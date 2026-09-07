import { Fragment } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { FilterChips } from '../shared/filter-chips';
import { MarkSelected } from '../shared/mark-selected';
import type { CatalogueRow } from './data';
import { rv } from '../shared/reveal';

/** Peptide · Therapy · Apparel are the pillars a chip names; a pathway of devices reads as therapy. */
export const kindTag = (kind: string) => (kind === 'device' ? 'therapy' : kind);
export const isOut = (r: { available: number }) => r.available <= 0;
export const isLow = (r: CatalogueRow) => r.available > 0 && r.available <= r.low_stock_threshold;

export async function CatalogueList({ rows }: { rows: CatalogueRow[] }) {
  const t = await getTranslations('console.catalogue');
  const locale = await getLocale();
  const pathwayName = (r: CatalogueRow) => (locale === 'en' ? r.name_en : r.name_id);

  // Group, do not repeat: the pathway becomes a heading and leaves the column it would have filled.
  const groups: { no: string; name: string; tags: string; rows: CatalogueRow[] }[] = [];
  for (const r of rows) {
    let g = groups[groups.length - 1];
    if (!g || g.no !== r.pathway_no) {
      g = { no: r.pathway_no, name: pathwayName(r), tags: kindTag(r.kind), rows: [] };
      groups.push(g);
    }
    g.rows.push(r);
    if (isOut(r) && !g.tags.includes('stockout')) g.tags += ' stockout';
  }

  return (
    <section className="screen on" data-scope="catalogue">
      <div className="rv" style={rv(0)}>
      <FilterChips scope="catalogue" chips={[
        { value: '', label: t('chips.all') },
        { value: 'peptide', label: t('chips.peptide') },
        { value: 'therapy', label: t('chips.therapy') },
        { value: 'apparel', label: t('chips.apparel') },
        { value: 'stockout', label: t('chips.stockout'), tone: 'err' },
      ]} />
      </div>

      <div className="tblwrap rv rv-line" style={rv(1)}>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t('cols.variant')}</th>
              <th className="desktop-only col-placed">{t('cols.content')}</th>
              <th className="n">{t('cols.price')}</th>
              <th className="n desktop-only">{t('cols.on_hand')}</th>
              <th className="n desktop-only">{t('cols.reserved')}</th>
              <th className="n">{t('cols.available')}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <Fragment key={g.no}>
                <tr className="grp" data-group="" data-tags={g.tags}>
                  <td colSpan={6}>{t('group', { no: g.no, name: g.name, count: g.rows.length })}</td>
                </tr>
                {g.rows.map(r => (
                  <tr key={r.variant_id} className="lnk" data-href={`/console/catalogue/${r.sku}`}
                    data-tags={`${kindTag(r.kind)}${isOut(r) ? ' stockout' : ''}`}>
                    <td className="k">
                      <Link href={`/console/catalogue/${r.sku}`} scroll={false}>
                        {r.product_name} · {r.dose}
                      </Link>
                      {r.is_active ? null : <span className="sub">{t('inactive')}</span>}
                    </td>
                    <td className="desktop-only col-placed">{r.content}</td>
                    <td className="n money">{idr(r.price_idr)}</td>
                    <td className="n desktop-only">{r.on_hand}</td>
                    <td className={`n desktop-only${r.reserved ? '' : ' tone-dim'}`}>{r.reserved || '—'}</td>
                    <td className={`n${isOut(r) ? ' tone-err' : isLow(r) ? ' tone-warn' : ''}`}>{r.available}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="empty" data-none hidden>{t('empty')}</p>
      <p className="note rv" style={{ ...rv(2), marginTop: 14 }}>{t('note')}</p>
      <div className="hrow rv" style={{ ...rv(3), marginTop: 20 }}>
        <Link className="btn btn-sm btn-accent" href="/console/catalogue/new" scroll={false}>{t('new')}</Link>
      </div>
      <MarkSelected />
    </section>
  );
}
