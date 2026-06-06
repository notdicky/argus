'use client';

import { useActionState } from 'react';
import { createTargetAction } from './actions';
import { initialActionState } from '@/lib/action-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CreateTargetForm() {
  const [state, action, pending] = useActionState(createTargetAction, initialActionState);

  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <Input name="value" type="text" placeholder="example.com" required />
        {state.error ? <p className="mt-1 text-xs text-red-400">{state.error}</p> : null}
        {state.success ? <p className="mt-1 text-xs text-emerald-400">Target added.</p> : null}
      </div>
      <Button type="submit" disabled={pending} className="sm:w-auto">
        {pending ? 'Adding…' : 'Add target'}
      </Button>
    </form>
  );
}
