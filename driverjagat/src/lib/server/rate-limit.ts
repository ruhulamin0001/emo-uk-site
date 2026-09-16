import 'server-only';

/**
 * Cheshta gonona - ek jayga theke bar bar cheshta atkanor jonno.
 *
 * Kano lage?
 *
 * Tracking code gulo KRAMANUSARE toiri hoy - DJ-HD-00001,
 * DJ-HD-00002, DJ-HD-00003... (lib/tracking-code.ts).
 *
 * Mane keu ekta choto script likhe 00001 theke 09999 porjonto
 * cheshta kore SOB malik er post er obostha dekhe felte
 * parto. Amader protijogi ra ei ta i korto - kothay kon kaj
 * khali, koto beton, kon elaka.
 *
 * Duita jinish ei ta atkay:
 *   1. Sudhu code e kichhu dekha jay NA - phone o lage
 *   2. Ei file ta - ghontay 10 bar er beshi cheshta kora jay na
 */

import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';

export interface RateVerdict {
  allowed: boolean;
  /** Aro koybar cheshta kora jabe */
  remaining: number;
  /** Block hole aro koto minute */
  retryAfterMinutes: number;
}

/**
 * @param bucket  kon jinish er gonona - 'track', 'lead', ...
 * @param key     kake ginchi - sadharonoto IP
 */
export async function hitRateLimit(
  bucket: string,
  key: string,
  opts: { perHour: number; lockoutMinutes: number },
): Promise<RateVerdict> {
  /**
   * IP ta kacha na, hash kore rakha hoy.
   *
   * Amader sudhu "ei jayga theke bar bar cheshta hocche kina"
   * jana dorkar - ke tini seta na. Tai kacha IP rakhar kono
   * dorkar nai.
   *
   * Tobe ei hash ta IP ta LUKAY NA - niche `hash()` dekhun.
   */
  const id = `${bucket}_${hash(key)}`;
  const ref = adminDb().collection('rate_limits').doc(id);
  const now = Date.now();

  try {
    return await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data();

      const lockedUntil = Number(data?.lockedUntil ?? 0);
      if (lockedUntil > now) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMinutes: Math.ceil((lockedUntil - now) / 60_000),
        };
      }

      /* Ghonta ghure gele gonona shunyo theke shuru */
      const windowStart = Number(data?.windowStart ?? 0);
      const fresh = now - windowStart > 3_600_000;
      const used = fresh ? 0 : Number(data?.count ?? 0);

      if (used + 1 > opts.perHour) {
        tx.set(
          ref,
          {
            count: used + 1,
            windowStart: fresh ? now : windowStart,
            lockedUntil: now + opts.lockoutMinutes * 60_000,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        return {
          allowed: false,
          remaining: 0,
          retryAfterMinutes: opts.lockoutMinutes,
        };
      }

      tx.set(
        ref,
        {
          count: used + 1,
          windowStart: fresh ? now : windowStart,
          lockedUntil: 0,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return {
        allowed: true,
        remaining: opts.perHour - (used + 1),
        retryAfterMinutes: 0,
      };
    });
  } catch {
    /**
     * Gonona bhenge gele DHUKTE DEYA HOY.
     *
     * Ei ta ekta sposhto siddhanto. Rate limit ekta subidha,
     * nirapottar SHESH stor na - asol pahara hocche "phone o
     * lage" niyom ta.
     *
     * Firestore ek muhurter jonno uttor na dile jodi amra sob
     * obhibhabok ke atke ditam, tahole ekta choto gondogol puro
     * tracking bondho kore dito.
     */
    return { allowed: true, remaining: 0, retryAfterMinutes: 0 };
  }
}

/**
 * Choto, sthir hash - ekta chabi banonor jonno.
 *
 * Ei ta IP ta LUKAY NA - seta bhabar bhul kora jabe na.
 *
 * Age uporer comment e lekha chilo "hash rakhle database faas
 * holeo kar IP bojha jay na". Ota SOTTI NA. IPv4 e mot 4
 * kuti-r kichhu beshi thikana - keu database peye gele protita
 * IP ei function e chaliye milie nite pare, kayek second e.
 *
 * Sotti lukate hole gopon chabi soho HMAC lagto. Amra oi poth e
 * jai ni - karon ekhane ja rakha hoy ta sudhu "ei jayga theke
 * ghontay koybar cheshta holo", ar 24 ghontar moddhe seta muche
 * o jay (`lifecycle.ts`).
 *
 * Kintu comment ta SOTTI kotha bolbe. Mithya line pore bipod
 * dake - keu bhabto IP ta nirapod, ar tar upor bhorosa kore aro
 * kichhu rakhto.
 */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/**
 * Request theke IP - proxy er pichhone thakleo.
 *
 * `x-forwarded-for` er SESH mullo ta neya hoy, PROTHOM ta NA.
 *
 * Age prothom ta neya hoto - ar oi ta CLIENT NIJE pathay.
 *
 * Mane rate limit ta puro faka chilo: ekta script protita
 * request e `X-Forwarded-For:` er jaygay elomelo mullo boshiye
 * protibar EKTA NOTUN ghor peto. 10-bar-er shima kokhono lagto
 * na. Ar tokhon MJ-HD-00001 theke gone gone sob post er obostha
 * dekhe fela jeto - thik jeta atkanor jonno ei file ta lekha.
 *
 * Traefik amader container e pathanor age NIJER dekha asol IP ta
 * oi talikar SESHE joRe dey. Client ja likhe pathiyeche ta sudhu
 * tar AGE boshe thake. Tai sesh ta i bishwas kora jay.
 *
 * Ei ta EKTA proxy dhore lekha. Bhobishshote samne Cloudflare
 * ba onno CDN bosale sesh mullo ta CDN er IP hobe - tokhon SOB
 * manush EK ghore pore jaben, ar ek jon er cheshtay sobai block
 * hoben. CDN bosale ei function ta abar dekhte HOBE.
 */
export function clientIp(headers: Headers): string {
  /**
   * CLOUDFLARE er pichhone thakle SOB kichhu bodle jay.
   *
   * Cloudflare on korle request er poth hoy:
   *   manush → Cloudflare → Traefik → amader container
   *
   * Tokhon `x-forwarded-for` er SESH mullo ta ar manush er IP na
   * - seta CLOUDFLARE ER edge IP. Cloudflare er edge kayek ta i,
   * mane SOB manush oi kayek ta IP te pore jeten, ar ek jon er
   * cheshtay SOBAI block hoye jeten. Rate limit puro ulta kaj
   * korto.
   *
   * Cloudflare ekta ALADA header dey - `cf-connecting-ip` - ja
   * SOB SOMOY asol manush er IP. Ar ei ta Cloudflare NIJE bosay:
   * keu nijer request e `cf-connecting-ip` likhe pathaleo
   * Cloudflare seta MUCHE nijer ta bosay. Tai churi kora jay na.
   *
   * Kintu ei ta SUDHU tokhon i bishwas kora jay jokhon amra
   * NISCHIT je request ta Cloudflare diye eseche. Nahole (proxy
   * off, ba keu sorasori origin IP te hit korle) keu ei header
   * spoof korte parto.
   *
   * Tai ekta switch - `BEHIND_CLOUDFLARE`. Proxy on korar SATHE
   * SATHE ei ta `true` korte hobe. Duita ALADA jinish (DNS proxy
   * ar ei env), tai duita ek shathe bodlanor kotha docs/DEPLOY.md
   * e lekha.
   */
  if (process.env.BEHIND_CLOUDFLARE === 'true') {
    const cf = headers.get('cf-connecting-ip')?.trim();
    if (cf) return cf;
    /* CF header nai - hoy Cloudflare bypass kore sorasori origin
       e hit, noy misconfig. Niche fallback e chole - kintu ei
       obosthay ekjon attacker origin IP peye gele XFF spoof
       korte parbe. Seta atkanor jonno origin firewall lage
       (docs/DEPLOY.md), kintu VPS e onno site o ache bole seta
       alada kaj. */
  }

  const chain = headers
    .get('x-forwarded-for')
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (chain?.length) return chain[chain.length - 1];

  return headers.get('x-real-ip')?.trim() || 'unknown';
}
