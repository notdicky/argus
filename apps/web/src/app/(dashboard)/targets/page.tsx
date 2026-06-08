import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { requireOrg } from '@/lib/context';
import { db, targets } from '@argus/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateTargetForm } from './create-target-form';
import { startScanAction, toggleMonitoringAction } from './actions';

const verificationTone = {
  pending: 'medium',
  verified: 'success',
  failed: 'critical',
} as const;

const scanTone = {
  queued: 'info',
  running: 'low',
  completed: 'success',
  failed: 'critical',
  cancelled: 'neutral',
} as const;

export default async function TargetsPage() {
  const { org } = await requireOrg();

  const rows = await db.query.targets.findMany({
    where: eq(targets.organizationId, org.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    with: {
      scanRuns: {
        orderBy: (s, { desc }) => [desc(s.createdAt)],
        limit: 1,
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Targets</h1>
        <p className="text-sm text-zinc-400">Domains you own and are authorized to monitor.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-zinc-100">Add a target</CardTitle>
          <p className="text-xs text-zinc-500">Only scan assets you are authorized to test.</p>
        </CardHeader>
        <CardContent>
          <CreateTargetForm />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">No targets yet. Add one above to get started.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((target) => {
            const latest = target.scanRuns[0];
            return (
              <Card key={target.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/targets/${target.id}`}
                      className="font-medium text-zinc-100 hover:text-emerald-400"
                    >
                      {target.value}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{target.type}</Badge>
                      <Badge tone={verificationTone[target.verification]}>
                        {target.verification}
                      </Badge>
                      {latest ? (
                        <Badge tone={scanTone[latest.status]}>scan: {latest.status}</Badge>
                      ) : (
                        <Badge tone="neutral">no scans</Badge>
                      )}
                      {target.monitoringEnabled ? <Badge tone="success">monitoring</Badge> : null}
                    </div>
                    {target.verification === 'pending' ? (
                      <span className="text-xs text-zinc-500">
                        Verify ownership with DNS TXT{' '}
                        <code className="text-zinc-400">
                          argus-verify={target.verificationToken}
                        </code>
                      </span>
                    ) : null}
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
                      <Button type="submit" size="sm" variant="outline">
                        Run scan
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
