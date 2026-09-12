import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { pct } from '@/lib/money';
import { fmtLong } from '@/lib/domain/dates';
import type { Coa } from '@/lib/site/catalogue';
import { CopyButton } from './copy-button';
import { ProductImage } from './product-image';

export type CoaQuery = { q?: string };

export function filterCoas(rows: Coa[], q: CoaQuery): Coa[] {
  const needle = (q.q ?? '').trim().toLowerCase();
  if (!needle) return rows;
  return rows.filter(x => [x.product, x.lot_code, x.sku, x.dose].some(v => (v ?? '').toLowerCase().includes(needle)));
}

/**
 * The certificate library in the reference's shape: a search card, a count, then two columns of
 * certificate cards. Each card states what its row holds — the lot, the purity by the stated method,
 * the issue date, the lot size — and lists exactly the two checks AXIOM makes, purity by HPLC and
 * identity by MS. Nothing is claimed that the row does not carry.
 */
export async function CoaCards({ rows, q, locale, total, compounds, method, threshold, purityLabel, ruo }: {
  rows: Coa[]; q: CoaQuery; locale: string; total: number; compounds: number; method: string; threshold: string; purityLabel: string; ruo: string;
}) {
  const t = await getTranslations('site.coas');
  return (
    <>
      <form className="coa-search" method="get" action="/coas" role="search">
        <label className="search" htmlFor="coa-q">
          <Icon name="search" />
          <input id="coa-q" name="q" type="search" defaultValue={q.q ?? ''} placeholder={t('search_placeholder')} aria-label={t('search')} autoComplete="off" />
        </label>
        <button type="submit" className="btn btn-solid">{t('search_btn')}</button>
        {q.q ? <Link href={{ pathname: '/coas' }} className="btn">{t('clear')}</Link> : null}
      </form>

      <p className="coa-count" data-rows={rows.length}>{t('count', { compounds, reports: total })}{rows.length !== total ? ` · ${t('showing', { count: rows.length })}` : ''}</p>

      {rows.length ? (
        <div className="coa-grid">
          {rows.map(r => (
            <article className="coa-card" key={r.id} data-lot={r.lot_code ?? ''}>
              <div className="top">
                <Link href={`/coas/${r.id}`} className="thumb" aria-label={r.product ?? t('doc_title')}>
                  <ProductImage slug={r.slug ?? ''} name={r.product ?? ''} dose={r.dose} purity={purityLabel} kind={r.kind ?? 'peptide'} size="thumb" ruo={ruo} />
                </Link>
                <div>
                  <div className="ttl">
                    <div>
                      <h3><Link href={`/coas/${r.id}`}>{r.product ?? t('doc_title')}</Link></h3>
                      <p className="sub">{t('research_compound')}</p>
                    </div>
                    <span className="vbadge"><Icon name="check" />{r.is_sample ? t('badge_sample') : t('badge_published')}</span>
                  </div>
                  <div className="fields">
                    <div className="f">
                      <span className="k">{t('f_lot')}</span>
                      <span className="v lot mono-n">{r.lot_code ?? '—'}{r.lot_code ? <CopyButton value={r.lot_code} label={t('copy')} done={t('copied')} /> : null}</span>
                    </div>
                    <div className="f">
                      <span className="k">{t('f_purity', { method })}</span>
                      <span className="v pur mono-n">{r.purity_pct === null ? '—' : pct(r.purity_pct, 2)}</span>
                    </div>
                    <div className="f">
                      <span className="k">{t('f_issued')}</span>
                      <span className="v">{r.issued_at ? fmtLong(new Date(r.issued_at), locale) : '—'}</span>
                    </div>
                    <div className="f">
                      <span className="k">{t('f_size')}</span>
                      <span className="v mono-n">{r.dose ?? '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <span className="vt">{t('verified_title')}</span>
                <div className="chips">
                  <span className="chip"><Icon name="check" />{t('chip_purity')}</span>
                  <span className="chip"><Icon name="check" />{t('chip_identity')}</span>
                  <span className="chip"><Icon name="check" />{threshold}</span>
                </div>
              </div>
              <p className="doc"><Icon name="file" />{t('documented')}</p>
              <div className="acts">
                <Link href={`/coas/${r.id}`} className="btn btn-solid">{t('view_cert')}</Link>
                <a href={`/api/documents/coa/${r.id}?locale=${locale}`} className="btn">{t('pdf_short')}</a>
              </div>
            </article>
          ))}
        </div>
      ) : <p className="note" style={{ marginTop: 28 }}>{t('none')}</p>}
      <p className="sr-only">{ruo}</p>
    </>
  );
}
