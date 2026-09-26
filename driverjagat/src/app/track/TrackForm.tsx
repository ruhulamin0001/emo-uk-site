'use client';

import { useActionState } from 'react';
import { trackAction, type TrackFormState } from '@/app/actions/public';
import { STAGE_MESSAGE } from '@/lib/tracking-messages';
import { StageBadge } from '@/components/StageBadge';
import type { JobStatus } from '@/types/enums';

const initial: TrackFormState = { ok: false };

export function TrackForm() {
  const [state, action, pending] = useActionState(trackAction, initial);

  return (
    <div>
      <form action={action} className="space-y-3 rounded-lg bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="code">
            ট্র্যাকিং কোড
          </label>
          <input
            id="code"
            name="code"
            required
            className="w-full rounded-md border border-ink-200 px-3 py-2 font-mono uppercase"
            placeholder="DJ-HD-00123"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="phone">
            যে মোবাইল নম্বর দিয়ে জমা দিয়েছিলেন
          </label>
          <input
            id="phone"
            name="phone"
            required
            inputMode="tel"
            className="w-full rounded-md border border-ink-200 px-3 py-2"
            placeholder="01XXXXXXXXX"
          />
        </div>
        {!state.ok && state.message ? (
          <p className="text-sm text-danger">{state.message}</p>
        ) : null}
        <button
          disabled={pending}
          className="w-full rounded-lg bg-brand-700 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {pending ? 'খোঁজা হচ্ছে...' : 'অবস্থা দেখুন'}
        </button>
      </form>

      {state.ok && state.view ? (
        <div className="mt-6 rounded-lg bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-ink-400">{state.view.trackingCode}</span>
            <StageBadge stage={state.view.stage as JobStatus} />
          </div>
          <p className="mt-3 text-ink-800">
            {STAGE_MESSAGE[String(state.view.stage)] ?? ''}
          </p>
          {state.view.matchedContact ? (
            <div className="mt-4 rounded-lg bg-success-bg p-4 text-success">
              <p className="font-semibold">যোগাযোগ:</p>
              <p>
                {state.view.matchedContact.name} ·{' '}
                <span className="font-mono">{state.view.matchedContact.phone}</span>
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
