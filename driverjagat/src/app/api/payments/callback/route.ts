import { NextResponse, type NextRequest } from 'next/server';
import { settlePayment } from '@/lib/server/payments';
import { verifyWebhookSignature } from '@/lib/payments';

/**
 * Taka newar gateway er webhook - taka jachai hole tara ei URL e hit koren.
 *
 * EI URL TA KHOLA. Login lage na, lagate parbo o na - gateway
 * er server hit kore, tader kachhe amader cookie nai.
 *
 * NIYOM #2: ekhane ja pathano hoy tar KICHHU I bishwas kora hoy na.
 * Sudhu ekta id neya hoy - "ei payment ta dekho" - ar tarpor
 * `settlePayment()` NIJE giye provider ke jiggesh kore
 * "ei payment ta ki sotti hoyeche, ar koto taka?".
 *
 * Je keu ei URL e `?status=success&amount=99999` likhe hit korte
 * pare - ar tate kichhu i hobe na.
 *
 * NIYOM #10: ei file e kono gateway er NAM nai, ar gateway er
 * file o import kora hoy na. Sudhu `@/lib/payments`. Gateway
 * bodlale ei file er ekta line o bodlabe na.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Amader NIJER payment id ta callback er body te kon name ache.
 *
 * Gateway ra alada alada nam babohar kore (`order_id`,
 * `merchant_invoice`, ...). Tai koyekta nam dekha hoy - ei
 * talika ta gateway er nam na, sudhu common ghor er nam.
 */
const OUR_ID_KEYS = ['order_id', 'merchant_invoice', 'invoice', 'id'] as const;

async function handle(req: NextRequest) {
  const url = new URL(req.url);
  let payload: Record<string, unknown> = Object.fromEntries(url.searchParams);

  if (req.method === 'POST') {
    /**
     * Raw text hishebe pori, JSON hishebe na.
     *
     * HMAC soi ta HUBAHU oi byte gulor upor kora. `req.json()`
     * kore abar `JSON.stringify` korle space ba key er kram
     * ektuo bodlale soi ta ar mile na.
     */
    const raw = await req.text().catch(() => '');

    if (raw) {
      const contentType = req.headers.get('content-type') ?? '';

      if (contentType.includes('application/json')) {
        /* Soi na milleI ekhane i sesh - Firestore porjonto jay na */
        if (!verifyWebhookSignature(raw, req.headers.get('x-signature'))) {
          return NextResponse.json({ ok: false }, { status: 401 });
        }
        try {
          payload = { ...payload, ...JSON.parse(raw) };
        } catch {
          return NextResponse.json({ ok: false }, { status: 400 });
        }
      } else {
        payload = {
          ...payload,
          ...Object.fromEntries(new URLSearchParams(raw)),
        };
      }
    }
  }

  const rawOrderId = String(
    OUR_ID_KEYS.map((k) => payload[k]).find((v) => v !== undefined) ?? '',
  );

  /**
   * Site er chhap ta kete nei - `DJ-a1b2c3` → `a1b2c3`.
   *
   * Ek i gateway account e onek site chole, tai id er samne
   * site er chhap boshano hoy. Amader Firestore e doc id ta
   * chhap CHHARA, tai ekhane kete nite hoy.
   *
   * ⚠️ Chhap 2 theke 4 ta BORO HATER okkhor - sonkha ba chhoto
   * hater okkhor dile ei regex ta kate na, ar taka atke jay.
   *
   * ⚠️ Chhap na thakleo chole - chhap bosanor AGE toiri purono
   * payment gulo tokhono pending e thakte pare, tader webhook
   * eleo kaj korbe.
   *
   * ⚠️ ONNO site er chhap (TJ-, RJ-, MJ-) ele o kono khoti nai:
   * `settlePayment` amader NIJER Firestore e khoje, na pele
   * "পেমেন্ট পাওয়া যায়নি" bole fire jay. Kichhu ghote na.
   */
  const paymentId = rawOrderId.replace(/^[A-Z]{2,4}-/, '');

  if (!paymentId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const res = await settlePayment(paymentId, payload);

  /**
   * Gateway ke SOB SOMOY 200 deya hoy - bhitore ja i hok.
   *
   * Karon beshirbhag gateway 200 na pele bar bar cheshta kore,
   * ghonta dhore. Amader dik er somossa amader nothi te thakbe -
   * gateway ke bar bar dakiye labh nai.
   */
  return NextResponse.json({ ok: res.ok });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
