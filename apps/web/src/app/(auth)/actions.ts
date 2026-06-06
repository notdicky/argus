'use server';

import { AuthError } from 'next-auth';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db, users, organizations, memberships } from '@argus/db';
import { signUpSchema } from '@argus/core';
import { signIn } from '@/auth';
import type { ActionState } from '@/lib/action-state';

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || 'org'}-${suffix}`;
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await signIn('credentials', {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      redirectTo: '/dashboard',
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password' };
    }
    throw error;
  }
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { name, email, password } = parsed.data;

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    return { error: 'An account with that email already exists' };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({ name, email, passwordHash }).returning();
  if (!user) {
    return { error: 'Could not create account' };
  }

  const [org] = await db
    .insert(organizations)
    .values({ name: `${name}'s workspace`, slug: slugify(name) })
    .returning();
  if (!org) {
    return { error: 'Could not create workspace' };
  }

  await db.insert(memberships).values({ organizationId: org.id, userId: user.id, role: 'owner' });

  await signIn('credentials', { email, password, redirectTo: '/dashboard' });
  return {};
}
