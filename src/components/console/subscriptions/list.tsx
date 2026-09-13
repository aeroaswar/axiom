import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { fmtShort } from '@/lib/domain/dates';
import type { SubscriptionRow } from '@/lib/queries/subscriptions';
import { ActionButton } from '../shared/action-form';
import { rv } from '../shared/reveal';
import { raiseRenewal } from './actions';

/** Every plan, renewals due first. The one action is raising the renewal quote. */
export async function SubscriptionsList({ rows, due }: { rows: SubscriptionRow[]; due: Set<string> }) {
  const t = await getTranslations('console.subscriptions');
  const locale = await getLocale();
  const now = Date.now();
  const dueRows = rows.filter(r => due.has(r.id));
  const rest = rows.filter(r => !due.has(r.id));

  const Row = ({ s }: { s: SubscriptionRow }) => {
    const nd = new Date(s.next_due_at);
    const overdue = s.state === 'active' && nd.getTime() < now;
    return (
      <tr data-tags={`${s.state}${due.has(s.id) ? ' due' : ''}`}>
        <td className="k"><Link href={`/console/clients/${s.account_id}`}>{s.account}</Link>{s.site_name ? <span className="sub"> · {t('site', { site: s.site_name })}</span> : null}</td>
        <td><Link href={`/console/catalogue/${s.sku}`}>{s.name} · {s.dose}</Link> × {s.qty}</td>
        <td className="tnum">{t('every', { days: s.interval_days, pct: Number(s.discount_pct) })}</td>
        <td className={`n${overdue ? ' tone-warn' : ''}`}>{fmtShort(nd, locale)}{overdue ? ` · ${t('overdue')}` : ''}</td>
        <td><span className={`chip${s.state === 'active' ? ' ok' : s.state === 'paused' ? ' warn' : ' quiet'}`}><span className="dot" />{t(`state_${s.state}`)}</span></td>
        <td className="n">
          {s.renewal_open && s.renewal_quote_number ? (
            <Link className="tlink" href={`/console/orders/quotes/${s.renewal_quote_number}`}>{t('open_quote', { number: s.renewal_quote_number })}</Link>
          ) : s.state === 'active' ? (
            <ActionButton action={raiseRenewal} submit={t('raise')} tone={due.has(s.id) ? 'accent' : undefined} hidden={{ id: s.id }} />
          ) : <span className="dim-2">{t('no_quote')}</span>}
        </td>
      </tr>
    );
  };

  const Table = ({ items }: { items: SubscriptionRow[] }) => (
    <div className="tblwrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>{t('col_account')}</th><th>{t('col_lot')}</th><th>{t('col_plan')}</th>
            <th className="n">{t('col_next')}</th><th>{t('col_state')}</th><th className="n">{t('col_renewal')}</th>
          </tr>
        </thead>
        <tbody>{items.map(s => <Row key={s.id} s={s} />)}</tbody>
      </table>
    </div>
  );

  return (
    <section className="screen on">
      <div className="sec-h rv" style={rv(0)}><span className="kicker">{t('kicker')}</span></div>
      <p className="note rv" style={{ ...rv(1), maxWidth: '64ch' }}>{t('lead')}</p>
      {!rows.length ? <p className="empty" style={{ marginTop: 18 }}>{t('empty')}</p> : (
        <>
          {dueRows.length ? (
            <div className="rv" style={{ ...rv(2), marginTop: 22 }}>
              <div className="sec-h"><span className="kicker">{t('due')}</span><span className="sp" /><span className="note tnum">{dueRows.length}</span></div>
              <Table items={dueRows} />
            </div>
          ) : null}
          <div className="rv" style={{ ...rv(3), marginTop: 26 }}>
            <div className="sec-h"><span className="kicker">{t('all')}</span><span className="sp" /><span className="note tnum">{rest.length}</span></div>
            <Table items={rest} />
          </div>
        </>
      )}
    </section>
  );
}
