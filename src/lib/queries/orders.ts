import 'server-only';
import { pgMessage, withRls } from '@/lib/db';

/**
 * One order, as the sheet reads it. Nothing here recomputes a rule: the delivery legs come from
 * `axiom.delivery_for_lines`, the margin from the costs frozen on the lines at acceptance, and the
 * history from `order_events` — the log every state change writes.
 */
export type OrderDetail = {
  id: string; number: string; state: 'awaiting_payment' | 'packing' | 'dispatched' | 'delivered' | 'cancelled';
  account_id: string; account: string; account_whatsapp: string | null;
  placed_at: Date; accepted_at: Date | null; cancelled_at: Date | null; delivered_at: Date | null;
  paid_claim_at: Date | null; paid_claim_ref: string | null;
  subtotal_idr: string; delivery_idr: string; total_idr: string;
  quote_number: string | null;
  invoice_id: string | null; invoice_number: string | null; invoice_total_idr: string | null;
  invoice_due_at: Date | null; invoice_paid_at: Date | null; invoice_paid_ref: string | null; invoice_voided_at: Date | null;
  dispatched_at: Date | null; carrier: string | null; tracking_no: string | null; eta_at: Date | null;
  cold: boolean; eta_days: number; has_peptide: boolean;
  reorder_due_at: Date | null; cadence_days: number | null;
};

export type OrderLine = {
  id: string; variant_id: string; sku: string; name: string; kind: 'peptide' | 'device' | 'apparel';
  dose: string; qty: number; unit_price_idr: string; line_total_idr: string;
  site_id: string | null; site_name: string | null; zone: string | null;
};

export type Leg = { site_id: string; site_name: string; zone: string; units: number; charge_idr: string | null; cap_idr: string | null; capped: boolean };

export type EventRow = { at: Date; actor: string; from_state: string | null; to_state: string };

export async function orderByNumber(uid: string, number: string) {
  const rows = await withRls({ uid }, tx => tx<OrderDetail[]>`
    select o.id::text as id, o.number, o.state, o.account_id::text as account_id, a.name as account, a.whatsapp as account_whatsapp,
           o.placed_at, o.delivered_at, o.paid_claim_at, o.paid_claim_ref,
           o.subtotal_idr::text as subtotal_idr, o.delivery_idr::text as delivery_idr, o.total_idr::text as total_idr,
           (select min(e.at) from public.order_events e where e.order_id = o.id and e.to_state = 'awaiting_payment') as accepted_at,
           (select max(e.at) from public.order_events e where e.order_id = o.id and e.to_state = 'cancelled') as cancelled_at,
           q.number as quote_number,
           i.id::text as invoice_id, i.number as invoice_number, i.total_idr::text as invoice_total_idr,
           i.due_at as invoice_due_at, i.paid_at as invoice_paid_at, i.paid_ref as invoice_paid_ref, i.voided_at as invoice_voided_at,
           s.dispatched_at, s.carrier, s.tracking_no, s.eta_at,
           exists (select 1 from public.order_items oi join public.product_variants v on v.id = oi.variant_id
                    where oi.order_id = o.id and v.is_cold_chain) as cold,
           exists (select 1 from public.order_items oi join public.product_variants v on v.id = oi.variant_id
                    join public.products p on p.id = v.product_id where oi.order_id = o.id and p.kind = 'peptide') as has_peptide,
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
    left join lateral (select id, number, total_idr, due_at, paid_at, paid_ref, voided_at from public.invoices
                        where order_id = o.id and kind = 'invoice' order by created_at desc limit 1) i on true
    left join lateral (select dispatched_at, carrier, tracking_no, eta_at from public.shipments
                        where order_id = o.id order by dispatched_at desc nulls last limit 1) s on true
    where o.number = ${number}`);
  return rows[0] ?? null;
}

export async function orderBody(uid: string, order: OrderDetail) {
  return withRls({ uid }, async tx => ({
    lines: await tx<OrderLine[]>`
      select oi.id::text as id, oi.variant_id::text as variant_id, v.sku, p.name, p.kind, v.dose, oi.qty,
             oi.unit_price_idr::text as unit_price_idr, oi.line_total_idr::text as line_total_idr,
             oi.site_id::text as site_id, coalesce(st.name, oi.site_name) as site_name, st.zone::text as zone
      from public.order_items oi
      join public.product_variants v on v.id = oi.variant_id
      join public.products p on p.id = v.product_id
      left join public.account_sites st on st.id = oi.site_id
      where oi.order_id = ${order.id}::uuid
      order by st.sort nulls last, st.name nulls last, p.name, v.dose`,
    legs: await tx<Leg[]>`
      select d.site_id::text as site_id, d.site_name, d.zone::text as zone, d.units,
             d.charge_idr::text as charge_idr, dz.cap_idr::text as cap_idr,
             (d.charge_idr is not null and d.charge_idr = dz.cap_idr
              and ceil(d.units / 3.0) * dz.per_three_idr > dz.cap_idr) as capped
      from axiom.delivery_for_lines(
        (select jsonb_agg(jsonb_build_object('site_id', oi.site_id, 'qty', oi.qty))
           from public.order_items oi where oi.order_id = ${order.id}::uuid),
        ${order.account_id}::uuid) d
      join public.delivery_zones dz on dz.zone = d.zone`,
    events: await tx<EventRow[]>`
      select at, actor_label as actor, from_state, to_state
      from public.order_events where order_id = ${order.id}::uuid order by at desc, id desc`,
  }));
}

// ---------------------------------------------------------------- margin
// The cost snapshot frozen on each line at acceptance. The policy on order_item_costs raises for
// anyone but the owner, so the refusal is the answer — never a blank card, never a hidden element.
export type Margin = { revenue: string; supplier: string; pen: string; base: string; margin: string; gm_pct: number };

export async function orderMargin(uid: string, orderId: string): Promise<Margin | { refused: string }> {
  try {
    const rows = await withRls({ uid }, tx => tx<Margin[]>`
      select coalesce(sum(oi.line_total_idr), 0)::text as revenue,
             coalesce(sum(c.unit_supplier_cost_idr * oi.qty), 0)::text as supplier,
             coalesce(sum(c.unit_pen_cost_idr * oi.qty), 0)::text as pen,
             coalesce(sum((c.unit_supplier_cost_idr + c.unit_pen_cost_idr) * oi.qty), 0)::text as base,
             coalesce(sum(oi.line_total_idr - (c.unit_supplier_cost_idr + c.unit_pen_cost_idr) * oi.qty), 0)::text as margin,
             case when coalesce(sum(oi.line_total_idr), 0) > 0
                  then round(sum(oi.line_total_idr - (c.unit_supplier_cost_idr + c.unit_pen_cost_idr) * oi.qty)::numeric
                             / sum(oi.line_total_idr) * 100, 1) else 0 end as gm_pct
      from public.order_items oi
      join public.order_item_costs c on c.order_item_id = oi.id
      where oi.order_id = ${orderId}::uuid`);
    return rows[0];
  } catch (e) {
    return { refused: pgMessage(e) };
  }
}

export const isRefused = <T,>(x: T | { refused: string }): x is { refused: string } =>
  typeof x === 'object' && x !== null && 'refused' in x;

/** Lines grouped by the destination they ship to, in the order the legs are charged. */
export function byDestination<T extends { site_id: string | null; site_name: string | null }>(lines: T[]) {
  const groups: { siteId: string | null; siteName: string | null; lines: T[] }[] = [];
  for (const l of lines) {
    let g = groups.find(x => x.siteId === l.site_id);
    if (!g) { g = { siteId: l.site_id, siteName: l.site_name, lines: [] }; groups.push(g); }
    g.lines.push(l);
  }
  return groups;
}
