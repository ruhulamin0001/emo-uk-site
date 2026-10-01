/**
 * Prokashsho card er pahara.
 *
 * Ei test ta fail korbe jodi keu PUBLIC_CARD_FIELDS talikay
 * kono gopon ghor dhukay. Talika ta i prokashsho serializer er
 * EKMATRO utso (lib/server/jobs.ts) - tai ei ekta test i
 * puro "card e PII nai" wada ta pahara dey.
 *
 * DriverJagat e gopon ghor: malik er nam-phone, purno thikana,
 * gari r registration number (D-009). Gari r chobi prokashsho
 * kintu oichhik (D-008).
 */

import { PUBLIC_CARD_FIELDS } from '../src/lib/server/jobs';
import { jobPrivateSchema } from '../src/lib/validators/job';

let failed = 0;
const ok = (cond: boolean, label: string) => {
  console.log(`${cond ? ' PASS ' : ' FAIL '} ${label}`);
  if (!cond) failed++;
};

console.log('━━ Prokashsho card ━━');

/* 1 - gopon schema r ekta ghor o talikay nai */
const privateKeys = Object.keys(jobPrivateSchema.shape);
const overlap = PUBLIC_CARD_FIELDS.filter((f) => privateKeys.includes(f as string));
ok(
  overlap.length === 0,
  `gopon schema r kono ghor card e nai${overlap.length ? ` - dhuke geche: ${overlap.join(', ')}` : ''}`,
);

/* 2 - naam dhore o pahara: banan bodle schema theke sore gele o dhora pore */
const FORBIDDEN = [
  'employerName',
  'ownerName',
  'name',
  'fullName',
  'phone',
  'altPhone',
  'fullAddress',
  'address',
  'holdingNo',
  'landmark',
  'email',
  'nid',
  'vehicleRegNo',
  'regNo',
  'plateNo',
];
for (const f of FORBIDDEN) {
  ok(!(PUBLIC_CARD_FIELDS as readonly string[]).includes(f), `'${f}' card e NAI`);
}

/* 3 - bebshar gonona o card e jay na (quota-secrecy invariant).
   Malik leadCount janle beton komaben ba admin bypass korben. */
ok(
  !(PUBLIC_CARD_FIELDS as readonly string[]).includes('leadCount'),
  'leadCount card e NAI - gonona admin er, supply map na',
);

/* 4 - chobi card e thake (oichhik, kintu talikay ache) */
ok(
  (PUBLIC_CARD_FIELDS as readonly string[]).includes('photoPaths'),
  'photoPaths card e ACHE - gari r chobi prokashsho (D-008)',
);

/* 5 - driver er khojar mul ghor gulo card e ACHE */
for (const f of ['vehicleType', 'salary', 'licenseRequired', 'areaId']) {
  ok((PUBLIC_CARD_FIELDS as readonly string[]).includes(f), `'${f}' card e ACHE`);
}

if (failed) {
  console.error(`\n${failed} TA FAIL`);
  process.exit(1);
}
console.log('\nSOB PASS');
