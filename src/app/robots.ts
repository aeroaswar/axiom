import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site/seo';

// Education is indexable. Commerce, the basket and every authenticated surface are not.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  const disallow = ['/api/', '/request', '/request/', '/sign-in', '/account', '/console', '/auth/'];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: [...disallow, ...disallow.map(p => `/en${p}`)] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
