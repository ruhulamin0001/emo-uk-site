import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { getSession } from '@/lib/server/auth';
import { isStaff } from '@/types/enums';

export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="border-b border-ink-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        {/* Logo - public/logo.svg. SVG bole next/image lage na. */}
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt={siteConfig.name} className="h-10 w-auto" />
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/jobs" className="text-ink-600 hover:text-ink-800">
            কাজ খুঁজুন
          </Link>
          <Link href="/track" className="text-ink-600 hover:text-ink-800">
            খোঁজ নিন
          </Link>
          {session ? (
            <>
              {isStaff(session.role) ? (
                <Link href="/admin" className="text-ink-600 hover:text-ink-800">
                  অ্যাডমিন
                </Link>
              ) : null}
              <Link
                href="/dashboard"
                className="rounded-md bg-brand-700 px-3 py-1.5 font-medium text-white hover:bg-brand-800"
              >
                আমার পোস্ট
              </Link>
            </>
          ) : (
            <Link
              href="/post-job"
              className="rounded-md bg-brand-700 px-3 py-1.5 font-medium text-white hover:bg-brand-800"
            >
              ড্রাইভার চাই
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
