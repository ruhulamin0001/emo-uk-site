import 'server-only';

/**
 * Rojkar jhaṛu - ja keu na dekhle nijei theme jeto.
 *
 * Tinta kaj:
 *   1. Job er MEYAD sesh (D-005) - `validUntil` par hoye gele feed theke
 *   2. Approve kore taka na dile 7 din e approval ta batil
 *   3. Atke thaka gateway payment (§৫ of PAYMENTS-MULTISITE)
 *
 * ⚠️ 1 ar 2 na thakle ki hoto: `validUntil` LEKHA hoto, kintu keu
 * kono din PORTO na. Mane bhora hoye jaowa "ড্রাইভার চাই" post
 * chirokal feed e boshe thakto - ar Facebook group gulor thik oi
 * ek number rog ta amader ekhane o eshe jeto. Amader ekmatro
 * parthokko i to ei: feed e ja ache ta SOTTI khali.
 *
 * Utso: docs/PAYMENTS-MULTISITE.md (TutorJagat, commit 25a8338)
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { manualProvider } from '@/lib/payments';
import { EMPLOYER_STATUS, JOB_CLOSED_STATE, JOB_STAGE, PAYMENT_STATUS } from '@/types/enums';
import {
  JOB,
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

/* ══════════════════════════════════════════════════════════════
   2 · JOB ER MEYAD SESH (D-005)
   ══════════════════════════════════════════════════════════════ */

/**
 * ⚠️ EI TA NA THAKLE AMADER EKMATRO PARTHOKKO TA I SESH.
 *
 * `validUntil` payment er transaction e boshano hoy - kintu keu
 * oi ghor ta PORTO na. Mane ekta post ekbar prokash hole
 * CHIROKAL feed e thakto: driver phone koren, malik bolen "oi
 * kaj to tin mash age bhore gechhe" - ar dui pokkho i amader
 * upor bhorosa hariye felen.
 *
 * Facebook group gulor ek number rog ta i ei - bhora hoye jaowa
 * post. Amader ekmatro daabi holo feed e ja ache ta SOTTI khali.
 * Ei function ta i oi daabi ta rakhe.
 *
 * ⚠️ SUDHU `published` gulo. `shortlisted` ba `onboarding` mane
 * admin tokhon dui pokkher sathe kotha bolchen - majhkhane
 * meyad sesh kore dile ekta cholti alochona bhenge jeto.
 */
async function expireJobs(now: number): Promise<number> {
  const snap = await adminDb()
    .collection('jobs')
    .where('stage', '==', JOB_STAGE.published)
    .where('validUntil', '<=', Timestamp.fromMillis(now))
    .limit(200)
    .get();

  for (const doc of snap.docs) {
    await doc.ref.update({
      stage: JOB_CLOSED_STATE.expired,
      expiredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return snap.size;
}

/* ══════════════════════════════════════════════════════════════
   3 · APPROVE KORA KINTU TAKA DEY NAI
   ══════════════════════════════════════════════════════════════ */

/**
 * Admin approve korechen, malik taka den ni - 7 din por approval
 * ta batil.
 *
 * ⚠️ Kano lage: ei fak ta bondho na korle "approve kore rakhi,
 * taka pore debo" ekta sthayi obostha hoye jeto - admin er somoy
 * kheye neya hoto, ar hishebe ekta bhoot theke jeto.
 *
 * ⚠️ Job ta MUCHE FELA HOY NA - `pending` e fire jay, `approvedAt`
 * mocha hoy. Malik pore ele admin abar ekbar dekhe onumodon dite
 * paren, suru theke korte hoy na. Tar kagoj, tar jachai - sob
 * thake.
 *
 * ⚠️ `approvedUnpaidReminderDays` (3 din) ekhono babohar hoy NA -
 * SMS er kono poth ei app e nai. Poth ta boshle ei function er
 * bhitore i mone koriye deya boshbe (DECISIONS D-036).
 */
async function expireApprovedUnpaid(now: number): Promise<number> {
  const cutoff = Timestamp.fromMillis(now - JOB.approvedUnpaidExpiryDays * DAY_MS);

  /**
   * ⚠️ `stage: pending` + `approvedAt` purono - EI DUITA I shorto.
   *
   * Sudhu `approvedAt` dekhle prokashito job gulo o ei jaale
   * porto - tara to taka diyei feed e utheche.
   */
  const snap = await adminDb()
    .collection('jobs')
    .where('stage', '==', JOB_STAGE.pending)
    .where('approvedAt', '<=', cutoff)
    .limit(200)
    .get();

  let expired = 0;

  for (const doc of snap.docs) {
    await doc.ref.update({
      approvedAt: null,
      approvedBy: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    expired++;

    /**
     * Malik er obostha ta o firiye ana - kintu SAVDHANE.
     *
     * ⚠️ Tini `verified` hole HAAT DEYA HOY NA. Ek malik er
     * EKADHIK post thakte pare (D-013): ekta r fee bakite meyad
     * sesh holeo tar age deya post gulo to thik i ache. Verified
     * theke namiye dile oi post gulo o mara jeto.
     */
    const uid = String(doc.get('createdBy'));
    const user = adminDb().collection('users').doc(uid);
    const snapUser = await user.get();
    if (snapUser.exists && snapUser.get('employerStatus') === EMPLOYER_STATUS.approved_unpaid) {
      await user.update({
        employerStatus: EMPLOYER_STATUS.under_review,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  return expired;
}

/* ══════════════════════════════════════════════════════════════
   4 · PURO ROJKAR KAJ
   ══════════════════════════════════════════════════════════════ */

export interface LifecycleReport {
  /** Meyad sesh hoye feed theke neme gechhe */
  expiredJobs: number;
  /** Approve chhilo, taka ase ni - approval batil */
  expiredApprovals: number;
  payments: PaymentSweepReport;
}

/**
 * ⚠️ `Date.now()` EKBAR neya hoy, ar sob jaygay oi ta i.
 *
 * Protita hishebe alada kore dakle 200 ta job er majhkhane somoy
 * egiye jeto - ar kono ekta ekdom shimana r upore thakle tar
 * hisheb ek i run e duirokom hoto.
 */
export async function runLifecycle(now = Date.now()): Promise<LifecycleReport> {
  return {
    expiredJobs: await expireJobs(now),
    expiredApprovals: await expireApprovedUnpaid(now),
    payments: await runPaymentSweep(now),
  };
}
