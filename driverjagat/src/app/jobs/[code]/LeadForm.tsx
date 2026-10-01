'use client';

import { useActionState } from 'react';
import { sendLeadAction, type LeadFormState } from '@/app/actions/public';
import { LICENSE_TYPE_LABEL } from '@/types/enums';

const initial: LeadFormState = { ok: false };

function Err({ errors, k }: { errors?: Record<string, string>; k: string }) {
  const msg = errors?.[k];
  return msg ? <p className="mt-1 text-sm text-danger">{msg}</p> : null;
}

/**
 * "এই কাজে আগ্রহী" - nam, phone, license, obhiggota + oichhik note.
 * Ei form malik ke KICHHU janay na - lead admin er desk e jay,
 * admin phone koren.
 */
export function LeadForm({ trackingCode }: { trackingCode: string }) {
  const [state, action, pending] = useActionState(sendLeadAction, initial);

  if (state.ok) {
    return <div className="rounded-lg bg-success-bg p-4 text-success">{state.message}</div>;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="trackingCode" value={trackingCode} />

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="lead-name">
          আপনার নাম
        </label>
        <input
          id="lead-name"
          name="name"
          required
          className="w-full rounded-md border border-ink-200 px-3 py-2"
          placeholder="যেমন: মোঃ আব্দুল্লাহ"
        />
        <Err errors={state.errors} k="name" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="lead-phone">
          মোবাইল নম্বর
        </label>
        <input
          id="lead-phone"
          name="phone"
          required
          inputMode="tel"
          className="w-full rounded-md border border-ink-200 px-3 py-2"
          placeholder="01XXXXXXXXX"
        />
        <Err errors={state.errors} k="phone" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="lead-license">
            আপনার লাইসেন্স
          </label>
          <select
            id="lead-license"
            name="licenseType"
            required
            defaultValue=""
            className="w-full rounded-md border border-ink-200 bg-white px-3 py-2"
          >
            <option value="" disabled>
              বাছুন
            </option>
            {Object.entries(LICENSE_TYPE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <Err errors={state.errors} k="licenseType" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="lead-exp">
            অভিজ্ঞতা (বছর)
          </label>
          <input
            id="lead-exp"
            name="experienceYears"
            required
            inputMode="numeric"
            className="w-full rounded-md border border-ink-200 px-3 py-2"
            placeholder="যেমন: ৫"
          />
          <Err errors={state.errors} k="experienceYears" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="lead-note">
          কিছু বলতে চাইলে (ঐচ্ছিক)
        </label>
        <textarea
          id="lead-note"
          name="note"
          rows={2}
          className="w-full rounded-md border border-ink-200 px-3 py-2"
          placeholder="যেমন: আগে মাইক্রোবাস চালিয়েছি, মিরপুরে থাকি"
        />
      </div>

      {state.message ? <p className="text-sm text-danger">{state.message}</p> : null}

      <button
        disabled={pending}
        className="w-full rounded-lg bg-brand-700 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? 'পাঠানো হচ্ছে...' : 'আগ্রহ জানান'}
      </button>
      <p className="text-xs text-ink-400">
        আপনার তথ্য শুধু আমাদের টিম দেখবে। মালিক জানবেন না কে আগ্রহ দেখিয়েছেন।
        আপনার জন্য পুরোটা ফ্রি।
      </p>
    </form>
  );
}
