import Link from 'next/link';
import { requireStaffPage } from '@/lib/server/auth';
import { listLeads } from '@/lib/server/leads';
import { setLeadStatusAction, shortlistLeadAction } from '@/app/actions/admin';
import { AdminForm } from '@/components/AdminForm';
import {
  LEAD_STATUS,
  LEAD_STATUS_LABEL,
  LICENSE_TYPE_LABEL,
  type LeadStatus,
} from '@/types/enums';
import { timeAgo, toBn } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireStaffPage();
  const sp = await searchParams;
  const status = (sp.status && sp.status in LEAD_STATUS ? sp.status : LEAD_STATUS.new) as LeadStatus;

  const rows = await listLeads(status);

  return (
    <main>
      <h1 className="text-xl font-bold text-ink-950">ড্রাইভার লিড</h1>
      <p className="text-sm text-ink-400">
        যে ড্রাইভাররা কোনো কাজে আগ্রহ জানিয়েছেন। ফোন আপনি করবেন - মালিক এদের
        কথা জানেন না, জানবেনও না।
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        {Object.entries(LEAD_STATUS_LABEL).map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/leads?status=${k}`}
            className={`rounded-full px-3 py-1 text-sm ${
              status === k ? 'bg-brand-700 text-white' : 'border border-ink-200 bg-white text-ink-600'
            }`}
          >
            {label}
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
                <th className="px-3 py-2">নাম</th>
                <th className="px-3 py-2">মোবাইল</th>
                <th className="px-3 py-2">লাইসেন্স</th>
                <th className="px-3 py-2">অভিজ্ঞতা</th>
                <th className="px-3 py-2">কাজ</th>
                <th className="px-3 py-2">বার্তা</th>
                <th className="px-3 py-2">কখন</th>
                <th className="px-3 py-2">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-t border-ink-100">
                  <td className="px-3 py-2 font-medium">{l.name}</td>
                  <td className="px-3 py-2 font-mono">{l.phone}</td>
                  <td className="px-3 py-2">{LICENSE_TYPE_LABEL[l.licenseType]}</td>
                  <td className="px-3 py-2">{toBn(l.experienceYears)} বছর</td>
                  <td className="px-3 py-2 font-mono">
                    <Link href={`/admin/jobs/${l.jobId}`} className="text-brand-700 underline">
                      {l.trackingCode}
                    </Link>
                  </td>
                  <td className="max-w-[16rem] px-3 py-2 text-ink-600">{l.note ?? '·'}</td>
                  <td className="px-3 py-2 text-ink-400">{timeAgo(l.createdAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {l.status === LEAD_STATUS.new ? (
                        <AdminForm action={setLeadStatusAction.bind(null, l.id, LEAD_STATUS.called)}>
                          <button className="rounded border border-ink-200 px-2 py-1 text-xs">
                            ফোন করেছি
                          </button>
                        </AdminForm>
                      ) : null}
                      {l.status === LEAD_STATUS.new || l.status === LEAD_STATUS.called ? (
                        <AdminForm action={shortlistLeadAction.bind(null, l.id, l.jobId)}>
                          <button className="rounded bg-info px-2 py-1 text-xs font-semibold text-white">
                            আলোচনায় নিন
                          </button>
                        </AdminForm>
                      ) : null}
                      {l.status !== LEAD_STATUS.converted && l.status !== LEAD_STATUS.dropped ? (
                        <AdminForm action={setLeadStatusAction.bind(null, l.id, LEAD_STATUS.dropped)}>
                          <button className="rounded border border-ink-200 px-2 py-1 text-xs text-ink-600">
                            বাদ
                          </button>
                        </AdminForm>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
