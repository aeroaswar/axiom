import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { pick, type Pathway, type ShopQuery } from '@/lib/site/catalogue';

/**
 * The shop's toolbar in the reference's order: the search (left, one GET form with the sort), then
 * one row of pills: All products, each research pathway, Devices, Merch, and Saved when the browser
 * holds a saved list. Every pill is a link that carries the rest of the query, so the page is the
 * URL and the URL is the page.
 */
export function shopHref(q: ShopQuery, patch: Partial<ShopQuery>): { pathname: string; query?: Record<string, string> } {
  const next: Record<string, string> = {};
  const merged = { ...q, ...patch };
  for (const k of ['kind', 'pathway', 'q', 'sort', 'saved'] as const) {
    const v = merged[k];
    if (v && v !== 'all' && v !== 'default') next[k] = v;
  }
  return Object.keys(next).length ? { pathname: '/products', query: next } : { pathname: '/products' };
}

export async function ShopFilters({ q, pathways, count, shown, total, savedCount, locale, suggestions }: {
  q: ShopQuery; pathways: Pathway[]; count: number; shown: number; total: number; savedCount: number; locale: string; suggestions: string[];
}) {
  const t = await getTranslations('site.shop');
  const research = pathways.filter(p => p.kind === 'peptide');
  const none = !q.kind && !q.pathway && !q.saved;
  const filtered = Boolean(q.q || q.kind || q.pathway || q.saved);
  return (
    <>
      <form className="ptool" method="get" action="/products" role="search">
        {q.kind ? <input type="hidden" name="kind" value={q.kind} /> : null}
        {q.pathway ? <input type="hidden" name="pathway" value={q.pathway} /> : null}
        {q.saved ? <input type="hidden" name="saved" value="1" /> : null}
        <label className="search" htmlFor="shop-q">
          <Icon name="search" />
          <input id="shop-q" name="q" type="search" defaultValue={q.q ?? ''} placeholder={t('search_placeholder')} aria-label={t('search')} autoComplete="off" list="shop-sugg" />
          <datalist id="shop-sugg">{suggestions.map(x => <option key={x} value={x} />)}</datalist>
          <button type="submit">{t('search_btn')}</button>
        </label>
        <div className="sortwrap">
          <label htmlFor="shop-sort">{t('sort_by')}</label>
          <select id="shop-sort" name="sort" defaultValue={q.sort ?? 'default'}>
            <option value="default">{t('sort_default')}</option>
            <option value="name">{t('sort_name')}</option>
            <option value="price">{t('sort_price')}</option>
            <option value="price_desc">{t('sort_price_desc')}</option>
          </select>
          <button type="submit" className="btn btn-sm sr-only sr-only-focusable">{t('sort')}</button>
        </div>
        <span className="cnt" data-rows={count}>
          <span>{shown < count ? t('showing_of', { shown, count }) : t('showing', { count })}{q.q ? ` · “${q.q}”` : ''}</span>
          {filtered ? <Link href="/products" className="clear">{t('clear')}</Link> : null}
          <Link href="/price-list" className="tlink pl">{t('price_list_link')} <Icon name="arrow" className="ar" /></Link>
        </span>
      </form>
      <nav className="pills" aria-label={t('pathways')}>
        <Link href={shopHref(q, { kind: undefined, pathway: undefined, saved: undefined })} className={`chip${none ? ' on' : ''}`}>{t('all_products')}</Link>
        {research.map(p => (
          <Link key={p.slug} href={shopHref(q, { kind: undefined, pathway: p.slug, saved: undefined })} className={`chip${q.pathway === p.slug ? ' on' : ''}`}>
            {pick(locale, p.name_en, p.name_id)}
          </Link>
        ))}
        <Link href={shopHref(q, { kind: 'device', pathway: undefined, saved: undefined })} className={`chip${q.kind === 'device' ? ' on' : ''}`}>{t('tab_device')}</Link>
        <Link href={shopHref(q, { kind: 'apparel', pathway: undefined, saved: undefined })} className={`chip${q.kind === 'apparel' ? ' on' : ''}`}>{t('tab_apparel')}</Link>
        {savedCount || q.saved ? (
          <Link href={shopHref(q, { kind: undefined, pathway: undefined, saved: '1' })} className={`chip${q.saved ? ' on' : ''}`}>
            <Icon name="bookmark-f" style={{ marginRight: 6, fontSize: 11 }} />{t('saved_chip')}{savedCount ? ` · ${savedCount}` : ''}
          </Link>
        ) : null}
      </nav>
    </>
  );
}
