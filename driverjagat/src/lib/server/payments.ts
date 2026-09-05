import 'server-only';

/**
 * Taka newar asol kaj.
 *
 * Ei file ta puro projekter shobcheye SHONKATAPONNO jayga.
 * Ekhane bhul mane manuser taka. Tai protita niyom niche likhe
 * rakha holo.
 *
 * TINTA NIYOM, KOKHONO BHANGA JABE NA:
 *
 *   1. Toka r poriman SERVER e hisheb hoy. Client ja pathay ta
 *      dekha-i hoy na.
 *
 *   2. "Taka esechhe" kotha ta PROVIDER ke jiggesh kore jana hoy.
 *      Callback e ja lekha ta ingit, proman na.
 *
 *   3. Taka pawa ar tar FOL (job prokash howa) EK
 *      transaction e. Duita alada hole majhkhane crash korle
 *      manush taka diye kichhu peten na.
 *
 * MarriageJagat theke ekta BORO parthokko: okhane payment er
 * fol user er EKTA biodata er upor porto. Ekhane ek malik er
 * EKADHIK job - tai payment nothi te `jobId` thake, ar
 * fol ta OI job er upor i pore. Meyad (validUntil) o
 * job er gaye boshe, account er gaye na.
 */

import { FieldValue, Timestamp, type Transaction } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { activeProvider, manualProvider, providerById } from '@/lib/payments';
import { writeLog } from './activity-log';
import type { Session } from './session';
import { taka } from '@/lib/format';
import {
  EMPLOYER_STATUS,
  JOB_CLOSED_STATE,
  JOB_STAGE,
  PAYMENT_KIND,
  PAYMENT_STATUS,
  type PaymentKind,
  type PaymentStatus,
} from '@/types/enums';
import { FEES, JOB, MANUAL_PAYMENT, PAYMENT_DEAD_AFTER_DAYS } from '@/config/business';

export interface PaymentDoc {
  id: string;
  userId: string;
  /** Kon kajer fee - job_fee o renewal e LAGBE I */
  jobId?: string | null;
  kind: PaymentKind;
  amount: number;
  status: PaymentStatus;
  providerId: string;
  providerRef?: string;
  createdAt?: FirebaseFirestore.Timestamp;
  paidAt?: FirebaseFirestore.Timestamp;
  /** Admin haate haate pawa taka bosale - ke bosalen */
  settledBy?: string;
  note?: string;
  /**
   * MALIK ER CHOKH LAGBE.
   *
   * Niyom #4 bole "note likhe malik er hate charo". Kintu note
   * ta nothi r bhitore poRe thakle malik er hate kichhu i jay
   * na - kono pata te oi note ta uthto na. Ei ghor ta i oi
   * "hat": `true` hole nothi ta /admin/payments er "দেখা দরকার"
   * sari te othe. Malik dekhe, kaj kore, tarpor namiye den.
   */
  needsOwner?: boolean;
}

const paymentsCol = () => adminDb().collection('payments');
const userRef = (uid: string) => adminDb().collection('users').doc(uid);

/* ══════════════════════════════════════════════════════════════
   1 · KOTO TAKA - server er hisheb
   ══════════════════════════════════════════════════════════════ */

/**
 * Ei function ta CHARA r kothao takar onko basano jabe na.
 *
 * Client theke `amount` newa mane - keu browser er javascript
 * bodle `amount: 1` pathiye ek taka diye publish kore nito.
 * Tai amount SUDHU ekhane, sudhu `kind` dekhe.
 */
export function amountFor(kind: PaymentKind): number {
  switch (kind) {
    case PAYMENT_KIND.job_fee:
      return FEES.jobFee;
    case PAYMENT_KIND.connection_fee:
      return FEES.connectionFee;
    case PAYMENT_KIND.renewal:
      /* Nobayon ekhon job er soman - alada hole ekhane bodlabe */
      return FEES.jobFee;
    default:
      return FEES.jobFee;
  }
}

/**
 * NIYOM #4 - provider ja bollo, ta amader hisheber sathe mile?
 *
 * ALADA, PURE function kore rakha hoyeche icchakrito: ei niyom
 * ta Firestore chara i porikkha kora jay (`npm run check:money`).
 * Niyom ta settlePayment er bhitore lukiye thakle porikkha korte
 * hole puro emulator, payment doc, nokol gateway lagto - ar
 * setai karone TutorJagat e ei niyom ta bochor dhore
 * na-porikkhito chilo.
 */
export type AmountVerdict = { ok: true } | { ok: false; note: string; message: string };

export function checkAmount(reported: number, required: number): AmountVerdict {
  /**
   * ONKO OJANA HOLE ATKAY - ei ta age FAK chilo.
   *
   * Age lekha chilo `reported > 0 && reported < required`. Mane
   * provider `amount: 0` ba kichhu i na pathale oi shorto ta
   * MITHYA hoto, ar payment ta CHUPCHAP pass kore jeto - onko
   * ekbar o milano hoto na. Gateway er uttor er gathon bodlale
   * (`amount` er jaygay `total`) protita payment jachai chara
   * publish hoye jeto.
   */
  if (!Number.isFinite(reported) || reported <= 0) {
    return {
      ok: false,
      note: `টাকার পরিমাণ জানা যায়নি - গেটওয়েতে মিলিয়ে দেখুন (দরকার ${required})`,
      message: 'টাকা যাচাই করা যায়নি - আমাদের জানান',
    };
  }

  if (reported < required) {
    return {
      ok: false,
      note: `কম টাকা এসেছে - ${reported}, দরকার ${required}`,
      message: 'পুরো টাকা আসেনি - আমাদের জানান',
    };
  }

  return { ok: true };
}

/** Job er meyad - aj theke JOB.validDays din (D-005: 60) */
function jobValidUntil(): Timestamp {
  return Timestamp.fromMillis(Date.now() + JOB.validDays * 24 * 60 * 60 * 1000);
}

/**
 * Ei manuser ekhono ekta CHOLTI (pending) payment ache kina.
 *
 * ⚠️ Boyosh-shima ta EI FUNCTION ER MUL KOTHA, ekta bonus na.
 * Shima chhara ek bar chhere deya checkout manush ke CHIROKAL
 * atke deye (§৪ক).
 *
 * Purono `(userId, createdAt)` index tai kaje lagano hoy -
 * status ar boyosh ekhane meye dekha hoy, tai notun index lage
 * na.
 */
async function hasInFlightPayment(userId: string, jobId?: string): Promise<boolean> {
  const cutoff = Date.now() - PAYMENT_DEAD_AFTER_DAYS * 24 * 3600_000;

  const snap = await paymentsCol()
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  return snap.docs.some((d) => {
    if (d.get('status') !== PAYMENT_STATUS.pending) return false;
    const at = d.get('createdAt')?.toMillis?.() ?? 0;
    if (at < cutoff) return false;
    /* Alada job er fee alada kaj - ekta atke thakle onno ta
       bondho kore deya thik na */
    const otherJob = (d.get('jobId') as string | null) ?? null;
    return otherJob === (jobId ?? null);
  });
}

/* ══════════════════════════════════════════════════════════════
   2 · TAKA NEWA SHURU
   ══════════════════════════════════════════════════════════════ */

export type StartPaymentResult =
  | { ok: true; paymentId: string; redirectUrl: string }
  | { ok: false; message: string };

export async function startPayment(opts: {
  userId: string;
  name: string;
  phone: string;
  email?: string;
  kind: PaymentKind;
  /** job_fee / renewal hole kon kajer jonno */
  jobId?: string;
  siteUrl: string;
}): Promise<StartPaymentResult> {
  /* Kon kajer fee ta na janle fol ghotano jabe na - tai
     job-somporkito kind e jobId chhara SHURU I hoy na */
  if (
    (opts.kind === PAYMENT_KIND.job_fee || opts.kind === PAYMENT_KIND.renewal) &&
    !opts.jobId
  ) {
    return { ok: false, message: 'কোন কাজের ফি তা জানা যায়নি - আবার চেষ্টা করুন' };
  }

  /**
   * ⚠️ EK I MANUSER DUITA CHOLTI PAYMENT THAKTE PARE NA.
   *
   * Ei ta sudhu porichchhonnota na - niyom ১১ er sathe jora
   * (docs/PAYMENTS-MULTISITE.md §১ dhap ৪). Gateway melay
   * **pathanor number + takar onko** diye. Ek i manush ek i
   * onko r duita opekkhoman session banale duitar chabi HUBUHU
   * ek hoye jay - gateway kon ta melabe janto na.
   *
   * ⚠️ Ar BOYOSH-SHIMA ta ei niyom er PRAN (§৪ক). Shima chhara
   * likhle: manush "taka din" chapen, checkout pata khole, taka
   * NA DIYE bondho koren - nothi ta chirokal `pending` e thake,
   * ar tini KONO DIN ar taka dite parten na. Ei bug ta emon je
   * malik o bujhten na keno manush taka dicchen na.
   *
   * `PAYMENT_DEAD_AFTER_DAYS` er purono nothi ke amra "chholti"
   * dhori na - jhaṛu (runPaymentSweep) oi gulo ke emniteo
   * `failed` kore dey.
   */
  const inFlight = await hasInFlightPayment(opts.userId, opts.jobId);
  if (inFlight) {
    return {
      ok: false,
      message: 'একটি লেনদেন এখনো চলছে - কয়েক মিনিট পর আবার দেখুন',
    };
  }

  const amount = amountFor(opts.kind);
  const provider = activeProvider();

  /**
   * Nothi ta taka chawar AGE toiri hoy.
   *
   * Ulto korle: manush taka diye dilen, tarpor amader database
   * e likhte giye net gelo - tokhon tader taka gechhe, othocho
   * amader kachhe oi payment er kono chinho nai. Ferot dewar
   * jonno khuje-o pawa jeto na.
   */
  const ref = paymentsCol().doc();
  await ref.set({
    userId: opts.userId,
    jobId: opts.jobId ?? null,
    kind: opts.kind,
    amount,
    status: PAYMENT_STATUS.initiated,
    providerId: provider.id,
    createdAt: FieldValue.serverTimestamp(),
  });

  const started = await provider.start({
    paymentId: ref.id,
    amount,
    kind: opts.kind,
    userId: opts.userId,
    customerName: opts.name,
    customerPhone: opts.phone,
    customerEmail: opts.email,
    returnUrl: `${opts.siteUrl}/payment/done?id=${ref.id}`,
    cancelUrl: `${opts.siteUrl}/payment?cancelled=1`,
  });

  if (!started.ok) {
    await ref.update({ status: PAYMENT_STATUS.failed, note: started.message });
    return { ok: false, message: started.message };
  }

  await ref.update({
    status: PAYMENT_STATUS.pending,
    ...(started.providerRef ? { providerRef: started.providerRef } : {}),
  });

  return { ok: true, paymentId: ref.id, redirectUrl: started.redirectUrl };
}

/* ══════════════════════════════════════════════════════════════
   3 · TAKA ESECHHE KINA - ar tar FOL
   ══════════════════════════════════════════════════════════════ */

export type SettleResult =
  | { ok: true; alreadyDone: boolean; paid: boolean }
  | { ok: false; message: string };

/**
 * Callback ba return page theke daka hoy.
 *
 * EI FUNCTION TA EKADHIKBAR DAKA HOBE - ar seta thik ache.
 * Gateway callback pathay, abar manush o return URL e fere.
 * Tai ei ta idempotent - fol ekbar i ghote.
 */
export async function settlePayment(
  paymentId: string,
  payload: Record<string, unknown> = {},
): Promise<SettleResult> {
  const ref = paymentsCol().doc(paymentId);
  const snap = await ref.get();

  if (!snap.exists) return { ok: false, message: 'পেমেন্ট পাওয়া যায়নি' };
  const doc = { id: snap.id, ...snap.data() } as PaymentDoc;

  /* Age i sesh - abar kichhu korar nai */
  if (doc.status === PAYMENT_STATUS.success) {
    return { ok: true, alreadyDone: true, paid: true };
  }

  /**
   * Provider ke NIJERA jiggesh kori.
   * `payload` ta sudhu ingit - "ei payment ta dekho" bolar jonno.
   */
  const provider = providerById(doc.providerId);
  const result = await provider.verify(
    { paymentId, providerRef: doc.providerRef },
    payload,
  );

  if (!result.ok) return { ok: false, message: result.message };

  if (!result.paid) {
    return { ok: true, alreadyDone: false, paid: false };
  }

  /**
   * POROMAN TA MILIYE DEKHI (niyom #4).
   *
   * Provider bollo taka esechhe - kintu KOTO? Onko na milie
   * fol ghotano JABE NA. Ei milano ta na thakle keu gateway er
   * pata te giye onko bodle 1 taka diye 100 takar kaj kore nito.
   *
   * Niyom ta `checkAmount()` e - alada, pure, porikkha kora jay.
   */
  const verdict = checkAmount(result.amount, doc.amount);
  if (!verdict.ok) {
    /* Taka r nothi ta THAKE, note soho - malik nijer gateway er
       pata te dekhe siddhanto neben. Fol ghote na. */
    await ref.update({
      status: PAYMENT_STATUS.failed,
      note: verdict.note,
      providerRef: result.providerRef,
      /* Note lekha SUDHU adhek kaj - malik ta DEKHBEN kothay?
         Ei flag ta chara nothi ta chupchap `failed` hoye poRe
         thakto, ar manuser taka gateway e boshe thakto. */
      needsOwner: true,
    });
    return { ok: false, message: verdict.message };
  }

  await applyPaidEffect(doc, result.providerRef);
  return { ok: true, alreadyDone: false, paid: true };
}

/**
 * Taka pawa lekha, ar tar FOL ghotano - EK transaction e.
 *
 * Duita alada korle: taka "success" likhlam, tarpor basha
 * publish korte giye crash - database e taka esechhe lekha,
 * kintu malik kichhu pan ni, ar bojhar upay o nai.
 */
async function applyPaidEffect(doc: PaymentDoc, providerRef: string): Promise<void> {
  await adminDb().runTransaction(async (tx: Transaction) => {
    const payRef = paymentsCol().doc(doc.id);
    const fresh = await tx.get(payRef);

    /* Transaction er BHITORE abar dekhi - ei faka somoy er
       moddhe onno ekta callback kaj ta kore fela thakte pare */
    if (fresh.get('status') === PAYMENT_STATUS.success) return;

    const user = userRef(doc.userId);
    const userSnap = await tx.get(user);

    /**
     * Job TA O ei transaction e i porte hoy - Firestore
     * transaction e SOB read lekha-r AGE korte hobe. Pore porle
     * puro transaction i bhеnge jeto.
     */
    const jobId = doc.jobId ?? null;
    const jobRef = jobId
      ? adminDb().collection('jobs').doc(jobId)
      : null;
    const jobSnap = jobRef ? await tx.get(jobRef) : null;

    tx.update(payRef, {
      status: PAYMENT_STATUS.success,
      providerRef,
      paidAt: FieldValue.serverTimestamp(),
    });

    /**
     * Bariwalar nothi ta ache to?
     *
     * Na thakle `tx.update(user, ...)` commit er somoy NOT_FOUND
     * diye puro transaction ULTIYE dey - takar nothi o "success"
     * hoy na, gateway bar bar callback pathay ar protibar bhange.
     * Tai taka LEKHA hoy, ar ekta note boshe jate malik ferot
     * dite paren.
     */
    if (!userSnap.exists) {
      tx.update(payRef, { note: 'মালিকের নথি নেই - ফেরত দিতে হবে', needsOwner: true });
      return;
    }

    const status = userSnap.get('employerStatus') as string | undefined;

    /**
     * Ban howa keu taka dile tar job prokash kora HOY NA.
     * Taka ta lekha thake (ferot dite nothi lagbe), fol ghote na.
     */
    if (status === EMPLOYER_STATUS.banned) {
      tx.update(payRef, { note: 'নিষিদ্ধ অ্যাকাউন্ট - ফেরত দিতে হবে', needsOwner: true });
      return;
    }

    if (doc.kind === PAYMENT_KIND.job_fee) {
      /**
       * TAKA + ADMIN APPROVE = PROKASH. Duita i ei
       * transaction er shorto - admin er `approvedAt` na
       * thakle taka esheo job pending e i thake.
       *
       * Ei ta i "payment o tar fol EK transaction e" niyom -
       * ekhane fol ta HOLO job feed e utha. Alada korle
       * taka asha ar prokash er majhkhane crash hole malik
       * taka diyeo adrisho theke jeten.
       */
      if (
        jobRef &&
        jobSnap?.exists &&
        jobSnap.get('stage') === JOB_STAGE.pending &&
        jobSnap.get('approvedAt')
      ) {
        tx.update(jobRef, {
          stage: JOB_STAGE.published,
          publishedAt: FieldValue.serverTimestamp(),
          /* Meyad JOB er gaye - account er gaye na.
             Ek malik er 3 ta job 3 din e chalu hole 3 ta
             আলাদা meyad cholbe. */
          validUntil: jobValidUntil(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        tx.update(user, {
          employerStatus: EMPLOYER_STATUS.verified,
          verifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        tx.update(payRef, {
          note: 'অনুমোদনের আগে টাকা এসেছে - অ্যাডমিন দেখবেন',
          needsOwner: true,
        });
      }
      return;
    }

    if (doc.kind === PAYMENT_KIND.renewal) {
      /* Nobayon: meyad bare, ar meyad-shesh job abar feed e othe.
         approvedAt chhara kokhono na - admin er chokh eriye
         nobayon diye o publish howa jabe na. */
      if (jobRef && jobSnap?.exists && jobSnap.get('approvedAt')) {
        const stage = String(jobSnap.get('stage'));
        tx.update(jobRef, {
          validUntil: jobValidUntil(),
          renewedAt: FieldValue.serverTimestamp(),
          ...(stage === JOB_CLOSED_STATE.expired
            ? { stage: JOB_STAGE.published, publishedAt: FieldValue.serverTimestamp() }
            : {}),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      return;
    }

    /**
     * connection_fee er FOL ekhane GHOTE NA - icchakrito.
     *
     * Number-thikana binimoy ekta MANUSHER kaj: admin dui pokkher
     * sathe kotha bole tarpor number den (matching desk, Phase 4).
     * Taka automatically number khule dile admin majhkhane
     * theke sore jeten - ar seta amader mul wada bhanga.
     * Ekhane sudhu taka ta "success" hoy; admin dekhe egoben.
     */
  });
}

/**
 * TAKA AGE ESECHHE, APPROVE PORE - tokhon prokash ta ke kore?
 *
 * "Taka + approve = prokash" - duita shorto. `applyPaidEffect`
 * ta dekhe SUDHU takar dik theke: taka elo, approve ache to?
 * na thakle note likhe theme jay. Kintu ulto dik ta keu dekhto
 * na - admin pore approve korle oi note ta poRe i thakto, job
 * chirokal pending, ar manuser taka amader kachhe.
 *
 * Tai approve howar por O ekbar dekha hoy: ei job er fee ki
 * age i deya hoye geche? Hole EKHANE prokash hoy - oi ek i
 * transaction er niyome (niyom #5), ar nothi ta malik er sari
 * theke o neme jay.
 *
 * Ei function ta i ek matro jayga jekhane payment.ts job er
 * stage bodlay applyPaidEffect er baire - dutoi "taka r fol",
 * tai duitai ei file e.
 */
export async function publishIfAlreadyPaid(jobId: string): Promise<boolean> {
  return adminDb().runTransaction(async (tx: Transaction) => {
    const jobRef = adminDb().collection('jobs').doc(jobId);
    const jobSnap = await tx.get(jobRef);

    if (!jobSnap.exists) return false;
    if (jobSnap.get('stage') !== JOB_STAGE.pending) return false;
    /* Approve na hole ekhane kichhu i na - ei ta i to shorto */
    if (!jobSnap.get('approvedAt')) return false;

    /* Firestore transaction: SOB pora lekha-r AGE */
    const paidSnap = await tx.get(
      paymentsCol()
        .where('jobId', '==', jobId)
        .where('status', '==', PAYMENT_STATUS.success)
        .limit(10),
    );
    const fee = paidSnap.docs.find((d) => d.get('kind') === PAYMENT_KIND.job_fee);
    if (!fee) return false;

    const user = userRef(String(jobSnap.get('createdBy')));
    const userSnap = await tx.get(user);
    if (!userSnap.exists) return false;
    if (userSnap.get('employerStatus') === EMPLOYER_STATUS.banned) return false;

    tx.update(jobRef, {
      stage: JOB_STAGE.published,
      publishedAt: FieldValue.serverTimestamp(),
      validUntil: jobValidUntil(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.update(user, {
      employerStatus: EMPLOYER_STATUS.verified,
      verifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.update(fee.ref, {
      needsOwner: false,
      note: 'অনুমোদনের পর প্রকাশ হয়েছে',
    });

    return true;
  });
}

/* ══════════════════════════════════════════════════════════════
   4 · HAATE HAATE PAWA TAKA
   ══════════════════════════════════════════════════════════════ */

/**
 * Admin nijer bKash e taka peye ei ta chapen.
 *
 * Ei ta ALADA rasta, ar seta icchakrito. `manual` provider
 * er `verify` kokhono `paid: true` bole na - nahole je keu
 * callback URL e hit kore publish koriye nito.
 * Ekhane manush er siddhanto lage, ar seta audit log e jay.
 */
export async function markManuallyPaid(
  actor: Session,
  paymentId: string,
  note: string,
): Promise<SettleResult> {
  /**
   * NOTE BADDHOTAMULOK, ar 4 oksor er kom hole NA (niyom #9).
   *
   * Ekhane kono gateway er proman nai - sudhu ekjon manuser
   * kotha. Pore hisheb na mille ei note ta i EKMATRO suto:
   * bKash er TrxID ba je number theke taka esechhe. Faka ba
   * "ok" jatiyo note oi suto ta kete dey.
   *
   * Action e o dekha hoy, ekhane O dekha hoy - action URL
   * sorasori POST kora jay, tai server er niyom server e i.
   */
  const clean = note.trim();
  if (clean.length < MANUAL_PAYMENT.noteMinChars) {
    return { ok: false, message: 'bKash এর লেনদেন নম্বর বা যে নম্বর থেকে টাকা এসেছে লিখুন' };
  }

  const ref = paymentsCol().doc(paymentId);
  const snap = await ref.get();

  if (!snap.exists) return { ok: false, message: 'পেমেন্ট পাওয়া যায়নি' };

  const doc = { id: snap.id, ...snap.data() } as PaymentDoc;
  if (doc.status === PAYMENT_STATUS.success) {
    return { ok: true, alreadyDone: true, paid: true };
  }

  await ref.update({ settledBy: actor.uid, note: clean });
  await applyPaidEffect(doc, `manual:${actor.uid}`);

  /**
   * AUDIT LOG - ei kaj ta ALADA kore lekha hoy (niyom #9).
   *
   * Baki sob payment e gateway er proman thake. Ei ekta rastay
   * nai - ekjon manush "peyechi" bolechen, ar tate ekjon
   * malik verified hoye gechen. Hisheb na mille ei line ta i
   * bole dey KE bolechilen, KOKHON, ar KON TrxID dekhe.
   */
  await writeLog(actor, {
    action: 'payment.manual_settle',
    targetId: paymentId,
    changes: { status: [doc.status, PAYMENT_STATUS.success] },
    note: `${taka(doc.amount)} · ${clean}`,
  });

  return { ok: true, alreadyDone: false, paid: true };
}

/* ══════════════════════════════════════════════════════════════
   5 · DEKHA
   ══════════════════════════════════════════════════════════════ */

export async function getPayment(id: string): Promise<PaymentDoc | null> {
  const snap = await paymentsCol().doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as PaymentDoc) : null;
}

/** Ekjon manuser sob taka - nijer pata te dekhben */
export async function getPaymentsFor(userId: string): Promise<PaymentDoc[]> {
  const snap = await paymentsCol()
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentDoc);
}

/**
 * Malik er sari - HAATE HAATE takar opekkha.
 *
 * `providerId` ta o dekha HOY - sudhu `status: pending` na.
 *
 * Gateway diye dite giye manush majh pothe chole gele oi nothi o
 * chirokal `pending` e thake. Sudhu status dekhle oigulo O ei
 * sari te uthe asto - ar malik ekta ONLINE payment ke bKash er
 * bhebe chap diye diten. (TutorJagat e ei fak ta dhora porechilo.)
 */
export async function getPendingPayments(): Promise<PaymentDoc[]> {
  const snap = await paymentsCol()
    .where('status', '==', PAYMENT_STATUS.pending)
    .where('providerId', '==', manualProvider.id)
    .orderBy('createdAt', 'asc')
    .limit(50)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentDoc);
}

/**
 * MALIK ER DEKHA DORKAR - je taka gulo atke geche.
 *
 * Ei sari ta na thakle niyom #4 er sesh ordhek ta faka thakto.
 * Niyom ta bole: onko na mille "note likhe MALIK ER HATE charo".
 * Note lekha hoto - kintu kono pata te uthto na, tai malik er
 * hate kichhu i jeto na. Chartita rasta ekhane eshe pore:
 *
 *   • onko ojana ba kom (settlePayment)
 *   • malik er nothi nai - ferot dite hobe
 *   • nishiddho account - ferot dite hobe
 *   • approve er AGE taka eshe geche - job ekhono pending
 *
 * Sob koyta te manuser taka amader kachhe, ar tar bodole se
 * kichhu pay ni. Tai ei sari ta khali thaka i sabhabik - kichhu
 * thakle seta AJ i dekhte hobe.
 */
export async function getPaymentsNeedingAttention(): Promise<PaymentDoc[]> {
  const snap = await paymentsCol()
    .where('needsOwner', '==', true)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentDoc);
}

/* ══════════════════════════════════════════════════════════════
   6 · SARI THEKE NAMANO - "dekhechi, kaj koreichi"
   ══════════════════════════════════════════════════════════════ */

/**
 * Malik kaj ta kore fele nothi ta sari theke namachhen.
 *
 * Ei ta takar obostha (`status`) bodlay NA - sudhu "ei ta ar
 * amar dekhar bakite nai" bole. Ferot deya, gateway e miliye
 * dekha, ba job ta হাতে prokash kora - oi asol kaj gulo ei
 * botam er BAIRE. Tai note ta baddhotamulok: chhoy mash pore
 * "ei 500 taka r ki holo" prosno er uttor ekhane i thakbe.
 */
export async function clearPaymentAttention(
  actor: Session,
  paymentId: string,
  note: string,
): Promise<SettleResult> {
  const clean = note.trim();
  if (clean.length < MANUAL_PAYMENT.noteMinChars) {
    return { ok: false, message: 'কী করলেন সেটা লিখুন (ফেরত দিলাম / মিলিয়ে দেখলাম)' };
  }

  const ref = paymentsCol().doc(paymentId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, message: 'পেমেন্ট পাওয়া যায়নি' };

  const doc = { id: snap.id, ...snap.data() } as PaymentDoc;
  if (!doc.needsOwner) return { ok: true, alreadyDone: true, paid: false };

  /* Purono note ta MOCHA HOY NA - keno atkechilo seta i
     asol kotha. Notun kotha tar pore joRa lage. */
  await ref.update({
    needsOwner: false,
    note: `${doc.note ?? ''} → ${clean}`.trim(),
    settledBy: actor.uid,
  });

  await writeLog(actor, {
    action: 'payment.attention_cleared',
    targetId: paymentId,
    note: `${taka(doc.amount)} · ${doc.note ?? ''} → ${clean}`,
  });

  return { ok: true, alreadyDone: false, paid: false };
}
