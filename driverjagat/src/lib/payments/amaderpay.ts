import 'server-only';

/**
 * AmaderPay - D-04খ
 *
 * EI TA KARD GATEWAY NA. Ei ta bKash/Nagad/Rocket er
 * ekta "number-bhittik" babostha.
 *
 * Kivabe kaj kore:
 *   1. Amra checkout session banai → tara ekta `checkout_url` dey
 *   2. Manush oi pata te giye tader bKash number e taka pathan
 *   3. MALIK ER PHONE E ekta Android app boshe SMS pore
 *   4. SMS e TrxID mile gele tara "verified" bole, ar webhook pathay
 *
 * Mane taka SATHE SATHE mele NA. Malik er phone bondho thakle,
 * ba oi app ta na challe, jachai atke thake. Ei karone i
 * `/payment/done` pata ta "opekkha korun" dekhay, "byartho" na.
 *
 * ────────────────────────────────────────────────────────────
 * NICHE R SHAPE GULO ANUMAN NA - tader nijer API Docs
 * playground e chaliye dekha (2026-08-26). Age ja likhechilam
 * tar beshirbhag i bhul chilo.
 * ────────────────────────────────────────────────────────────
 */

import type { PaymentIntent, PaymentProvider, StartResult, VerifyResult } from './types';

const API_KEY = process.env.AMADERPAY_API_KEY;
const BASE_URL = process.env.AMADERPAY_BASE_URL ?? 'https://amaderpay.vercel.app';

/**
 * Sudhu key thakleI chalu hoy na - `AMADERPAY_VERIFIED=true`
 * alada kore boshate hoy.
 *
 * Ei gate ta ekta ASOL bipod theke bachiyeche. Dekhun niche r
 * `payment_status` er montobbo.
 */
export const isAmaderPayReady = (): boolean =>
  Boolean(API_KEY) && process.env.AMADERPAY_VERIFIED === 'true';

/**
 * DUITA header ekshathe pathai - icchakrito.
 *
 * Tader API Docs er cURL e lekha `Authorization: Bearer`, kintu
 * tader API Keys pata te lekha `X-API-KEY`. Duito jayga duirokom
 * bole. Duitai pathale je kono ekta thik holei chole.
 */
const authHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_KEY}`,
  'X-API-KEY': API_KEY ?? '',
});

export const amaderPayProvider: PaymentProvider = {
  id: 'amaderpay',
  label: 'বিকাশ, নগদ, রকেট',

  async start(intent: PaymentIntent): Promise<StartResult> {
    if (!isAmaderPayReady()) {
      return { ok: false, message: 'অনলাইনে টাকা দেওয়া এখন বন্ধ আছে' };
    }

    try {
      const res = await fetch(`${BASE_URL}/api/v1/checkout/create`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          amount: intent.amount,
          /**
           * Amader nijer id ekhane `order_id` hishebe jay.
           * Webhook e ei ta i fire ashe - ar ei ta diye i amra
           * amader nothi khuje pai.
           */
          order_id: intent.paymentId,
          customer_name: intent.customerName,
          success_url: intent.returnUrl,
        }),
        /** Gateway jhuley thakle amader pata-o chirokal ghurto */
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        return { ok: false, message: 'টাকার পাতা খোলা যায়নি - আবার চেষ্টা করুন' };
      }

      const data = (await res.json()) as {
        status?: string;
        payment_id?: string;
        checkout_url?: string;
      };

      if (!data.checkout_url || !data.payment_id) {
        return { ok: false, message: 'টাকার পাতা খোলা যায়নি - আবার চেষ্টা করুন' };
      }

      return {
        ok: true,
        redirectUrl: data.checkout_url,
        /** Tader UUID - jachai er somoy EI TA lagbe, amader ta na */
        providerRef: data.payment_id,
      };
    } catch {
      return { ok: false, message: 'টাকার সেবার সাথে যোগাযোগ করা যায়নি' };
    }
  },

  async verify(ref): Promise<VerifyResult> {
    if (!isAmaderPayReady()) {
      return { ok: false, message: 'যাচাই করা যায়নি' };
    }

    /**
     * Tader id chara jachai kora JAY NA.
     *
     * Age amader nijer id pathatam - tate tader kachhe kichhu i
     * milto na, ar KONO payment kokhono jachai hoto na.
     */
    if (!ref.providerRef) {
      return { ok: false, message: 'যাচাই করা যায়নি' };
    }

    try {
      /**
       * Ei ta amader NIJEDER prosno, callback er kotha na.
       * Callback e ja lekha ta bishwas kora hoy na.
       *
       * (Tader ei endpoint ta "Public" - auth lage na. Mane je
       * keu UUID jene status dekhte pare. Amader jonno somossa
       * na, karon amra sudhu PORCHI. Kintu tader dik theke ei ta
       * durbol - UUID faas hole keu onner payment er obostha,
       * onko ar phone number dekhte pabe.)
       */
      const res = await fetch(
        `${BASE_URL}/api/v1/checkout/verify/${encodeURIComponent(ref.providerRef)}`,
        { signal: AbortSignal.timeout(15_000) },
      );

      if (!res.ok) return { ok: false, message: 'যাচাই করা যায়নি' };

      const data = (await res.json()) as {
        status?: string;
        payment_status?: string;
        amount?: number | string;
        trx_id?: string;
        payment_method?: string;
        sender_phone?: string;
      };

      /**
       * EI EK LINE E PURO JINISH TA BOSHE ACHHE.
       *
       * Tader uttore DUITA "status" achhe:
       *
       *   `status` - API call ta thik moto holo kina.
       *                      HTTP 200 hole ei ta SOB SOMOY "success".
       *   `payment_status` - taka ta sotti eseche kina.
       *                      "pending" ba "verified".
       *
       * Ami age likhechilam `data.status === 'success'` mane taka
       * eseche. Ota chalu hole PROTITA pending payment "paid"
       * dhora hoto - mane JE KEU ek poysa na diye verified
       * shikkhok hoye jeto.
       *
       * Playground e chaliye dekhlam: taka na diyeo
       * `"status": "success"` ar `"payment_status": "pending"`
       * ek shathe ashe.
       *
       * Ei karone i `AMADERPAY_VERIFIED` gate ta rekhechilam.
       */
      return {
        ok: true,
        paid: data.payment_status === 'verified',
        amount: Number(data.amount ?? 0),
        providerRef: ref.providerRef,
        raw: data as Record<string, unknown>,
      };
    } catch {
      return { ok: false, message: 'যাচাই করা যায়নি' };
    }
  },

  /**
   * Chuktir ongsho (types.ts) - callback route ei ta SORASORI
   * daake na, `@/lib/payments` er `verifyWebhookSignature()` diye
   * daake. Tai gateway er nam ei folder er baire jay na (niyom #10).
   */
  verifySignature(rawBody: string, signature: string | null): boolean {
    return isValidWebhookSignature(rawBody, signature);
  },
};

/* ══════════════════════════════════════════════════════════════
   WEBHOOK ER SOI
   ══════════════════════════════════════════════════════════════ */

/**
 * Tara webhook er sathe ekta HMAC soi pathay - * header `x-signature`, format `sha256=<hex>`.
 *
 * Ei ta amader ASHOL pahara NA. Asol pahara `verify()` - * amra nijera tader API te giye jiggesh kori.
 *
 * Tobu soi ta dekhi, karon ota sosta ar ekta bhalo prothom
 * chhakni: bhua request gulo Firestore porjonto pouchhay i na.
 *
 * `timingSafeEqual` babohar kora hoy, `!==` na. Sadharon
 * milano te kototuku somoy laglo ta diye ek okkhor ek okkhor
 * kore soi ta ANUMAN kora jay (timing attack).
 */
export function isValidWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  const secret = process.env.AMADERPAY_WEBHOOK_SECRET;

  /* Secret na thakle soi dekha jay na - tokhon verify() i bhorosa */
  if (!secret) return true;
  if (!signature) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createHmac, timingSafeEqual } = require('node:crypto') as typeof import('node:crypto');

    const expected =
      'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
