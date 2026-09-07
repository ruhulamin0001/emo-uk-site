/**
 * EK GATEWAY, ONEK SITE - niyom gulor pahara.
 *
 *   npm run check:multisite
 *
 * Utso: TutorJagat er `docs/PAYMENTS-MULTISITE.md` (commit
 * 25a8338). Oi kagoj ta 5 ta platform er jonno - ei script ta
 * dekhe DriverJagat oi kagojer §৪ er tinta fak ar §৯ er
 * talikar protita ghor sotti puron korechhe kina.
 *
 * Kano alada script: takar 10 niyom pahara dey `check:money`.
 * Ei gulo alada jinish - ek gateway account e ONEK site
 * cholar niyom. Ek file e mishiye felle kon ta kon kagojer
 * niyom seta ar bojha jeto na.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  FEES,
  PAYMENT_LAST_DIGIT,
  PAYMENT_DEAD_AFTER_DAYS,
  PAYMENT_SWEEP_MIN_AGE_MS,
  PAYMENT_SWEEP_MAX_AGE_MS,
  isOurAmount,
  paymentAmount,
  shouldExpirePending,
} from '../src/config/business';
import { PAYMENT_KIND } from '../src/types/enums';
import { siteConfig } from '../src/config/site';

let fails = 0;
const ok = (cond: boolean, what: string, extra = '') => {
  if (!cond) fails++;
  console.log(` ${cond ? 'PASS' : 'FAIL'}  ${what}${extra ? ' - ' + extra : ''}`);
};

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const has = (p: string) => existsSync(join(root, p));

/* ══════════════════════════════════════════════════════════════
   §২ক · DRIVERJAGAT ER ELAKA - chhap ar sesh onko
   ══════════════════════════════════════════════════════════════ */

console.log('\n━━ §২ক · Nijer elaka (chhap + sesh onko) ━━');
ok(siteConfig.trackingPrefix === 'DJ', "chhap ta `DJ` (§২ক er talika)");
ok(
  /^[A-Z]{2,4}$/.test(siteConfig.trackingPrefix),
  'chhap 2-4 ta BORO HATER okkhor - noyle callback er regex kate na',
);
ok(PAYMENT_LAST_DIGIT === 2, 'DriverJagat er sesh onko 2');

/**
 * ⚠️ ACHORON diye poriksha - talika mile dekhe na.
 *
 * Ei ta i asol niyom ১১: gateway melay number + ONKO diye, tai
 * dui platform e ek onko thakle duita session er chabi ek hoye
 * jay. Notun ekta dam jog kore keu 150 likhle EI TEST ta lal
 * hobe.
 */
for (const [name, amount] of Object.entries(FEES)) {
  ok(isOurAmount(amount), `FEES.${name} = ${amount} - 2 e sesh`);
}
for (const kind of Object.values(PAYMENT_KIND)) {
  const amount = paymentAmount(kind);
  ok(amount !== null && isOurAmount(amount), `paymentAmount(${kind}) = ${amount} - 2 e sesh`);
}
/* Ar function ta sotti kaj kore to? */
ok(!isOurAmount(100), 'isOurAmount(100) - RentJagat er onko, amader na');
ok(!isOurAmount(49), 'isOurAmount(49) - TutorJagat er onko, amader na');
ok(isOurAmount(52) && isOurAmount(1002), 'isOurAmount(52) ar (1002) - amader');

/* ══════════════════════════════════════════════════════════════
   §৩গ · order_id te site er chhap
   ══════════════════════════════════════════════════════════════ */

console.log('\n━━ §৩গ · order_id te chhap ━━');
{
  const gw = read('src/lib/payments/amaderpay.ts');
  ok(
    /order_id: `\$\{siteConfig\.trackingPrefix\}-\$\{intent\.paymentId\}`/.test(gw),
    'order_id e chhap boshano hoy',
  );
  const cb = read('src/app/api/payments/callback/route.ts');
  ok(
    /replace\(\/\^\[A-Z\]\{2,4\}-\/, ''\)/.test(cb),
    'callback e chhap ta kete neya hoy',
  );
  /* Chhap chhara purono payment o jate chole */
  ok('a1b2c3'.replace(/^[A-Z]{2,4}-/, '') === 'a1b2c3', 'chhap NA thakleo id ta thik thake');
  ok('DJ-a1b2c3'.replace(/^[A-Z]{2,4}-/, '') === 'a1b2c3', 'DJ- kata pore');
  ok('TJ-x9'.replace(/^[A-Z]{2,4}-/, '') === 'x9', 'onno site er chhap o kate (tarpor khuje pabe na - thik)');
}

/* ══════════════════════════════════════════════════════════════
   §৪ · TINTA FAK - ekta o bad deya jabe na
   ══════════════════════════════════════════════════════════════ */

console.log('\n━━ §৪ক · checkout chhere dile chirokal atke jay na ━━');
{
  const pay = read('src/lib/server/payments.ts');
  ok(/async function hasInFlightPayment/.test(pay), 'cholti payment er pahara ache');
  ok(/hasInFlightPayment\(opts\.userId/.test(pay), 'startPayment oi ta daake');
  /**
   * ⚠️ EI TA I §৪ক. Pahara ta boyosh-shima CHHARA likhle seta
   * nijei bug - manush ekbar checkout chhere dile chirokal
   * atke jeten.
   */
  ok(/PAYMENT_DEAD_AFTER_DAYS/.test(pay), 'oi paharay BOYOSH-SHIMA ache (§৪ক er mul kotha)');

  /* Meyad sesher niyom - ACHORON diye, karon emulator e gateway nai */
  ok(PAYMENT_DEAD_AFTER_DAYS === 3, 'gateway "na" bolar 3 din pore meyad sesh');
  ok(!shouldExpirePending(false, false, 99), 'gateway CHUP thakle kichhu i kora hoy NA (99 din holeo)');
  ok(!shouldExpirePending(true, true, 99), 'taka ese gele meyad sesh kora hoy NA');
  ok(!shouldExpirePending(true, false, 3), 'thik 3 din e ekhono na');
  ok(shouldExpirePending(true, false, 3.5), 'gateway "na" bolechhe + 3 din par → meyad sesh');
}

console.log('\n━━ §৪খ · "opekkha korun" pata nije theke dekhe ━━');
{
  ok(has('src/app/payment/done/_components/AutoRecheck.tsx'), 'AutoRecheck ache');
  const ar = read('src/app/payment/done/_components/AutoRecheck.tsx');
  ok(/everyMs = 6_000/.test(ar), '6 second por por dekhe');
  ok(/forMs = 120_000/.test(ar), '2 minute por theme jay (pata khola thakle chirokal na)');
  ok(/router\.refresh\(\)/.test(ar), 'refresh kore - settlePayment abar chole');
  const done = read('src/app/payment/done/page.tsx');
  ok(/<AutoRecheck \/>/.test(done), 'pata te sotti bosano ache');
  ok(/আবার টাকা দেবেন না/.test(done), '"abar taka deben na" lekha ache (duibar kata bondho)');
}

console.log('\n━━ §৪গ · takar jhaṛu alada kore daka jay ━━');
{
  ok(has('src/app/api/cron/lifecycle/route.ts'), 'cron route ache');
  const cron = read('src/app/api/cron/lifecycle/route.ts');
  ok(/task === 'payments'/.test(cron), "`?task=payments` alada kore chole");
  ok(/cronKeyOk/.test(cron), 'cron-key diye pahara deya');
  ok(/export async function POST/.test(cron), 'POST - GET na (jate kono crawler chalate na pare)');
}

/* ══════════════════════════════════════════════════════════════
   §৫ · ROJKAR JAL - handleStuckPayments
   ══════════════════════════════════════════════════════════════ */

console.log('\n━━ §৫ · atke thaka payment er jal ━━');
{
  ok(has('src/lib/server/lifecycle.ts'), 'lifecycle.ts ache');
  const lc = read('src/lib/server/lifecycle.ts');
  ok(/status', '==', PAYMENT_STATUS\.pending/.test(lc), 'pending gulo dekhe');
  ok(/orderBy\('createdAt', 'asc'\)/.test(lc) && /limit\(100\)/.test(lc), 'createdAt onujayi, limit 100');
  ok(/manualProvider\.id\) continue/.test(lc), 'haate haate takar gulo BAD');
  ok(PAYMENT_SWEEP_MIN_AGE_MS === 15 * 60_000, '15 minute er kom boyosh BAD (manush tokhono patay)');
  ok(PAYMENT_SWEEP_MAX_AGE_MS === 7 * 24 * 3600_000, '7 diner beshi purono BAD (gateway o bhule gechhe)');
  ok(/settlePayment\(doc\.id\)/.test(lc), 'notun niyom banay na - settlePayment i daake');
  ok(/shouldExpirePending\(/.test(lc), 'meyad sesher niyom ta oi pure function theke');
  ok(/stuckOver24h/.test(lc), 'stuckOver24h gona hoy - EI SONKHYA TA I ROG NIRNOY');

  /* Index ta sotti ache to? Na thakle production e FAILED_PRECONDITION */
  const idx = JSON.parse(read('firestore.indexes.json')) as {
    indexes: { collectionGroup: string; fields: { fieldPath: string; order: string }[] }[];
  };
  ok(
    idx.indexes.some(
      (i) =>
        i.collectionGroup === 'payments' &&
        i.fields.length === 2 &&
        i.fields[0].fieldPath === 'status' &&
        i.fields[1].fieldPath === 'createdAt' &&
        i.fields[1].order === 'ASCENDING',
    ),
    'Firestore index `payments (status ASC, createdAt ASC)` ache',
  );
}

/* ══════════════════════════════════════════════════════════════
   §২ক · 5 ta ek shathe dekhar ghor
   ══════════════════════════════════════════════════════════════ */

console.log('\n━━ §২ক · /api/payments/health ━━');
{
  ok(has('src/app/api/payments/health/route.ts'), 'health ghor ta ache');
  const h = read('src/app/api/payments/health/route.ts');
  for (const f of [
    'site', 'domain', 'mode', 'stuckOver24h',
    'pendingGateway', 'pendingManual', 'oldestGatewayHours', 'ok',
  ]) {
    ok(new RegExp(`\\b${f}[,:]`).test(h), `uttor e \`${f}\` ache (5 ta site er ek i akriti)`);
  }
  ok(/cronKeyOk/.test(h), 'cron-key diye pahara');
  ok(/export async function GET/.test(h), 'GET - pore, kichhu bodlay na');
  /**
   * ⚠️ Ei ghor ta KICHHU BODLAY NA. `settlePayment` ba
   * `runPaymentSweep` ekhane dakle ekta swastho-poriksha nijei
   * taka bodle dito - "dekha" ar "kora" r farak sesh hoye jeto.
   */
  ok(!/settlePayment|runPaymentSweep|\.update\(|\.set\(/.test(h), 'ei ghor SUDHU PORE, kichhu BODLAY NA');
}

/* ══════════════════════════════════════════════════════════════
   §৭ + §৯ · env ar talika
   ══════════════════════════════════════════════════════════════ */

console.log('\n━━ §৭ · env ━━');
{
  const env = read('.env.example');
  for (const key of [
    'AMADERPAY_API_KEY', 'AMADERPAY_BASE_URL', 'AMADERPAY_VERIFIED',
    'AMADERPAY_WEBHOOK_SECRET', 'CRON_SECRET',
  ]) {
    ok(new RegExp(`^${key}=`, 'm').test(env), `${key} ache`);
  }
  ok(/^AMADERPAY_VERIFIED=false$/m.test(env), 'VERIFIED=false diye SURU (§৯) - asol taka diye dekhar age true na');
}

console.log('\n━━ §৯ · niyom ১০ - admin sari te SUDHU manual ━━');
{
  const pay = read('src/lib/server/payments.ts');
  const q = pay.slice(pay.indexOf('export async function getPendingPayments'));
  ok(
    /providerId', '==', manualProvider\.id/.test(q),
    'opekkhoman sari te sudhu manual - gateway er osomapto payment ekhane uthle malik emon karo ke verified korten jini ek poisa o den ni',
  );
}

console.log(`\n${fails === 0 ? 'SOB PASS' : fails + ' TA FAIL'}\n`);
process.exit(fails === 0 ? 0 : 1);
