/**
 * Config o moulik niyom gulo SOTTI kaj kore kina.
 *
 *   npm run check:config
 *
 * RentJagat er check-config er DriverJagat songskoron. Protita
 * porikkha emon, fix ta sorale LAL hoy.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FEES, JOB, MATCHING, paymentAmount } from '../src/config/business';
import { siteConfig } from '../src/config/site';
import {
  CALL_OUTCOME,
  EMPLOYER_STATUS,
  JOB_STAGE,
  JOB_STAGE_ORDER,
  LICENSE_TYPE,
  PAYMENT_KIND,
  VEHICLE_TYPE,
  canPublish,
  isMatch,
  licenseCovers,
  shouldTryNext,
  type JobStatus,
} from '../src/types/enums';
import { STAGE_MESSAGE } from '../src/lib/tracking-messages';
import {
  makeTrackingCode,
  normalizeTrackingCode,
  parseTrackingCode,
} from '../src/lib/tracking-code';
import { normalizeBdPhone, fieldErrors } from '../src/lib/validators/primitives';
import { jobIntakeSchema, leadSchema } from '../src/lib/validators/job';
import { areas, districts, divisions } from '../src/data/locations';
import { taka, toBn } from '../src/lib/format';

let fails = 0;
const ok = (cond: boolean, what: string, extra = '') => {
  if (!cond) fails++;
  console.log(` ${cond ? 'PASS' : 'FAIL'}  ${what}${extra ? ' - ' + extra : ''}`);
};

const root = join(__dirname, '..');

console.log('\n━━ 1 · Taka - launch pricing (D-002) ━━');
ok(FEES.jobFee === 100, 'job post fee ৳100');
ok(FEES.connectionFee === 500, 'connection fee ৳500');
ok(JOB.freeQuota === 0, 'free post NAI');
ok(paymentAmount(PAYMENT_KIND.job_fee) === 100, 'paymentAmount(job) = 100');
ok(paymentAmount(PAYMENT_KIND.connection_fee) === 500, 'paymentAmount(connection) = 500');
ok(JOB.approvedUnpaidExpiryDays > 0, 'approve kore taka na dile meyad ache');
ok(JOB.validDays === 30, 'D-005: meyad 30 din - driver er kaj taratari bhore');
ok(JOB.minPhotos === 0 && JOB.maxPhotos >= 1, 'D-008: chobi oichhik, kintu deya jay');

console.log('\n━━ 2 · Stage machine ━━');
ok(JOB_STAGE_ORDER[0] === JOB_STAGE.pending, 'jibon suru pending e');
ok(JOB_STAGE_ORDER[JOB_STAGE_ORDER.length - 1] === JOB_STAGE.completed, 'sesh completed e');
ok(canPublish(EMPLOYER_STATUS.verified), 'verified hole prokash jay');
ok(!canPublish(EMPLOYER_STATUS.approved_unpaid), 'taka na dile prokash jay NA');
ok(isMatch(CALL_OUTCOME.agreed), 'agreed = match');
ok(!isMatch(CALL_OUTCOME.declined), 'declined match na');
ok(shouldTryNext(CALL_OUTCOME.no_answer), 'phone na dhorle porer jon');
ok(MATCHING.shortlistSize === 3, 'ek shathe 3 jon alochonay');

/* Tracking pata - PROTITA obostha r ekta barta ache, nahole
   kono ekta stage e manush faka pata dekhto */
const allStatuses: JobStatus[] = [
  'pending', 'published', 'shortlisted', 'onboarding', 'completed',
  'rejected', 'needs_edit', 'expired', 'cancelled', 'hired_outside',
];
for (const s of allStatuses) {
  ok(Boolean(STAGE_MESSAGE[s]), `tracking barta ache: ${s}`);
}

console.log('\n━━ 3 · License niyom ━━');
ok(licenseCovers(LICENSE_TYPE.light, VEHICLE_TYPE.private_car), 'light license e private car chole');
ok(!licenseCovers(LICENSE_TYPE.light, VEHICLE_TYPE.truck), 'light license e truck chole NA');
ok(licenseCovers(LICENSE_TYPE.heavy, VEHICLE_TYPE.bus), 'heavy license e bus chole');
ok(!licenseCovers(LICENSE_TYPE.motorcycle, VEHICLE_TYPE.private_car), 'motorcycle license e car chole NA');

console.log('\n━━ 4 · Tracking code - DJ prefix ━━');
const dhakaDiv = divisions.find((d) => d.name === 'Dhaka')!;
const c = makeTrackingCode({ month: 8, divisionId: dhakaDiv.id, serial: 123 });
ok(c === 'DJ-HD-00123', 'August+Dhaka = DJ-HD-00123', c);
ok(siteConfig.trackingPrefix === 'DJ', 'prefix DJ (DriverJagat)');
ok(parseTrackingCode(c)!.month === 8, 'mash pora jay');
ok(normalizeTrackingCode('dj hd 123') === 'DJ-HD-00123', 'phone e bola code o chole');
ok(normalizeTrackingCode('RJ-HD-00123') === null, 'RentJagat er code ekhane chole NA');
ok(normalizeTrackingCode('MJ-HD-00123') === null, 'MarriageJagat er code ekhane chole NA');
ok(normalizeTrackingCode('TJ-HD-00123') === null, 'TutorJagat er code ekhane chole NA');

console.log('\n━━ 5 · Phone ━━');
ok(normalizeBdPhone('01712345678') === '+8801712345678', 'sadharon');
ok(normalizeBdPhone('০১৭১২৩৪৫৬৭৮') === '+8801712345678', 'Bangla onko');
ok(normalizeBdPhone('017-1234-5678') === '+8801712345678', 'dash soho');
ok(normalizeBdPhone('01212345678') === null, 'bhul prefix dhora pore');

console.log('\n━━ 6 · Job form er niyom ━━');
const dhaka = districts.find((d) => d.name === 'Dhaka')!;
const dhakaArea = areas.find((a) => a.districtId === dhaka.id)!;
const base = {
  public: {
    jobType: 'full_time', vehicleType: 'private_car', employerType: 'family',
    salary: 18000, salaryNegotiable: false, benefits: ['food'],
    dutyHours: 'h10', residence: 'live_out',
    licenseRequired: 'light', experienceYearsMin: 2,
    startFrom: '2026-10',
    divisionId: dhaka.divisionId, districtId: dhaka.id, areaId: dhakaArea.id,
  },
  private: {
    employerName: 'Md Abdullah', phone: '01712345678', email: '',
    fullAddress: 'House 1, Road 2, Mirpur, Dhaka',
  },
};

const good = jobIntakeSchema.safeParse(base);
ok(good.success, 'thik data pass kore', good.success ? '' : JSON.stringify(fieldErrors(good.error)));
if (good.success) {
  ok(good.data.private.phone === '+8801712345678', 'phone ek rokom kore rakha hoy');
}

const truckLight = jobIntakeSchema.safeParse({
  ...base,
  public: { ...base.public, vehicleType: 'truck', licenseRequired: 'light' },
});
ok(!truckLight.success, 'truck e light license atkay - medium/heavy lagbe');

const truckHeavy = jobIntakeSchema.safeParse({
  ...base,
  public: { ...base.public, vehicleType: 'truck', licenseRequired: 'heavy' },
});
ok(truckHeavy.success, 'truck + heavy chole');

const bikeCarLicense = jobIntakeSchema.safeParse({
  ...base,
  public: { ...base.public, vehicleType: 'motorcycle', licenseRequired: 'light' },
});
ok(!bikeCarLicense.success, 'motorcycle e light license atkay');

const crazySalary = jobIntakeSchema.safeParse({
  ...base, public: { ...base.public, salary: 500 },
});
ok(!crazySalary.success, 'osombhob kom beton atkay (typo dhora)');

const badMonth = jobIntakeSchema.safeParse({
  ...base, public: { ...base.public, startFrom: '2026-13' },
});
ok(!badMonth.success, 'bhua mash atkay');

const lead = leadSchema.safeParse({
  name: 'করিম', phone: '০১৮১১১১১১১১', licenseType: 'light', experienceYears: '৫',
});
ok(lead.success && lead.data.experienceYears === 5, 'driver lead - Bangla onko soho pass kore');
const leadNoLicense = leadSchema.safeParse({ name: 'করিম', phone: '01811111111' });
ok(!leadNoLicense.success, 'lead e license chara atkay');

console.log('\n━━ 7 · Login o session (TutorJagat er shikkha) ━━');
{
  const authSrc = readFileSync(join(root, 'src/lib/server/auth.ts'), 'utf8');
  /* Nokol admin er DUITA shorto - NEXT_PUBLIC_USE_EMULATOR ekta
     build-time var, eka thakle ekta bhul build-arg e PROTITA
     visitor malik hoye jeto */
  ok(
    /NODE_ENV\s*!==\s*'production'/.test(authSrc),
    'nokol admin er DUITA shorto - emulator AR production-na',
  );

  for (const f of ['Dockerfile', 'docker-compose.yml']) {
    ok(
      /NODE_ENV[=:]\s*production/.test(readFileSync(join(root, f), 'utf8')),
      `${f} e NODE_ENV=production`,
    );
  }

  for (const r of ['session', 'signout']) {
    ok(
      /sameOrigin\(req\)/.test(readFileSync(join(root, `src/app/api/auth/${r}/route.ts`), 'utf8')),
      `/api/auth/${r} - onno site theke daka jay NA (login CSRF)`,
    );
  }

  ok(
    /revokeRefreshTokens/.test(readFileSync(join(root, 'src/app/api/auth/signout/route.ts'), 'utf8')),
    'logout Firebase e session SOTTI bati kore',
  );
}

console.log('\n━━ 8 · Admin patar pahara - folder ghure dekha ━━');
{
  /**
   * TutorJagat e ei porikkha ekta ASOL fak dhorechilo -
   * "pore guard boshabo" bola ekta pata production e khule
   * giyechilo. Manush bhole, script bhole na.
   */
  const adminDir = join(root, 'src', 'app', 'admin');
  const pages: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === 'page.tsx') pages.push(full);
    }
  };
  walk(adminDir);

  const layout = readFileSync(join(adminDir, 'layout.tsx'), 'utf8');
  ok(/requireStaffPage/.test(layout), 'layout e pahara ache');

  const naked = pages.filter(
    (p) => !/requireStaffPage|requireOwnerPage/.test(readFileSync(p, 'utf8')),
  );
  ok(
    naked.length === 0,
    `protita admin pata te NIJER pahara (${pages.length} ta pata)`,
    naked.map((p) => p.split(/admin[\\/]/)[1]).join(', '),
  );

  /* Header er admin link sudhu staff dekhen */
  const header = readFileSync(join(root, 'src/components/SiteHeader.tsx'), 'utf8');
  ok(/isStaff\(/.test(header), 'header er admin link SUDHU staff dekhen');
}

console.log('\n━━ 9 · Deploy er mora jinish ━━');
ok(existsSync(join(root, 'src/app/robots.ts')), 'robots ache - Docker healthcheck ei pata i mare');
ok(existsSync(join(root, '.dockerignore')), '.dockerignore ache');
ok(
  readFileSync(join(root, '.dockerignore'), 'utf8').includes('.env.local'),
  '.env.local image e dhoke NA',
);
ok(existsSync(join(root, 'public/icon-512.png')), 'PWA icon ache');
ok(existsSync(join(root, 'public/logo.svg')), 'logo ache');
ok(existsSync(join(root, 'public/og.png')), 'OG share card ache');
ok(
  readFileSync(join(root, 'docker-compose.yml'), 'utf8').includes(siteConfig.domain),
  'docker-compose er Traefik host = site.ts er domain',
);

console.log('\n━━ 10 · Bangla ━━');
ok(taka(100) === '৳১০০', 'taka Banglay', taka(100));
ok(toBn(2026) === '২০২৬', 'onko Banglay');

console.log(`\n${fails === 0 ? 'SOB PASS' : fails + ' TA FAIL'}\n`);
process.exit(fails === 0 ? 0 : 1);
