/**
 * Nirapottar pahara - hacker er chokhe.
 *
 *   npm run check:security
 *
 * Bangladesh er onek hacker asol site e hamla kore. Ei script
 * dekhe - amader nirapottar deyal gulo jekhane chilo, sekhane
 * i ache kina. Ekta deyal chupchap khule gele keu dhorto na.
 *
 * Ei ta ekta CHECKLIST - live hamla na (seta alada kore
 * chalano hoy). Ei ta dekhe kod theke deyal gulo SORE geche kina.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let fails = 0;
const ok = (cond: boolean, what: string, extra = '') => {
  if (!cond) fails++;
  console.log(` ${cond ? 'PASS' : 'FAIL'}  ${what}${extra ? '  - ' + extra : ''}`);
};

const ROOT = join(__dirname, '..');
const read = (f: string) => readFileSync(join(ROOT, f), 'utf8');

/* ══════════════════════════════════════════════════════════════
   1 · NIRAPOTTAR HEADER
   ══════════════════════════════════════════════════════════════ */

console.log('\n━━ Header ━━');
{
  const cfg = read('next.config.ts');

  /**
   * "X-Powered-By: Next.js" - ei ta hacker ke bole dito amra
   * ki chalachhi, tarpor se sudhu Next er CVE khujto.
   */
  ok(/poweredByHeader:\s*false/.test(cfg), 'X-Powered-By faas kora bondho');

  ok(/Content-Security-Policy/.test(cfg), 'CSP header ache');
  ok(/frame-ancestors '?none'?/.test(cfg), 'clickjacking bondho (frame-ancestors)');
  ok(/object-src '?none'?/.test(cfg), 'plugin/Flash diye script bondho (object-src)');
  ok(/base-uri '?self'?/.test(cfg), '<base> hijack bondho (base-uri)');
  ok(/form-action '?self'?/.test(cfg), 'form onno site e post bondho');

  /**
   * SCRIPT e `'unsafe-inline'` LAGE - Next nijei inline script
   * dey. Kintu ei ta jate bhule STYLE er baire, kono baje
   * jaygay (jemon `default-src`) na jay.
   *
   * `script-src` e `'unsafe-inline'` thakbe (Next er dorkar),
   * kintu `object-src` ar `base-uri` er upor bhorosa.
   */
  /* apis.google.com + www.gstatic.com lage Google popup login er
     jonno (RentJagat D-023) - tar baire kono host na */
  ok(
    /"script-src 'self' 'unsafe-inline' https:\/\/apis\.google\.com https:\/\/www\.gstatic\.com"/.test(cfg),
    'script-src - Next + Google login er moto, tar beshi na',
  );

  ok(/nosniff/.test(cfg), 'X-Content-Type-Options nosniff');
  ok(/Strict-Transport-Security/.test(cfg), 'HSTS ache');

  /* Camera/mic/payment - kichhu i use kori na, sob bondho */
  ok(/Permissions-Policy/.test(cfg) && /camera=\(\)/.test(cfg), 'Permissions-Policy - camera/mic bondho');
}

/* ══════════════════════════════════════════════════════════════
   2 · KHOLA API - dui doraja
   ══════════════════════════════════════════════════════════════ */

console.log('\n━━ Khola API ━━');
{
  /**
   * Amader duita khola POST ache - login ar logout. Duitai
   * `sameOrigin` diye pahara deya - nahole onno site theke
   * manush ke attacker er account e login koriye deya jeto.
   */
  for (const r of ['session', 'signout']) {
    const src = read(`src/app/api/auth/${r}/route.ts`);
    ok(/sameOrigin\(req\)/.test(src), `/api/auth/${r} - CSRF pahara ache`);
  }

  /**
   * Payment callback - je keu hit korte pare (gateway er
   * server hit kore). Tai ekhane KICHHU I bishwas kora hoy na -
   * provider ke NIJERA jiggesh kore jana hoy.
   */
  const cb = read('src/app/api/payments/callback/route.ts');
  ok(/settlePayment/.test(cb), 'payment callback - settlePayment daka hoy');

  const pay = read('src/lib/server/payments.ts');
  ok(
    /provider\.verify/.test(pay),
    'callback e ja lekha ta bishwas kora hoy NA - provider ke jiggesh',
  );
  ok(
    /result\.amount[\s\S]{0,120}<[\s\S]{0,40}doc\.amount/.test(pay),
    'kom taka ele verified kora hoy NA',
  );
}

/* ══════════════════════════════════════════════════════════════
   3 · RATE LIMIT - IP churi bondho
   ══════════════════════════════════════════════════════════════ */

console.log('\n━━ Rate limit ━━');
{
  const rl = read('src/lib/server/rate-limit.ts');

  /**
   * `x-forwarded-for` er SESH mullo - PROTHOM ta na.
   *
   * Prothom ta client nije pathay. Seta nile hacker protibar
   * elomelo XFF pathiye protibar notun ghor peto, ar rate limit
   * ta puro faka thakto.
   */
  ok(
    /chain\[chain\.length - 1\]/.test(rl),
    'XFF er SESH mullo neya hoy - client er lekha churi kora jay na',
  );

  ok(
    /allowed: true, remaining: 0/.test(rl),
    'rate limit bhengе gele DHUKTE deya hoy (subidha, sesh stor na)',
  );

  /**
   * Cloudflare on hole `cf-connecting-ip` (asol manush) pora
   * hoy - kintu SUDHU `BEHIND_CLOUDFLARE=true` hole. Nahole keu
   * oi header spoof korte parto.
   */
  ok(
    /BEHIND_CLOUDFLARE.*===.*'true'/.test(rl) && /cf-connecting-ip/.test(rl),
    'Cloudflare er asol IP sudhu switch ON hole neya hoy',
  );
}

/* ══════════════════════════════════════════════════════════════
   4 · PATH TRAVERSAL - onner kagoj e dhukar cheshta
   ══════════════════════════════════════════════════════════════ */

console.log('\n━━ Kagojer path ━━');
{
  const up = read('src/lib/upload.ts');

  /**
   * Manuser deya file er NAM babohar kora HOY NA.
   *
   * Oi name e `../`, Bangla, emoji thakte pare. Amra nijera nam
   * banai (`${slot}-${stamp}`), tai path ta sob somoy amader
   * niyontrone.
   */
  ok(
    /Date\.now\(\)\.toString/.test(up),
    'kagojer nam amra banai - manuser deya nam na',
  );

  /* storage.rules e onner kagoj e dhukar sob poth bondho */
  const rules = read('storage.rules');
  ok(/isSelf\(uid\)/.test(rules), 'nijer kagoj chhara dekha jay NA (isSelf)');
  ok(/resource == null/.test(rules), 'jachai er por kagoj bodlano jay NA');
}

/* ══════════════════════════════════════════════════════════════
   5 · GOPON GHOR - browser theke pora jay na
   ══════════════════════════════════════════════════════════════ */

console.log('\n━━ Gopon ghor ━━');
{
  const rules = read('firestore.rules');

  /* Ei collection gulo browser theke PORA JAY NA */
  for (const [name, snippet] of [
    ['staff (ke ke admin)', 'match /staff/'],
    ['payments', 'match /payments/'],
    ['employer_phones (ban-evade)', 'match /employer_phones/'],
    ['contact_leads', 'match /contact_leads/'],
    ['activity_logs (audit)', 'match /activity_logs/'],
  ] as const) {
    ok(rules.includes(snippet), `${name} - niyom ache`);
  }

  /* staff porao jay na, lekhao jay na */
  ok(
    /match \/staff\/\{uid\} \{\s*allow read, write: if false;/.test(rules),
    'staff talika browser theke pora/lekha JAY NA',
  );

  /* Sob sesher `if false` - nam kora hoy ni emon sob kichhu bondho */
  ok(
    /match \/\{document=\*\*\} \{\s*allow read, write: if false;/.test(rules),
    'nam-na-kora sob kichhu bondho (default deny)',
  );
}

console.log(`\n${fails === 0 ? 'SOB PASS' : fails + ' TA FAIL'}\n`);
process.exit(fails === 0 ? 0 : 1);
