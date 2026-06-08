# Argus

Self-hosted attack surface management. Argus continuously discovers what a domain you own
exposes to the internet — subdomains, hosts, open ports, services, certificates, and known
vulnerabilities — and tracks how that surface changes between scans.

![license](https://img.shields.io/badge/license-MIT-blue)
![typescript](https://img.shields.io/badge/TypeScript-5-3178c6)
![next.js](https://img.shields.io/badge/Next.js-15-black)

> **Authorized use only.** Only add and scan assets you own or have explicit written
> permission to test. Active reconnaissance against systems you are not authorized to
> assess may be unlawful.

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
  - [Monorepo layout](#monorepo-layout)
  - [Request flow](#request-flow)
  - [Scan pipeline](#scan-pipeline)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local development](#local-development)
  - [Running in containers](#running-in-containers)
- [Configuration](#configuration)
- [Database and migrations](#database-and-migrations)
- [Deployment](#deployment)
- [Project status](#project-status)
- [Security](#security)
- [License](#license)

## Overview

Most teams cannot reliably answer a simple question: what of ours is reachable from the
internet right now, and did it change since yesterday? Argus answers it by turning a set of
recon and scanning tools into an orchestrated, repeatable pipeline, storing every result,
and diffing each run against the last so newly exposed assets and findings surface
automatically.

It is built as a Turborepo monorepo with a Next.js dashboard and a background worker that
runs scans off a job queue. External tooling is optional: when the ProjectDiscovery
binaries are not present, the worker falls back to built-in Node implementations so a scan
still produces useful results.

## Features

- **Targets** — register domains, hold an ownership-verification token, and enable
  continuous monitoring.
- **Staged recon pipeline** — subdomain discovery, DNS resolution, port and service
  scanning, HTTP fingerprinting, TLS inspection, security-header grading, and an optional
  vulnerability scan.
- **Asset inventory** — discovered subdomains, hosts, open ports, web endpoints, and
  certificates, deduplicated with first/last-seen timestamps.
- **Findings** — results graded by severity (info through critical).
- **Snapshots and diffing** — every run is snapshotted, and changes raise alerts.
- **Mobile-first dashboard** — responsive layout with a desktop sidebar and a mobile tab
  bar.

## Architecture

### Monorepo layout

```
argus/
├─ apps/
│  ├─ web/        Next.js dashboard: UI, API routes, auth, server actions
│  └─ worker/     Background service that consumes the scan queue and runs the pipeline
├─ packages/
│  ├─ db/         Drizzle ORM schema, migrations, and the PostgreSQL client
│  └─ core/       Shared zod schemas, queue wiring, and pipeline definitions
└─ infra/         Dockerfiles, Compose files, and a private deploy-overlay template
```

### Request flow

The dashboard writes a scan request to the database and enqueues a job on Redis (BullMQ).
The worker consumes the job, runs each pipeline stage, persists assets and findings to
PostgreSQL, snapshots the surface, and diffs it against the previous snapshot. The
dashboard reads results back directly from PostgreSQL.

```
web (Next.js) ──enqueue──▶ Redis (BullMQ) ──▶ worker ──▶ PostgreSQL ──read──▶ web
```

### Scan pipeline

Stages run in dependency order. Each persists its output before the next begins.

| Stage | Tool | Output |
| --- | --- | --- |
| Subdomain enumeration | subfinder | candidate hostnames |
| DNS resolution | dnsx / Node DNS | live hosts |
| Port & service scan | naabu / Node TCP | open ports |
| HTTP probe & fingerprint | httpx / Node fetch | status, title, server, technologies |
| TLS & certificate analysis | Node TLS | issuer, validity, expiry |
| Security header grading | built-in | A–F grade and missing headers |
| Vulnerability scan | nuclei (optional) | findings with severity |
| Persist & diff | built-in | snapshot and change set vs. the previous run |

The default worker image is node-only and relies on the built-in fallbacks. Build
`infra/Dockerfile.worker.tools` to bake in the ProjectDiscovery binaries for fuller recon.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js (App Router), React, Tailwind CSS |
| Auth | Auth.js (credentials, JWT sessions) |
| Backend | Next.js server actions and route handlers |
| Worker | Node, BullMQ |
| Data | PostgreSQL, Drizzle ORM |
| Queue | Redis |
| Validation | Zod |
| Tooling | Turborepo, pnpm, TypeScript |
| Runtime | Docker / Podman |

## Getting started

### Prerequisites

- Node.js 24+
- pnpm 10+
- Docker (or Podman) for PostgreSQL and Redis

### Local development

```bash
cp .env.example .env
# set AUTH_SECRET, e.g. openssl rand -base64 32

docker compose -f infra/docker-compose.yml up -d postgres redis
pnpm install
pnpm db:push        # apply the schema to your local database
pnpm dev            # starts the dashboard and the worker
```

The dashboard is served at http://localhost:3000.

### Running in containers

```bash
docker compose -f infra/docker-compose.yml up --build
```

## Configuration

Configuration is read from the environment. See `.env.example` for a template.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `REDIS_URL` | yes | Redis connection string |
| `AUTH_SECRET` | yes | Secret used to sign sessions (`openssl rand -base64 32`) |
| `AUTH_URL` | yes | Public URL of the dashboard |
| `WORKER_CONCURRENCY` | no | Number of concurrent scan jobs (default `4`) |

## Database and migrations

Drizzle owns the schema in `packages/db`.

```bash
pnpm db:generate    # generate a migration from schema changes
pnpm db:migrate     # apply migrations (use this in deployments)
pnpm db:push        # push the schema directly (handy in local dev)
pnpm db:studio      # open Drizzle Studio
```

## Deployment

A sanitized production Compose template lives at `infra/docker-compose.prod.example.yml`.
Copy it to `infra/docker-compose.prod.yml` (gitignored), supply secrets through an
environment file kept out of version control, and place the web service behind a reverse
proxy. Database and Redis ports are not published in the production template.

## Project status

- [x] **M0** — monorepo foundation, auth, targets, job queue, worker, first scan stage
- [x] **M1** — full pipeline (ports, HTTP, TLS, headers, optional nuclei) and snapshot
  diffing with alerts
- [x] **M2** — scheduled re-scans, monitoring toggle, and a change feed (alerts + diffs)
- [ ] **M3** — alert channels (email / webhook / chat) and alert rules
- [ ] **M4** — organizations, RBAC, and ownership verification

## Security

- Scan only assets you are authorized to assess.
- Secrets are read from the environment and never committed; production overlays and any
  network-specific configuration stay out of version control.
- Authentication uses hashed credentials and signed sessions.

## License

MIT
