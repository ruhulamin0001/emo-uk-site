import 'server-only';

/**
 * Job toiri - DUITA doraja r EK I rasta.
 *
 * Kano ek jaygay?
 *
 * Duita doraja diye job ashe:
 *   • Admin panel theke (admin phone e shune likhen)
 *   • Malik nijer haate (/post-job)
 *
 * Duita alada kore likhle ek somoy duita alada niyom hoye jeto.
 * Ar sob theke boro bipod: keu ekta doraja te `stage` ta
 * `published` kore dito - tokhon bhua "ড্রাইভার চাই" post SOJA feed e
 * chole jeto, admin er chokhe na pore. Bhua post thekano i amader
 * asol ponno - ei line ta i sei byabsa.
 *
 * Malik er niyom (TutorJagat theke hubuhu): "user theke asha
 * data KOKHONO auto publish hobe na - admin check howar pore."
 *
 * Ei file er `JOB_STAGE.pending` line ta i sei niyom.
 * Ekta i line, ek i jayga - tai bhola somvob na.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { nextJobSerial } from './counters';
import { makeTrackingCode } from '@/lib/tracking-code';
import { JOB_STAGE } from '@/types/enums';
import type { JobIntake } from '@/lib/validators/job';

export interface CreatedJob {
  id: string;
  trackingCode: string;
}

/** Asia/Dhaka er mash - UTC diye NA */
function dhakaMonth(): number {
  const s = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    month: 'numeric',
  }).format(new Date());
  return Number(s);
}

/**
 * @param by.source  'admin' ba 'employer' - nothi te lekha thake,
 *                   kintu NIYOM bodlay na. Duijon er joma i pending e jay.
 */
export async function createJob(
  d: JobIntake,
  by: { uid: string; source: 'admin' | 'employer' },
  photoPaths: string[] = [],
): Promise<CreatedJob> {
  const serial = await nextJobSerial();
  const trackingCode = makeTrackingCode({
    month: dhakaMonth(),
    divisionId: d.public.divisionId,
    serial,
  });

  const db = adminDb();
  const ref = db.collection('jobs').doc();
  const batch = db.batch();

  /* Oichhik ghor faka thakle zod `undefined` dey, ar Firestore
     `undefined` nite oswikar kore - puro joma i bhenge jeto.
     Tai faka mane `null` - doc e ghor ta thake, mullo nai. */
  const nn = <T extends Record<string, unknown>>(o: T): T =>
    Object.fromEntries(
      Object.entries(o).map(([k, v]) => [k, v === undefined ? null : v]),
    ) as T;
  const pub = nn(d.public as unknown as Record<string, unknown>);
  const priv = nn(d.private as unknown as Record<string, unknown>);

  /* ── Prokashsho ongsho ──
     Ekhane malik er nam, phone, purno thikana, gari r number KOKHONO na.
     `d.public` er type e oi ghor gulo NAI (validators/job.ts) -
     tai spread korleo dhukte pare na. */
  batch.set(ref, {
    trackingCode,
    /**
     * EI LINE TA BODLANO JABE NA.
     *
     * Kono doraja theke i job SOJA feed e jay na. Admin
     * dekhe onumodon na dile kichhu prokashsho hoy na.
     */
    stage: JOB_STAGE.pending,
    flags: [],

    ...pub,

    /**
     * Gari r chobi PROKASHSHO kintu OICHHIK (D-008). Path gulo
     * action e jachai hoye ekhane ashe (nijer folder, amader
     * banano nam). Publish er age feed e kichu nai.
     */
    photoPaths,

    /**
     * EKTA I gonona - `leadCount`.
     *
     * Ei sonkha SUDHU ADMIN er jonno - malik KE O dekhano hobe
     * na. Malik jodi jane 10 jon agrohi, tini beton komaben ba
     * soja bypass korben - admin er match korar khomota i chole
     * jay (quota-secrecy invariant).
     */
    leadCount: 0,

    createdBy: by.uid,
    /** Kon doraja theke elo - admin er kaje lage, niyom bodlay na */
    source: by.source,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  /* ── Gopon ghor ──
     Browser ei doc ta CHAITE O pare na - firestore.rules e
     read o write duitai `if false`. Purno thikana o phone EKHANE i
     thake (D-009) - public doc e kokhono na. */
  batch.set(ref.collection('private').doc('contact'), {
    kind: 'job_contact',
    ...priv,
    createdAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { id: ref.id, trackingCode };
}
