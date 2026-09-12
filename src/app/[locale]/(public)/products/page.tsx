import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { JsonLd } from '@/components/site/json-ld';
import { ShopCard } from '@/components/site/shop-card';
import { ShopFilters } from '@/components/site/shop-filters';
import { filterShop, getCatalogue, getPathways, groupCompounds, pick, type ShopQuery } from '@/lib/site/catalogue';
import { alternates, breadcrumbLd } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';
import { getSaved } from '@/components/account/saved';

// The saved filter and the hearts read a cookie, so the page renders per request.
export const dynamic = 'force-dynamic';

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
  const q: ShopQuery = { kind: one(sp.kind), pathway: one(sp.pathway), q: one(sp.q), sort: one(sp.sort), saved: one(sp.saved) };
  const t = await getTranslations('site.shop');
  const tn = await getTranslations('nav');
  const ts = await getTranslations('site.common');
  const [rows, pathways, settings, saved] = await Promise.all([getCatalogue(), getPathways(), getSettings(), getSaved()]);
  const all = groupCompounds(rows);
  const compounds = filterShop(rows, q, saved);
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const ruoShort = (await getTranslations('common'))('ruo_short');

  return (
    <>
      <JsonLd data={breadcrumbLd(locale, [{ name: 'AXIOM', path: '/' }, { name: t('title'), path: '/products' }])} />
      <section className="page-hero" style={{ paddingTop: 56, paddingBottom: 0, borderBottom: 'none' }}>
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{ts('home')}</Link></span><span>{tn('shop')}</span></div>
          <h1 style={{ fontSize: 'clamp(34px,4.6vw,56px)' }}>{t('title')}</h1>
          <p className="lead" style={{ marginTop: 12 }}>{t('subtitle')}</p>
          <ShopFilters q={q} pathways={pathways} count={compounds.length} total={all.length} savedCount={saved.length} locale={locale} />
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap" style={{ paddingTop: 0 }}>
          {!compounds.length ? (
            <p className="lead" style={{ paddingTop: 20 }}>{t('none')}</p>
          ) : (
            <div className="pgrid cards" data-scope="shop">
              {compounds.map(c => <ShopCard key={c.slug} c={c} locale={locale} purity={threshold} ruo={ruoShort} />)}
            </div>
          )}
          <div className="sp-44" />
          <div className="ruo">{pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)}</div>
        </div>
      </section>
    </>
  );
}
