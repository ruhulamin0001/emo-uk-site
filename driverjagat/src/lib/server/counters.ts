import 'server-only';

/**
 * Gonona - tracking code er crom o homepage er live sonkha.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';

const COUNTERS = 'counters';

/**
 * Porer crom sonkha - BJ-HD-00123 er sesher ongsho.
 *
 * Transaction e kora HOBE. Dujon admin ek shathe job bosale
 * duijon i ek i sonkha peto, ar duita job er code ek hoye jeto.
 * Tokhon ekta job er link e onnota khulto - ar seta kokhono
 * error dito na.
 *
 * Ei sonkha mash e reset hoy NA (lib/tracking-code.ts dekhun).
 */
export async function nextJobSerial(): Promise<number> {
  const ref = adminDb().collection(COUNTERS).doc('job_serial');

  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.data()?.value as number | undefined) ?? 0;
    const next = current + 1;
    tx.set(ref, { value: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return next;
  });
}

/**
 * `bumpCounter` ar `readStats` ekhane chilo - SORIYE deya holo.
 *
 * Oi gulo `counters/stats` ghore job er hisheb rakhto:
 * pendingJobs, publishedJobs, rejectedJobs, totalJobs. Ar oi ghor
 * ta KOKHONO milie neya hoto na.
 *
 * `publishedJobs` sudhu BARTO - job sesh hole ba muche gele
 * komto na. Ar kono ek jaygay ekta bump baad porleI sonkha ta
 * CHIROKAL er jonno bethik hoye jeto.
 *
 * Nije chokhe dekhechi: admin er tab e "অপেক্ষমাণ ১১", othocho
 * kiu te job chilo EKTA.
 *
 * Stats lagle SOTTI gone dekhben (`count()` query) - alada
 * counter doc rakhben na. Kono kaje ashe na emon lekha,
 * protibar takar bill soho.
 *
 * `count()` ke "dami ar dhire" bola chilo - ota BHUL. 1000
 * document er jonno 1 ta read er dam, ar puro doc pore na.
 */
