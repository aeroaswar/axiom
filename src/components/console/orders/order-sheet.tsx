import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { Icon } from '@/components/shell/sprite';
import { dispatchEta, type CutoffSetting } from '@/lib/domain/cutoff';
import { nextAction, orderSteps, type OrderView } from '@/lib/domain/next-action';
import { byDestination, isRefused, type Leg, type Margin, type OrderDetail, type OrderLine, type EventRow } from '@/lib/queries/orders';
import { ActionForm } from '../shared/action-form';
import { advanceOrder, cancelOrder, markPaid, requote } from './actions';
import { labels, NextCell } from './labels';
import { waLink, withRuo } from './wa';

type Props = {
  order: OrderDetail; lines: OrderLine[]; legs: Leg[]; events: EventRow[];
  margin: Margin | { refused: string }; owner: boolean; cutoff: CutoffSetting; ruo: string; floor: number;
};

/**
 * The order, read top to bottom: the five moments it has passed, the one thing it waits for and the
 * control that completes it, what is in it and where each line goes, what it is worth, and every
 * state change that brought it here. The dispatch control does not exist while an invoice is unpaid —
 * it is not disabled, it is absent, because payment is the only door into packing.
 */
export async function OrderSheetBody({ order, lines, legs, events, margin, owner, cutoff, ruo, floor }: Props) {
  const t = await getTranslations('commerce.order');
  const ts = await getTranslations('states');
  const L = await labels();

  const view: OrderView = {
    state: order.state, placed_at: order.placed_at, paid_claim_at: order.paid_claim_at,
    delivered_at: order.delivered_at, cancelled_at: order.cancelled_at, dispatched_at: order.dispatched_at,
    invoice_due_at: order.invoice_due_at, invoice_paid_at: order.invoice_paid_at,
    invoice_voided_at: order.invoice_voided_at, cold: order.cold, eta_days: order.eta_days,
    reorder_due_at: order.reorder_due_at, cadence_days: order.cadence_days,
  };
  const na = nextAction(view, cutoff);
  const steps = orderSteps({ ...view, invoice_number: order.invoice_number, accepted_at: order.accepted_at }, cutoff);
  const eta = dispatchEta({ cold: order.cold, cutoff, etaDays: order.eta_days, dispatchedAt: order.dispatched_at });
  const groups = byDestination(lines);
  // `nextAction` dates the transfer row by the invoice's due date; the sentence names the
  // moment the transfer was reported, so that one date is supplied here.
  const claimStamp = na.key === 'o_transfer_reported' && order.paid_claim_at
    ? { date: L.stamp(order.paid_claim_at) } : undefined;
  const gmTone = !isRefused(margin) && Number(margin.gm_pct) < floor ? 'warn' : 'ok';
  const quiet = order.state === 'delivered' || order.state === 'cancelled';

  const stepText = (s: (typeof steps)[number]) => {
    switch (s.key) {
      case 'accepted': return L.stamp(s.at);
      case 'invoiced': return s.label === 'voided' ? t('voided') : (s.label || '');
      case 'paid': return s.at ? L.stamp(s.at) : s.due ? t('due', { date: L.short(s.due) }) : '';
      case 'dispatched':
        if (s.at) return L.stamp(s.at);
        if (!s.eta) return '';
        return t(order.cold
          ? (s.eta.late ? 'packing_cold_tomorrow' : 'packing_cold_today')
          : (s.eta.late ? 'packing_tomorrow' : 'packing_today'), { cut: s.eta.cutLabel });
      default:
        if (s.at) return L.stamp(s.at);
        if (s.off) return t('cancelled');
        return s.eta ? t('est', { date: L.short(s.eta.deliver) }) : '';
    }
  };

  const invoiceState = order.invoice_voided_at ? t('void')
    : order.invoice_paid_at ? t('paid_on', { date: L.short(order.invoice_paid_at), ref: order.invoice_paid_ref ?? '' })
      : order.invoice_due_at && new Date(order.invoice_due_at) < new Date() ? t('overdue', { date: L.short(order.invoice_due_at) })
        : t('due_on', { date: L.short(order.invoice_due_at) });

  const legLabel = (l: Leg) =>
    `${l.site_name} · ${t('units', { n: l.units })}${l.capped ? ` · ${t('capped')}` : ''}`;

  const deliveryLabel = legs.length > 1
    ? t('destinations', { n: legs.length, units: t('units', { n: legs.reduce((s, l) => s + l.units, 0) }) })
    : legs[0] ? legLabel(legs[0]) : '';

  return (
    <>
      <div className={`steps${order.state === 'cancelled' ? ' off' : ''}`}>
        {steps.map(s => (
          <div key={s.key} className={`s${s.done ? ' done' : ''}${s.now ? ' now' : ''}`}>
            <i />
            <span className="t1">{t(`step_${s.key}`)}</span>
            <span className="t2">{stepText(s)}</span>
          </div>
        ))}
      </div>

      <div className={`nxt${na.tone ? ` ${na.tone}` : quiet ? ' quiet' : ''}`}>
        <span className="k">{quiet ? t('closed') : t('next')}</span>
        <span className="v"><NextCell row={{ next: na, cold: order.cold }} cutoff={cutoff} text={L.next(na, claimStamp)} className="" /></span>
      </div>

      {/* The control that completes it. Absent, not disabled, when the rule does not allow it. */}
      {order.state === 'awaiting_payment' ? (
        <div className="nxt-act">
          <ActionForm action={markPaid} submit={L.t('act.mark_paid')} tone="accent">
            <input type="hidden" name="order_id" value={order.id} />
            <div className="field">
              <label htmlFor="reference">{t('reference')}</label>
              <input id="reference" name="reference" required autoComplete="off"
                defaultValue={order.paid_claim_ref ?? ''} />
            </div>
          </ActionForm>
        </div>
      ) : order.state === 'packing' ? (
        <div className="nxt-act">
          <ActionForm action={advanceOrder} submit={L.t('act.mark_dispatched')} tone="accent">
            <input type="hidden" name="order_id" value={order.id} />
            <div className="fgrid">
              <div className="field"><label htmlFor="carrier">{t('carrier')}</label><input id="carrier" name="carrier" autoComplete="off" /></div>
              <div className="field"><label htmlFor="tracking">{t('tracking')}</label><input id="tracking" name="tracking" autoComplete="off" /></div>
            </div>
          </ActionForm>
        </div>
      ) : order.state === 'dispatched' ? (
        <div className="nxt-act">
          <ActionForm action={advanceOrder} submit={L.t('act.mark_delivered')} tone="accent">
            <input type="hidden" name="order_id" value={order.id} />
          </ActionForm>
        </div>
      ) : (
        <div className="nxt-act">
          <ActionForm action={requote} submit={L.t('act.requote')} tone="accent">
            <input type="hidden" name="order_number" value={order.number} />
          </ActionForm>
        </div>
      )}

      <div className="hrow" style={{ margin: '14px 0' }}>
        <span className={`chip ${order.state === 'packing' ? 'warn' : order.state === 'dispatched' ? 'info' : order.state === 'cancelled' ? 'err' : order.state === 'delivered' ? 'quiet ok' : 'quiet'}`}>
          <span className="dot" />{ts(`order.${order.state}`)}
        </span>
        <span className="note">{L.short(order.placed_at)}{order.quote_number ? ` · ${t('from_quote', { quote: order.quote_number })}` : ''}</span>
      </div>

      <div className="kv"><span className="k">{t('account')}</span><span className="v">
        <Link href={`/console/clients/${order.account_id}`} scroll={false}>{order.account}</Link>
      </span></div>

      {groups.map(g => (
        <div key={g.siteId ?? 'none'}>
          {groups.length > 1 ? (
            <div className="grpline"><span className="nm">{g.siteName ?? ''}</span></div>
          ) : null}
          {g.lines.map(l => (
            <div className="kv" key={l.id}>
              <span className="k">{l.name}{l.kind === 'peptide' ? ` · ${l.dose}` : ''} × {l.qty}{l.interval_days ? ` · ${t('plan', { days: l.interval_days, pct: Number(l.discount_pct) })}` : ''}</span>
              <span className="v">{idr(l.line_total_idr)}</span>
            </div>
          ))}
        </div>
      ))}

      <div className="kv">
        <span className="k">{legs.length > 1 ? t('delivery') : t('delivery_to', { site: deliveryLabel })}</span>
        <span className="v">{idr(order.delivery_idr)}</span>
      </div>
      {legs.length > 1 ? (
        <div className="delivery-legs">
          {legs.map(l => (
            <div className="kv" key={l.site_id}>
              <span className="k">{legLabel(l)}</span>
              <span className={`v${l.charge_idr === null ? ' tone-warn' : ''}`}>
                {l.charge_idr === null ? t('rate_pending') : idr(l.charge_idr)}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {order.state === 'packing' ? (
        <div className="kv">
          <span className="k">{order.cold ? t('cold_dispatch') : t('dispatch')}</span>
          <span className="v"><NextCell row={{ next: na, cold: order.cold }} cutoff={cutoff} text={L.next(na, claimStamp)} className="" /></span>
        </div>
      ) : null}
      {order.dispatched_at ? (
        <div className="kv"><span className="k">{t('dispatch')}</span>
          <span className="v">{t('dispatched_on', { date: L.short(order.dispatched_at) })}{order.carrier ? ` · ${order.carrier}` : ''}{order.tracking_no ? ` · ${order.tracking_no}` : ''}</span></div>
      ) : null}
      {order.state === 'dispatched' ? (
        <div className="kv"><span className="k">{t('delivery')}</span><span className="v">{t('delivery_est', { date: L.short(eta.deliver) })}</span></div>
      ) : null}
      {order.delivered_at ? (
        <div className="kv"><span className="k">{t('delivered')}</span><span className="v">{L.stamp(order.delivered_at)}</span></div>
      ) : null}

      {order.invoice_number ? (
        <div className="kv">
          <span className="k">
            <Link href={`/console/invoices/${order.invoice_number}`} scroll={false}>{t('invoice', { number: order.invoice_number })}</Link>
          </span>
          <span className={`v${order.invoice_voided_at ? ' tone-dim' : ''}`}>{invoiceState}</span>
        </div>
      ) : null}
      {order.paid_claim_at && !order.invoice_paid_at ? (
        <p className="note" style={{ marginTop: 10 }}>
          {t('transfer_reported', { date: L.stamp(order.paid_claim_at), ref: order.paid_claim_ref ?? '' })}
        </p>
      ) : null}

      <div className="big-total"><span className="kicker">{t('total')}</span><span className="v">{idr(order.total_idr)}</span></div>

      {owner ? (
        <div className="margin-box owner-only">
          <span className="kicker">{t('margin')}</span>
          {isRefused(margin) ? <p className="note">{t('margin_unavailable')}</p> : (
            <>
              <div className="kv"><span className="k">{t('revenue')}</span><span className="v">{idr(margin.revenue)}</span></div>
              <div className="kv"><span className="k">{t('supplier')}</span><span className="v">{idr(margin.supplier)}</span></div>
              {BigInt(margin.pen) > 0n ? <div className="kv"><span className="k">{t('pens')}</span><span className="v">{idr(margin.pen)}</span></div> : null}
              <div className="kv"><span className="k">{t('base')}</span><span className="v">{idr(margin.base)}</span></div>
              <div className="kv" style={{ border: 'none' }}>
                <span className="k">{t('margin_v')}</span>
                <span className="v" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {idr(margin.margin)}<span className={`chip ${gmTone} mchip`}><span className="dot" />{t('gm', { pct: Number(margin.gm_pct).toFixed(1) })}</span>
                </span>
              </div>
              <p className="note" style={{ marginTop: 6 }}>{t('margin_note')}</p>
            </>
          )}
        </div>
      ) : null}

      <div className="sec-h" style={{ marginTop: 22 }}><span className="kicker">{t('history')}</span></div>
      <div className="hist">
        {events.map((e, i) => (
          <div className="kv" key={i}>
            <span className="k">{L.stamp(e.at)} · {e.actor}</span>
            <span className="v">{t('moved', {
              from: e.from_state === 'accepted' ? t('ev_accepted') : e.from_state ? ts(`order.${e.from_state}`) : t('ev_new'),
              to: ts(`order.${e.to_state}`),
            })}</span>
          </div>
        ))}
      </div>

      {order.state === 'awaiting_payment' || order.state === 'packing' ? (
        <div style={{ marginTop: 16 }}>
          <ActionForm action={cancelOrder} submit={L.t(order.invoice_number && !order.invoice_paid_at && !order.invoice_voided_at ? 'act.cancel_voids' : 'act.cancel_order')}>
            <input type="hidden" name="order_id" value={order.id} />
            <div className="field">
              <label htmlFor="reason">{t('reason')}</label>
              <input id="reason" name="reason" autoComplete="off" />
              <span className="hint">{t('reason_hint')}</span>
            </div>
          </ActionForm>
        </div>
      ) : null}

      {order.has_peptide ? <div className="ruo" style={{ marginTop: 18 }}>{ruo}</div> : null}
    </>
  );
}

/** The sheet's footer: the ways out of it. The action that changes state lives beside the Next line. */
export async function OrderSheetFooter({ order, ruo }: { order: OrderDetail; ruo: string }) {
  const t = await getTranslations('commerce.order');
  const ta = await getTranslations('commerce.act');
  const overdue = !!order.invoice_due_at && !order.invoice_paid_at && !order.invoice_voided_at && new Date(order.invoice_due_at) < new Date();
  const nudge = overdue && !order.paid_claim_at;
  const text = nudge
    ? t('wa_nudge', { account: order.account, invoice: order.invoice_number ?? '', amount: idr(order.invoice_total_idr ?? order.total_idr) })
    : t('wa_update', { account: order.account, order: order.number });
  return (
    <>
      <a className="btn btn-sm" href={waLink(withRuo(text, order.has_peptide, ruo), order.account_whatsapp)} target="_blank" rel="noopener noreferrer">
        <Icon name="wa" />{nudge ? ta('nudge') : ta('message')}
      </a>
      {order.invoice_number ? (
        <Link className="btn btn-sm" href={`/console/invoices/${order.invoice_number}`}><Icon name="file" />{ta('invoice')}</Link>
      ) : null}
    </>
  );
}
