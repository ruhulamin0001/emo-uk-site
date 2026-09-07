import Link from 'next/link';
import { requireStaffPage } from '@/lib/server/auth';
import { listJobsByStage } from '@/lib/server/jobs';
import { StageBadge } from '@/components/StageBadge';
import {
  JOB_STAGE,
  VEHICLE_TYPE_LABEL,
  type JobStage,
  type JobStatus,
} from '@/types/enums';
import { findDistrict } from '@/lib/locations';
import { taka, timeAgo, toBn } from '@/lib/format';

export const dynamic = 'force-dynamic';

const TABS: Array<{ key: JobStage | 'needs_edit' | 'rejected'; label: string }> = [
  { key: JOB_STAGE.pending, label: 'অপেক্ষমাণ' },
  { key: JOB_STAGE.published, label: 'প্রকাশিত' },
  { key: JOB_STAGE.shortlisted, label: 'আলোচনায়' },
  { key: JOB_STAGE.onboarding, label: 'ইন্টারভিউ চলছে' },
  { key: JOB_STAGE.completed, label: 'সম্পন্ন' },
  { key: 'needs_edit', label: 'সংশোধনে' },
  { key: 'rejected', label: 'বাতিল' },
];

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  await requireStaffPage();
  const sp = await searchParams;
  const stage = (TABS.find((t) => t.key === sp.stage)?.key ?? JOB_STAGE.pending) as JobStage;

  const rows = await listJobsByStage(stage);

  return (
    <main>
      <h1 className="text-xl font-bold text-ink-950">ড্রাইভার চাই পোস্ট</h1>

      <div className="mt-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/jobs?stage=${t.key}`}
            className={`rounded-full px-3 py-1 text-sm ${
              stage === t.key
                ? 'bg-brand-700 text-white'
                : 'border border-ink-200 bg-white text-ink-600'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 text-center text-ink-400">এই তালিকা খালি।</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-ink-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-ink-600">
              <tr>
                <th className="px-3 py-2">কোড</th>
                <th className="px-3 py-2">গাড়ি</th>
                <th className="px-3 py-2">বেতন</th>
                <th className="px-3 py-2">জেলা</th>
                <th className="px-3 py-2">লিড</th>
                <th className="px-3 py-2">অবস্থা</th>
                <th className="px-3 py-2">জমা</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50">
                  <td className="px-3 py-2 font-mono">
                    <Link href={`/admin/jobs/${r.id}`} className="text-brand-700 underline">
                      {String(r.trackingCode)}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {(VEHICLE_TYPE_LABEL as Record<string, string>)[String(r.vehicleType)] ?? ''}
                  </td>
                  <td className="px-3 py-2">{taka(Number(r.salary ?? 0))}</td>
                  <td className="px-3 py-2">{findDistrict(String(r.districtId ?? ''))?.bn ?? ''}</td>
                  <td className="px-3 py-2">{toBn(r.leadCount)}</td>
                  <td className="px-3 py-2">
                    <StageBadge stage={String(r.stage) as JobStatus} />
                  </td>
                  <td className="px-3 py-2 text-ink-400">{timeAgo(r.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
