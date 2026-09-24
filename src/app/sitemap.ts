import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { getPathways, getPublishedSlugs } from '@/lib/site/catalogue';
import { absolute, localePath, siteUrl } from '@/lib/site/seo';

export const revalidate = 60;

// Both locales, every indexable page, and the compound and pathway pages read from the database —
// a compound that is unpublished never appears, and a renamed one cannot leave a stale entry.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [pathways, products] = await Promise.all([getPathways(), getPublishedSlugs()]);
  const base = siteUrl();

  const paths: { path: string; lastModified?: Date; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' }[] = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
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
    paths.push({
      path: p.kind === 'peptide' ? `/compounds/${p.pathway_slug}/${p.slug}` : `/products/${p.slug}`,
      lastModified: new Date(p.updated_at),
      priority: p.kind === 'peptide' ? 0.7 : 0.5,
      changeFrequency: 'weekly',
    });
  }

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
