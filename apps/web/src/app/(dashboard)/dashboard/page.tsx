import Link from 'next/link';
import { count, eq } from 'drizzle-orm';
import { requireOrg } from '@/lib/context';
import { db, targets, scanRuns, findings } from '@argus/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const { org } = await requireOrg();

  const targetRows = await db
    .select({ value: count() })
    .from(targets)
    .where(eq(targets.organizationId, org.id));
  const targetCount = targetRows[0]?.value ?? 0;

  const scanRows = await db
    .select({ value: count() })
    .from(scanRuns)
    .innerJoin(targets, eq(scanRuns.targetId, targets.id))
    .where(eq(targets.organizationId, org.id));
  const scanCount = scanRows[0]?.value ?? 0;

  const findingRows = await db
    .select({ value: count() })
    .from(findings)
    .innerJoin(targets, eq(findings.targetId, targets.id))
    .where(eq(targets.organizationId, org.id));
  const findingCount = findingRows[0]?.value ?? 0;

  const stats = [
    { label: 'Targets', value: targetCount },
    { label: 'Scan runs', value: scanCount },
    { label: 'Findings', value: findingCount },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-100">Overview</h1>
        <p className="text-sm text-zinc-400">Attack surface summary for {org.name}.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle>{stat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-semibold text-zinc-100">{stat.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {targetCount === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-2 p-6">
            <p className="text-sm text-zinc-300">No targets yet.</p>
            <Link href="/targets" className="text-sm text-emerald-400 hover:underline">
              Add your first target →
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
