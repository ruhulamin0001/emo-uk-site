import 'server-only';

/**
 * Cron route gulor ek i pahara - EK jaygay.
 *
 * ⚠️ Duita route ei ta babohar kore: `/api/cron/lifecycle` ar
 * `/api/payments/health`. Pahara ta copy kore duijaygay likhle
 * ekdin ekta halnagad hoto, onnota hoto na - nirapottar bhul
 * emon i chupchap dhoroner.
 */

import { timingSafeEqual } from 'node:crypto';

/**
 * ⚠️ `timingSafeEqual`, `!==` NA.
 *
 * Sadharon milano te kototuku somoy laglo ta mepe ek okkhor ek
 * okkhor kore secret ta anuman kora jay (timing attack).
 *
 * ⚠️ Lomba alada hole timingSafeEqual nijei chhure - tai age
 * lomba dekha hoy. Ei ta ekta chhoto faas (lomba ta jana jay),
 * kintu secret ta 64 hex okkhor - lomba jene kono lav nai.
 */
export function cronKeyOk(given: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !given) return false;

  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}
