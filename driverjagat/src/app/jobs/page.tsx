import { getPublishedJobs } from '@/lib/server/jobs';
import { JobCard } from '@/components/JobCard';
import { VEHICLE_TYPE, VEHICLE_TYPE_LABEL, type VehicleType } from '@/types/enums';
import { districts } from '@/lib/locations';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'ড্রাইভারের কাজ খুঁজুন' };

/**
 * Feed - login LAGE NA. Google theke asha manush o dekhben.
 * Card e kono PII nai (PUBLIC_CARD_FIELDS), tai khola rakha nirapod.
 */
export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string; district?: string }>;
}) {
  const sp = await searchParams;
  const vehicleType = Object.values(VEHICLE_TYPE).includes(sp.vehicle as VehicleType)
    ? (sp.vehicle as VehicleType)
    : undefined;
  const districtId = sp.district || undefined;

  const rows = await getPublishedJobs({ vehicleType, districtId });

  const link = (v?: string, d?: string) => {
    const q = new URLSearchParams();
    if (v) q.set('vehicle', v);
    if (d) q.set('district', d);
    const s = q.toString();
    return s ? `/jobs?${s}` : '/jobs';
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink-950">ড্রাইভারের কাজ খুঁজুন</h1>
      <p className="mt-1 text-sm text-ink-600">
        প্রতিটি পোস্ট যাচাই করা। পছন্দ হলে আগ্রহ জানান, আমরা ফোন করব। ড্রাইভারের জন্য সব ফ্রি।
      </p>

      {/* ── Chakni ── */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {[
          { v: undefined, label: 'সব গাড়ি' },
          ...Object.values(VEHICLE_TYPE).map((v) => ({
            v,
            label: VEHICLE_TYPE_LABEL[v],
          })),
        ].map((o) => (
          <a
            key={o.label}
            href={link(o.v, districtId)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              vehicleType === o.v
                ? 'bg-brand-700 text-white'
                : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
            }`}
          >
            {o.label}
          </a>
        ))}

        <form method="get" className="ml-auto">
          {vehicleType ? <input type="hidden" name="vehicle" value={vehicleType} /> : null}
          <select
            name="district"
            defaultValue={districtId ?? ''}
            className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">সব জেলা</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.bn}
              </option>
            ))}
          </select>
          <button className="ml-2 rounded-md border border-ink-200 bg-white px-3 py-1.5 text-sm hover:bg-ink-50">
            দেখুন
          </button>
        </form>
      </div>

      {/* ── Talika ── */}
      {rows.length === 0 ? (
        <p className="mt-12 text-center text-ink-400">
          এই মুহূর্তে এখানে কোনো কাজ নেই। ফিল্টার বদলে দেখুন।
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((b) => (
            <JobCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </main>
  );
}
