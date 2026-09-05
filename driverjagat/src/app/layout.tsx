import type { Metadata } from 'next';
import { DM_Sans, Noto_Sans_Bengali } from 'next/font/google';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { SiteHeader } from '@/components/SiteHeader';
import './globals.css';

/* globals.css er --font-* variable gulor sathe nam EK hote HOBE -
   na hole Bangla te fallback font e □□□ ashe */
const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-noto-bengali',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.nameBn} - ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.nameBn}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  icons: {
    icon: [
      /* SVG age - vector browser e sob size e dhardhalo */
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  openGraph: {
    title: `${siteConfig.nameBn} - ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.nameBn,
    /* scripts/make-icons.ts logo.svg theke banay - logo bodlale abar chalaben */
    images: [{ url: '/og.png', width: 1200, height: 630 }],
    locale: 'bn_BD',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn" className={`${notoBengali.variable} ${dmSans.variable}`}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="border-t border-ink-200 bg-white py-6 text-center text-sm text-ink-400">
          <p>
            {siteConfig.nameBn} · সহায়তা:{' '}
            <a href={`https://wa.me/${siteConfig.support.whatsapp}`} className="text-brand-700">
              WhatsApp
            </a>{' '}
            · <Link href="/track">পোস্টের খোঁজ</Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
