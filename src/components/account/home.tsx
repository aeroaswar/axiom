import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { idr } from '@/lib/money';
import { nextAction, nextActionQ } from '@/lib/domain/next-action';
import { rv } from '@/components/console/shared/reveal';
import type { CutoffSetting } from '@/lib/domain/cutoff';
import { pipeline, withReorderDue, type OrderRow, type QuoteRow } from './data';
import { subscriptionsFor } from '@/lib/queries/subscriptions';
import { chipToneFor, naValues, orderView, quoteView, StateChip } from './ui';
import { ReorderButton } from './client-forms';

/**
 * The account's home is the spine seen from the buyer's side: what needs you, what is moving, what
 * is done. The three groups are a view of the same records the Console works, sorted by what is
 * due first, and each row carries the one next action its own function returned.
 */

const ORDER_ICON: Record<string, string> = {
  awaiting_payment: 'file', packing: 'box', dispatched: 'truck', delivered: 'check', cancelled: 'x',
};
const QUOTE_ICON: Record<string, string> = {
  sent: 'send', requested: 'clock', draft: 'clock', expired: 'clock', accepted: 'receipt', lost: 'x',
};

type Item = { key: string; href: string; icon: string; title: string; sub: string; tone: string; amount: string | null; chip: string; number: string; reorder?: boolean; at: number };

export async function AccountHome({ uid, accountId, cutoff, basketCount }: {
  uid: string; accountId: string; cutoff: CutoffSetting; basketCount: number;
}) {
  const t = await getTranslations('account');
  const locale = await getLocale();
  const [{ orders: raw, quotes, cadence }, plans] = await Promise.all([pipeline(uid, accountId), subscriptionsFor(uid, accountId)]);
  const livePlans = plans.filter(p => p.state !== 'cancelled').length;
  // a live plan carries its own date; the reorder nudge is for accounts without one
  const orders = withReorderDue(raw, livePlans ? null : cadence);

  const quoteItem = (q: QuoteRow): Item => {
    const na = nextActionQ(quoteView(q));
    const requested = q.state === 'requested' || q.state === 'draft';
    return {
      key: `q-${q.id}`,
      href: `/account/quotes/${q.number}`,
      icon: QUOTE_ICON[q.state] ?? 'send',
      title: requested ? t('home.request', { number: q.number }) : t('home.quote', { number: q.number }),
      sub: t(`next.${na.key}`, naValues(na, locale)),
      tone: na.tone,
      amount: q.unpriced ? null : String(Number(q.total_idr ?? 0) + (q.delivery_known ? Number(q.delivery_idr ?? 0) : 0)),
      chip: q.state,
      number: q.number,
      at: new Date(q.created_at).getTime(),
    };
  };

  const orderItem = (o: OrderRow): Item => {
    const na = nextAction(orderView(o), cutoff);
    return {
      key: `o-${o.id}`,
      href: `/account/orders/${o.number}`,
      icon: ORDER_ICON[o.state] ?? 'receipt',
      title: o.number,
      sub: t(`next.${na.key}`, naValues(na, locale)),
      tone: na.tone,
      amount: o.invoice_total_idr && !o.invoice_voided_at ? o.invoice_total_idr : o.total_idr,
      chip: o.state === 'awaiting_payment' && o.paid_claim_at ? 'transfer_reported'
        : o.state === 'awaiting_payment' && o.invoice_due_at && new Date(o.invoice_due_at) < new Date() ? 'overdue'
          : o.state,
      number: o.number,
      reorder: o.state === 'delivered' || o.state === 'cancelled',
      at: new Date(o.placed_at).getTime(),
    };
  };

  // Needs you: a sent quote waiting for acceptance, and an issued invoice that is still unpaid —
  // including one whose transfer has been reported, because the money has not landed yet.
  const needs: Item[] = [
    ...quotes.filter(q => q.state === 'sent').map(quoteItem),
    ...orders.filter(o => o.state === 'awaiting_payment').map(orderItem),
  ].sort((a, b) => b.at - a.at);

  const progress: Item[] = [
    ...quotes.filter(q => q.state === 'requested' || q.state === 'draft').map(quoteItem),
    ...orders.filter(o => o.state === 'packing' || o.state === 'dispatched').map(orderItem),
  ].sort((a, b) => b.at - a.at);

  const earlier: Item[] = [
    ...orders.filter(o => o.state === 'delivered' || o.state === 'cancelled').map(orderItem),
    ...quotes.filter(q => q.state === 'expired' || q.state === 'lost').map(quoteItem),
  ].sort((a, b) => b.at - a.at);

  const Rows = ({ items, empty }: { items: Item[]; empty: string }) => (
    items.length ? (
      <div className="rows">
        {items.map(i => (
          <div className="row rowa" key={i.key}>
            <span className="ic"><Icon name={i.icon} /></span>
            <span className="bd">
              <Link className="t1 lk" href={i.href}>{i.title}</Link>
              <span className={`t2${i.tone ? ` ${i.tone}` : ''}`}>{i.sub}</span>
            </span>
            <span className="rt">
              <span className="amt">{idr(i.amount)}</span>
              <StateChip state={i.chip} tone={chipToneFor(i.chip)} />
            </span>
            {i.reorder ? <span className="act"><ReorderButton number={i.number} label={t('home.reorder')} /></span> : null}
          </div>
        ))}
      </div>
    ) : <p className="empty">{empty}</p>
  );

  return (
    <>
      <section className="sec rv" style={rv(0)}>
        <div className="sec-h">
          <span className="kicker">{t('home.needs_you')}</span>
          <span className="sp" />
          <span className="note">{t('home.needs_you_note')}</span>
        </div>
        <Rows items={needs} empty={t('home.needs_you_empty')} />
      </section>

      <section className="sec rv" style={rv(1)}>
        <div className="sec-h"><span className="kicker">{t('home.in_progress')}</span></div>
        <Rows items={progress} empty={t('home.in_progress_empty')} />
      </section>

      <section className="sec rv" style={rv(2)}>
        <div className="sec-h"><span className="kicker">{t('home.earlier')}</span></div>
        <Rows items={earlier} empty={t('home.earlier_empty')} />
      </section>

      <div className="basketbar rv" style={rv(3)}>
        <span className="note">{t('home.basket_link', { count: basketCount })}</span>
        <span className="sp" />
        {basketCount ? <Link className="btn btn-sm" href="/account/basket">{t('home.basket_cta')}</Link> : null}
        <Link className="btn btn-sm" href="/account/shop">{t('home.shop_cta')}</Link>
      </div>
      {livePlans ? (
        <div className="basketbar rv" style={rv(4)}>
          <span className="note">{t('home.plans', { count: livePlans })}</span>
          <span className="sp" />
          <Link className="btn btn-sm" href="/account/subscriptions">{t('home.plans_cta')}</Link>
        </div>
      ) : null}
    </>
  );
}
