import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/site/seo';

// Education is indexable. Commerce, the basket and every authenticated surface are not.
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  // '/k/' is a protocol card: it carries a client's name, so it is never crawled. The real defence
  // is the code's 80 bits, but a URL that leaks through a referrer should not then be indexed.
  const disallow = ['/api/', '/request', '/request/', '/sign-in', '/account', '/console', '/auth/', '/k/'];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: [...disallow, ...disallow.map(p => `/en${p}`)] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
