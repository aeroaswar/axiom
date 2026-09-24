import 'server-only';
import { pgMessage, withRls } from '@/lib/db';
import type { EventRow, Leg, Margin } from './orders';

/**
 * One quote, as the builder and the record both read it. Availability, delivery and the
 * acknowledgement clearance are all the database's own functions — `axiom.available`,
 * `axiom.delivery_for_lines`, `axiom.account_has_ack` — so what the screen disables Send on is
 * exactly what `axiom.send_quote` would refuse.
 */
export type QuoteDetail = {
  id: string; number: string; state: 'requested' | 'draft' | 'sent' | 'accepted' | 'lost';
  account_id: string; account: string; account_whatsapp: string | null; account_type: string;
  ack: string; has_ack: boolean;
  created_at: Date; sent_at: Date | null; accepted_at: Date | null; lost_at: Date | null;
  order_number: string | null; notes: string | null;
  has_peptide: boolean; cold: boolean; line_count: number;
  subtotal_idr: string; delivery_idr: string; delivery_priced: boolean;
};

export type QuoteLine = {
  id: string; variant_id: string; sku: string; name: string; kind: 'peptide' | 'device' | 'apparel';
  dose: string; content: string; qty: number;
  unit_price_idr: string; line_total_idr: string; frozen: boolean;
  site_id: string | null; site_name: string | null; zone: string | null;
  available: number;
};

export type SiteOption = { id: string; name: string; zone: string; priced: boolean; is_default: boolean };
export type VariantOption = { variant_id: string; sku: string; label: string; price_idr: string; available: number; kind: string };

export async function quoteByNumber(uid: string, number: string) {
  const rows = await withRls({ uid }, tx => tx<QuoteDetail[]>`
    select q.id::text as id, q.number, q.state, q.account_id::text as account_id,
           a.name as account, a.whatsapp as account_whatsapp, a.type::text as account_type,
           axiom.ack_state_for(a.id) as ack, axiom.account_has_ack(a.id) as has_ack,
           q.created_at, q.sent_at, q.accepted_at, q.notes,
           (select max(e.at) from public.quote_events e where e.quote_id = q.id and e.to_state = 'lost') as lost_at,
           o.number as order_number,
           (select count(*)::int from public.quote_items qi where qi.quote_id = q.id) as line_count,
           exists (select 1 from public.quote_items qi join public.product_variants v on v.id = qi.variant_id
                    join public.products p on p.id = v.product_id where qi.quote_id = q.id and p.kind = 'peptide') as has_peptide,
           exists (select 1 from public.quote_items qi join public.product_variants v on v.id = qi.variant_id
                    where qi.quote_id = q.id and v.is_cold_chain) as cold,
           coalesce((select sum(coalesce(qi.unit_price_idr, v.price_idr) * qi.qty)
              from public.quote_items qi join public.product_variants v on v.id = qi.variant_id
             where qi.quote_id = q.id), 0)::text as subtotal_idr,
           coalesce((select sum(coalesce(d.charge_idr, 0)) from axiom.delivery_for_lines(
              (select jsonb_agg(jsonb_build_object('site_id', qi.site_id, 'qty', qi.qty))
                 from public.quote_items qi where qi.quote_id = q.id), q.account_id) d), 0)::text as delivery_idr,
           not exists (select 1 from axiom.delivery_for_lines(
              (select jsonb_agg(jsonb_build_object('site_id', qi.site_id, 'qty', qi.qty))
                 from public.quote_items qi where qi.quote_id = q.id), q.account_id) d
             where d.charge_idr is null) as delivery_priced
    from public.quotes q
    join public.accounts a on a.id = q.account_id
    left join public.orders o on o.id = q.order_id
    where q.number = ${number}`);
  return rows[0] ?? null;
}

export async function quoteBody(uid: string, q: QuoteDetail) {
  return withRls({ uid }, async tx => ({
    lines: await tx<QuoteLine[]>`
      select qi.id::text as id, qi.variant_id::text as variant_id, v.sku, p.name, p.kind, v.dose, v.content, qi.qty,
             coalesce(qi.unit_price_idr, v.price_idr)::text as unit_price_idr,
             (coalesce(qi.unit_price_idr, v.price_idr) * qi.qty)::text as line_total_idr,
             qi.unit_price_idr is not null as frozen,
             qi.site_id::text as site_id, st.name as site_name, st.zone::text as zone,
             (axiom.available(qi.variant_id) + case when ${q.state}::text = 'sent' then qi.qty else 0 end) as available
      from public.quote_items qi
      join public.product_variants v on v.id = qi.variant_id
      join public.products p on p.id = v.product_id
      left join public.account_sites st on st.id = qi.site_id
      where qi.quote_id = ${q.id}::uuid
      order by qi.id`,
    legs: await tx<Leg[]>`
      select d.site_id::text as site_id, d.site_name, d.zone::text as zone, d.units,
             d.charge_idr::text as charge_idr, dz.cap_idr::text as cap_idr,
             (d.charge_idr is not null and d.charge_idr = dz.cap_idr
              and ceil(d.units / 3.0) * dz.per_three_idr > dz.cap_idr) as capped
      from axiom.delivery_for_lines(
        (select jsonb_agg(jsonb_build_object('site_id', qi.site_id, 'qty', qi.qty))
           from public.quote_items qi where qi.quote_id = ${q.id}::uuid),
        ${q.account_id}::uuid) d
      join public.delivery_zones dz on dz.zone = d.zone`,
    events: await tx<EventRow[]>`
      select at, actor_label as actor, from_state, to_state
      from public.quote_events where quote_id = ${q.id}::uuid order by at desc, id desc`,
    sites: await tx<SiteOption[]>`
      select s.id::text as id, s.name, s.zone::text as zone, dz.per_three_idr is not null as priced, s.is_default
      from public.account_sites s join public.delivery_zones dz on dz.zone = s.zone
      where s.account_id = ${q.account_id}::uuid order by s.is_default desc, s.sort, s.name`,
  }));
}

/** What may still be added to a quote: the catalogue at its live price, with what is available. */
export async function variantOptions(uid: string, accountId: string) {
  return withRls({ uid }, tx => tx<VariantOption[]>`
    select v.id::text as variant_id, v.sku,
           p.name || ' · ' || v.dose as label, v.price_idr::text as price_idr,
           axiom.available(v.id) as available, p.kind::text as kind
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.is_active and (p.kind <> 'peptide' or axiom.account_has_ack(${accountId}::uuid))
    order by p.kind, p.name, v.sort, v.dose`);
}

export type AccountOption = { id: string; name: string; type: string; ack: string; sites: number };

export async function accountOptions(uid: string) {
  return withRls({ uid }, tx => tx<AccountOption[]>`
    select a.id::text as id, a.name, a.type::text as type, axiom.ack_state_for(a.id) as ack,
           (select count(*)::int from public.account_sites s where s.account_id = a.id) as sites
    from public.accounts a order by a.name`);
}

/** Owner-only. Frozen costs once the quote is sent, the live book before that. */
export async function quoteMargin(uid: string, quoteId: string): Promise<Margin | { refused: string }> {
  try {
    const rows = await withRls({ uid }, tx => tx<Margin[]>`
      with l as (
        select qi.qty,
               coalesce(qi.unit_price_idr, v.price_idr) * qi.qty as revenue,
               coalesce(c.unit_supplier_cost_idr, vc.supplier_cost_idr) * qi.qty as supplier,
               coalesce(c.unit_pen_cost_idr, vc.pen_cost_idr) * qi.qty as pen
        from public.quote_items qi
        join public.product_variants v on v.id = qi.variant_id
        join public.variant_costs vc on vc.variant_id = v.id
        left join public.quote_item_costs c on c.quote_item_id = qi.id
        where qi.quote_id = ${quoteId}::uuid)
      select coalesce(sum(revenue), 0)::text as revenue,
             coalesce(sum(supplier), 0)::text as supplier,
             coalesce(sum(pen), 0)::text as pen,
             coalesce(sum(supplier + pen), 0)::text as base,
             coalesce(sum(revenue - supplier - pen), 0)::text as margin,
             case when coalesce(sum(revenue), 0) > 0
                  then round(sum(revenue - supplier - pen)::numeric / sum(revenue) * 100, 1) else 0 end as gm_pct
      from l`);
    return rows[0];
  } catch (e) {
    return { refused: pgMessage(e) };
  }
}

/** Why Send is off, in the database's own terms — the same three tests `axiom.send_quote` applies. */
export function sendBlockers(q: QuoteDetail, lines: QuoteLine[], legs: Leg[]) {
  const short = lines.filter(l => l.qty > l.available);
  const pending = legs.filter(l => l.charge_idr === null);
  const unacked = !q.has_ack && lines.some(l => l.kind === 'peptide');
  return { short, pending, unacked, empty: lines.length === 0, blocked: !!(short.length || pending.length || unacked || !lines.length) };
}
