/**
 * TAKAR 10 TA NIYOM - script diye pahara.
 *
 *   npm run check:money
 *
 * Kano ei file ta?
 *
 * Takar niyom gulo comment e lekha thakle manush bhole jay -
 * bishesh kore chhoy mash pore, ba onno keu code ta dhorle.
 * Ei script ta ASOL file gulo pore dekhe niyom ta ekhono ache
 * kina. Niyom ta sorale ei test LAL hoye jabe.
 *
 * TutorJagat er `check:money` er hubuhu uttoradhikar. Ekhane
 * ja lekha ache tar protita ekbar SOTTI bhanga chilo - tai
 * ekta niyom o "sposhto" bole bad deya hoy ni.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MANUAL_PAYMENT } from '../src/config/business';
import { checkAmount } from '../src/lib/server/payments';

let fails = 0;
const ok = (cond: boolean, what: string, extra = '') => {
  if (!cond) fails++;
  console.log(` ${cond ? 'PASS' : 'FAIL'}  ${what}${extra ? ' - ' + extra : ''}`);
};

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

/**
 * Comment bad diye SUDHU kod.
 *
 * Kano lage: ei file er niyom gulo KOD er upor. Comment e
 * "`paid: true` kokhono bola hoy na" lekha thakle seta niyom
 * BHANGA na - ulto, seta niyom ta BOJHACHHE. Comment na sorale
 * test ta nijer i bakya dhore lal hoye jeto.
 */
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const PAY_DIR = 'src/lib/payments';
const server = read('src/lib/server/payments.ts');
const index = read(`${PAY_DIR}/index.ts`);
const manual = read(`${PAY_DIR}/manual.ts`);
const types = read(`${PAY_DIR}/types.ts`);
const callback = read('src/app/api/payments/callback/route.ts');
const adminAction = read('src/app/actions/admin.ts');

console.log('\n━━ Gathon - 4 ta file ━━');
for (const f of ['types.ts', 'manual.ts', 'index.ts']) {
  ok(
    readdirSync(join(root, PAY_DIR)).includes(f),
    `${PAY_DIR}/${f} ache`,
  );
}
ok(
  readdirSync(join(root, PAY_DIR)).some(
    (f) => !['types.ts', 'manual.ts', 'index.ts'].includes(f) && f.endsWith('.ts'),
  ),
  'ekta gateway file ache (<gateway>.ts)',
);
for (const m of ['id', 'label', 'start(', 'verify(']) {
  ok(types.includes(m), `PaymentProvider chuktite \`${m}\` ache`);
}

console.log('\n━━ 1 · amount SERVER e hisheb hoy ━━');
ok(/export function amountFor\(kind: PaymentKind\)/.test(server), 'amountFor(kind) ache - onko sudhu kind dekhe');
/* `startPayment` er opts e `amount` thakle client onko pathate parto */
const startOpts = server.slice(server.indexOf('export async function startPayment'), server.indexOf('): Promise<StartPaymentResult>'));
ok(!/\bamount\??:/.test(startOpts), 'startPayment client theke amount NEY NA');
ok(/const amount = amountFor\(opts\.kind\)/.test(server), 'onko server e hisheb hoy');

console.log('\n━━ 2 · callback er body proman na, ingit ━━');
ok(/provider\.verify\(/.test(server), 'settlePayment NIJE provider ke jiggesh kore');
/* callback payload theke `paid`/`status` dekhe siddhanto neya JABE NA */
ok(
  !/payload\.(status|paid|success)/.test(server),
  'callback er `status`/`paid` dekhe siddhanto NEYA HOY NA',
);
ok(
  !/payload\.(amount|total)/.test(server),
  'callback er `amount` dekhe onko dhora HOY NA',
);

console.log('\n━━ 3 · verify() te DUITA id ━━');
ok(
  /verify\(\s*\{\s*paymentId[\s\S]{0,80}providerRef/.test(server),
  'verify() te amader paymentId AR tader providerRef duitai jay',
);
ok(/providerRef\?: string/.test(types), 'chuktite providerRef ache');

console.log('\n━━ 4 · onko miliye dekha - ACHORON diye porikkha ━━');
{
  /**
   * Ei ta lekha porikkha na - `checkAmount()` ke SOTTI chaliye
   * dekha. Niyom ta pure function e bole Firestore lage na.
   */
  const need = 100;
  const blocked: Array<[string, number]> = [
    ['onko 0 (gateway kichhu bole ni)', 0],
    ['onko NaN (uttor er gathon bodleche)', Number.NaN],
    ['onko negative', -50],
    ['kom taka', 99],
  ];
  for (const [what, reported] of blocked) {
    const v = checkAmount(reported, need);
    ok(!v.ok, `${what} → ATKAY`);
    ok(!v.ok && v.note.trim().length > 0, `${what} → note lekha hoy (malik er hate)`);
  }
  ok(checkAmount(100, need).ok, 'thik onko → jay');
  ok(checkAmount(150, need).ok, 'beshi taka → jay (ferot alada kaj)');

  /* Ar settlePayment SOTTI ei function ta i babohar kore to? */
  ok(/const verdict = checkAmount\(result\.amount, doc\.amount\)/.test(server), 'settlePayment checkAmount() daake');
  const failBlock = server.slice(server.indexOf('if (!verdict.ok)'), server.indexOf('await applyPaidEffect(doc, result.providerRef)'));
  ok(/PAYMENT_STATUS\.failed/.test(failBlock), 'na milleI status failed hoy');
  ok(/note: verdict\.note/.test(failBlock), 'na milleI note boshe');
  ok(/return \{ ok: false/.test(failBlock), 'na milleI fol ghotano BONDHO (applyPaidEffect e jay na)');
}

console.log('\n━━ 5 · taka o tar FOL ek transaction e ━━');
ok(/runTransaction/.test(server), 'applyPaidEffect transaction e chole');
const txBlock = server.slice(server.indexOf('async function applyPaidEffect'));
ok(/tx\.update\(payRef, \{[\s\S]{0,120}PAYMENT_STATUS\.success/.test(txBlock), '"success" lekha transaction er BHITORE');
ok(/tx\.update\(user, \{[\s\S]{0,140}EMPLOYER_STATUS\.verified/.test(txBlock), 'verified kora O ek i transaction e');

console.log('\n━━ 6 · settlePayment idempotent ━━');
ok(
  /if \(doc\.status === PAYMENT_STATUS\.success\)[\s\S]{0,120}alreadyDone: true/.test(server),
  'age success hole abar kichhu ghote na',
);
ok(
  /fresh\.get\('status'\) === PAYMENT_STATUS\.success\) return/.test(server),
  'transaction er BHITORE abar dekha hoy (dui callback ek shathe)',
);

console.log('\n━━ 7 · nothi AGE, taka chaowa PORE ━━');
const startBlock = server.slice(server.indexOf('export async function startPayment'), server.indexOf('3 · TAKA ESECHHE'));
const iInit = startBlock.indexOf('PAYMENT_STATUS.initiated');
const iStart = startBlock.indexOf('provider.start(');
const iPending = startBlock.indexOf('PAYMENT_STATUS.pending');
ok(iInit > 0 && iStart > iInit, 'initiated nothi provider.start() er AGE toiri hoy');
ok(iPending > iStart, 'pending hoy start() er PORE');

console.log('\n━━ 8 · manual kokhono paid:true bole na ━━');
const manualVerify = manual.slice(manual.indexOf('async verify('));
ok(/paid: false/.test(manualVerify), 'manual verify() paid: false fera dey');
ok(!/paid: true/.test(codeOnly(manual)), 'manual er KOD e `paid: true` kothao NAI');

console.log('\n━━ 9 · "taka peyechi" - sudhu MALIK, note baddhotamulok ━━');
const markAction = adminAction.slice(adminAction.indexOf('export async function markPaidAction'), adminAction.indexOf('Dol o ban'));
ok(/requireOwner\(\)/.test(markAction), 'markPaidAction requireOwner (admin NA)');
ok(!/requireStaff\(\)/.test(markAction), 'requireStaff diye kora HOY NA');
ok(/MANUAL_PAYMENT\.noteMinChars/.test(markAction), 'action e note er nunotom mapa hoy');
ok(MANUAL_PAYMENT.noteMinChars >= 4, `note kompokkhe 4 oksor (ekhon ${MANUAL_PAYMENT.noteMinChars})`);
const markServer = server.slice(server.indexOf('export async function markManuallyPaid'));
ok(/MANUAL_PAYMENT\.noteMinChars/.test(markServer), 'server e O abar mapa hoy (action URL khola)');
ok(/writeLog\(actor, \{[\s\S]{0,120}payment\.manual_settle/.test(markServer), 'activity log e lekha hoy');
ok(/settledBy: actor\.uid/.test(markServer), 'ke bosalen ta nothi te boshe');

console.log('\n━━ 10 · gateway er nam sudhu payments folder e ━━');
{
  const gatewayWords = [/amaderpay/i, /sslcommerz/i, /bkash[-_]?api/i, /shurjopay/i, /aamarpay/i];
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(join(root, dir))) {
      const rel = `${dir}/${e}`;
      if (statSync(join(root, rel)).isDirectory()) {
        walk(rel);
        continue;
      }
      if (!/\.tsx?$/.test(e)) continue;
      if (rel.startsWith(PAY_DIR)) continue; // ei folder ta i gateway chene
      const src = readFileSync(join(root, rel), 'utf8');
      if (gatewayWords.some((w) => w.test(src))) offenders.push(rel);
    }
  };
  walk('src');
  ok(offenders.length === 0, 'payments folder er BAIRE gateway er nam NAI', offenders.join(', '));
}
ok(
  !/from '@\/lib\/payments\/[a-z]/.test(callback + adminAction + server.replace(/from '@\/lib\/payments'/g, '')),
  'kono file gateway er file SORASORI import kore na',
);
ok(/verifyWebhookSignature/.test(index), 'index.ts neutral verifyWebhookSignature() dey');
ok(/verifyWebhookSignature/.test(callback), 'callback route oi neutral function ta i daake');

console.log('\n━━ Webhook soi - HMAC, timingSafeEqual ━━');
{
  const gatewayFile = readdirSync(join(root, PAY_DIR)).find(
    (f) => !['types.ts', 'manual.ts', 'index.ts'].includes(f) && f.endsWith('.ts'),
  )!;
  const gw = read(`${PAY_DIR}/${gatewayFile}`);
  ok(/createHmac\('sha256'/.test(gw), 'HMAC sha256 diye soi milano hoy');
  ok(/timingSafeEqual/.test(gw), 'timingSafeEqual - `===` diye NA (timing attack)');
  ok(/if \(!secret\) return true/.test(gw), 'secret na thakleo app chole (asol pahara niyom #2)');
}

console.log('\n━━ Doc er ghor gulo ━━');
for (const f of ['userId', 'kind', 'amount', 'status', 'providerId', 'providerRef', 'settledBy', 'note', 'createdAt']) {
  ok(new RegExp(`\\b${f}[?]?:`).test(server), `PaymentDoc e \`${f}\` ache`);
}
for (const s of ['initiated', 'pending', 'success', 'failed']) {
  ok(new RegExp(`${s}: '${s}'`).test(read('src/types/enums.ts')), `status \`${s}\` ache`);
}

console.log(`\n${fails === 0 ? 'SOB PASS' : fails + ' TA FAIL'}\n`);
process.exit(fails === 0 ? 0 : 1);
