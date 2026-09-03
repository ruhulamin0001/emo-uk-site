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
import {
  EMPLOYER_STATUS,
  JOB_CLOSED_STATE,
  JOB_STAGE,
  PAYMENT_KIND,
  PAYMENT_STATUS,
  type PaymentKind,
  type PaymentStatus,
} from '@/types/enums';
import { FEES, JOB } from '@/config/business';

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

/** Job er meyad - aj theke JOB.validDays din (D-005: 60) */
function jobValidUntil(): Timestamp {
  return Timestamp.fromMillis(Date.now() + JOB.validDays * 24 * 60 * 60 * 1000);
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
   * POROMAN TA MILIYE DEKHI.
   *
   * Provider bollo taka esechhe - kintu KOTO? Kom ele publish
   * kora jabe na. Ei ekta line na thakle keu gateway er pata te
   * giye onko bodle ৳1 diye ৳100 er kaj kore nite parto.
   */
  if (result.amount > 0 && result.amount < doc.amount) {
    await ref.update({
      status: PAYMENT_STATUS.failed,
      note: `কম টাকা এসেছে - ${result.amount}, দরকার ${doc.amount}`,
      providerRef: result.providerRef,
    });
    return { ok: false, message: 'পুরো টাকা আসেনি - আমাদের জানান' };
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
      tx.update(payRef, { note: 'মালিকের নথি নেই - ফেরত দিতে হবে' });
      return;
    }

    const status = userSnap.get('employerStatus') as string | undefined;

    /**
     * Ban howa keu taka dile tar job prokash kora HOY NA.
     * Taka ta lekha thake (ferot dite nothi lagbe), fol ghote na.
     */
    if (status === EMPLOYER_STATUS.banned) {
      tx.update(payRef, { note: 'নিষিদ্ধ অ্যাকাউন্ট - ফেরত দিতে হবে' });
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
  paymentId: string,
  adminUid: string,
  note: string,
): Promise<SettleResult> {
  const ref = paymentsCol().doc(paymentId);
  const snap = await ref.get();

  if (!snap.exists) return { ok: false, message: 'পেমেন্ট পাওয়া যায়নি' };

  const doc = { id: snap.id, ...snap.data() } as PaymentDoc;
  if (doc.status === PAYMENT_STATUS.success) {
    return { ok: true, alreadyDone: true, paid: true };
  }

  await ref.update({ settledBy: adminUid, note });
  await applyPaidEffect(doc, `manual:${adminUid}`);

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
