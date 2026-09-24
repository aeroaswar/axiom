import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { FilterChips } from '../shared/filter-chips';
import { MarkSelected } from '../shared/mark-selected';
import { reorderDue, type ClientRow } from './data';
import { rv } from '../shared/reveal';

/** The account monogram: an initial or two, never a bordered icon square. */
export function monogram(name: string) {
  const words = name.replace(/^(Klinik|Dr\.|Studio|PT|Apotek)\s+/i, '').split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? words[0]?.[1] ?? '')).toUpperCase();
}

/** Current is the norm and stays quiet; every other state is an exception and earns its chip. */
export async function AckChip({ state }: { state: ClientRow['ack'] }) {
  const t = await getTranslations('console.clients.ack');
  const tone = state === 'current' ? 'quiet ok' : state === 'lapsed' ? 'err' : 'warn';
  return <span className={`chip ${tone}`}><span className="dot" />{t(state)}</span>;
}

export function clientTags(c: ClientRow) {
  const rd = reorderDue(c);
  return [c.type, c.ack !== 'current' ? 'attention' : '', rd && (rd.overdue || rd.soon) ? 'reorder' : '']
    .filter(Boolean).join(' ');
}

export async function ClientsList({ rows }: { rows: ClientRow[] }) {
  const t = await getTranslations('console.clients');
  const tc = await getTranslations('console.common');

  const reorderLabel = (c: ClientRow) => {
    const rd = reorderDue(c);
    if (!rd) return null;
    return rd.days < 0 ? t('overdue', { days: -rd.days }) : rd.days === 0 ? t('due_today') : t('due_in', { days: rd.days });
  };

  return (
    <section className="screen on" data-scope="clients">
      <div className="rv" style={rv(0)}>
      <FilterChips scope="clients" chips={[
        { value: '', label: t('chips.all') },
        { value: 'clinic', label: t('chips.clinic') },
        { value: 'institution', label: t('chips.institution') },
        { value: 'individual', label: t('chips.individual') },
        { value: 'attention', label: t('chips.attention'), tone: 'err' },
        { value: 'reorder', label: t('chips.reorder'), tone: 'warn' },
      ]} />
      </div>

      <div className="tblwrap desktop-only rv rv-line" style={rv(1)}>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t('cols.account')}</th>
              <th>{t('cols.type')}</th>
              <th className="col-placed">{t('cols.manager')}</th>
              <th className="n">{t('cols.lifetime')}</th>
              <th className="n">{t('cols.orders')}</th>
              <th>{t('cols.next_reorder')}</th>
              <th>{t('cols.ack')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => {
              const rd = reorderDue(c);
              return (
                <tr key={c.id} className="lnk" data-href={`/console/clients/${c.id}`} data-tags={clientTags(c)}>
                  <td className="k"><Link href={`/console/clients/${c.id}`} scroll={false}>{c.name}</Link></td>
                  <td>{t(`types.${c.type}`)}</td>
                  <td className="col-placed">{c.manager ?? <span className="dim-2">{t('no_manager')}</span>}</td>
                  <td className="n money">{idr(c.lifetime ?? 0)}</td>
                  <td className="n">{c.orders_n}</td>
                  <td className={rd?.overdue ? 'tone-warn' : ''}>
                    {reorderLabel(c) ?? <span className="dim-2">{t('no_cadence')}</span>}
                  </td>
                  <td><AckChip state={c.ack} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rows mobile-only rv" style={rv(1)}>
        {rows.map(c => (
          <Link key={c.id} className="row" href={`/console/clients/${c.id}`} scroll={false}
            data-href={`/console/clients/${c.id}`} data-tags={clientTags(c)}>
            <span className="ic mono">{monogram(c.name)}</span>
            <span className="bd">
              <span className="t1">{c.name}</span>
              <span className="t2">
                {tc('orders', { count: c.orders_n })}
                {reorderLabel(c) ? ` · ${t('reorder_sub', { label: reorderLabel(c)!.toLowerCase() })}` : ` · ${t('no_cadence')}`}
              </span>
            </span>
            <span className="rt">
              <span className="amt">{idr(c.lifetime ?? 0)}</span>
              <AckChip state={c.ack} />
            </span>
          </Link>
        ))}
      </div>

      <p className="empty" data-none hidden>{t('empty')}</p>
      <p className="note rv" style={{ ...rv(2), marginTop: 16 }}>{t('note')}</p>
      <div className="hrow rv" style={{ ...rv(3), marginTop: 20 }}>
        <Link className="btn btn-sm btn-accent" href="/console/clients/new" scroll={false}>{t('new')}</Link>
      </div>
      <MarkSelected />
    </section>
  );
}
