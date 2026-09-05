import { notFound } from 'next/navigation';
import { getPublicJobByCode } from '@/lib/server/jobs';
import { StageBadge } from '@/components/StageBadge';
import { LeadForm } from './LeadForm';
import {
  BENEFIT_LABEL,
  DUTY_HOURS_LABEL,
  EMPLOYER_TYPE_LABEL,
  JOB_STAGE,
  JOB_TYPE_LABEL,
  LICENSE_TYPE_LABEL,
  RESIDENCE_LABEL,
  VEHICLE_TYPE_LABEL,
  type JobStatus,
} from '@/types/enums';
import { findArea, findDistrict, findDivision } from '@/lib/locations';
import { monthBn, taka, toBn } from '@/lib/format';
import { photoUrl } from '@/lib/photo-url';

export const dynamic = 'force-dynamic';

const lbl = (map: Record<string, string>, key: unknown): string | null =>
  key ? (map[String(key)] ?? null) : null;

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-ink-100 py-2 text-sm">
      <span className="text-ink-400">{label}</span>
      <span className="text-right font-medium text-ink-800">{value}</span>
    </div>
  );
}

/**
 * Card er purno pata.
 *
 * Ei patay JA dekhano hoy sob `JobView` theke - ar seta
 * PUBLIC_CARD_FIELDS talika. Malik er nam, phone, thikana, gari r
 * number ei pata KOKHONO janbe i na (D-009).
 */
export default async function JobPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const b = await getPublicJobByCode(decodeURIComponent(code));
  if (!b) notFound();

  const district = findDistrict(String(b.districtId ?? ''));
  const division = findDivision(String(b.divisionId ?? ''));
  const area = findArea(String(b.areaId ?? ''));
  const stage = String(b.stage) as JobStatus;
  const acceptingLeads = stage === JOB_STAGE.published;

  const photos = Array.isArray(b.photoPaths) ? (b.photoPaths as string[]) : [];
  const benefits = Array.isArray(b.benefits) ? (b.benefits as string[]) : [];
  const exp = Number(b.experienceYearsMin ?? 0);

  const location = [area?.bn, district?.bn, division ? `${division.bn} বিভাগ` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink-950">
          {lbl(VEHICLE_TYPE_LABEL, b.vehicleType)} ড্রাইভার · {String(b.trackingCode)}
        </h1>
        <StageBadge stage={stage} />
      </div>

      {/* ── Chobi ── */}
      {photos.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p) => (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={p}
              src={photoUrl(p)}
              alt="গাড়ির ছবি"
              loading="lazy"
              className="h-40 w-full rounded-lg object-cover"
            />
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 md:grid-cols-5">
        {/* ── Tottho ── */}
        <div className="md:col-span-3">
          <section className="rounded-lg bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink-950">বেতন ও সুবিধা</h2>
            <Row
              label="মাসিক বেতন"
              value={`${taka(Number(b.salary ?? 0))}${b.salaryNegotiable ? ' (আলোচনা সাপেক্ষে)' : ''}`}
            />
            <Row label="কাজের ধরন" value={lbl(JOB_TYPE_LABEL, b.jobType)} />
            <Row label="ডিউটি" value={lbl(DUTY_HOURS_LABEL, b.dutyHours)} />
            <Row label="থাকার ব্যবস্থা" value={lbl(RESIDENCE_LABEL, b.residence)} />
            <Row label="কবে থেকে" value={b.startFrom ? monthBn(String(b.startFrom)) : null} />
          </section>

          <section className="mt-4 rounded-lg bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink-950">কী লাগবে</h2>
            <Row label="গাড়ি" value={lbl(VEHICLE_TYPE_LABEL, b.vehicleType)} />
            <Row label="লাইসেন্স" value={lbl(LICENSE_TYPE_LABEL, b.licenseRequired)} />
            <Row
              label="অভিজ্ঞতা"
              value={exp > 0 ? `কমপক্ষে ${toBn(exp)} বছর` : 'নতুন ড্রাইভারও চলবে'}
            />
            <Row label="কে খুঁজছেন" value={lbl(EMPLOYER_TYPE_LABEL, b.employerType)} />
            <Row label="এলাকা" value={location || null} />
          </section>

          {benefits.length > 0 ? (
            <section className="mt-4 rounded-lg bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-ink-950">বেতনের বাইরে যা পাবেন</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {benefits.map((a) => (
                  <span key={a} className="rounded bg-success-bg px-2 py-0.5 text-xs text-success">
                    {lbl(BENEFIT_LABEL, a) ?? a}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {b.description ? (
            <section className="mt-4 rounded-lg bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-ink-950">বিস্তারিত</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-ink-600">
                {String(b.description)}
              </p>
            </section>
          ) : null}

          <p className="mt-4 text-xs text-ink-400">
            নিরাপত্তার জন্য মালিকের ঠিকানা আর নম্বর এখানে দেখানো হয় না। দুই পক্ষ
            রাজি হলে আমাদের টিম ঠিকানা ও নম্বর মিলিয়ে দেয়।
          </p>
        </div>

        {/* ── Agroho ── */}
        <div className="md:col-span-2">
          <div className="sticky top-4 rounded-lg bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-ink-950">এই কাজে আগ্রহী?</h2>
            {acceptingLeads ? (
              <>
                <p className="mt-1 text-sm text-ink-600">
                  নাম, নম্বর, লাইসেন্স আর অভিজ্ঞতা দিন। আমাদের টিম ফোন করে
                  ইন্টারভিউর ব্যবস্থা করবে।
                </p>
                <div className="mt-4">
                  <LeadForm trackingCode={String(b.trackingCode)} />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-600">
                এই কাজ নিয়ে এখন আলোচনা চলছে, নতুন আগ্রহ নেওয়া হচ্ছে না।
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
