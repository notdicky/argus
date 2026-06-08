'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db, alerts } from '@argus/db';
import { requireOrg } from '@/lib/context';

export async function resolveAlertAction(formData: FormData): Promise<void> {
  const { org } = await requireOrg();
  const alertId = String(formData.get('alertId') ?? '');
  await db
    .update(alerts)
    .set({ status: 'resolved' })
    .where(and(eq(alerts.id, alertId), eq(alerts.organizationId, org.id)));
  revalidatePath('/activity');
}
