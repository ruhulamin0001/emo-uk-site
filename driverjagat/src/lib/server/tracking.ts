import 'server-only';

/**
 * Malik nijer post er obostha dekhen - login chara.
 *
 * SUDHU CODE DIYE KICHHU DEKHA JAY NA - phone o lage.
 *
 * Tracking code kramanusare toiri hoy: DJ-HD-00001, 00002...
 * Keu gone gone cheshta korle SOB post er obostha dekhe
 * felte parto. Phone ta code er moto anuman kora jay na - ei
 * mil ta i asol pahara (rate limit sudhu subidha-stor).
 *
 * leadCount ekhane o NAI - malik koyjon agrohi ta tracking
 * page diyeo jante paren na (supply-map gopon).
 */

import { adminDb } from '@/lib/firebase/admin';
import { normalizeBdPhone } from '@/lib/validators/primitives';
import { JOB_STAGE, type JobStatus } from '@/types/enums';

export interface TrackView {
  trackingCode: string;
  stage: JobStatus;
  createdAt: number;
  /**
   * SUDHU completed hole - je driver niyog holo tar nam-number.
   * Onno karo kichhu ekhane KOKHONO ashe na.
   */
  matchedContact: { name: string; phone: string } | null;
}

export type TrackResult =
  | { ok: true; view: TrackView }
  | { ok: false; message: string };

export async function lookupTracking(code: string, phone: string): Promise<TrackResult> {
  const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
  const cleanPhone = normalizeBdPhone(phone);

  /**
   * Code bhul, phone bhul, ba duitai - SOB khetre EK I barta.
   * Alada barta dile keu bujhto "code thik, phone bhul" - ar
   * code ta niye onno kaje lagato.
   */
  const SAME = 'কোড বা নম্বর মিলছে না। আবার দেখে দিন।';

  if (!cleanCode || !cleanPhone) return { ok: false, message: SAME };

  const snap = await adminDb()
    .collection('jobs')
    .where('trackingCode', '==', cleanCode)
    .limit(1)
    .get();

  if (snap.empty) return { ok: false, message: SAME };

  const doc = snap.docs[0];
  const priv = await doc.ref.collection('private').doc('contact').get();

  /* Phone EK ROKOM kore rakha bole ei mil kaj kore -
     "01712..." ar "+88017..." alada joma hole malik nijer
     number diyeo dekhte parten na */
  if (priv.get('phone') !== cleanPhone && priv.get('altPhone') !== cleanPhone) {
    return { ok: false, message: SAME };
  }

  return {
    ok: true,
    view: {
      trackingCode: cleanCode,
      stage: String(doc.get('stage') ?? '') as JobStatus,
      createdAt: doc.get('createdAt')?.toMillis?.() ?? 0,
      matchedContact: await matchedContactFor(doc),
    },
  };
}

/**
 * Sudhu `completed` obosthay. Number binimoy admin phone e i
 * koren (matching desk) - ei ta sudhu pore dekhbar nothi.
 * Admin match action e jobs/{id}/private/match doc e driver er
 * nam-number likhe rakhen.
 */
async function matchedContactFor(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<{ name: string; phone: string } | null> {
  if (doc.get('stage') !== JOB_STAGE.completed) return null;

  const match = await doc.ref.collection('private').doc('match').get();
  if (!match.exists) return null;

  const name = match.get('driverName') as string | undefined;
  const phone = match.get('driverPhone') as string | undefined;
  if (!name || !phone) return null;

  return { name, phone };
}

/** Manush ke stage onujayi ki bola hobe - lib/tracking-messages.ts e
    (client component o pore, tai server-only file e rakha jay na) */
export { STAGE_MESSAGE } from '@/lib/tracking-messages';
