import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireOrg } from '@/lib/context';
import { signOut } from '@/auth';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/targets', label: 'Targets' },
  { href: '/activity', label: 'Activity' },
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, org } = await requireOrg();

  async function signOutAction() {
    'use server';
    await signOut({ redirectTo: '/sign-in' });
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800 p-4 md:flex">
        <Link href="/dashboard" className="mb-6 text-lg font-semibold text-emerald-400">
          Argus
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 pt-4 text-xs text-zinc-500">
          <span className="truncate font-medium text-zinc-400">{org.name}</span>
          <span className="truncate">{session.user.email}</span>
          <form action={signOutAction}>
            <Button variant="outline" size="sm" className="w-full">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 md:hidden">
          <Link href="/dashboard" className="text-base font-semibold text-emerald-400">
            Argus
          </Link>
          <form action={signOutAction}>
            <Button variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </header>

        <main className="flex-1 p-4 pb-24 sm:p-6 md:pb-6">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-zinc-800 bg-zinc-950/95 backdrop-blur md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-zinc-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
