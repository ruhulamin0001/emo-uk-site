'use client';

import { useState, useTransition, type FormEvent } from 'react';
import type { ActionState } from '@/app/actions/admin';

/**
 * Admin er choto form - server action ke dake, uttor ta dekhay.
 * Server component theke `action.bind(null, id)` kore pathano hoy.
 */
export function AdminForm({
  action,
  children,
  className,
}: {
  action: (fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionState | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => setResult(await action(fd)));
  };

  return (
    <form onSubmit={onSubmit} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {result ? (
        <p className={`mt-1 text-sm ${result.ok ? 'text-success' : 'text-danger'}`}>
          {result.message}
        </p>
      ) : null}
    </form>
  );
}
