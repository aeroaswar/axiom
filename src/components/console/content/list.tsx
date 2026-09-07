import { Fragment } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { FilterChips } from '../shared/filter-chips';
import { MarkSelected } from '../shared/mark-selected';
import type { ContentRow } from './data';
import { rv } from '../shared/reveal';

/** Research text with nothing behind it is the one state worth surfacing on this list. */
export const needsRefs = (r: ContentRow) => r.has_research && r.ref_count === 0;

export async function ContentList({ rows }: { rows: ContentRow[] }) {
  const t = await getTranslations('console.content');
  const tc = await getTranslations('console.common');
  const tcc = await getTranslations('common');
  const locale = await getLocale();

  const groups: { no: string; name: string; tags: string; rows: ContentRow[] }[] = [];
  for (const r of rows) {
    let g = groups[groups.length - 1];
    if (!g || g.no !== r.pathway_no) {
      g = { no: r.pathway_no, name: locale === 'en' ? r.name_en : r.name_id, tags: '', rows: [] };
      groups.push(g);
    }
    g.rows.push(r);
    if (!r.is_published && !g.tags.includes('unpublished')) g.tags += ' unpublished';
    if (needsRefs(r) && !g.tags.includes('norefs')) g.tags += ' norefs';
  }

  return (
    <section className="screen on" data-scope="content">
      <div className="rv" style={rv(0)}>
      <FilterChips scope="content" chips={[
        { value: '', label: tc('view_all') },
        { value: 'unpublished', label: t('unpublished') },
        { value: 'norefs', label: t('needs_refs'), tone: 'warn' },
      ]} />
      </div>

      <div className="tblwrap rv rv-line" style={rv(1)}>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t('cols.product')}</th>
              <th className="desktop-only col-placed">{t('cols.kind')}</th>
              <th className="desktop-only col-placed">{t('cols.draft')}</th>
              <th className="n">{t('cols.references')}</th>
              <th>{t('cols.state')}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <Fragment key={g.no}>
                <tr className="grp" data-group="" data-tags={g.tags.trim()}>
                  <td colSpan={5}>{g.no} · {g.name} · {tcc('compounds', { count: g.rows.length })}</td>
                </tr>
                {g.rows.map(r => (
                  <tr key={r.id} className="lnk" data-href={`/console/content/${r.slug}`}
                    data-tags={`${r.is_published ? '' : 'unpublished'}${needsRefs(r) ? ' norefs' : ''}`.trim()}>
                    <td className="k"><Link href={`/console/content/${r.slug}`} scroll={false}>{r.name}</Link></td>
                    <td className="desktop-only col-placed">{t(`kinds.${r.kind}`)}</td>
                    <td className="desktop-only col-placed">
                      {r.has_research ? t('draft_present') : <span className="dim-2">{t('no_research')}</span>}
                    </td>
                    <td className={`n${needsRefs(r) ? ' tone-warn' : ''}`}>{r.ref_count}</td>
                    <td>
                      {r.is_published
                        ? <span className="chip quiet ok"><span className="dot" />{t('published')}</span>
                        : <span className="chip warn"><span className="dot" />{t('unpublished')}</span>}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="empty" data-none hidden>{t('empty')}</p>
      <p className="note rv" style={{ ...rv(2), marginTop: 14 }}>{t('note')}</p>
      <MarkSelected />
    </section>
  );
}
