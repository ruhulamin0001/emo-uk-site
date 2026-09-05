import Link from 'next/link';
import { getSession } from '@/lib/server/auth';
import { getUser } from '@/lib/server/employers';
import { getOwnJobs } from '@/lib/server/jobs';
import { getPaymentsFor } from '@/lib/server/payments';
import { startJobPaymentAction } from '@/app/actions/employer';
import { StageBadge } from '@/components/StageBadge';
import { SignOutButton } from '@/components/SignOutButton';
import {
  EMPLOYER_STATUS,
  EMPLOYER_STATUS_LABEL,
  PAYMENT_KIND_LABEL,
  PAYMENT_STATUS_LABEL,
  VEHICLE_TYPE_LABEL,
  type JobStatus,
} from '@/types/enums';
import { FEES } from '@/config/business';
import { taka, timeAgo } from '@/lib/format';
import { findArea } from '@/lib/locations';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'আমার পোস্ট' };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null; // middleware /signin e pathay

  const [user, jobs, payments] = await Promise.all([
    getUser(session.uid),
    getOwnJobs(session.uid),
    getPaymentsFor(session.uid),
  ]);

  const employerStatus = user?.employerStatus ?? EMPLOYER_STATUS.none;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-950">স্বাগতম, {session.name}</h1>
        <SignOutButton />
      </div>

      {employerStatus !== EMPLOYER_STATUS.none ? (
        <p className="mt-2 text-sm text-ink-600">
          অ্যাকাউন্টের অবস্থা: {EMPLOYER_STATUS_LABEL[employerStatus]}
        </p>
      ) : null}

      {/* ── Post gulo ── */}
      <section className="mt-6 rounded-lg bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink-950">আমার ড্রাইভার চাই পোস্ট</h2>
          <Link
            href="/post-job"
            className="rounded-md bg-brand-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            + নতুন পোস্ট
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="mt-6 text-center">
            <p className="text-ink-600">আপনার এখনো কোনো পোস্ট নেই।</p>
            <Link
              href="/post-job"
              className="mt-4 inline-block rounded-lg bg-brand-700 px-6 py-2.5 font-semibold text-white"
            >
              ড্রাইভার চাই পোস্ট দিন
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {jobs.map((l) => {
              const area = findArea(String(l.areaId ?? ''));
              return (
                <li key={l.id} className="rounded-lg border border-ink-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm text-ink-400">{String(l.trackingCode)}</span>
                      <h3 className="font-semibold">
                        {(VEHICLE_TYPE_LABEL as Record<string, string>)[String(l.vehicleType)] ?? ''}
                        {area ? ` · ${area.bn}` : ''} · {taka(Number(l.salary ?? 0))}
                      </h3>
                    </div>
                    <StageBadge stage={String(l.stage) as JobStatus} />
                  </div>

                  {l.awaitingFee ? (
                    <div className="mt-3 rounded-lg bg-warning-bg p-4">
                      <p className="font-medium text-warning">
                        পোস্ট অনুমোদিত হয়েছে। পোস্ট ফি {taka(FEES.jobFee)} দিলেই প্রকাশিত হবে।
                      </p>
                      <form action={startJobPaymentAction.bind(null, l.id)} className="mt-3">
                        <button className="rounded-lg bg-brand-700 px-6 py-2.5 font-semibold text-white hover:bg-brand-800">
                          ফি দিন - {taka(FEES.jobFee)}
                        </button>
                      </form>
                    </div>
                  ) : null}

                  {String(l.stage) === 'needs_edit' ? (
                    <p className="mt-3 rounded-lg bg-warning-bg p-3 text-sm text-warning">
                      কিছু তথ্য সংশোধন দরকার। আমাদের টিম ফোনে জানাবে, অথবা
                      হোয়াটসঅ্যাপে যোগাযোগ করুন।
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Taka ── */}
      {payments.length > 0 ? (
        <section className="mt-6 rounded-lg bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-ink-950">পেমেন্ট</h2>
          <ul className="mt-3 divide-y divide-ink-100">
            {payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>{PAYMENT_KIND_LABEL[p.kind]}</span>
                <span>{taka(p.amount)}</span>
                <span className="text-ink-600">{PAYMENT_STATUS_LABEL[p.status]}</span>
                <span className="text-ink-400">
                  {p.createdAt ? timeAgo(p.createdAt.toMillis()) : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
