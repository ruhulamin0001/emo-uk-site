import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

/**
 * Sthir pata gulo. Job card gulo ICCHAKRITO ekhane HATE LEKHA
 * NA - kaj 30 din e ghure jay, sitemap e dhorle Google purono
 * link dekhato. Feed pata i index hok, card na.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  return [
    { url: base, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/jobs`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${base}/post-job`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/track`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/signin`, changeFrequency: 'monthly', priority: 0.3 },
  ];
}
