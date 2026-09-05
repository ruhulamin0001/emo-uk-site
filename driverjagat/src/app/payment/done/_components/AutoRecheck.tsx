'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * "অপেক্ষা করুন" pata ta NIJE THEKE abar dekhe (§৪খ).
 *
 * ⚠️ EI TA NA THAKLE MANUSH BHABTEN TAKA MAR GECHHE.
 *
 * Gateway er SMS-pora app ta ~20-30 second ney. Manush "আমি
 * পেমেন্ট সম্পন্ন করেছি" chepe SATHE SATHE amader patay fire
 * ashen - tokhon gateway tokhono "pending" i bole. Mane PRAY
 * SOBAI prothome "অপেক্ষা করুন" i dekhen.
 *
 * Haate chapar ekta link thakleo beshirbhag manush oi ta chapen
 * na - tara bhaben taka mar gechhe, tarpor phone koren. Ba aro
 * kharap: ABAR TAKA PATHAN.
 *
 * ⚠️ Ei ta webhook er upor nirbhorota PRAY SESH kore dey. Gateway
 * er portal e Webhook URL er ghor EKTA i, tai dwitiyo-tritiyo
 * site webhook pay i na - manush patay thakle ekhane i kaj ta
 * hoye jay.
 *
 * `router.refresh()` server component ta abar chalay, ar seta
 * `settlePayment` ke abar daake - ja idempotent, tai bar bar
 * dakleo fol ekbar i ghote.
 */
export function AutoRecheck({
  everyMs = 6_000,
  forMs = 120_000,
}: {
  everyMs?: number;
  forMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    const startedAt = Date.now();

    const timer = setInterval(() => {
      /* ⚠️ 2 minute por theme jay - noyle pata ta khola thakle
         chirokal gateway ke jiggesh korto */
      if (Date.now() - startedAt > forMs) {
        clearInterval(timer);
        return;
      }
      router.refresh();
    }, everyMs);

    return () => clearInterval(timer);
  }, [router, everyMs, forMs]);

  return null;
}
