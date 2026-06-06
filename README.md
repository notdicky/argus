# Argus

Self-hosted attack surface management. Give it a domain you own and it keeps track of
what you've got facing the internet (subdomains, open ports, services, known vulns) and
flags it when that changes.

Only scan things you own or are allowed to test.

## Contents

- [What's in here](#whats-in-here)
- [Pipeline](#pipeline)
- [Stack](#stack)
- [Running it locally](#running-it-locally)
- [Deploying](#deploying)
- [Status](#status)

## What's in here

It's a Turborepo monorepo:

- `apps/web`: the Next.js dashboard and API
- `apps/worker`: background scanner that pulls jobs off a queue
- `packages/db`: Drizzle schema + Postgres client
- `packages/core`: shared types, zod schemas, queue and pipeline setup
- `infra`: compose files and Dockerfiles

The web app drops scan jobs onto Redis (BullMQ), the worker picks them up, runs each
stage, writes the results to Postgres, and saves a snapshot so the next run can be diffed
against it.

## Pipeline

```
subfinder -> dnsx -> naabu -> httpx -> tls/header checks -> nuclei -> store + diff
```

If those tools aren't installed the worker falls back to built-in Node implementations
(DNS resolution, TCP port checks, fetch-based HTTP probing, a TLS inspector, and header
grading), so a scan still produces real results. The default worker image
(`infra/Dockerfile.worker`) is node-only; build `infra/Dockerfile.worker.tools` to bake in
the ProjectDiscovery tools for fuller recon.

## Stack

Next.js, React, TypeScript, Tailwind, Drizzle, Postgres, Redis, BullMQ, Auth.js, Docker.

## Running it locally

You need Node 24+, pnpm, and Docker.

```bash
cp .env.example .env
# set AUTH_SECRET (openssl rand -base64 32)

docker compose -f infra/docker-compose.yml up -d postgres redis
pnpm install
pnpm db:push
pnpm dev
```

Dashboard is on http://localhost:3000.

Everything in containers instead:

```bash
docker compose -f infra/docker-compose.yml up --build
```

## Deploying

There's a sanitized prod template at `infra/docker-compose.prod.example.yml`. Copy it to
`infra/docker-compose.prod.yml` (gitignored), point it at an env file you keep out of git,
and stick the web service behind a reverse proxy. Postgres and Redis aren't published in
that template.

## Status

M0 works end to end: monorepo, auth, targets, the job queue, and the first scan stage.
Still on the list: the rest of the pipeline (ports, HTTP probing, TLS, headers, nuclei),
then scheduled rescans with diffing, then alerting.

## License

MIT
