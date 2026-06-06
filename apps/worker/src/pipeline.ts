import { and, eq } from 'drizzle-orm';
import { db, scanRuns, assets, snapshots, findings, targets } from '@argus/db';
import type { ScanJob, Severity } from '@argus/core';
import { discoverSubdomains, resolveHosts } from './stages/subdomain';
import { scanPorts } from './stages/ports';
import { probeHttp, isWebPort, type HttpResult } from './stages/http';
import { analyzeTls } from './stages/tls';
import { gradeHeaders, headerSeverity } from './stages/headers';
import { runNuclei } from './stages/vulns';
import { computeDiff } from './stages/diff';

type AssetKind = 'subdomain' | 'host' | 'port' | 'service' | 'url' | 'certificate';

async function upsertAsset(
  job: ScanJob,
  type: AssetKind,
  value: string,
  metadata: Record<string, unknown>,
) {
  const existing = await db.query.assets.findFirst({
    where: and(eq(assets.targetId, job.targetId), eq(assets.type, type), eq(assets.value, value)),
  });

  if (existing) {
    await db
      .update(assets)
      .set({ lastSeenAt: new Date(), scanRunId: job.scanRunId, metadata })
      .where(eq(assets.id, existing.id));
    return;
  }

  await db
    .insert(assets)
    .values({ targetId: job.targetId, scanRunId: job.scanRunId, type, value, metadata });
}

async function addFinding(
  job: ScanJob,
  severity: Severity,
  name: string,
  templateId: string,
  asset: string,
  evidence: Record<string, unknown>,
) {
  await db.insert(findings).values({
    targetId: job.targetId,
    scanRunId: job.scanRunId,
    severity,
    name,
    templateId,
    description: asset,
    evidence,
  });
}

export async function runScan(job: ScanJob) {
  const target = await db.query.targets.findFirst({ where: eq(targets.id, job.targetId) });
  if (!target) {
    throw new Error('target not found');
  }

  await db
    .update(scanRuns)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(scanRuns.id, job.scanRunId));

  try {
    const candidates = await discoverSubdomains(job.target);
    const resolved = await resolveHosts(candidates);
    const live = resolved.filter((entry) => entry.addresses.length > 0);

    for (const entry of live) {
      await upsertAsset(job, 'subdomain', entry.host, { addresses: entry.addresses });
    }

    const hostPorts: { host: string; ports: number[] }[] = [];
    for (const entry of live) {
      const ports = await scanPorts(entry.host);
      hostPorts.push({ host: entry.host, ports });
      for (const port of ports) {
        await upsertAsset(job, 'port', `${entry.host}:${port}`, { host: entry.host, port });
      }
    }

    const httpResults: HttpResult[] = [];
    for (const { host, ports } of hostPorts) {
      for (const port of ports.filter(isWebPort)) {
        const result = await probeHttp(host, port);
        if (!result) continue;

        httpResults.push(result);
        await upsertAsset(job, 'url', result.url, {
          status: result.status,
          title: result.title,
          server: result.server,
        });

        const grade = gradeHeaders(result.headers);
        if (grade.missing.length > 0) {
          await addFinding(
            job,
            headerSeverity(grade.missing),
            `Missing security headers (grade ${grade.grade})`,
            'headers',
            result.url,
            { grade: grade.grade, missing: grade.missing },
          );
        }
      }

      if (ports.includes(443) || ports.includes(8443)) {
        const tlsInfo = await analyzeTls(host);
        if (tlsInfo) {
          await upsertAsset(job, 'certificate', `${host}:tls`, { ...tlsInfo });
          if (tlsInfo.daysUntilExpiry !== null && tlsInfo.daysUntilExpiry < 21) {
            const expired = tlsInfo.daysUntilExpiry < 0;
            await addFinding(
              job,
              expired ? 'high' : 'medium',
              expired ? 'TLS certificate expired' : 'TLS certificate expiring soon',
              'tls',
              host,
              { ...tlsInfo },
            );
          }
        }
      }
    }

    const urls = httpResults.map((result) => result.url);
    const vulns = await runNuclei(urls);
    for (const vuln of vulns) {
      await addFinding(job, vuln.severity, vuln.name, vuln.templateId || 'nuclei', vuln.url, {
        description: vuln.description,
      });
    }

    const snapshotData = {
      hosts: live.map((entry) => ({ host: entry.host, addresses: entry.addresses })),
      ports: hostPorts,
      urls,
    };
    const [snapshot] = await db
      .insert(snapshots)
      .values({ targetId: target.id, scanRunId: job.scanRunId, data: snapshotData })
      .returning();

    let changeCount = 0;
    if (snapshot) {
      const changes = await computeDiff(target.id, target.organizationId, snapshot.id, snapshotData);
      changeCount = changes.length;
    }

    const openPorts = hostPorts.reduce((total, entry) => total + entry.ports.length, 0);
    await db
      .update(scanRuns)
      .set({
        status: 'completed',
        finishedAt: new Date(),
        stats: {
          discovered: candidates.length,
          live: live.length,
          ports: openPorts,
          urls: urls.length,
          findings: vulns.length,
          changes: changeCount,
        },
      })
      .where(eq(scanRuns.id, job.scanRunId));

    return { live: live.length, ports: openPorts, urls: urls.length, findings: vulns.length };
  } catch (error) {
    await db
      .update(scanRuns)
      .set({
        status: 'failed',
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      .where(eq(scanRuns.id, job.scanRunId));
    throw error;
  }
}
