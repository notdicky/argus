'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db, targets, scanRuns } from '@argus/db';
import { createTargetSchema, enqueueScan, scanJobSchema } from '@argus/core';
import { requireOrg } from '@/lib/context';
import type { ActionState } from '@/lib/action-state';

export async function createTargetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { org } = await requireOrg();

  const parsed = createTargetSchema.safeParse({
    value: formData.get('value'),
    type: formData.get('type') ?? 'domain',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid target' };
  }

  const existing = await db.query.targets.findFirst({
    where: and(eq(targets.organizationId, org.id), eq(targets.value, parsed.data.value)),
  });
  if (existing) {
    return { error: 'That target already exists' };
  }

  await db.insert(targets).values({
    organizationId: org.id,
    value: parsed.data.value,
    type: parsed.data.type,
  });

  revalidatePath('/targets');
  return { success: true };
}

export async function toggleMonitoringAction(formData: FormData): Promise<void> {
  const { org } = await requireOrg();

  const targetId = String(formData.get('targetId') ?? '');
  const target = await db.query.targets.findFirst({
    where: and(eq(targets.id, targetId), eq(targets.organizationId, org.id)),
  });
  if (!target) {
    return;
  }

  await db
    .update(targets)
    .set({ monitoringEnabled: !target.monitoringEnabled })
    .where(eq(targets.id, target.id));

  revalidatePath('/targets');
  revalidatePath(`/targets/${target.id}`);
}

export async function startScanAction(formData: FormData): Promise<void> {
  const { org } = await requireOrg();

  const targetId = String(formData.get('targetId') ?? '');
  const target = await db.query.targets.findFirst({
    where: and(eq(targets.id, targetId), eq(targets.organizationId, org.id)),
  });
  if (!target) {
    return;
  }

  const [run] = await db
    .insert(scanRuns)
    .values({ targetId: target.id, status: 'queued', trigger: 'manual' })
    .returning();
  if (!run) {
    return;
  }

  const job = scanJobSchema.parse({
    scanRunId: run.id,
    targetId: target.id,
    target: target.value,
    targetType: target.type,
    trigger: 'manual',
  });

  await enqueueScan(job);
  revalidatePath('/targets');
}
