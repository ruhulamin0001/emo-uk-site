/**
 * Storage path → prokashsho chobi URL.
 *
 * Gari r chobi PROKASHSHO (D-008, storage.rules `read: if true`),
 * tai signed URL lage na - soja `alt=media` link i chole. Client o
 * server duijaygay ek i function - NEXT_PUBLIC_* var build e dhuke.
 */

export function photoUrl(path: string): string {
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '';
  const base =
    process.env.NEXT_PUBLIC_USE_EMULATOR === 'true'
      ? 'http://127.0.0.1:9199'
      : 'https://firebasestorage.googleapis.com';
  return `${base}/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
}
