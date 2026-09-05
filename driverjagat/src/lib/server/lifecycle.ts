import 'server-only';

/**
 * Rojkar jhaṛu - ja keu na dekhle nijei theme jeto.
 *
 * Ekhon ekta i kaj ache: ATKE THAKA GATEWAY PAYMENT (§৫).
 * Job er meyad, reminder SMS - oi gulo pore ekhane i boshbe.
 *
 * Utso: docs/PAYMENTS-MULTISITE.md (TutorJagat, commit 25a8338)
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { manualProvider } from '@/lib/payments';
import { PAYMENT_STATUS } from '@/types/enums';
import {
  PAYMENT_SWEEP_MAX_AGE_MS,
  PAYMENT_SWEEP_MIN_AGE_MS,
  shouldExpirePending,
} from '@/config/business';
import { settlePayment } from './payments';

export interface PaymentSweepReport {
  /** Koto ta ke abar jiggesh korlam */
  checked: number;
  /** Tar moddhe koto ta sotti taka pawa gelo (webhook miss hoyechilo) */
  recovered: number;
  /**
   * ⚠️ 24 ghontar por o jachai hoy nai - EI TA I ROG NIRNOY.
   *
   * 0 chhara kichhu mane kichhu ekta bhanga: phone bondho, app
   * ghumacche, gateway pore gechhe, ba SIM e network nai.
   */
  stuckOver24h: number;
  /** Gateway "taka ashe nai" bolar por 3 din - abar cheshtar poth khule dey */
  expired: number;
}

const DAY_MS = 24 * 3600_000;

/**
 * ⚠️ EI TA NA THAKLE MANUSER TAKA HARIYE JETO.
 *
 * Gateway er jachai ta malik er phone e bosa ekta SMS-pora app
 * er upor dara. Oi phone BONDHO thakle ba network na thakle
 * taka eshe o "pending" e boshe thake. Phone fire ele tara
 * webhook pathay - kintu oi EK BAR er webhook ta miss hole
 * (amader site tokhon rebuild hocche, ba net gechilo) payment
 * ta CHIROKAL pending e boshe thakto.
 *
 * Aro boro kotha: gateway er portal e Webhook URL er ghor EKTA
 * i. Mane ek account e 5 ta site cholle SUDHU ekta site webhook
 * pay - bakider taka eshe o khobor ta pouchhay na. Tader jonno
 * ei jhaṛu tai EKMATRO bhorosa (§৪গ).
 *
 * Tokhon obostha ta emon hoto: malik taka diyechen, amader
 * bKash e taka dhukechhe, othocho tar post prokash hoy nai - ar
 * thik korar KONO poth chhilo na, karon admin er sari te
 * ICCHAKRITOBHABE sudhu haate haate takar payment dekhano hoy
 * (niyom ১০ - noyle malik bhul kore emon karo ke verified kore
 * diten jini ek poisa o den nai).
 *
 * ⚠️ Ei ta kono "bishwas kore paid kore deya" NA. `settlePayment`
 * nijei gateway ke jiggesh kore, onko miliye dekhe, ar
 * idempotent. Tai ei poth diye bhua kichhu dhukte pare na -
 * sudhu ja SOTTI verified hoye gechhe othocho khobor ta amader
 * kachhe pouchhay nai, sei gulo i uddhar hoy.
 */
export async function runPaymentSweep(now = Date.now()): Promise<PaymentSweepReport> {
  /**
   * ⚠️ Index LAGE: `payments (status ASC, createdAt ASC)`.
   *
   * Age theke thaka `(status, providerId, createdAt)` ei kaje
   * lage NA - okhane providerId majhkhane bosa.
   */
  const snap = await adminDb()
    .collection('payments')
    .where('status', '==', PAYMENT_STATUS.pending)
    .orderBy('createdAt', 'asc')
    .limit(100)
    .get();

  let checked = 0;
  let recovered = 0;
  let stuckOver24h = 0;
  let expired = 0;

  for (const doc of snap.docs) {
    /* Haate haate takar ta malik nijer bKash dekhe chapen - ekhane na */
    if (doc.get('providerId') === manualProvider.id) continue;

    const age = now - (doc.get('createdAt')?.toMillis?.() ?? 0);
    if (age < PAYMENT_SWEEP_MIN_AGE_MS || age > PAYMENT_SWEEP_MAX_AGE_MS) continue;

    checked++;
    /* ⚠️ Ekta te net gele baki gulo jate na atke jay */
    const res = await settlePayment(doc.id).catch(() => null);
    if (res?.ok && res.paid) {
      recovered++;
      continue;
    }

    /**
     * ⚠️ MEYAD SESH - abar cheshta korar poth khule deya (§৪ক).
     *
     * Sob cheye sadharon ghotona: manush "taka din" chapen,
     * checkout pata khole, tarpor taka NA DIYE i bondho koren.
     * Nothi ta `pending` e roye jay, ar porer bar cheshta korle
     * "একটি লেনদেন এখনো চলছে" bole atke jay. CHIROKAL.
     *
     * ⚠️ SUDHU tokhon i meyad sesh kori jokhon gateway NIJE
     * uttor diye bolechhe "taka ashe nai". Gateway pore thakle
     * ba net gele kichhu i kori na - noyle tara 3 din down
     * thakle SOB payment ke mithya "failed" bole ditam.
     *
     * ⚠️ `failed` CHURANTO NA. Taka pore sotti jachai hole
     * `settlePayment` tokhono kaj kore - se sudhu `success` ke
     * agei-sesh dhore, `failed` ke na.
     */
    if (shouldExpirePending(Boolean(res?.ok), res?.ok === true && res.paid, age / DAY_MS)) {
      await doc.ref.update({
        status: PAYMENT_STATUS.failed,
        note: 'টাকা আসেনি - সময় শেষ, আবার চেষ্টা করা যাবে',
        expiredAt: FieldValue.serverTimestamp(),
      });
      expired++;
      continue;
    }

    /**
     * ⚠️ EI SONKHYA TA I ROG NIRNOY.
     *
     * Alada kore "gateway ki jibito?" ba "SMS app ta ki chalu?"
     * jiggesh kori NA - prothom ta rojh gateway er khatay bhua
     * invoice jomato, ar dwitiyo ta mithya ashwosto korto (app
     * chalu ache kintu battery saving take ghum pariye rekhechhe -
     * poriksha ta tao "chalu" i bolto).
     *
     * Ei EK sonkhya SOB rog dhore: phone bondho, app ghumacche,
     * gateway pore gechhe, SIM e network nai. 0 mane sob thik.
     */
    if (age > DAY_MS) stuckOver24h++;
  }

  return { checked, recovered, stuckOver24h, expired };
}
