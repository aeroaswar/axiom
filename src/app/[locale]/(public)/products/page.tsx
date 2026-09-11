import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { JsonLd } from '@/components/site/json-ld';
import { ShopCard } from '@/components/site/shop-card';
import { ShopFilters } from '@/components/site/shop-filters';
import { filterShop, getCatalogue, getPathways, groupCompounds, pick, type ShopQuery } from '@/lib/site/catalogue';
import { alternates, breadcrumbLd } from '@/lib/site/seo';
import { getPlanTiers, getSettings } from '@/lib/settings';

export const revalidate = 60;

type Params = Promise<{ locale: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.shop' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/products') };
}

/**
 * The shop: every published compound, one card each, grouped by pathway in catalogue order unless
 * a sort is asked for. Kind, pathway, search and sort are URL parameters, so each chip is a link,
 * the page is server-rendered for every combination, and the count in the toolbar is the count in
 * the grid.
 */
export default async function ShopPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q: ShopQuery = { kind: one(sp.kind), pathway: one(sp.pathway), q: one(sp.q), sort: one(sp.sort) };
  const t = await getTranslations('site.shop');
  const tn = await getTranslations('nav');
  const ts = await getTranslations('site.common');
  const [rows, pathways, tiers, settings] = await Promise.all([getCatalogue(), getPathways(), getPlanTiers(), getSettings()]);
  const all = groupCompounds(rows);
  const compounds = filterShop(rows, q);
  const grouped = !q.sort || q.sort === 'default';
  const [t1, t2, t3] = tiers;

  // Chapters by pathway when in catalogue order; a flat grid when sorted.
  const chapters: { key: string; no: string; name: string; items: typeof compounds }[] = [];
  if (grouped) {
    for (const c of compounds) {
      let ch = chapters.find(x => x.key === c.pathway.slug);
      if (!ch) chapters.push((ch = { key: c.pathway.slug, no: c.pathway.no, name: pick(locale, c.pathway.name_en, c.pathway.name_id), items: [] }));
      ch.items.push(c);
    }
  }

  return (
    <>
      <JsonLd data={breadcrumbLd(locale, [{ name: 'AXIOM', path: '/' }, { name: t('title'), path: '/products' }])} />
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{ts('home')}</Link></span><span>{tn('shop')}</span></div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead', { d1: t1?.days ?? 0, d2: t2?.days ?? 0, d3: t3?.days ?? 0 })}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap" style={{ paddingTop: 0 }}>
          <ShopFilters q={q} pathways={pathways} count={compounds.length} total={all.length} />
          <div className="sp-24" />
          {!compounds.length ? (
            <p className="lead" style={{ paddingTop: 20 }}>{t('none')}</p>
          ) : grouped ? (
            <div className="pgrid" data-scope="shop">
              {chapters.map(ch => (
                <div key={ch.key} style={{ display: 'contents' }}>
                  <div className="pgrp" id={ch.key}><span className="mono-n">{ch.no}</span><span className="nm">{ch.name}</span></div>
                  {ch.items.map(c => <ShopCard key={c.slug} c={c} locale={locale} />)}
                </div>
              ))}
            </div>
          ) : (
            <div className="pgrid" data-scope="shop">
              {compounds.map(c => <ShopCard key={c.slug} c={c} locale={locale} />)}
            </div>
          )}
          <div className="sp-44" />
          <div className="ruo">{pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)}</div>
        </div>
      </section>
    </>
  );
}
