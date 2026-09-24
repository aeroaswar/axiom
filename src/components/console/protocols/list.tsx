import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { FilterChips } from '../shared/filter-chips';
import { MarkSelected } from '../shared/mark-selected';
import { rv } from '../shared/reveal';
import { monogram } from '../clients/list';
import type { ProtocolRow } from './data';

/** Issued is the norm and stays quiet; withdrawn and draft are exceptions and earn a chip. */
export async function StateChip({ state }: { state: ProtocolRow['state'] }) {
  const t = await getTranslations('console.protocols.state');
  const tone = state === 'issued' ? 'quiet ok' : state === 'revoked' ? 'err' : 'warn';
  return <span className={`chip ${tone}`}><span className="dot" />{t(state)}</span>;
}

const day = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d)) : '';

export async function ProtocolsList({ rows }: { rows: ProtocolRow[] }) {
  const t = await getTranslations('console.protocols');

  // The code itself is never in this list. It is the one thing that opens a card, and a list is
  // read over a shoulder; the number is what ops says out loud.
  return (
    <section className="screen on" data-scope="protocols">
      <div className="rv" style={rv(0)}>
        <FilterChips scope="protocols" chips={[
          { value: '', label: t('chips.all') },
          { value: 'issued', label: t('chips.issued') },
          { value: 'revoked', label: t('chips.revoked'), tone: 'err' },
          { value: 'empty', label: t('chips.empty'), tone: 'warn' },
        ]} />
      </div>

      <div className="tblwrap desktop-only rv rv-line" style={rv(1)}>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t('cols.account')}</th>
              <th>{t('cols.card')}</th>
              <th>{t('cols.study')}</th>
              <th className="n">{t('cols.compounds')}</th>
              <th className="col-placed">{t('cols.issued')}</th>
              <th>{t('cols.state')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className="lnk" data-href={`/console/protocols/${p.id}`}
                data-tags={`${p.state}${p.items_n === 0 ? ' empty' : ''}`}>
                <td className="k"><Link href={`/console/protocols/${p.id}`} scroll={false}>{p.subject_label}</Link></td>
                <td>{p.number}</td>
                <td>{p.title || <span className="dim-2">{t('no_title')}</span>}</td>
                <td className="n">{p.items_n}</td>
                <td className="col-placed">{day(p.issued_at)}</td>
                <td><StateChip state={p.state} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rows mobile-only rv" style={rv(1)}>
        {rows.map(p => (
          <Link key={p.id} className="row" href={`/console/protocols/${p.id}`} scroll={false}
            data-href={`/console/protocols/${p.id}`} data-tags={`${p.state}${p.items_n === 0 ? ' empty' : ''}`}>
            <span className="ic mono">{monogram(p.subject_label)}</span>
            <span className="bd">
              <span className="t1">{p.subject_label}</span>
              <span className="t2">{p.number} · {t('items_n', { n: p.items_n })}</span>
            </span>
            <span className="rt"><StateChip state={p.state} /></span>
          </Link>
        ))}
      </div>

      <p className="empty" data-none hidden>{t('empty')}</p>
      <p className="note rv" style={{ ...rv(2), marginTop: 16 }}>{t('note')}</p>
      <div className="hrow rv" style={{ ...rv(3), marginTop: 20 }}>
        <Link className="btn btn-sm btn-accent" href="/console/protocols/new" scroll={false}>{t('new')}</Link>
      </div>
      <MarkSelected />
    </section>
  );
}
