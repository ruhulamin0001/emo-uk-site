/**
 * Lekhar niyom - malik er sposhto nirdesh.
 *
 *   npm run check:style
 *
 * Ei script ta ekta jinish er jonno: malik ekta chinho ke
 * SPOSHTO kore na koreche, ar seta jate KOKHONO fire na ashe.
 *
 * Ekbar hate soriye dile porer sopta he abar dhuke jeto - amar
 * hate, ba onno karo hate. Tai hate na, PAHARA.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let fails = 0;
const ok = (cond: boolean, what: string, extra = '') => {
  if (!cond) fails++;
  console.log(` ${cond ? 'PASS' : 'FAIL'}  ${what}${extra ? '  - ' + extra : ''}`);
};

const ROOT = join(__dirname, '..');

function allFiles(): string[] {
  const out: string[] = [];
  const skip = /node_modules|\.next|\.git|public|data-source/;
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (skip.test(p)) continue;
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|cjs|mjs|css|md|json|rules|yml)$/.test(name)) out.push(p);
    }
  };
  for (const r of ['src', 'scripts', 'docs']) {
    if (existsSync(join(ROOT, r))) walk(join(ROOT, r));
  }
  for (const f of ['README.md', 'firestore.rules', 'storage.rules', 'package.json']) {
    if (existsSync(join(ROOT, f))) out.push(join(ROOT, f));
  }
  return out;
}

console.log('\n━━ Lomba dash ━━');

/**
 * MALIK EI CHINHO GULO CHAN NA. Kothao na.
 *
 *   U+2014  em dash
 *   U+2013  en dash
 *   U+2015  horizontal bar
 *
 * Ei file er BHITORE O oi chinho lekha jabe na - tai upore
 * naam diye bola, ar niche escape diye khoja. Prothom bar
 * chinho gulo hate likhechilam, ar ei script NIJEKE i dhore
 * felechilo. Seta thik i korechilo.
 *
 * Kano guruttopurno: manush keyboard e ei gulo type kore na.
 * Lekhay ei chinho thakle seta "kompiuter er lekha" mone hoy,
 * "manuser lekha" na. Amader protita lekha ekjon obhibhabok ba
 * shikkhok poRen, ar tader kachhe seta manuser lekha mone
 * howa TA i sob.
 *
 * Bodle: sadharon hyphen, comma, ba interpunct.
 */
const DASH_CODES = [0x2014, 0x2013, 0x2015];
const DASHES = new RegExp(`[${DASH_CODES.map((c) => String.fromCharCode(c)).join('')}]`, 'g');

const dirty: string[] = [];
let total = 0;

for (const f of allFiles()) {
  const src = readFileSync(f, 'utf8');
  const hits = src.match(DASHES);
  if (!hits) continue;
  total += hits.length;

  /* Kon line e - prothom ta dekhai, jate khuje pete sohoj hoy */
  const line = src.split('\n').findIndex((l) => DASHES.test(l)) + 1;
  dirty.push(`${f.replace(ROOT, '').replace(/^[\\/]/, '')}:${line} (${hits.length})`);
}

ok(
  dirty.length === 0,
  `kono lomba dash NAI (${allFiles().length} ta file dekha holo)`,
  dirty.slice(0, 6).join('  ·  ') + (dirty.length > 6 ? ` ... aro ${dirty.length - 6}` : ''),
);

if (total) {
  console.log(`\n  mot ${total} ta. Bodlate:`);
  console.log("  node -e \"...\"  ba hate. Bodle `-` ba `,` ba `·` din.\n");
}

console.log(`\n${fails === 0 ? 'SOB PASS' : fails + ' TA FAIL'}\n`);
process.exit(fails === 0 ? 0 : 1);
