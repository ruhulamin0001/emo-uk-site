'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/firebase/auth';

export function SignOutButton() {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          await signOut();
          router.push('/');
          router.refresh();
        })
      }
      className="text-sm text-ink-400 underline hover:text-ink-600"
    >
      {pending ? 'লগআউট হচ্ছে...' : 'লগআউট'}
    </button>
  );
}
