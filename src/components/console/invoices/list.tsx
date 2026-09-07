import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { Icon } from '@/components/shell/sprite';
import { daysFrom } from '@/lib/domain/dates';
import { invoiceState, receivables, type InvoiceRow } from '@/lib/queries/invoices';
import { FilterChips } from '../shared/filter-chips';
import { rv } from '../shared/reveal';
import { labels } from '../orders/labels';

/**
 * The receivables book. Outstanding, overdue and paid this month are summed from the rows below
 * them, so the strip and the table are one figure read twice. Overdue and void are derived — the
 * first from a due date that has passed unpaid, the second from a cancel that voided the invoice.
 */
export async function InvoicesList({ rows, payDays }: { rows: InvoiceRow[]; payDays: number }) {
  const t = await getTranslations('commerce.invoices');
  const ts = await getTranslations('states.invoice');
  const L = await labels();
  const r = receivables(rows);

  const next = (i: InvoiceRow) => {
    const s = invoiceState(i);
    if (s === 'draft') return { text: t('n_draft'), tone: 'warn' };
    if (s === 'void') return { text: t('n_void', { date: L.short(i.voided_at) }), tone: '' };
    if (s === 'paid') return { text: t('n_paid', { date: L.short(i.paid_at) }), tone: '' };
    if (i.paid_claim_at) return { text: i.paid_claim_ref ? t('n_match', { ref: i.paid_claim_ref }) : t('n_match_plain'), tone: 'warn' };
    if (s === 'overdue') return { text: t('n_overdue', { days: daysFrom(i.due_at) }), tone: 'err' };
    return { text: t('n_due', { date: L.short(i.due_at) }), tone: '' };
  };

  const chip = (i: InvoiceRow) => {
    const s = invoiceState(i);
    if (s === 'overdue') return <span className="chip err"><span className="dot" />{t('chip_overdue', { days: daysFrom(i.due_at) })}</span>;
    if (s === 'issued') return <span className="chip quiet"><span className="dot" />{t('chip_due', { days: -daysFrom(i.due_at) })}</span>;
    return <span className={`chip ${s === 'paid' ? 'quiet ok' : 'quiet'}`}><span className="dot" />{ts(s)}</span>;
  };

  const tags = (i: InvoiceRow) => {
    const s = invoiceState(i);
    return [s === 'overdue' ? 'issued overdue' : s, i.kind === 'credit_note' ? 'credit' : ''].filter(Boolean).join(' ');
  };

  const title = (i: InvoiceRow) =>
    i.kind === 'credit_note' && i.parent_number ? `${i.number} · ${t('credit_of', { number: i.parent_number })}` : i.number;

  return (
    <section className="screen on" data-scope="invoices">
      <div className="recv rv rv-line" style={rv(0)}>
        <div className="kpi">
          <span className="lab">{t('outstanding')}</span>
          <span className="val">{idr(r.open)}</span>
          <span className="tgt">{t('outstanding_sub', { n: r.openN })}</span>
        </div>
        <div className="kpi">
          <span className="lab">{t('overdue')}</span>
          <span className={`val${r.overN ? ' tone-err' : ''}`}>{idr(r.over)}</span>
          <span className="tgt">{t('overdue_sub', { n: r.overN })}</span>
        </div>
        <div className="kpi">
          <span className="lab">{t('paid_month')}</span>
          <span className="val">{idr(r.paid)}</span>
          <span className="tgt">{t('paid_sub', { n: r.paidN })}</span>
        </div>
      </div>

      <div className="rv" style={rv(1)}>
        <FilterChips scope="invoices" chips={[
          { value: '', label: t('f_all') },
          { value: 'issued', label: t('f_awaiting') },
          { value: 'overdue', label: t('f_overdue'), tone: 'err' },
          { value: 'paid', label: t('f_paid') },
          { value: 'void', label: t('f_void') },
        ]} />
      </div>

      <div className="tblwrap desktop-only rv" style={rv(2)}>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t('number')}</th>
              <th className="col-placed">{t('order')}</th>
              <th>{t('account')}</th>
              <th className="col-placed">{t('issued')}</th>
              <th>{t('next')}</th>
              <th className="n">{t('total')}</th>
              <th>{t('state')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(i => {
              const n = next(i);
              return (
                <tr key={i.id} className="lnk" data-href={`/console/invoices/${i.number}`} data-tags={tags(i)}>
                  <td className="k"><Link href={`/console/invoices/${i.number}`}>{title(i)}</Link></td>
                  <td className="col-placed">{i.order_number}</td>
                  <td>{i.account}</td>
                  <td className="col-placed">{L.short(i.issued_at)}</td>
                  <td className={`nx${n.tone ? ` ${n.tone}` : ''}`}>{n.text}</td>
                  <td className="n money">{idr(i.total_idr)}</td>
                  <td>{chip(i)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rows mobile-only rv" style={rv(2)}>
        {rows.map(i => {
          const n = next(i);
          return (
            <Link key={i.id} className="row" href={`/console/invoices/${i.number}`} data-tags={tags(i)}>
              <span className="ic"><Icon name="file" /></span>
              <span className="bd">
                <span className="t1">{title(i)}</span>
                <span className={`t2${n.tone ? ` ${n.tone}` : ''}`}>{i.account} · {n.text}</span>
              </span>
              <span className="rt"><span className="amt">{idr(i.total_idr)}</span>{chip(i)}</span>
            </Link>
          );
        })}
      </div>

      <p className="empty" data-none hidden>{t('empty')}</p>
      <p className="note rv" style={{ ...rv(3), marginTop: 16, maxWidth: '78ch' }}>{t('note', { days: payDays })}</p>
    </section>
  );
}
