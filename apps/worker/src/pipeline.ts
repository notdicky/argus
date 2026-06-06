import { and, eq } from 'drizzle-orm';
import { db, scanRuns, assets, snapshots } from '@argus/db';
import type { ScanJob } from '@argus/core';
import { discoverSubdomains, resolveHosts } from './stages/subdomain';

async function upsertSubdomain(
  targetId: string,
  scanRunId: string,
  host: string,
  metadata: Record<string, unknown>,
) {
  const existing = await db.query.assets.findFirst({
    where: and(eq(assets.targetId, targetId), eq(assets.type, 'subdomain'), eq(assets.value, host)),
  });

  if (existing) {
    await db
      .update(assets)
      .set({ lastSeenAt: new Date(), scanRunId, metadata })
      .where(eq(assets.id, existing.id));
    return;
  }

  await db.insert(assets).values({ targetId, scanRunId, type: 'subdomain', value: host, metadata });
}

export async function runScan(job: ScanJob) {
  await db
    .update(scanRuns)
    .set({ status: 'running', startedAt: new Date() })
    .where(eq(scanRuns.id, job.scanRunId));

  try {
    const candidates = await discoverSubdomains(job.target);
    const resolved = await resolveHosts(candidates);
    const live = resolved.filter((entry) => entry.addresses.length > 0);

    for (const entry of live) {
      await upsertSubdomain(job.targetId, job.scanRunId, entry.host, { addresses: entry.addresses });
    }

    await db.insert(snapshots).values({
      targetId: job.targetId,
      scanRunId: job.scanRunId,
      data: {
        hosts: live.map((entry) => ({ host: entry.host, addresses: entry.addresses })),
        discovered: candidates.length,
        live: live.length,
      },
    });

    await db
      .update(scanRuns)
      .set({
        status: 'completed',
        finishedAt: new Date(),
        stats: { discovered: candidates.length, live: live.length },
      })
      .where(eq(scanRuns.id, job.scanRunId));

    return { discovered: candidates.length, live: live.length };
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
