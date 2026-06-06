'use client';

import { useActionState } from 'react';
import { signInAction } from '../actions';
import { initialActionState } from '@/lib/action-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SignInForm() {
  const [state, action, pending] = useActionState(signInAction, initialActionState);

  return (
    <form action={action} className="flex flex-col gap-3">
      <Input name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
      <Input
        name="password"
        type="password"
        placeholder="Password"
        autoComplete="current-password"
        required
      />
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
