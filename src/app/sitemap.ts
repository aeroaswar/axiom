import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getCoas, getPathways, getPublishedSlugs } from '@/lib/site/catalogue';
import { absolute, localePath, siteUrl } from '@/lib/site/seo';

export const revalidate = 60;

// Both locales, every indexable page, and the compound and pathway pages read from the database —
// a compound that is unpublished never appears, and a renamed one cannot leave a stale entry.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pathways, products, coas] = await Promise.all([getPathways(), getPublishedSlugs(), getCoas()]);
  const base = siteUrl();

  const paths: { path: string; lastModified?: Date; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/products', priority: 0.95, changeFrequency: 'daily' },
    { path: '/merch', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/coas', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/compounds', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/price-list', priority: 0.9, changeFrequency: 'daily' },
    { path: '/standard', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/how-to-read-a-coa', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/process', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/legal', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/terms', priority: 0.3, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' },
  ];

  for (const p of pathways.filter(x => x.kind === 'peptide')) {
    paths.push({ path: `/compounds/${p.slug}`, priority: 0.8, changeFrequency: 'weekly' });
  }
  for (const p of products) {
    // every product has a shop page; a research compound has its guide page as well
    paths.push({ path: `/products/${p.slug}`, lastModified: new Date(p.updated_at), priority: 0.6, changeFrequency: 'weekly' });
    if (p.kind === 'peptide') paths.push({ path: `/compounds/${p.pathway_slug}/${p.slug}`, lastModified: new Date(p.updated_at), priority: 0.7, changeFrequency: 'weekly' });
  }
  for (const c of coas) paths.push({ path: `/coas/${c.id}`, lastModified: c.issued_at ? new Date(c.issued_at) : undefined, priority: 0.4, changeFrequency: 'monthly' });

  const entries: MetadataRoute.Sitemap = [];
  for (const e of paths) {
    const languages: Record<string, string> = {};
    for (const l of routing.locales) languages[l] = `${base}${localePath(l, e.path)}`;
    languages['x-default'] = `${base}${localePath(routing.defaultLocale, e.path)}`;
    for (const locale of routing.locales) {
      entries.push({
        url: absolute(locale, e.path),
        lastModified: e.lastModified,
        changeFrequency: e.changeFrequency,
        priority: e.priority,
        alternates: { languages },
      });
    }
  }
  return entries;
}
