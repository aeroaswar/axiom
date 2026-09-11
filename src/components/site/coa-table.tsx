import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { pct } from '@/lib/money';
import { fmtLong } from '@/lib/domain/dates';
import { pick, type Coa, type Pathway } from '@/lib/site/catalogue';

export type CoaQuery = { q?: string; pathway?: string };

export function filterCoas(rows: Coa[], q: CoaQuery): Coa[] {
  let r = rows;
  if (q.pathway) r = r.filter(x => x.pathway_slug === q.pathway);
  if (q.q) {
    const needle = q.q.trim().toLowerCase();
    if (needle) r = r.filter(x => (x.product ?? '').toLowerCase().includes(needle) || (x.lot_code ?? '').toLowerCase().includes(needle) || (x.sku ?? '').toLowerCase().includes(needle));
  }
  return r;
}

const href = (q: CoaQuery, patch: Partial<CoaQuery>) => {
  const merged = { ...q, ...patch };
  const query: Record<string, string> = {};
  if (merged.q) query.q = merged.q;
  if (merged.pathway) query.pathway = merged.pathway;
  return Object.keys(query).length ? { pathname: '/coas', query } : { pathname: '/coas' };
};

/** The certificate library: one row per published certificate, the row a link to the certificate. */
export async function CoaTable({ rows, q, pathways, locale, total }: { rows: Coa[]; q: CoaQuery; pathways: Pathway[]; locale: string; total: number }) {
  const t = await getTranslations('site.coas');
  const shown = pathways.filter(p => p.kind === 'peptide');
  return (
    <>
      <div className="shop-tools">
        <div className="chips" style={{ borderBottom: 'none', padding: 0 }}>
          <Link href={href(q, { pathway: undefined })} className={`chip${!q.pathway ? ' on' : ''}`}>{t('all_pathways')}</Link>
          {shown.map(p => (
            <Link key={p.slug} href={href(q, { pathway: p.slug })} className={`chip${q.pathway === p.slug ? ' on' : ''}`}>
              <span className="mono-n" style={{ marginRight: 8, opacity: .6 }}>{p.no}</span>{pick(locale, p.name_en, p.name_id)}
            </Link>
          ))}
        </div>
        <form className="tools-row" method="get" action="/coas" role="search">
          {q.pathway ? <input type="hidden" name="pathway" value={q.pathway} /> : null}
          <div className="field grow">
            <label htmlFor="coa-q">{t('search')}</label>
            <input id="coa-q" name="q" type="search" defaultValue={q.q ?? ''} autoComplete="off" />
          </div>
          <button type="submit" className="btn btn-sm">{t('search_btn')}</button>
          {q.q || q.pathway ? <Link href={{ pathname: '/coas' }} className="tlink" style={{ paddingBottom: 12 }}>{t('clear')}</Link> : null}
          <span className="cnt" data-rows={rows.length}>{t('showing', { count: rows.length })}{rows.length !== total ? ` · ${total}` : ''}</span>
        </form>
      </div>

      {rows.length ? (
        <div className="tblwrap" style={{ marginTop: 28 }}>
          <table className="tbl coa-tbl">
            <caption className="sr-only">{t('title')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('col_compound')}</th>
                <th scope="col">{t('col_lot')}</th>
                <th scope="col">{t('col_method')}</th>
                <th scope="col" className="n">{t('col_purity')}</th>
                <th scope="col" className="n">{t('col_issued')}</th>
                <th scope="col" className="n"><span className="sr-only">{t('col_view')}</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="k">
                    <Link className="lk" href={`/coas/${r.id}`}>{r.product ?? '—'}{r.dose ? ` · ${r.dose}` : ''}</Link>
                    {r.is_sample ? <span className="chip sample quiet" style={{ borderColor: 'var(--accent-line)', color: 'var(--accent-bright)' }}>{t('sample')}</span> : null}
                  </td>
                  <td className="lot">{r.lot_code ?? '—'}</td>
                  <td>{r.method}</td>
                  <td className="n pur">{r.purity_pct === null ? '—' : pct(r.purity_pct, 2)}</td>
                  <td className="n">{r.issued_at ? fmtLong(new Date(r.issued_at), locale) : '—'}</td>
                  <td className="n"><Link className="tlink" href={`/coas/${r.id}`}>{t('view')} <Icon name="arrow" className="ar" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="note" style={{ marginTop: 28 }}>{t('none')}</p>}
    </>
  );
}
