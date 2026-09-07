'use client';
import { Fragment, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { usePrices } from './prices';
import { idr } from '@/lib/money';

// Every row of the price list is rendered on the server and lives in the HTML, so a crawler and a
// clinic on a poor connection both get the whole book. Filtering, search and sorting are the only
// things that happen in the browser, over rows that are already there.

export type PriceRow = {
  sku: string; name: string; href: string; dose: string; content: string;
  price: number | null; available: number;
  pathwayNo: string; pathwaySlug: string; pathwayName: string; productId: string;
};

type Sort = 'default' | 'name' | 'price';

export function PriceTable({ rows, signInHref }: { rows: PriceRow[]; signInHref: string }) {
  const t = useTranslations('site.price_list');
  const tc = useTranslations('site.common');
  const [pathway, setPathway] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('default');
  const live = usePrices(useMemo(() => rows.map(r => r.sku), [rows]));
  const priceOf = (r: PriceRow) => (live[r.sku] !== null && live[r.sku] !== undefined ? live[r.sku] : r.price);

  const pathways = useMemo(() => {
    const seen = new Map<string, { slug: string; no: string; name: string }>();
    for (const r of rows) if (!seen.has(r.pathwaySlug)) seen.set(r.pathwaySlug, { slug: r.pathwaySlug, no: r.pathwayNo, name: r.pathwayName });
    return [...seen.values()];
  }, [rows]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter(r =>
      (!pathway || r.pathwaySlug === pathway) &&
      (!needle || r.name.toLowerCase().includes(needle) || r.dose.toLowerCase().includes(needle)));
    if (sort === 'name') out = [...out].sort((a, b) => a.name.localeCompare(b.name) || a.dose.localeCompare(b.dose, undefined, { numeric: true }));
    if (sort === 'price') out = [...out].sort((a, b) => {
      const x = priceOf(a), y = priceOf(b);
      if (x === null && y === null) return a.name.localeCompare(b.name);
      if (x === null) return 1;
      if (y === null) return -1;
      return x - y;
    });
    return out;
    // priceOf reads `live`, which is part of the dependency list through `rows` and the store tick.
  }, [rows, pathway, q, sort, live]);

  const grouped = sort === 'default';
  let lastPathway = '';
  let lastProduct = '';
  const anyGated = shown.some(r => priceOf(r) === null);

  return (
    <>
      <div className="tools">
        <div className="field">
          <label htmlFor="pl-pathway">{t('filter')}</label>
          <select id="pl-pathway" value={pathway} onChange={e => setPathway(e.target.value)}>
            <option value="">{t('all')}</option>
            {pathways.map(p => <option key={p.slug} value={p.slug}>{p.no} · {p.name}</option>)}
          </select>
        </div>
        <div className="field grow">
          <label htmlFor="pl-search">{t('search')}</label>
          <input id="pl-search" type="search" value={q} onChange={e => setQ(e.target.value)} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="pl-sort">{t('sort')}</label>
          <select id="pl-sort" value={sort} onChange={e => setSort(e.target.value as Sort)}>
            <option value="default">{t('sort_default')}</option>
            <option value="name">{t('sort_name')}</option>
            <option value="price">{t('sort_price')}</option>
          </select>
        </div>
        <div className="cnt mono-n" aria-live="polite">{t('showing', { count: shown.length, total: rows.length })}</div>
      </div>

      <div className="tblwrap">
        <table className="tbl" data-rows={rows.length}>
          <caption className="sr-only">{t('title')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('col_item')}</th>
              <th scope="col">{t('col_dose')}</th>
              <th scope="col">{t('col_presentation')}</th>
              <th scope="col" className="n">{t('col_price')}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(r => {
              const newPathway = grouped && r.pathwaySlug !== lastPathway;
              const newProduct = !grouped || r.productId !== lastProduct;
              if (newPathway) lastPathway = r.pathwaySlug;
              if (grouped) lastProduct = r.productId;
              const price = priceOf(r);
              return (
                <Fragment key={r.sku}>
                {newPathway ? (
                  <tr className="grp">
                    <td colSpan={4}><span className="no mono-n">{r.pathwayNo}</span>{r.pathwayName}</td>
                  </tr>
                ) : null}
                <tr data-lot="1">
                  <td className="k">
                    {newProduct ? <Link href={r.href} className="tlink" style={{ fontSize: 12, letterSpacing: '.06em', textTransform: 'none' }}>{r.name}</Link> : null}
                  </td>
                  <td className="id">{r.dose}</td>
                  <td>{r.content}</td>
                  <td className={price === null ? 'n' : 'n money'}>
                    {price === null ? <span className="gated">{tc('gated_cell')}</span> : idr(price)}
                  </td>
                </tr>
                </Fragment>
              );
            })}
            {!shown.length ? <tr><td colSpan={4} className="dim-2" style={{ padding: '34px 14px' }}>{t('none')}</td></tr> : null}
          </tbody>
        </table>
      </div>

      {anyGated ? (
        <p className="gated" style={{ marginTop: 20 }}>
          {t('gated_note')} <Link href={{ pathname: '/sign-in', query: { next: signInHref } }}>{tc('gated_link')}</Link>
        </p>
      ) : null}
    </>
  );
}
