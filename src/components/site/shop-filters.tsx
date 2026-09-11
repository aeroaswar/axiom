import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { pick, type Pathway, type ShopQuery } from '@/lib/site/catalogue';

/**
 * The shop's toolbar. Kind tabs and pathway chips are links that carry the rest of the query; the
 * search and the sort are one GET form. So every control is a real navigation, works without
 * JavaScript, and the result it produces is the server-rendered page — nothing is filtered in
 * the browser and nothing can disagree with the URL.
 */
export function shopHref(q: ShopQuery, patch: Partial<ShopQuery>): { pathname: string; query?: Record<string, string> } {
  const next: Record<string, string> = {};
  const merged = { ...q, ...patch };
  for (const k of ['kind', 'pathway', 'q', 'sort'] as const) {
    const v = merged[k];
    if (v && v !== 'all' && v !== 'default') next[k] = v;
  }
  return Object.keys(next).length ? { pathname: '/products', query: next } : { pathname: '/products' };
}

export async function ShopFilters({ q, pathways, count, total }: { q: ShopQuery; pathways: Pathway[]; count: number; total: number }) {
  const t = await getTranslations('site.shop');
  const kind = q.kind ?? 'all';
  const tabs: { key: string; label: string }[] = [
    { key: 'all', label: t('tab_all') }, { key: 'peptide', label: t('tab_peptide') },
    { key: 'device', label: t('tab_device') }, { key: 'apparel', label: t('tab_apparel') },
  ];
  const shown = pathways.filter(p => kind === 'all' || p.kind === kind);
  const dirty = !!(q.q || q.pathway || q.sort);
  return (
    <div className="shop-tools">
      <nav className="tabs" aria-label={t('tab_all')}>
        {tabs.map(x => (
          <Link key={x.key} href={shopHref(q, { kind: x.key === 'all' ? undefined : x.key, pathway: undefined })} className={kind === x.key ? 'on' : ''} aria-current={kind === x.key ? 'page' : undefined}>
            {x.label}
          </Link>
        ))}
      </nav>
      {shown.length > 1 ? (
        <div className="chips" style={{ borderBottom: 'none', padding: '0' }} aria-label={t('pathways')}>
          <Link href={shopHref(q, { pathway: undefined })} className={`chip${!q.pathway ? ' on' : ''}`}>{t('all_pathways')}</Link>
          {shown.map(p => (
            <Link key={p.slug} href={shopHref(q, { pathway: p.slug })} className={`chip${q.pathway === p.slug ? ' on' : ''}`}>
              <span className="mono-n" style={{ marginRight: 8, opacity: .6 }}>{p.no}</span>{pick(p.kind, p.name_en, p.name_id)}
            </Link>
          ))}
        </div>
      ) : null}
      <form className="tools-row" method="get" action="/products" role="search">
        {q.kind ? <input type="hidden" name="kind" value={q.kind} /> : null}
        {q.pathway ? <input type="hidden" name="pathway" value={q.pathway} /> : null}
        <div className="field grow">
          <label htmlFor="shop-q">{t('search')}</label>
          <input id="shop-q" name="q" type="search" defaultValue={q.q ?? ''} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="shop-sort">{t('sort')}</label>
          <select id="shop-sort" name="sort" defaultValue={q.sort ?? 'default'}>
            <option value="default">{t('sort_default')}</option>
            <option value="name">{t('sort_name')}</option>
            <option value="price">{t('sort_price')}</option>
            <option value="price_desc">{t('sort_price_desc')}</option>
          </select>
        </div>
        <button type="submit" className="btn btn-sm">{t('search_btn')}</button>
        {dirty ? <Link href={shopHref(q, { q: undefined, pathway: undefined, sort: undefined })} className="tlink" style={{ paddingBottom: 12 }}>{t('clear')}</Link> : null}
        <span className="cnt" data-rows={count}>{t('showing', { count })}{count !== total ? ` · ${total}` : ''}</span>
      </form>
    </div>
  );
}
