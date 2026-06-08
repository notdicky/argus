import { desc, eq, inArray } from 'drizzle-orm';
import { requireOrg } from '@/lib/context';
import { db, targets, diffs, alerts } from '@argus/db';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveAlertAction } from './actions';

const severityTone = {
  info: 'info',
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
} as const;

const changeTone = {
  added: 'success',
  removed: 'critical',
  changed: 'medium',
} as const;

const changeSign = {
  added: '+',
  removed: '−',
  changed: '~',
} as const;

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const { org } = await requireOrg();

  const orgTargets = await db
    .select({ id: targets.id, value: targets.value })
    .from(targets)
    .where(eq(targets.organizationId, org.id));
  const ids = orgTargets.map((target) => target.id);
  const nameById = new Map(orgTargets.map((target) => [target.id, target.value] as const));

  const recentDiffs = ids.length
    ? await db.select().from(diffs).where(inArray(diffs.targetId, ids)).orderBy(desc(diffs.createdAt)).limit(50)
    : [];
  const recentAlerts = await db
    .select()
    .from(alerts)
    .where(eq(alerts.organizationId, org.id))
    .orderBy(desc(alerts.createdAt))
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Activity</h1>
        <p className="text-sm text-zinc-400">Alerts and changes across your targets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAlerts.length === 0 ? (
            <p className="text-sm text-zinc-500">No alerts.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-zinc-800">
              {recentAlerts.map((alert) => (
                <li key={alert.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={severityTone[alert.severity]}>{alert.severity}</Badge>
                      <span className="truncate text-sm text-zinc-100">{alert.title}</span>
                    </div>
                    {alert.body ? (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{alert.body}</p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-zinc-600">{alert.createdAt.toLocaleString()}</p>
                  </div>
                  {alert.status === 'resolved' ? (
                    <Badge tone="neutral">resolved</Badge>
                  ) : (
                    <form action={resolveAlertAction}>
                      <input type="hidden" name="alertId" value={alert.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Resolve
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Changes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentDiffs.length === 0 ? (
            <p className="text-sm text-zinc-500">No changes detected yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {recentDiffs.map((diff) => (
                <li key={diff.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-zinc-200">{nameById.get(diff.targetId) ?? 'target'}</span>
                    <span className="text-xs text-zinc-600">{diff.createdAt.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {diff.changes.map((change, index) => (
                      <Badge key={index} tone={changeTone[change.type]}>
                        {changeSign[change.type]} {change.value}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
