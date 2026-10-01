import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/**
 * PWA - phone er home screen e boshano jay. BD te manush notun
 * app install koren na, kintu home screen icon 0 MB - seta koren.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.nameBn} - ${siteConfig.tagline}`,
    short_name: siteConfig.nameBn,
    description: siteConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    /* Logo r navy - brand-800 (public/logo.svg) */
    theme_color: '#0F3460',
    lang: 'bn-BD',
    dir: 'ltr',
    orientation: 'portrait',
    categories: ['lifestyle', 'business'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
