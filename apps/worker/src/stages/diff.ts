import { and, eq, ne } from 'drizzle-orm';
import { db, snapshots, diffs, alerts } from '@argus/db';
import type { DiffChange } from '@argus/db';

export interface SnapshotData {
  hosts: { host: string; addresses: string[] }[];
}

export async function computeDiff(
  targetId: string,
  organizationId: string,
  currentSnapshotId: string,
  current: SnapshotData,
): Promise<DiffChange[]> {
  const previous = await db.query.snapshots.findFirst({
    where: and(eq(snapshots.targetId, targetId), ne(snapshots.id, currentSnapshotId)),
    orderBy: (snapshot, { desc }) => [desc(snapshot.createdAt)],
  });

  if (!previous) {
    return [];
  }

  const previousData = previous.data as unknown as SnapshotData;
  const previousHosts = new Set((previousData.hosts ?? []).map((entry) => entry.host));
  const currentHosts = new Set((current.hosts ?? []).map((entry) => entry.host));

  const changes: DiffChange[] = [];
  for (const host of currentHosts) {
    if (!previousHosts.has(host)) {
      changes.push({ type: 'added', assetType: 'subdomain', value: host });
    }
  }
  for (const host of previousHosts) {
    if (!currentHosts.has(host)) {
      changes.push({ type: 'removed', assetType: 'subdomain', value: host });
    }
  }

  if (changes.length === 0) {
    return [];
  }

  await db.insert(diffs).values({
    targetId,
    fromSnapshotId: previous.id,
    toSnapshotId: currentSnapshotId,
    changes,
  });

  const added = changes.filter((change) => change.type === 'added');
  if (added.length > 0) {
    await db.insert(alerts).values({
      organizationId,
      targetId,
      severity: 'medium',
      title: `${added.length} new host(s) discovered`,
      body: added.map((change) => change.value).join(', '),
    });
  }

  return changes;
}
