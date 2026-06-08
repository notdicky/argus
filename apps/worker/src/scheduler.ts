import { eq } from 'drizzle-orm';
import { db, targets, scanRuns } from '@argus/db';
import { enqueueScan, scanJobSchema } from '@argus/core';

const INTERVAL_MINUTES = Number(process.env.RESCAN_INTERVAL_MINUTES ?? '360');

export async function scheduleDueScans() {
  const monitored = await db.query.targets.findMany({
    where: eq(targets.monitoringEnabled, true),
    with: {
      scanRuns: {
        orderBy: (run, { desc }) => [desc(run.createdAt)],
        limit: 1,
      },
    },
  });

  const now = Date.now();
  const intervalMs = INTERVAL_MINUTES * 60_000;

  for (const target of monitored) {
    const latest = target.scanRuns[0];
    if (latest && (latest.status === 'queued' || latest.status === 'running')) {
      continue;
    }
    const lastAt = latest?.createdAt?.getTime() ?? 0;
    if (now - lastAt < intervalMs) {
      continue;
    }

    const [run] = await db
      .insert(scanRuns)
      .values({ targetId: target.id, status: 'queued', trigger: 'scheduled' })
      .returning();
    if (!run) {
      continue;
    }

    await enqueueScan(
      scanJobSchema.parse({
        scanRunId: run.id,
        targetId: target.id,
        target: target.value,
        targetType: target.type,
        trigger: 'scheduled',
      }),
    );
    console.log(`[argus] scheduled rescan queued for ${target.value}`);
  }
}
