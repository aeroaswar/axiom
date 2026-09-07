import { Fragment } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr, pct } from '@/lib/money';
import { FilterChips } from '../shared/filter-chips';
import { MarkSelected } from '../shared/mark-selected';
import { share, total, type PricingRow } from './data';
import { rv } from '../shared/reveal';

const under = (r: PricingRow, floor: number) => !r.cost_assumed && Number(r.gm_pct) < floor;

/**
 * The margin book. Nine pathways foot to the document; devices and apparel sit outside it, flagged
 * as assumed, because their landed cost has not arrived. Selling price is set per lot and margin is
 * what remains — never the other way round.
 */
export async function PricingScreen({ rows, floor }: { rows: PricingRow[]; floor: number }) {
  const t = await getTranslations('console.pricing');
  const locale = await getLocale();
  const name = (r: PricingRow) => (locale === 'en' ? r.pathway_en : r.pathway_id_name);

  const peptide = rows.filter(r => r.kind === 'peptide');
  const other = rows.filter(r => r.kind !== 'peptide');
  const book = total(peptide);
  const low = peptide.filter(r => under(r, floor));
  const penEach = peptide.reduce((m, r) => (BigInt(r.pen_cost_idr) > m ? BigInt(r.pen_cost_idr) : m), 0n);
  const bySpread = [...peptide].sort((a, b) => Number(a.gm_pct) - Number(b.gm_pct));
  const thin = bySpread[0], wide = bySpread[bySpread.length - 1];

  // The roll-up: one line per pathway, then the line every one of them adds up to.
  const groups: { no: string; name: string; rows: PricingRow[] }[] = [];
  for (const r of peptide) {
    let g = groups[groups.length - 1];
    if (!g || g.no !== r.pathway_no) { g = { no: r.pathway_no, name: name(r), rows: [] }; groups.push(g); }
    g.rows.push(r);
  }

  const composition: [string, bigint][] = [
    [t('composition.supplier'), book.supplier],
    [t('composition.pens'), book.pen],
    [t('composition.margin'), book.margin],
  ];

  const lotRow = (r: PricingRow) => (
    <tr key={r.variant_id} className="lnk" data-href={`/console/pricing/${r.sku}`}
      data-tags={`${r.kind === 'peptide' ? 'peptide' : 'nonpeptide'}${under(r, floor) ? ' low' : ''}`}>
      <td className="k">
        <Link href={`/console/pricing/${r.sku}`} scroll={false}>{r.name} · {r.dose}</Link>
      </td>
      <td className="desktop-only col-placed">{r.content}</td>
      <td className="n">{idr(r.supplier_cost_idr)}{r.cost_assumed ? <span className="sub">{t('assumed')}</span> : null}</td>
      <td className="n desktop-only col-placed">{Number(r.pen_cost_idr) ? idr(r.pen_cost_idr) : <span className="dim-2">—</span>}</td>
      <td className="n desktop-only">{idr(r.base_idr)}</td>
      <td className="n money">{idr(r.price_idr)}</td>
      <td className="n">{idr(r.margin_idr)}</td>
      <td className={`n${under(r, floor) ? ' tone-warn' : ''}`}>{pct(r.gm_pct)}</td>
    </tr>
  );

  const mobileRow = (r: PricingRow) => (
    <Link key={r.variant_id} className="row" href={`/console/pricing/${r.sku}`} scroll={false}
      data-href={`/console/pricing/${r.sku}`}
      data-tags={`${r.kind === 'peptide' ? 'peptide' : 'nonpeptide'}${under(r, floor) ? ' low' : ''}`}>
      <span className="bd">
        <span className="t1">{r.name} · {r.dose}</span>
        <span className="t2">{t('row_sub', { base: idr(r.base_idr), margin: idr(r.margin_idr) })}</span>
      </span>
      <span className="rt">
        <span className="amt">{idr(r.price_idr)}</span>
        {under(r, floor)
          ? <span className="chip warn"><span className="dot" />{t('under_floor', { floor })}</span>
          : <span className="t2">{pct(r.gm_pct)}</span>}
      </span>
    </Link>
  );

  return (
    <section className="screen on" data-scope="pricing">
      <p className="eyebrow rv" style={{ ...rv(0), marginBottom: 16 }}>
        {t('sub', { count: book.lots, gm: pct(share(book.margin, book.selling)) })}
      </p>

      {/* The four figures the document foots to, summed from the lots below. */}
      <div className="kpis rv rv-line" style={{ ...rv(1), marginBottom: 14 }}>
        <div className="kpi">
          <span className="lab">{t('kpis.supplier')}</span>
          <span className="val">{idr(book.supplier)}</span>
          <span className="def">{t('kpis.supplier_def')}</span>
          <span className="tgt">{t('kpis.supplier_tgt', { pct: pct(share(book.supplier, book.selling)) })}</span>
        </div>
        <div className="kpi">
          <span className="lab">{t('kpis.base')}</span>
          <span className="val">{idr(book.base)}</span>
          <span className="def">{t('kpis.base_def')}</span>
          <span className="tgt">{t('kpis.base_tgt', { amount: idr(book.pen) })}</span>
        </div>
        <div className="kpi">
          <span className="lab">{t('kpis.selling')}</span>
          <span className="val">{idr(book.selling)}</span>
          <span className="def">{t('kpis.selling_def')}</span>
        </div>
        <div className="kpi">
          <span className="lab">{t('kpis.margin')}</span>
          <span className="val">{share(book.margin, book.selling)}<span className="u">%</span></span>
          <span className="def">{t('kpis.margin_def', { amount: idr(book.margin) })}</span>
          <span className="tgt">{t('kpis.margin_tgt', { pct: pct(share(book.margin, book.base)) })}</span>
        </div>
      </div>

      <div className="kpis sub rv" style={{ ...rv(2), marginBottom: 24 }}>
        <div className="kpi">
          <span className="lab">{t('kpis.lots')}</span><span className="val">{book.lots}</span>
          <span className="tgt">{t('kpis.lots_tgt', { count: other.length })}</span>
        </div>
        <div className="kpi">
          <span className="lab">{t('kpis.below', { floor })}</span>
          <span className={`val${low.length ? ' tone-warn' : ''}`}>{low.length}</span>
        </div>
        <div className="kpi">
          <span className="lab">{t('kpis.thinnest')}</span>
          <span className="val">{pct(thin?.gm_pct ?? 0)}</span>
          <span className="tgt">{thin ? `${thin.name} · ${thin.dose}` : ''}</span>
        </div>
        <div className="kpi">
          <span className="lab">{t('kpis.widest')}</span>
          <span className="val">{pct(wide?.gm_pct ?? 0)}</span>
          <span className="tgt">{wide ? `${wide.name} · ${wide.dose}` : ''}</span>
        </div>
      </div>

      <div className="split rv" style={{ ...rv(3), marginBottom: 4 }}>
        <div>
          <div className="sec-h"><span className="kicker">{t('how.kicker')}</span></div>
          <div className="kv"><span className="k">{t('how.supplier')}</span><span className="v">{t('how.supplier_v')}</span></div>
          <div className="kv"><span className="k">{t('how.pen')}</span><span className="v">{t('how.pen_v', { amount: idr(penEach) })}</span></div>
          <div className="kv"><span className="k">{t('how.base')}</span><span className="v">{t('how.base_v')}</span></div>
          <div className="kv"><span className="k">{t('how.selling')}</span><span className="v">{t('how.selling_v')}</span></div>
          <div className="kv"><span className="k">{t('how.margin')}</span><span className="v">{t('how.margin_v')}</span></div>
          <p className="note" style={{ marginTop: 12 }}>{t('how.note')}</p>
        </div>
        <div>
          <div className="sec-h"><span className="kicker">{t('composition.kicker')}</span></div>
          <div className="bars">
            {composition.map(([label, value]) => (
              <div className="bar-row" key={label}>
                <span className="nm">{label}</span>
                <span className="bar-track"><span className="bar-fill" style={{ width: `${share(value, book.selling)}%` }} /></span>
                <span className="amt">{pct(share(value, book.selling))}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="sec rv" style={rv(4)}>
        <div className="sec-h">
          <span className="kicker">{t('by_pathway.kicker')}</span>
          <span className="sp" />
          <span className="note">{t('by_pathway.note')}</span>
        </div>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t('by_pathway.cols.no')}</th>
                <th>{t('by_pathway.cols.pathway')}</th>
                <th className="n">{t('by_pathway.cols.lots')}</th>
                <th className="n">{t('by_pathway.cols.supplier')}</th>
                <th className="n">{t('by_pathway.cols.base')}</th>
                <th className="n">{t('by_pathway.cols.selling')}</th>
                <th className="n">{t('by_pathway.cols.margin')}</th>
                <th className="n">{t('by_pathway.cols.gm')}</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(g => {
                const s = total(g.rows);
                return (
                  <tr key={g.no}>
                    <td className="id">{g.no}</td>
                    <td className="k">{g.name}</td>
                    <td className="n">{s.lots}</td>
                    <td className="n">{idr(s.supplier)}</td>
                    <td className="n">{idr(s.base)}</td>
                    <td className="n money">{idr(s.selling)}</td>
                    <td className="n">{idr(s.margin)}</td>
                    <td className={`n${share(s.margin, s.selling) < floor ? ' tone-warn' : ''}`}>{pct(share(s.margin, s.selling))}</td>
                  </tr>
                );
              })}
              <tr data-footing>
                <td />
                <td className="k">{t('by_pathway.total')}</td>
                <td className="n">{book.lots}</td>
                <td className="n" data-foot="supplier">{idr(book.supplier)}</td>
                <td className="n" data-foot="base">{idr(book.base)}</td>
                <td className="n money" data-foot="selling">{idr(book.selling)}</td>
                <td className="n" data-foot="margin">{idr(book.margin)}</td>
                <td className="n">{pct(share(book.margin, book.selling))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rv" style={rv(5)}>
      <FilterChips scope="pricing" chips={[
        { value: '', label: t('chips.all') },
        { value: 'nonpeptide', label: t('chips.nonpeptide') },
        { value: 'low', label: t('chips.low', { floor }), tone: 'warn' },
      ]} />
      </div>

      <div className="tblwrap desktop-only rv" style={rv(6)}>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t('cols.variant')}</th>
              <th className="desktop-only col-placed">{t('cols.content')}</th>
              <th className="n">{t('cols.supplier')}</th>
              <th className="n desktop-only col-placed">{t('cols.pen')}</th>
              <th className="n desktop-only">{t('cols.base')}</th>
              <th className="n">{t('cols.selling')}</th>
              <th className="n">{t('cols.margin')}</th>
              <th className="n">{t('cols.gm')}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <Fragment key={g.no}>
                <tr className="grp" data-group="" data-tags={`peptide${g.rows.some(r => under(r, floor)) ? ' low' : ''}`}>
                  <td colSpan={8}>{g.no} · {g.name}</td>
                </tr>
                {g.rows.map(lotRow)}
              </Fragment>
            ))}
            {other.length ? (
              <>
                <tr className="grp" data-group="" data-tags="nonpeptide"><td colSpan={8}>{t('assumed_group')}</td></tr>
                {other.map(lotRow)}
              </>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rows mobile-only">
        {groups.map(g => (
          <Fragment key={g.no}>
            <div className="grpline" data-group="" data-tags={`peptide${g.rows.some(r => under(r, floor)) ? ' low' : ''}`}>
              <span>{g.no}</span><span className="nm">{g.name}</span>
            </div>
            {g.rows.map(mobileRow)}
          </Fragment>
        ))}
        {other.length ? (
          <>
            <div className="grpline" data-group="" data-tags="nonpeptide"><span className="nm">{t('assumed_group')}</span></div>
            {other.map(mobileRow)}
          </>
        ) : null}
      </div>

      <p className="empty" data-none hidden>{t('empty')}</p>
      <MarkSelected />
    </section>
  );
}
