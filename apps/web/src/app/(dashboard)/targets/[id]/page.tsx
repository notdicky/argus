import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { requireOrg } from '@/lib/context';
import { db, targets, assets, findings, scanRuns } from '@argus/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { startScanAction, toggleMonitoringAction } from '../actions';

const severityTone = {
  info: 'info',
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
} as const;

const scanTone = {
  queued: 'info',
  running: 'low',
  completed: 'success',
  failed: 'critical',
  cancelled: 'neutral',
} as const;

const ASSET_GROUPS: { type: 'subdomain' | 'port' | 'url' | 'certificate'; label: string }[] = [
  { type: 'subdomain', label: 'Hosts' },
  { type: 'port', label: 'Open ports' },
  { type: 'url', label: 'Web endpoints' },
  { type: 'certificate', label: 'Certificates' },
];

export default async function TargetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await requireOrg();

  const target = await db.query.targets.findFirst({
    where: and(eq(targets.id, id), eq(targets.organizationId, org.id)),
  });
  if (!target) {
    notFound();
  }

  const [assetRows, findingRows, scanRows] = await Promise.all([
    db.select().from(assets).where(eq(assets.targetId, id)).orderBy(desc(assets.lastSeenAt)),
    db.select().from(findings).where(eq(findings.targetId, id)).orderBy(desc(findings.createdAt)),
    db
      .select()
      .from(scanRuns)
      .where(eq(scanRuns.targetId, id))
      .orderBy(desc(scanRuns.createdAt))
      .limit(10),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/targets" className="text-xs text-zinc-500 hover:underline">
            ← Targets
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-zinc-100">{target.value}</h1>
            {target.monitoringEnabled ? <Badge tone="success">monitoring</Badge> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <form action={toggleMonitoringAction}>
            <input type="hidden" name="targetId" value={target.id} />
            <Button type="submit" size="sm" variant="ghost">
              {target.monitoringEnabled ? 'Stop monitoring' : 'Monitor'}
            </Button>
          </form>
          <form action={startScanAction}>
            <input type="hidden" name="targetId" value={target.id} />
            <Button type="submit" size="sm">
              Run scan
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
        </CardHeader>
        <CardContent>
          {findingRows.length === 0 ? (
            <p className="text-sm text-zinc-500">No findings yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-zinc-800">
              {findingRows.map((finding) => (
                <li key={finding.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-100">{finding.name}</p>
                    <p className="truncate text-xs text-zinc-500">{finding.description}</p>
                  </div>
                  <Badge tone={severityTone[finding.severity]}>{finding.severity}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ASSET_GROUPS.map((group) => {
          const rows = assetRows.filter((asset) => asset.type === group.type);
          return (
            <Card key={group.type}>
              <CardHeader>
                <CardTitle>
                  {group.label} ({rows.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <p className="text-sm text-zinc-500">None.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {rows.slice(0, 25).map((asset) => (
                      <li key={asset.id} className="truncate text-sm text-zinc-300">
                        {asset.value}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent scans</CardTitle>
        </CardHeader>
        <CardContent>
          {scanRows.length === 0 ? (
            <p className="text-sm text-zinc-500">No scans yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-zinc-800">
              {scanRows.map((scan) => (
                <li key={scan.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-xs text-zinc-500">
                    {scan.createdAt.toLocaleString()}
                  </span>
                  <Badge tone={scanTone[scan.status]}>{scan.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
