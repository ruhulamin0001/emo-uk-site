import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/**
 * Staging e SOB bondho - fail-closed. NEXT_PUBLIC_ALLOW_INDEXING
 * sposhto 'true' na hole kichu i index hobe na. Staging index hole
 * Google er kase duita ek i lekha thakto, dujoni neme jeto.
 *
 * Ei route ta Docker healthcheck O babohar kore
 * (Dockerfile: fetch /robots.txt) - muchhe dile container
 * chirokal "unhealthy" dekhabe.
 */
export default function robots(): MetadataRoute.Robots {
  const allow = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

  if (!allow) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Admin, api, dashboard - kokhono na
        disallow: ['/admin', '/admin/*', '/api/*', '/dashboard', '/payment/*'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
