'use client';

/**
 * Kagoj o chobi upload - chobi choto kore, tarpor Storage e.
 *
 * BROWSER E COMPRESS KORA HOY, server e na.
 *
 * Karon: Bangladesh e beshirbhag manush mobile data te achen,
 * ar phone er camera 8-12 MB er chobi tole. Ota temon pathale
 * 3G te 3-4 minute, majhkhane net gele purota abar, ar Storage
 * rules er 5 MB baddha y FIRE ASHTO. Choto korle 200-400 KB.
 */

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getBucket } from './firebase/client';

/** Storage rules e 5 MB - ekhane tar aage i dhora hoy */
const MAX_BYTES = 5 * 1024 * 1024;

/** Boro dik 1600px - kagojer lekha porar jonno jothesto */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export type UploadResult =
  | { ok: true; path: string; url: string }
  | { ok: false; message: string };

/**
 * Chobi choto kora.
 * PDF ekhane ashe na - ota jemon ache temon i jay.
 */
async function shrink(file: File): Promise<Blob> {
  if (file.type === 'application/pdf') return file;

  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return file;

  /* Sada rong age boshai - PNG er transparent jayga JPEG e
     KALO hoye jay, ar admin bhabten kagoj ta bikrito. */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', QUALITY),
  );

  /* Choto korte na parle asol ta i pathai - atkano r cheye bhalo */
  return blob ?? file;
}

/**
 * @param folder   `employer_docs` ba `job_photos` - storage.rules er sathe mile
 *                 (employer_docs = NID/malikanar kagoj, GOPON;
 *                  job_photos = gari r chobi, publish er por PROKASHSHO)
 * @param uid      login kora manuser id
 * @param slot     `identity`, `ownership`, `photo-1` - ekta ghor er ekta file
 */
export async function uploadDoc(
  file: File,
  folder: 'employer_docs' | 'job_photos',
  uid: string,
  slot: string,
): Promise<UploadResult> {
  try {
    const blob = await shrink(file);

    if (blob.size > MAX_BYTES) {
      return { ok: false, message: 'ফাইলটি অনেক বড় - ছোট করে আবার দিন' };
    }

    const isPdf = file.type === 'application/pdf';
    /**
     * Manuser deya file er NAM babohar kori NA.
     * Oi name e space, Bangla okkhor, `../`, emoji - sob thakte
     * pare. Amra nijera nam banai, tai path sob somoy amader
     * niyontrone.
     *
     * Nam PROTIBAR alada - sesh e somoy jora hoy.
     *
     * DUITA folder ei create-only rule (`resource == null`) -
     * kagoj JACHAI ER POR bodlano jabe na, ar chobi o chupchap
     * bodle fela jabe na (kon chobi ke dekhlo tar hisheb audit
     * log e path dhore thake). Sthir nam hole dwitiyo cheshta
     * "অনুমতি নেই" bole atke jeto - tai stamp SOB SOMOY.
     */
    const stamp = Date.now().toString(36);
    const name = `${slot}-${stamp}`;
    const path = `${folder}/${uid}/${name}.${isPdf ? 'pdf' : 'jpg'}`;

    const storageRef = ref(getBucket(), path);
    await uploadBytes(storageRef, blob, {
      contentType: isPdf ? 'application/pdf' : 'image/jpeg',
    });

    /* Dekhanor jonno ekta URL - save kora hoy PATH ta */
    const url = await getDownloadURL(storageRef);
    return { ok: true, path, url };
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    if (code.includes('unauthorized') || code.includes('permission')) {
      return { ok: false, message: 'অনুমতি নেই - আবার লগইন করে দেখুন' };
    }
    return { ok: false, message: 'আপলোড করা যায়নি - আবার চেষ্টা করুন' };
  }
}

/** Manush ke dekhanor jonno - "২.৪ MB" */
export function fileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  const s = mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
  return s.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
}
