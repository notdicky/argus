'use client';

import { useActionState } from 'react';
import { signUpAction } from '../actions';
import { initialActionState } from '@/lib/action-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, initialActionState);

  return (
    <form action={action} className="flex flex-col gap-3">
      <Input name="name" type="text" placeholder="Name" autoComplete="name" required />
      <Input name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
      <Input
        name="password"
        type="password"
        placeholder="Password (min 8 characters)"
        autoComplete="new-password"
        required
      />
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
