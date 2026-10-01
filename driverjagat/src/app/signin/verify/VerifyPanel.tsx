'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  completeEmailLink,
  completeEmailLinkWith,
  isEmailLink,
} from '@/lib/firebase/auth';

/**
 * Email link e chap dile ei pata khole.
 * Onno device e khulle email ta jana thake na - tokhon chaite hoy.
 */
export function VerifyPanel() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [needEmail, setNeedEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const url = window.location.href;
    if (!isEmailLink(url)) {
      setMessage('লিংকটি সঠিক নয় বা মেয়াদ শেষ। আবার লগইন লিংক নিন।');
      return;
    }
    start(async () => {
      const res = await completeEmailLink(url);
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setNeedEmail(true);
        setMessage(res.message ?? null);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = () =>
    start(async () => {
      const res = await completeEmailLinkWith(window.location.href, email.trim());
      if (res.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setMessage(res.message ?? null);
      }
    });

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      {pending && !needEmail ? <p>লগইন হচ্ছে...</p> : null}

      {needEmail ? (
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="verify-email">
            যে ইমেইলে লিংক পাঠানো হয়েছিল
          </label>
          <input
            id="verify-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-ink-200 px-3 py-2"
          />
          <button
            disabled={pending}
            onClick={submit}
            className="mt-3 w-full rounded-lg bg-brand-700 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            লগইন করুন
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
    </div>
  );
}
