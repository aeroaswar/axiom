import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageTitle } from '@/components/shell/shell-client';
import { Icon } from '@/components/shell/sprite';
import { idr, planNet } from '@/lib/money';
import { fmtLong, fmtShort } from '@/lib/domain/dates';
import { getPlanTiers } from '@/lib/settings';
import { subscriptionsFor } from '@/lib/queries/subscriptions';
import { rv } from '@/components/console/shared/reveal';
import { accountSession } from '@/components/account/data';
import { PlanControls } from '@/components/account/client-forms';
import { RuoNote } from '@/components/account/ui';

export const dynamic = 'force-dynamic';

/**
 * The account's delivery plans. One card per plan: the lot, the interval and its percentage, the
 * next delivery date, the open renewal quote if AXIOM has raised one, and the controls. Every
 * figure is the row's own; the net price shown is the plan arithmetic the next quote will freeze.
 */
export default async function SubscriptionsPage() {
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.subscriptions');
  const locale = await getLocale();
  const [rows, tiers] = await Promise.all([subscriptionsFor(session.uid, session.accountId), getPlanTiers()]);
  const now = Date.now();

  return (
    <section className="screen on account">
      <PageTitle title={t('title')} />
      <div className="sec-h rv" style={rv(0)}><span className="kicker">{t('kicker')}</span></div>
      <p className="note rv" style={{ ...rv(1), maxWidth: '64ch' }}>{t('lead')}</p>

      {rows.length ? (
        <div className="rows rv" style={{ ...rv(2), marginTop: 18 }}>
          {rows.map(s => {
            const list = s.price_idr === null ? null : Number(s.price_idr);
            const net = list === null ? null : planNet(list, Number(s.discount_pct));
            const due = new Date(s.next_due_at);
            const past = due.getTime() < now && s.state === 'active';
            return (
              <div className={`row rowa plan-row${s.state === 'cancelled' ? ' dim' : ''}`} key={s.id} data-plan-state={s.state}>
                <span className="ic"><Icon name={s.state === 'active' ? 'reorder' : s.state === 'paused' ? 'clock' : 'x'} /></span>
                <span className="bd">
                  <Link className="t1" href={`/account/shop/${s.slug}`}>{t('lot', { name: s.name, dose: s.dose, qty: s.qty })}</Link>
                  <span className="t2">
                    {t('every', { days: s.interval_days, pct: Number(s.discount_pct) })}
                    {s.site_name ? ` · ${t('site', { site: s.site_name })}` : ''}
                    {` · ${t('started', { date: fmtShort(s.started_at, locale) })}`}
                    {s.last_order_number ? ` · ${t('last_order', { number: s.last_order_number })}` : ''}
                  </span>
                  <span className={`t2${past ? ' warn' : ''}`}>
                    {s.state === 'cancelled' ? t('state_cancelled') : past ? t('next_due_past', { date: fmtLong(due, locale) }) : t('next_due', { date: fmtLong(due, locale) })}
                    {s.renewal_open && s.renewal_quote_number ? (
                      <> · {t('renewal_open', { number: s.renewal_quote_number })} · <Link className="tlink" href={`/account/quotes/${s.renewal_quote_number}`}>{t('renewal_view')}</Link></>
                    ) : null}
                  </span>
                  <PlanControls id={s.id} state={s.state} intervalDays={s.interval_days} tiers={tiers} />
                </span>
                <span className="rt">
                  {net !== null ? <span className="amt">{idr(net * s.qty)}</span> : null}
                  <span className={`chip${s.state === 'active' ? ' ok' : s.state === 'paused' ? ' warn' : ' quiet'}`}><span className="dot" />{t(`state_${s.state}`)}</span>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <p className="empty">{t('empty')}</p>
          <div className="hrow" style={{ marginTop: 22 }}>
            <Link className="btn btn-sm btn-accent" href="/account/shop">{t('shop')}</Link>
          </div>
        </>
      )}

      <p className="note rv" style={{ ...rv(3), marginTop: 22, maxWidth: '64ch' }}>{t('note')}</p>
      <RuoNote />
    </section>
  );
}
