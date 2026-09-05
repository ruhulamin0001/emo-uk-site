import Link from 'next/link';
import { requireStaffPage } from '@/lib/server/auth';
import { countByStage } from '@/lib/server/jobs';
import { countNewLeads } from '@/lib/server/leads';
import { JOB_STAGE } from '@/types/enums';
import { toBn } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function AdminHomePage() {
  /* Layout check koreche, tobuo ekhane ABAR - dui storer pahara */
  const session = await requireStaffPage();

  const [pending, published, shortlisted, onboarding, newLeads] = await Promise.all([
    countByStage(JOB_STAGE.pending),
    countByStage(JOB_STAGE.published),
    countByStage(JOB_STAGE.shortlisted),
    countByStage(JOB_STAGE.onboarding),
    countNewLeads(),
  ]);

  const cards = [
    { label: 'অপেক্ষমাণ পোস্ট', value: pending, href: '/admin/jobs?stage=pending', hot: pending > 0 },
    { label: 'প্রকাশিত', value: published, href: '/admin/jobs?stage=published', hot: false },
    { label: 'আলোচনায়', value: shortlisted + onboarding, href: '/admin/jobs?stage=shortlisted', hot: false },
    { label: 'নতুন ড্রাইভার লিড', value: newLeads, href: '/admin/leads', hot: newLeads > 0 },
  ];

  return (
    <main>
      <h1 className="text-xl font-bold text-ink-950">স্বাগতম, {session.name}</h1>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`rounded-lg border p-4 ${
              c.hot ? 'border-brand-300 bg-brand-50' : 'border-ink-200 bg-white'
            }`}
          >
            <div className="text-3xl font-bold text-ink-950">{toBn(c.value)}</div>
            <div className="mt-1 text-sm text-ink-600">{c.label}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
