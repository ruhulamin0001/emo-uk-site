/**
 * Dev er jonno ekta prokashito demo job bosay - emulator e.
 *   npm run emulator   (cholte thakuk)
 *   npx tsx --env-file-if-exists=.env.local --conditions=react-server scripts/seed-demo.ts
 */

import { isEmulator } from '../src/lib/firebase/admin';
import { submitJob } from '../src/lib/server/employers';
import { approveJob } from '../src/lib/server/job-decisions';
import { markManuallyPaid, startPayment } from '../src/lib/server/payments';
import { jobIntakeSchema } from '../src/lib/validators/job';
import { EMPLOYER_STATUS, PAYMENT_KIND, ROLE } from '../src/types/enums';
import { areas, districts } from '../src/data/locations';
import type { Session } from '../src/lib/server/session';

async function main() {
  if (!isEmulator()) throw new Error('SUDHU emulator e');

  const employer: Session = {
    uid: 'demo-employer',
    email: 'demo@driverjagat.test',
    name: 'ডেমো মালিক',
    role: ROLE.employer,
    employerStatus: EMPLOYER_STATUS.none,
    banned: false,
  };
  const staff: Session = {
    uid: 'dev-admin',
    email: 'dev@driverjagat.test',
    name: 'ডেভ অ্যাডমিন',
    role: ROLE.owner,
    employerStatus: EMPLOYER_STATUS.none,
    banned: false,
  };

  const dhaka = districts.find((d) => d.name === 'Dhaka')!;
  const area = areas.find((a) => a.districtId === dhaka.id)!;

  const intake = jobIntakeSchema.parse({
    public: {
      jobType: 'full_time',
      vehicleType: 'private_car',
      employerType: 'family',
      salary: 18000,
      salaryNegotiable: true,
      benefits: ['food', 'bonus', 'weekly_off'],
      dutyHours: 'h10',
      residence: 'live_out',
      licenseRequired: 'light',
      experienceYearsMin: 2,
      startFrom: '2026-10',
      divisionId: dhaka.divisionId,
      districtId: dhaka.id,
      areaId: area.id,
      description: 'সকালে স্কুল ড্রপ, অফিস আনা-নেওয়া। শুক্রবার ছুটি। নন-স্মোকার হলে ভালো।',
    },
    private: {
      employerName: 'ডেমো মালিক',
      phone: '01855555555',
      email: '',
      fullAddress: 'বাড়ি ২২, রোড ৭, ব্লক সি',
      landmark: 'গোলচত্বরের পাশে',
    },
  });

  const sub = await submitJob(employer, intake, []);
  if (!sub.ok) throw new Error(sub.message);
  await approveJob(staff, sub.jobId);
  const pay = await startPayment({
    userId: employer.uid,
    name: 'ডেমো মালিক',
    phone: '+8801855555555',
    kind: PAYMENT_KIND.job_fee,
    jobId: sub.jobId,
    siteUrl: 'http://localhost:3000',
  });
  if (!pay.ok) throw new Error(pay.message);
  await markManuallyPaid(pay.paymentId, staff.uid, 'SEED');

  console.log(`Demo job live: ${sub.trackingCode} (${sub.jobId})`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
