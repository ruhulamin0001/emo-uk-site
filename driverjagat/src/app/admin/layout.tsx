import Link from 'next/link';
import { requireStaffPage } from '@/lib/server/auth';
import { ROLE } from '@/types/enums';

export const dynamic = 'force-dynamic';

/**
 * PUROTA /admin er pahara - EI EK JAYGAY.
 *
 * Ei layout er niche protita pata kholar AGE staff check hoy.
 * Tarpor o PROTITA admin page nije abar `requireStaffPage()`
 * daake (blueprint er niyom) - layout ta bhule kono route
 * segment e miss hole o data faas hobe na.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireStaffPage();
  const owner = session.role === ROLE.owner;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <nav className="flex flex-wrap gap-2 border-b border-ink-200 pb-3 text-sm">
        <Link href="/admin" className="rounded-md px-3 py-1.5 font-medium hover:bg-ink-100">
          ড্যাশবোর্ড
        </Link>
        <Link href="/admin/jobs" className="rounded-md px-3 py-1.5 font-medium hover:bg-ink-100">
          পোস্ট
        </Link>
        <Link href="/admin/leads" className="rounded-md px-3 py-1.5 font-medium hover:bg-ink-100">
          ড্রাইভার লিড
        </Link>
        {owner ? (
          <>
            <Link href="/admin/payments" className="rounded-md px-3 py-1.5 font-medium hover:bg-ink-100">
              পেমেন্ট
            </Link>
            <Link href="/admin/staff" className="rounded-md px-3 py-1.5 font-medium hover:bg-ink-100">
              টিম
            </Link>
            <Link href="/admin/moderation" className="rounded-md px-3 py-1.5 font-medium hover:bg-ink-100">
              নিষেধাজ্ঞা
            </Link>
          </>
        ) : null}
      </nav>
      <div className="mt-4">{children}</div>
    </div>
  );
}
