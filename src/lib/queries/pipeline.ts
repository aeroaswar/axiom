import 'server-only';
import { withRls } from '@/lib/db';
import { dispatchEta, leftLabel, type CutoffSetting } from '@/lib/domain/cutoff';
import { addDays, daysFrom, now, toDate } from '@/lib/domain/dates';
import {
  nextAction, nextActionQ, orderSteps, quoteExpires, quoteState,
  stageOfOrder, stageOfQuote,
  type NextAction, type OrderView, type QuoteView, type Stage,
} from '@/lib/domain/next-action';

/**
 * ONE pipeline. The Orders & quotes list and the dashboard's mini strip both call `pipeline()`;
 * neither counts anything itself, so the strip's counts are the list's rows by construction rather
 * than by coincidence. Every figure below is a sum over the rows this same call returns.
 *
 * The delivered stage is a thirty-day window — a work queue, not an archive — and the window applies
 * to the tile and to the list identically. An order delivered longer ago is history, reached from its
 * account, from search, or from the invoice it left behind.
 */
export const DELIVERED_WINDOW_DAYS = 30;

export type Note = { key: string; params: Record<string, string | number>; tone: '' | 'warn' | 'err' };

export type PipeRow = {
  kind: 'quote' | 'order';
  id: string;
  number: string;
  accountId: string;
  account: string;
  stage: Stage;
  /** The state a chip would name: a quote's derived state, or the order's. */
  state: string;
  /** Only an exception earns a chip; the rest is quiet. */
  chip: 'quiet' | 'quiet ok' | 'info' | 'warn' | 'err';
  firstItem: string;
  lineCount: number;
  total: string;
  next: NextAction;
  cold: boolean;
  claimAt: Date | null;
  icon: string;
  href: string;
  tags: string;
};

type QuoteRaw = {
  id: string; number: string; account_id: string; account: string;
  state: QuoteView['state']; created_at: Date; sent_at: Date | null; accepted_at: Date | null;
  lost_at: Date | null; order_number: string | null;
  line_count: number; first_item: string | null;
  subtotal_idr: string; delivery_idr: string;
};

type OrderRaw = {
  id: string; number: string; account_id: string; account: string;
  state: OrderView['state']; placed_at: Date; accepted_at: Date | null; cancelled_at: Date | null;
  paid_claim_at: Date | null; paid_claim_ref: string | null; delivered_at: Date | null;
  dispatched_at: Date | null; eta_days: number; cold: boolean;
  invoice_number: string | null; invoice_due_at: Date | null; invoice_paid_at: Date | null; invoice_voided_at: Date | null;
  quote_number: string | null; line_count: number; first_item: string | null;
  total_idr: string; reorder_due_at: Date | null; cadence_days: number | null;
};

/** The item column: the first line, then how many more. Composed by the surface, which owns the words. */
const first = (r: { first_item: string | null }) => r.first_item ?? '';

// ---------------------------------------------------------------- the read
// Two statements, one transaction. Quote totals price unsent lines from the live catalogue — the
// same row the builder would freeze — and add the delivery the database's own function returns.

export async function pipelineData(uid: string) {
  return withRls({ uid }, async tx => {
    const quotes = await tx<QuoteRaw[]>`
      select q.id::text as id, q.number, q.account_id::text as account_id, a.name as account,
             q.state, q.created_at, q.sent_at, q.accepted_at,
             (select max(e.at) from public.quote_events e where e.quote_id = q.id and e.to_state = 'lost') as lost_at,
             o.number as order_number,
             (select count(*)::int from public.quote_items qi where qi.quote_id = q.id) as line_count,
             (select p.name || case when p.kind = 'peptide' then ' ' || v.dose else '' end
                from public.quote_items qi
                join public.product_variants v on v.id = qi.variant_id
                join public.products p on p.id = v.product_id
               where qi.quote_id = q.id order by qi.id limit 1) as first_item,
             coalesce((select sum(coalesce(qi.unit_price_idr, v.price_idr) * qi.qty)
                from public.quote_items qi join public.product_variants v on v.id = qi.variant_id
               where qi.quote_id = q.id), 0)::text as subtotal_idr,
             coalesce((select sum(coalesce(d.charge_idr, 0)) from axiom.delivery_for_lines(
                (select jsonb_agg(jsonb_build_object('site_id', qi.site_id, 'qty', qi.qty))
                   from public.quote_items qi where qi.quote_id = q.id), q.account_id) d), 0)::text as delivery_idr
      from public.quotes q
      join public.accounts a on a.id = q.account_id
      left join public.orders o on o.id = q.order_id`;

    const orders = await tx<OrderRaw[]>`
      select o.id::text as id, o.number, o.account_id::text as account_id, a.name as account,
             o.state, o.placed_at, o.delivered_at, o.paid_claim_at, o.paid_claim_ref, o.total_idr::text as total_idr,
             (select min(e.at) from public.order_events e where e.order_id = o.id and e.to_state = 'awaiting_payment') as accepted_at,
             (select max(e.at) from public.order_events e where e.order_id = o.id and e.to_state = 'cancelled') as cancelled_at,
             s.dispatched_at,
             q.number as quote_number,
             i.number as invoice_number, i.due_at as invoice_due_at, i.paid_at as invoice_paid_at, i.voided_at as invoice_voided_at,
             (select count(*)::int from public.order_items oi where oi.order_id = o.id) as line_count,
             (select p.name || case when p.kind = 'peptide' then ' ' || v.dose else '' end
                from public.order_items oi
                join public.product_variants v on v.id = oi.variant_id
                join public.products p on p.id = v.product_id
               where oi.order_id = o.id order by oi.id limit 1) as first_item,
             exists (select 1 from public.order_items oi join public.product_variants v on v.id = oi.variant_id
                      where oi.order_id = o.id and v.is_cold_chain) as cold,
             coalesce((select max(dz.eta_days) from public.order_items oi
                        join public.account_sites st on st.id = oi.site_id
                        join public.delivery_zones dz on dz.zone = st.zone
                       where oi.order_id = o.id), 2) as eta_days,
             case when o.state = 'delivered' and o.placed_at = (
                    select max(x.placed_at) from public.orders x
                     where x.account_id = o.account_id and x.state <> 'cancelled')
                  then o.placed_at + make_interval(days => axiom.cadence_days(o.account_id)) end as reorder_due_at,
             axiom.cadence_days(o.account_id) as cadence_days
      from public.orders o
      join public.accounts a on a.id = o.account_id
      left join public.quotes q on q.id = o.quote_id
      left join lateral (
        select number, due_at, paid_at, voided_at from public.invoices
         where order_id = o.id and kind = 'invoice' order by created_at desc limit 1) i on true
      left join lateral (
        select dispatched_at from public.shipments
         where order_id = o.id order by dispatched_at desc nulls last limit 1) s on true`;

    return { quotes, orders };
  });
}

// ---------------------------------------------------------------- the rows
const QUOTE_ICON: Record<string, string> = {
  requested: 'clock', draft: 'receipt', sent: 'send', expired: 'warn', accepted: 'check', lost: 'x',
};
const QUOTE_CHIP: Record<string, PipeRow['chip']> = {
  requested: 'warn', draft: 'quiet', sent: 'info', expired: 'err', accepted: 'quiet ok', lost: 'quiet',
};
const ORDER_ICON: Record<string, string> = {
  awaiting_payment: 'file', packing: 'box', dispatched: 'truck', delivered: 'check', cancelled: 'x',
};
const ORDER_CHIP: Record<string, PipeRow['chip']> = {
  awaiting_payment: 'quiet', packing: 'warn', dispatched: 'info', delivered: 'quiet ok', cancelled: 'err',
};

const quoteView = (q: QuoteRaw, days: number): QuoteView => ({
  state: q.state, created_at: q.created_at, sent_at: q.sent_at, accepted_at: q.accepted_at,
  lost_at: q.lost_at, order_number: q.order_number, quote_days: days,
});

export const orderView = (o: OrderRaw): OrderView => ({
  state: o.state, placed_at: o.placed_at, paid_claim_at: o.paid_claim_at, delivered_at: o.delivered_at,
  cancelled_at: o.cancelled_at, dispatched_at: o.dispatched_at, invoice_due_at: o.invoice_due_at,
  invoice_paid_at: o.invoice_paid_at, invoice_voided_at: o.invoice_voided_at,
  cold: o.cold, eta_days: o.eta_days, reorder_due_at: o.reorder_due_at, cadence_days: o.cadence_days,
});

export type PipelineOpts = { cutoff: CutoffSetting; quoteDays: number; ref?: Date };

export type Pipeline = {
  rows: PipeRow[];
  stages: { key: Stage; n: number; value: string; note: Note }[];
  counts: Record<string, number>;
};

/**
 * Rows first, tiles from the rows. Open work sorts by the date its next action falls due, then the
 * delivered window newest first, then what is closed. A record with no next action cannot occur:
 * `nextAction` and `nextActionQ` are total over the states the database can hold.
 */
export function pipeline(data: { quotes: QuoteRaw[]; orders: OrderRaw[] }, opts: PipelineOpts): Pipeline {
  const ref = opts.ref ?? now();
  const rows: PipeRow[] = [];

  for (const q of data.quotes) {
    const view = quoteView(q, opts.quoteDays);
    const s = quoteState(view, ref);
    const stage = stageOfQuote(view, ref);
    rows.push({
      kind: 'quote', id: q.id, number: q.number, accountId: q.account_id, account: q.account,
      stage, state: s, chip: QUOTE_CHIP[s] ?? 'quiet',
      firstItem: first(q), lineCount: q.line_count,
      total: (BigInt(q.subtotal_idr) + BigInt(q.delivery_idr)).toString(),
      next: nextActionQ(view, ref), cold: false, claimAt: null, icon: QUOTE_ICON[s] ?? 'receipt',
      href: `/console/orders/quotes/${q.number}`,
      tags: `${stage} ${s}`,
    });
  }

  for (const o of data.orders) {
    const view = orderView(o);
    const stage = stageOfOrder(view);
    // The thirty-day window, applied once, before anything counts or renders.
    if (stage === 'delivered' && daysFrom(o.delivered_at ?? o.placed_at, ref) > DELIVERED_WINDOW_DAYS) continue;
    const overdue = !!o.invoice_due_at && !o.invoice_paid_at && !o.invoice_voided_at && new Date(o.invoice_due_at) < ref;
    rows.push({
      kind: 'order', id: o.id, number: o.number, accountId: o.account_id, account: o.account,
      stage, state: o.state, chip: ORDER_CHIP[o.state] ?? 'quiet',
      firstItem: first(o), lineCount: o.line_count, total: o.total_idr,
      next: nextAction(view, opts.cutoff, ref), cold: o.cold, claimAt: o.paid_claim_at, icon: ORDER_ICON[o.state] ?? 'receipt',
      href: `/console/orders/${o.number}`,
      tags: `${stage}${overdue ? ' overdue' : ''}${o.paid_claim_at ? ' claim' : ''}`,
    });
  }

  const rank = (r: PipeRow) => (r.stage === 'closed' ? 2 : r.stage === 'delivered' ? 1 : 0);
  const at = (r: PipeRow) => (r.next.at ? new Date(r.next.at).getTime() : 0);
  rows.sort((a, b) => {
    const ra = rank(a), rb = rank(b);
    if (ra !== rb) return ra - rb;
    return ra === 0 ? at(a) - at(b) : at(b) - at(a);
  });

  // ---- the five tiles, summed from the rows above
  const STAGES: Stage[] = ['quotes', 'awaiting_payment', 'packing', 'dispatched', 'delivered'];
  const of = (s: Stage) => rows.filter(r => r.stage === s);
  const sum = (rs: PipeRow[]) => rs.reduce((t, r) => t + BigInt(r.total), 0n).toString();

  const quotes = of('quotes');
  const open = new Set(quotes.map(r => r.id));
  const requested = quotes.filter(r => r.state === 'requested').length;
  const expired = quotes.filter(r => r.state === 'expired').length;
  const oldestQuote = data.quotes
    .filter(q => open.has(q.id))
    .reduce((m, q) => Math.max(m, daysFrom(q.created_at, ref)), 0);
  const quoteNote: Note =
    requested ? { key: 'to_price', params: { n: requested }, tone: 'warn' }
      : expired ? { key: 'expired', params: { n: expired }, tone: 'warn' }
        : !quotes.length ? { key: 'none_open', params: {}, tone: '' }
          : oldestQuote > 0 ? { key: 'oldest', params: { d: oldestQuote }, tone: '' }
            : { key: 'all_today', params: {}, tone: '' };

  const awaiting = of('awaiting_payment');
  const claims = awaiting.filter(r => r.tags.includes('claim')).length;
  const overdue = awaiting.filter(r => r.tags.includes('overdue')).length;
  const awaitingNote: Note =
    claims ? { key: 'transfers', params: { n: claims }, tone: 'warn' }
      : overdue ? { key: 'overdue', params: { n: overdue }, tone: 'err' }
        : awaiting.length ? { key: 'none_overdue', params: {}, tone: '' }
          : { key: 'nothing_due', params: {}, tone: '' };

  // The cut-off the queue actually faces: cold when a cold-chain line is in it, ambient otherwise.
  const packing = of('packing');
  const packCold = data.orders.some(o => o.state === 'packing' && o.cold);
  const eta = dispatchEta({ cold: packCold, cutoff: opts.cutoff, ref });
  const left = leftLabel(eta.minsLeft);
  const packNote: Note = !packing.length
    ? { key: 'queue_clear', params: {}, tone: '' }
    : eta.late
      ? { key: 'cutoff_passed', params: { cut: eta.cutLabel, cold: packCold ? 1 : 0 }, tone: 'err' }
      : { key: 'cutoff', params: { cut: eta.cutLabel, cold: packCold ? 1 : 0, leftKey: left.key, ...left.params }, tone: eta.state === 'warn' ? 'warn' : '' };

  const transit = data.orders
    .filter(o => o.state === 'dispatched')
    .map(o => dispatchEta({ cold: o.cold, cutoff: opts.cutoff, etaDays: o.eta_days, dispatchedAt: o.dispatched_at, ref }).deliver)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const transitNote: Note = transit
    ? { key: 'next_est', params: { date: transit.toISOString() }, tone: '' }
    : { key: 'nothing_on_road', params: {}, tone: '' };

  // Reorders read the same cadence the clients list reads: the database's, per account, once.
  const due = data.orders
    .filter(o => o.reorder_due_at)
    .map(o => ({ days: -daysFrom(o.reorder_due_at, ref), at: toDate(o.reorder_due_at)! }))
    .sort((a, b) => a.days - b.days);
  const reorderOverdue = due.filter(d => d.days < 0).length;
  const reorderSoon = due.filter(d => d.days >= 0 && d.days <= 7).length;
  const deliveredNote: Note =
    reorderOverdue ? { key: 'reorders_overdue', params: { n: reorderOverdue }, tone: 'warn' }
      : reorderSoon ? { key: 'reorders_week', params: { n: reorderSoon }, tone: '' }
        : due.length ? { key: 'next_reorder', params: { d: due[0].days }, tone: '' }
          : { key: 'no_reorder', params: {}, tone: '' };

  const notes: Record<string, Note> = {
    quotes: quoteNote, awaiting_payment: awaitingNote, packing: packNote,
    dispatched: transitNote, delivered: deliveredNote,
  };

  const stages = STAGES.map(key => {
    const rs = of(key);
    return { key, n: rs.length, value: sum(rs), note: notes[key] };
  });

  const counts = Object.fromEntries([...STAGES, 'closed' as Stage].map(s => [s, of(s).length]));
  return { rows, stages, counts };
}

/** The mini strip and the list read the same call. */
export async function consolePipeline(uid: string, opts: PipelineOpts) {
  return pipeline(await pipelineData(uid), opts);
}

export { quoteExpires, orderSteps, addDays };
