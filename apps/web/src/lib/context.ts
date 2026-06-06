import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db, memberships } from '@argus/db';

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }
  return session;
}

export async function requireOrg() {
  const session = await requireSession();
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
    with: { organization: true },
  });
  if (!membership) {
    redirect('/sign-in');
  }
  return { session, org: membership.organization, role: membership.role };
}
