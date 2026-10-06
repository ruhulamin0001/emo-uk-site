import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaffPage } from '@/lib/server/auth';
import { getJobForAdmin } from '@/lib/server/jobs';
import { listLeadsForJob } from '@/lib/server/leads';
import {
  approveJobAction,
  callOutcomeAction,
  completeMatchAction,
  rejectJobAction,
  hiredOutsideAction,
  requestEditAction,
  shortlistLeadAction,
} from '@/app/actions/admin';
import { AdminForm } from '@/components/AdminForm';
import { StageBadge } from '@/components/StageBadge';
import {
  CALL_OUTCOME_LABEL,
  DUTY_HOURS_LABEL,
  EMPLOYER_TYPE_LABEL,
  JOB_REJECT_REASON_INFO,
  JOB_STAGE,
  JOB_TYPE_LABEL,
  LEAD_STATUS,
  LEAD_STATUS_LABEL,
  LICENSE_TYPE_LABEL,
  RESIDENCE_LABEL,
  VEHICLE_TYPE_LABEL,
  licenseCovers,
  type JobStatus,
  type VehicleType,
} from '@/types/enums';
import { findArea, findDistrict } from '@/lib/locations';
import { monthBn, taka, timeAgo, toBn } from '@/lib/format';
import { photoUrl } from '@/lib/photo-url';

export const dynamic = 'force-dynamic';

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 border-b border-ink-100 py-1.5 text-sm">
      <span className="text-ink-400">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

const lbl = (map: Record<string, string>, key: unknown): string | undefined =>
  key ? map[String(key)] : undefined;

export default async function AdminJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffPage();
  const { id } = await params;

  const data = await getJobForAdmin(id);
  if (!data) notFound();
  const { view: b, priv } = data;

  const leads = await listLeadsForJob(id);
  const stage = String(b.stage) as JobStatus;
  const photos = Array.isArray(b.photoPaths) ? (b.photoPaths as string[]) : [];
  const vehicle = String(b.vehicleType ?? '') as VehicleType;
  const expMin = Number(b.experienceYearsMin ?? 0);

  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink-950">
          {lbl(VEHICLE_TYPE_LABEL, b.vehicleType)} ড্রাইভার ·{' '}
          <span className="font-mono">{String(b.trackingCode)}</span>
        </h1>
        <StageBadge stage={stage} />
      </div>

      {/* ── Chobi - thakle approve er AGE dekhte HOBE (number plate / phone ache?) ── */}
      {photos.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {photos.map((p) => (
            <a key={p} href={photoUrl(p)} target="_blank">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl(p)} alt="গাড়ির ছবি" className="h-28 w-28 rounded-md object-cover" />
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-400">ছবি নেই (ঐচ্ছিক)।</p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* ── Prokashsho tottho ── */}
        <section className="rounded-lg bg-white p-4 shadow-sm">
          <h2 className="font-semibold">প্রকাশ্য তথ্য</h2>
          <Row
            label="মাসিক বেতন"
            value={`${taka(Number(b.salary ?? 0))}${b.salaryNegotiable ? ' (আলোচনা সাপেক্ষে)' : ''}`}
          />
          <Row label="কাজের ধরন" value={lbl(JOB_TYPE_LABEL, b.jobType)} />
          <Row label="কে খুঁজছেন" value={lbl(EMPLOYER_TYPE_LABEL, b.employerType)} />
          <Row label="ডিউটি" value={lbl(DUTY_HOURS_LABEL, b.dutyHours)} />
          <Row label="থাকা" value={lbl(RESIDENCE_LABEL, b.residence)} />
          <Row label="লাইসেন্স লাগবে" value={lbl(LICENSE_TYPE_LABEL, b.licenseRequired)} />
          <Row label="অভিজ্ঞতা" value={expMin > 0 ? `কমপক্ষে ${toBn(expMin)} বছর` : 'লাগবে না'} />
          <Row label="শুরু" value={b.startFrom ? monthBn(String(b.startFrom)) : undefined} />
          <Row label="এলাকা" value={findArea(String(b.areaId ?? ''))?.bn} />
          <Row label="জেলা" value={findDistrict(String(b.districtId ?? ''))?.bn} />
          <Row label="উৎস" value={b.source === 'admin' ? 'অ্যাডমিন' : 'মালিক নিজে'} />
          <Row label="মোট লিড" value={toBn(b.leadCount)} />
          {b.description ? (
            <p className="mt-2 whitespace-pre-line text-sm text-ink-600">{String(b.description)}</p>
          ) : null}
          <p className="mt-3">
            <Link href={`/jobs/${String(b.trackingCode)}`} className="text-sm text-brand-700 underline">
              প্রকাশ্য পাতাটি দেখুন
            </Link>
          </p>
        </section>

        {/* ── Gopon ghor - SUDHU ei admin patay ── */}
        <section className="rounded-lg border-2 border-brand-100 bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-brand-800">গোপন তথ্য</h2>
          {priv ? (
            <>
              <Row label="মালিক / যোগাযোগ" value={priv.employerName} />
              <Row label="মোবাইল" value={priv.phone} />
              <Row label="বিকল্প নম্বর" value={priv.altPhone} />
              <Row label="ইমেইল" value={priv.email} />
              <Row label="গাড়ির নম্বর" value={priv.vehicleRegNo} />
              <Row label="পূর্ণ ঠিকানা" value={priv.fullAddress} />
              <Row label="কাছের জায়গা" value={priv.landmark} />
            </>
          ) : (
            <p className="text-sm text-ink-400">গোপন নথি পাওয়া যায়নি।</p>
          )}
        </section>
      </div>

      {/* ── Siddhanto ── */}
      {stage === JOB_STAGE.pending ? (
        <section className="mt-4 rounded-lg bg-white p-4 shadow-sm">
          <h2 className="font-semibold">সিদ্ধান্ত</h2>
          <p className="mt-1 text-xs text-ink-400">
            অনুমোদনের আগে: ফোনে মালিকের সাথে কথা বলেছেন? বেতন বাস্তব? ছবিতে
            নম্বর প্লেট বা ফোন নম্বর নেই তো?
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-6">
            <AdminForm action={approveJobAction.bind(null, id)}>
              <button className="rounded-lg bg-success px-5 py-2 font-semibold text-white">
                অনুমোদন করুন
              </button>
              <p className="mt-1 text-xs text-ink-400">
                ফি এলে তবেই প্রকাশ হবে - এখনই ফিডে উঠবে না।
              </p>
            </AdminForm>

            <AdminForm action={rejectJobAction.bind(null, id)} className="flex items-start gap-2">
              <select name="reason" required defaultValue="" className="rounded-md border border-ink-200 px-2 py-2 text-sm">
                <option value="" disabled>
                  বাতিলের কারণ
                </option>
                {Object.entries(JOB_REJECT_REASON_INFO).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <button className="rounded-lg bg-danger px-4 py-2 font-semibold text-white">
                বাতিল
              </button>
            </AdminForm>

            <AdminForm action={requestEditAction.bind(null, id)} className="flex items-start gap-2">
              <input
                name="note"
                placeholder="কী সংশোধন লাগবে"
                className="rounded-md border border-ink-200 px-2 py-2 text-sm"
              />
              <button className="rounded-lg bg-warning px-4 py-2 font-semibold text-white">
                সংশোধনে পাঠান
              </button>
            </AdminForm>
          </div>
        </section>
      ) : null}

      {/* ── Matching desk - lead er upor ── */}
      <section className="mt-4 rounded-lg bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">আগ্রহী ড্রাইভার ({toBn(leads.length)})</h2>
          <div className="flex gap-2">
            {stage === JOB_STAGE.onboarding ? (
              <AdminForm action={completeMatchAction.bind(null, id)}>
                <button className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white">
                  নিয়োগ চূড়ান্ত - সম্পন্ন করুন
                </button>
              </AdminForm>
            ) : null}
            {stage === JOB_STAGE.published || stage === JOB_STAGE.shortlisted ? (
              <AdminForm action={hiredOutsideAction.bind(null, id)}>
                <button className="rounded-lg border border-ink-200 px-4 py-2 text-sm text-ink-600">
                  মালিক নিজে ড্রাইভার নিয়েছেন
                </button>
              </AdminForm>
            ) : null}
          </div>
        </div>

        {leads.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">এখনো কেউ আগ্রহ দেখাননি।</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-left text-ink-600">
                <tr>
                  <th className="px-3 py-2">নাম</th>
                  <th className="px-3 py-2">মোবাইল</th>
                  <th className="px-3 py-2">লাইসেন্স</th>
                  <th className="px-3 py-2">অভিজ্ঞতা</th>
                  <th className="px-3 py-2">নোট</th>
                  <th className="px-3 py-2">অবস্থা</th>
                  <th className="px-3 py-2">কাজ</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  /* Admin er prothom chhakni - license e mele? obhiggota jothesto? */
                  const licenseOk = vehicle ? licenseCovers(l.licenseType, vehicle) : true;
                  const expOk = l.experienceYears >= expMin;
                  return (
                    <tr key={l.id} className="border-t border-ink-100">
                      <td className="px-3 py-2 font-medium">{l.name}</td>
                      <td className="px-3 py-2 font-mono">{l.phone}</td>
                      <td className={`px-3 py-2 ${licenseOk ? '' : 'text-danger'}`}>
                        {LICENSE_TYPE_LABEL[l.licenseType]}
                        {licenseOk ? '' : ' (মেলে না)'}
                      </td>
                      <td className={`px-3 py-2 ${expOk ? '' : 'text-warning'}`}>
                        {toBn(l.experienceYears)} বছর
                      </td>
                      <td className="px-3 py-2 text-ink-600">{l.note ?? '·'}</td>
                      <td className="px-3 py-2">{LEAD_STATUS_LABEL[l.status]}</td>
                      <td className="px-3 py-2">
                        {l.status === LEAD_STATUS.new || l.status === LEAD_STATUS.called ? (
                          <AdminForm action={shortlistLeadAction.bind(null, l.id, id)}>
                            <button className="rounded bg-info px-3 py-1 text-xs font-semibold text-white">
                              আলোচনায় নিন
                            </button>
                          </AdminForm>
                        ) : null}
                        {l.status === LEAD_STATUS.shortlisted ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(CALL_OUTCOME_LABEL).map(([k, label]) => (
                              <AdminForm key={k} action={callOutcomeAction.bind(null, l.id, id, k)}>
                                <button
                                  className={`rounded px-2 py-1 text-xs font-medium ${
                                    k === 'agreed'
                                      ? 'bg-success text-white'
                                      : 'border border-ink-200 bg-white text-ink-600'
                                  }`}
                                >
                                  {label}
                                </button>
                              </AdminForm>
                            ))}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-ink-400">
          নিয়ম মনে রাখুন: ফোন আপনি করবেন, দুই পক্ষ নিজেরা নয়। ড্রাইভারের লাইসেন্স
          আসল কিনা ফোনে বা ছবিতে মিলিয়ে নিন। দুই পক্ষ রাজি হলে তবেই নম্বর আর
          ঠিকানা বিনিময়, আর বাকি আগ্রহীরা কখনো জানবেন না যে তাদের নিয়ে ভাবা
          হয়েছিল। {timeAgo(Number(b.createdAt))} জমা।
        </p>
      </section>
    </main>
  );
}
