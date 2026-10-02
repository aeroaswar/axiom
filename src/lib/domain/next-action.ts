import { addDays, daysFrom, now, toDate } from './dates';
import { dispatchEta, type CutoffSetting } from './cutoff';

// Every record has exactly one next action and a date. The list's Next column, the sheet's Next
// line and the sheet's primary button all read it from here, on both surfaces. Labels are message
// keys with params so each surface translates in its own vocabulary (the client's, not the state
// machine's).

export type Tone = '' | 'warn' | 'err';
export type NextAction = { key: string; params: Record<string, string | number>; tone: Tone; act: string; at: Date | null; quiet?: boolean };

export type OrderView = {
  state: 'awaiting_payment' | 'packing' | 'dispatched' | 'delivered' | 'cancelled';
  placed_at: string | Date;
  paid_claim_at?: string | Date | null;
  delivered_at?: string | Date | null;
  cancelled_at?: string | Date | null;
  dispatched_at?: string | Date | null;
  invoice_due_at?: string | Date | null;
  invoice_paid_at?: string | Date | null;
  invoice_voided_at?: string | Date | null;
  cold: boolean;
  eta_days?: number;
  reorder_due_at?: string | Date | null;   // set when this is the account's latest order
  cadence_days?: number | null;
  /** Paid, less any credit note: what a cancelled order is still holding. Zero on a live order. */
  held_idr?: string | number | null;
};

export type QuoteView = {
  state: 'requested' | 'draft' | 'sent' | 'accepted' | 'lost';
  created_at: string | Date;
  sent_at?: string | Date | null;
  accepted_at?: string | Date | null;
  lost_at?: string | Date | null;
  order_number?: string | null;
  quote_days?: number;
};

export function quoteState(q: QuoteView, ref = now()): QuoteView['state'] | 'expired' {
  if (q.state === 'sent' && q.sent_at && daysFrom(q.sent_at, ref) >= (q.quote_days ?? 7)) return 'expired';
  return q.state;
}

export function quoteExpires(q: QuoteView) { return q.sent_at ? addDays(new Date(q.sent_at), q.quote_days ?? 7) : null; }

export function nextActionQ(q: QuoteView, ref = now()): NextAction {
  const s = quoteState(q, ref);
  const ex = quoteExpires(q);
  if (s === 'requested') return { key: 'q_requested', params: { days: daysFrom(q.created_at, ref) }, tone: 'warn', act: 'edit', at: addDays(new Date(q.created_at), 1) };
  if (s === 'draft') return { key: 'q_draft', params: {}, tone: '', act: 'edit', at: addDays(new Date(q.created_at), 2) };
  if (s === 'sent') { const d = -daysFrom(ex!, ref); return { key: 'q_sent', params: { days: d }, tone: d <= 1 ? 'warn' : '', act: 'accept', at: ex }; }
  if (s === 'expired') return { key: 'q_expired', params: { days: daysFrom(ex!, ref) }, tone: 'err', act: 'resend', at: ex };
  if (s === 'accepted') return { key: 'q_accepted', params: { order: q.order_number ?? '' }, tone: '', act: 'order', at: toDate(q.accepted_at) ?? ex, quiet: true };
  return { key: 'q_lost', params: {}, tone: '', act: 'requote', at: toDate(q.lost_at) ?? toDate(q.created_at), quiet: true };
}

export function nextAction(o: OrderView, cutoff: CutoffSetting, ref = now()): NextAction {
  if (o.state === 'awaiting_payment') {
    const due = toDate(o.invoice_due_at);
    if (o.paid_claim_at) return { key: 'o_transfer_reported', params: {}, tone: 'warn', act: 'paid', at: due };
    if (due && due < ref) return { key: 'o_overdue', params: { days: daysFrom(due, ref) }, tone: 'err', act: 'paid', at: due };
    return { key: 'o_payment_due', params: { days: due ? -daysFrom(due, ref) : 0 }, tone: '', act: 'paid', at: due };
  }
  if (o.state === 'packing') {
    const e = dispatchEta({ cold: o.cold, cutoff, etaDays: o.eta_days, ref });
    return { key: e.late ? 'o_pack_late' : 'o_pack_today', params: { cut: e.cutLabel, mins: e.minsLeft }, tone: e.state === 'ok' ? '' : 'warn', act: 'advance', at: e.late ? addDays(ref, 1) : ref };
  }
  if (o.state === 'dispatched') {
    const e = dispatchEta({ cold: o.cold, cutoff, etaDays: o.eta_days, dispatchedAt: o.dispatched_at, ref });
    const late = daysFrom(e.deliver, ref) > 0;
    return { key: late ? 'o_delivery_was' : 'o_delivery_est', params: {}, tone: late ? 'warn' : '', act: 'advance', at: e.deliver };
  }
  if (o.state === 'delivered') {
    if (o.reorder_due_at) { const d = daysFrom(o.reorder_due_at, ref); return { key: d > 0 ? 'o_reorder_overdue' : 'o_reorder_due', params: { days: Math.abs(d), cadence: o.cadence_days ?? 0 }, tone: d > 0 ? 'warn' : '', act: 'reorder', at: toDate(o.reorder_due_at), quiet: d <= 0 }; }
    return { key: 'o_delivered', params: {}, tone: '', act: 'reorder', at: toDate(o.delivered_at) ?? toDate(o.placed_at), quiet: true };
  }
  // A cancelled order that is still holding money is not closed: the refund is what happens next,
  // and it is loud. Only when nothing is held does cancelled read as a finished record.
  if (Number(o.held_idr ?? 0) > 0) {
    return { key: 'o_refund_due', params: {}, tone: 'err', act: 'credit', at: toDate(o.cancelled_at) ?? toDate(o.placed_at) };
  }
  return { key: 'o_cancelled', params: {}, tone: '', act: 'reorder', at: toDate(o.cancelled_at) ?? toDate(o.placed_at), quiet: true };
}

export type Stage = 'quotes' | 'awaiting_payment' | 'packing' | 'dispatched' | 'delivered' | 'closed';
export function stageOfOrder(o: Pick<OrderView, 'state'>): Stage { return o.state === 'cancelled' ? 'closed' : o.state; }
export function stageOfQuote(q: QuoteView, ref = now()): Stage { const s = quoteState(q, ref); return s === 'accepted' || s === 'lost' ? 'closed' : 'quotes'; }

/** Five moments, one line: accepted · invoiced · paid · dispatched · delivered. */
export function orderSteps(o: OrderView & { invoice_number?: string | null; accepted_at?: string | Date | null }, cutoff: CutoffSetting, ref = now()) {
  const off = o.state === 'cancelled';
  const i = ['awaiting_payment', 'packing', 'dispatched', 'delivered'].indexOf(o.state);
  const e = dispatchEta({ cold: o.cold, cutoff, etaDays: o.eta_days, dispatchedAt: o.dispatched_at, ref });
  return [
    { key: 'accepted', at: toDate(o.accepted_at) ?? toDate(o.placed_at), done: true, now: false },
    { key: 'invoiced', at: null as Date | null, label: o.invoice_voided_at ? 'voided' : o.invoice_number ?? '', done: !!o.invoice_number && !o.invoice_voided_at, now: false },
    { key: 'paid', at: toDate(o.invoice_paid_at), due: off ? null : toDate(o.invoice_due_at), done: !!o.invoice_paid_at, now: o.state === 'awaiting_payment' },
    { key: 'dispatched', at: toDate(o.dispatched_at), eta: !o.dispatched_at && !off && i >= 1 ? e : null, done: !!o.dispatched_at, now: o.state === 'packing' },
    { key: 'delivered', at: toDate(o.delivered_at), eta: !o.delivered_at && !off && i >= 1 ? e : null, done: !!o.delivered_at, now: o.state === 'dispatched', off },
  ];
}
