'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { sendEmailLink, signInWithGoogle } from '@/lib/firebase/auth';

export function SignInPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/dashboard';

  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);
  const [email, setEmail] = useState('');

  const google = () =>
    start(async () => {
      const res = await signInWithGoogle();
      if (res.ok) {
        router.push(next);
        router.refresh();
      } else {
        setMessage(res.message ?? null);
      }
    });

  const emailLink = () =>
    start(async () => {
      if (!email.trim()) {
        setMessage('ইমেইল দিন');
        return;
      }
      const res = await sendEmailLink(email.trim());
      if (res.ok) setLinkSent(true);
      else setMessage(res.message ?? null);
    });

  if (linkSent) {
    return (
      <div className="rounded-lg bg-success-bg p-5 text-success">
        <p className="font-semibold">ইমেইলে লিংক পাঠানো হয়েছে</p>
        <p className="mt-1 text-sm">
          {email} এ একটি লিংক গেছে। ওই লিংকে চাপ দিলেই লগইন হয়ে যাবে।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
      <button
        disabled={pending}
        onClick={google}
        className="w-full rounded-lg border border-ink-200 bg-white py-2.5 font-semibold text-ink-800 hover:bg-ink-50 disabled:opacity-60"
      >
        Google দিয়ে লগইন
      </button>

      <div className="flex items-center gap-3 text-xs text-ink-400">
        <span className="h-px flex-1 bg-ink-200" />
        অথবা
        <span className="h-px flex-1 bg-ink-200" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="email">
          ইমেইল দিয়ে লিংক নিন
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-ink-200 px-3 py-2"
          placeholder="apnar@email.com"
        />
        <button
          disabled={pending}
          onClick={emailLink}
          className="mt-2 w-full rounded-lg bg-brand-700 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? 'অপেক্ষা করুন...' : 'লগইন লিংক পাঠান'}
        </button>
      </div>

      {message ? <p className="text-sm text-danger">{message}</p> : null}

      <p className="text-xs text-ink-400">
        পাসওয়ার্ড মনে রাখার ঝামেলা নেই। কাজ দেখতে বা আগ্রহ জানাতে লগইন
        লাগে না, শুধু ড্রাইভার চাই পোস্ট দিতে লাগে।
      </p>
    </div>
  );
}
