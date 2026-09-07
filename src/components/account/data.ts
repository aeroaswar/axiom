import 'server-only';
import { withRls } from '@/lib/db';
import { getSession, type Session } from '@/lib/auth';

/**
 * Everything the Account reads. One rule per figure, and every one of them lives in Postgres:
 * `axiom.quote_state` derives expiry, `axiom.delivery_for_lines` prices a consignment,
 * `axiom.ack_state_for` and `axiom.ack_expires_for` answer the acknowledgement, `axiom.events`
 * produces the feed. Nothing here re-implements a rule; it only shapes the rows for a screen.
 *
 * Row-level security does the gating: a peptide line on an account whose acknowledgement is not
 * current is simply not returned, so a lapsed clinic reads its apparel order and nothing else.
 */

export type AccountSession = Session & { accountId: string };

/** The signed-in member and the account they belong to, or null. Pages guard through the layout. */
export async function accountSession(): Promise<AccountSession | null> {
  const s = await getSession();
  return s && s.accountId && (s.role === 'client' || s.role === 'clinic') ? (s as AccountSession) : null;
}

export type OrderRow = {
  id: string; number: string;
  state: 'awaiting_payment' | 'packing' | 'dispatched' | 'delivered' | 'cancelled';
  placed_at: Date; paid_claim_at: Date | null; paid_claim_ref: string | null; paid_claim_by: string | null;
  delivered_at: Date | null; cancelled_at: Date | null; dispatched_at: Date | null;
  carrier: string | null; tracking_no: string | null; eta_at: Date | null;
  subtotal_idr: string; delivery_idr: string; total_idr: string;
  quote_number: string | null;
  invoice_id: string | null; invoice_number: string | null;
  invoice_due_at: Date | null; invoice_paid_at: Date | null; invoice_voided_at: Date | null;
  invoice_total_idr: string | null; invoice_bank: Record<string, string> | null; invoice_ppn_idr: string | null;
  invoice_ppn_rate: string | null;
  cold: boolean; eta_days: number; line_count: number; visible_goods: string | null;
  requested_by: string | null; accepted_by: string | null; paid_claim_name: string | null;
  reorder_due_at?: Date | null; cadence_days?: number | null;
};

const ORDER_SELECT = `
  select o.id::text as id, o.number, o.state::text as state, o.placed_at, o.paid_claim_at, o.paid_claim_ref,
         o.paid_claim_by::text as paid_claim_by, o.delivered_at,
         o.subtotal_idr::text as subtotal_idr, o.delivery_idr::text as delivery_idr, o.total_idr::text as total_idr,
         q.number as quote_number,
         (select max(e.at) from public.order_events e where e.order_id = o.id and e.to_state = 'cancelled') as cancelled_at,
         s.dispatched_at, s.carrier, s.tracking_no, s.eta_at,
         i.id::text as invoice_id, i.number as invoice_number, i.due_at as invoice_due_at, i.paid_at as invoice_paid_at,
         i.voided_at as invoice_voided_at, i.total_idr::text as invoice_total_idr, i.bank_details as invoice_bank,
         i.ppn_idr::text as invoice_ppn_idr, i.ppn_rate::text as invoice_ppn_rate,
         coalesce((select bool_or(v.is_cold_chain) from public.order_items oi
                   join public.product_variants v on v.id = oi.variant_id where oi.order_id = o.id), false) as cold,
         coalesce((select max(dz.eta_days) from public.order_items oi
                   join public.account_sites st on st.id = oi.site_id
                   join public.delivery_zones dz on dz.zone = st.zone where oi.order_id = o.id), 2) as eta_days,
         (select count(*) from public.order_items oi where oi.order_id = o.id)::int as line_count,
         (select sum(oi.line_total_idr)::text from public.order_items oi where oi.order_id = o.id) as visible_goods,
         rq.full_name as requested_by, ac.full_name as accepted_by, pc.full_name as paid_claim_name
  from public.orders o
  left join public.quotes q on q.id = o.quote_id
  left join public.profiles rq on rq.id = q.created_by
  left join public.profiles ac on ac.id = o.accepted_by
  left join public.profiles pc on pc.id = o.paid_claim_by
  left join lateral (select * from public.shipments sh where sh.order_id = o.id order by sh.dispatched_at desc nulls last limit 1) s on true
  left join lateral (select * from public.invoices iv where iv.order_id = o.id and iv.kind = 'invoice'
                     order by (iv.voided_at is not null), iv.created_at desc limit 1) i on true`;

export type QuoteRow = {
  id: string; number: string;
  state: 'requested' | 'draft' | 'sent' | 'accepted' | 'lost' | 'expired';
  created_at: Date; sent_at: Date | null; accepted_at: Date | null; notes: string | null;
  order_number: string | null; order_id: string | null;
  line_count: number; total_idr: string | null; unpriced: boolean;
  delivery_idr: string; delivery_known: boolean;
  requested_by: string | null;
};

const QUOTE_SELECT = `
  select q.id::text as id, q.number, axiom.quote_state(q.*) as state, q.created_at, q.sent_at, q.accepted_at, q.notes,
         o.number as order_number, o.id::text as order_id,
         (select count(*) from public.quote_items qi where qi.quote_id = q.id)::int as line_count,
         (select sum(qi.line_total_idr)::text from public.quote_items qi where qi.quote_id = q.id) as total_idr,
         coalesce((select bool_or(qi.unit_price_idr is null) from public.quote_items qi where qi.quote_id = q.id), true) as unpriced,
         dl.delivery::text as delivery_idr, dl.known as delivery_known,
         cb.full_name as requested_by
  from public.quotes q
  left join public.orders o on o.id = q.order_id
  left join public.profiles cb on cb.id = q.created_by
  -- Delivery is one function, everywhere: the row's total is the same arithmetic the quote page
  -- shows, so a figure on the list can never disagree with the figure on the record.
  left join lateral (
    select coalesce(sum(d.charge_idr), 0) as delivery, coalesce(bool_and(d.charge_idr is not null), true) as known
    from axiom.delivery_for_lines(
      coalesce((select jsonb_agg(jsonb_build_object('site_id', qi.site_id, 'qty', qi.qty))
                from public.quote_items qi where qi.quote_id = q.id), '[]'::jsonb), q.account_id) d) dl on true`;

export type Line = {
  id: string; sku: string; slug: string; name: string; dose: string; content: string; kind: string;
  qty: number; unit_price_idr: string | null; line_total_idr: string | null;
  site_id: string | null; site_name: string | null; is_cold_chain: boolean;
};

export type DeliveryLeg = { site_id: string | null; site_name: string; zone: string; units: number; charge_idr: number | null };

/** `bigint` reaches the driver as a string; a charge that is added must be a number, not text. */
type RawLeg = { site_id: string | null; site_name: string; zone: string; units: number; charge_idr: string | number | null };
const legsOf = (rows: RawLeg[]): DeliveryLeg[] => rows.map(r => ({
  site_id: r.site_id ? String(r.site_id) : null,
  site_name: String(r.site_name ?? ''),
  zone: String(r.zone ?? ''),
  units: Number(r.units ?? 0),
  charge_idr: r.charge_idr === null || r.charge_idr === undefined ? null : Number(r.charge_idr),
}));

/** The account's quotes and orders, newest first. One read; the home groups them. */
export async function pipeline(uid: string, accountId: string) {
  return withRls({ uid }, async tx => {
    const orders = (await tx.unsafe(`${ORDER_SELECT} where o.account_id = $1 order by o.placed_at desc`, [accountId])) as unknown as OrderRow[];
    const quotes = (await tx.unsafe(`${QUOTE_SELECT} where q.account_id = $1 order by q.created_at desc`, [accountId])) as unknown as QuoteRow[];
    const [{ cadence }] = await tx<{ cadence: number | null }[]>`select axiom.cadence_days(${accountId}::uuid) as cadence`;
    return { orders, quotes, cadence };
  });
}

/**
 * Reorder due belongs to the account's most recent order, never to every delivered one: the
 * cadence is a property of the relationship, not of a row. `axiom.cadence_days` produced it.
 */
export function withReorderDue(orders: OrderRow[], cadence: number | null): OrderRow[] {
  const live = orders.filter(o => o.state !== 'cancelled');
  const latest = live.length ? live.reduce((a, b) => (new Date(a.placed_at) > new Date(b.placed_at) ? a : b)) : null;
  if (!latest || !cadence) return orders;
  return orders.map(o => (o.id === latest.id
    ? { ...o, cadence_days: cadence, reorder_due_at: new Date(new Date(o.placed_at).getTime() + cadence * 86_400_000) }
    : o));
}

export async function orderByNumber(uid: string, accountId: string, number: string) {
  return withRls({ uid }, async tx => {
    const rows = (await tx.unsafe(`${ORDER_SELECT} where o.account_id = $1 and o.number = $2`, [accountId, number])) as unknown as OrderRow[];
    const o = rows[0];
    if (!o) return null;
    const lines = await tx<Line[]>`
      select oi.id::text as id, v.sku, p.slug, p.name, v.dose, v.content, p.kind::text as kind, oi.qty,
             oi.unit_price_idr::text as unit_price_idr, oi.line_total_idr::text as line_total_idr,
             oi.site_id::text as site_id, coalesce(oi.site_name, s.name) as site_name, v.is_cold_chain
      from public.order_items oi
      join public.product_variants v on v.id = oi.variant_id
      join public.products p on p.id = v.product_id
      left join public.account_sites s on s.id = oi.site_id
      where oi.order_id = ${o.id}::uuid
      order by coalesce(oi.site_name, s.name, ''), p.name, v.sort`;
    const legs = legsOf(lines.length
      ? await tx<RawLeg[]>`select site_id::text, site_name, zone::text, units, charge_idr
          from axiom.delivery_for_lines(${tx.json(lines.map(l => ({ site_id: l.site_id, qty: l.qty })))}, ${accountId}::uuid)`
      : []);
    const events = await tx<{ at: Date; actor_label: string; from_state: string | null; to_state: string }[]>`
      select at, actor_label, from_state, to_state from public.order_events where order_id = ${o.id}::uuid order by at desc`;
    const invoiceEvents = o.invoice_id
      ? await tx<{ at: Date; actor_label: string; kind: string; ref: string | null }[]>`
          select at, actor_label, kind::text as kind, ref from public.invoice_events where invoice_id = ${o.invoice_id}::uuid order by at desc`
      : [];
    return { order: o, lines, legs, events, invoiceEvents };
  });
}

export async function quoteByNumber(uid: string, accountId: string, number: string) {
  return withRls({ uid }, async tx => {
    const rows = (await tx.unsafe(`${QUOTE_SELECT} where q.account_id = $1 and q.number = $2`, [accountId, number])) as unknown as QuoteRow[];
    const q = rows[0];
    if (!q) return null;
    const lines = await tx<Line[]>`
      select qi.id::text as id, v.sku, p.slug, p.name, v.dose, v.content, p.kind::text as kind, qi.qty,
             qi.unit_price_idr::text as unit_price_idr, qi.line_total_idr::text as line_total_idr,
             qi.site_id::text as site_id, s.name as site_name, v.is_cold_chain
      from public.quote_items qi
      join public.product_variants v on v.id = qi.variant_id
      join public.products p on p.id = v.product_id
      left join public.account_sites s on s.id = qi.site_id
      where qi.quote_id = ${q.id}::uuid
      order by coalesce(s.name, ''), p.name, v.sort`;
    const legs = legsOf(lines.length
      ? await tx<RawLeg[]>`select site_id::text, site_name, zone::text, units, charge_idr
          from axiom.delivery_for_lines(${tx.json(lines.map(l => ({ site_id: l.site_id, qty: l.qty })))}, ${accountId}::uuid)`
      : []);
    return { quote: q, lines, legs };
  });
}

/** The lines of a quote, as a fresh request would ask for them again. */
export async function quoteLinesForRequest(uid: string, accountId: string, number: string) {
  return withRls({ uid }, tx => tx<{ sku: string; qty: number; site_id: string | null }[]>`
    select v.sku, qi.qty, qi.site_id::text as site_id
    from public.quotes q
    join public.quote_items qi on qi.quote_id = q.id
    join public.product_variants v on v.id = qi.variant_id
    where q.account_id = ${accountId}::uuid and q.number = ${number}`);
}

/** The lines of a past order, as a reorder would ask for them again: same lots, same destinations. */
export async function orderLinesForReorder(uid: string, accountId: string, number: string) {
  return withRls({ uid }, async tx => {
    const rows = await tx<{ sku: string; qty: number; site_id: string | null }[]>`
      select v.sku, oi.qty, oi.site_id::text as site_id
      from public.orders o
      join public.order_items oi on oi.order_id = o.id
      join public.product_variants v on v.id = oi.variant_id
      where o.account_id = ${accountId}::uuid and o.number = ${number}`;
    return rows;
  });
}

export type Ack = {
  state: 'none' | 'current' | 'expiring' | 'lapsed';
  expires: Date | null;
  age_at: Date | null;
  researcher_at: Date | null;
  version: string | null;
  ack_version: string;
};

/** The acknowledgement as the database answers it, plus the two rows behind it. */
export async function acknowledgement(uid: string, accountId: string): Promise<Ack> {
  return withRls({ uid }, async tx => {
    const [s] = await tx<{ state: string; expires: Date | null }[]>`
      select axiom.ack_state_for(${accountId}::uuid) as state, axiom.ack_expires_for(${accountId}::uuid) as expires`;
    const rows = await tx<{ kind: string; acknowledged_at: Date; version: string }[]>`
      select kind::text as kind, acknowledged_at, version from public.acknowledgements
      where account_id = ${accountId}::uuid
         or profile_id in (select profile_id from public.account_members where account_id = ${accountId}::uuid)
      order by acknowledged_at desc`;
    const [v] = await tx<{ value: string }[]>`select value #>> '{}' as value from public.site_settings where key = 'ack_version'`;
    const latest = (k: string) => rows.find(r => r.kind === k) ?? null;
    return {
      state: (s?.state ?? 'none') as Ack['state'],
      expires: s?.expires ?? null,
      age_at: latest('age_18')?.acknowledged_at ?? null,
      researcher_at: latest('qualified_researcher')?.acknowledged_at ?? null,
      version: latest('qualified_researcher')?.version ?? null,
      ack_version: v?.value ?? '',
    };
  });
}

export type Site = { id: string; name: string; address: string | null; zone: string; is_default: boolean; sort: number };
export type Member = { profile_id: string; full_name: string; role: string; is_primary: boolean; email: string | null };
export type InvoiceRow = {
  id: string; number: string; order_number: string; issued_at: Date | null; due_at: Date | null;
  paid_at: Date | null; voided_at: Date | null; total_idr: string; kind: string;
};

export async function accountProfile(uid: string, accountId: string) {
  return withRls({ uid }, async tx => ({
    account: (await tx<{ id: string; name: string; type: string; whatsapp: string | null; email: string | null; manager: string | null }[]>`
      select a.id::text as id, a.name, a.type::text as type, a.whatsapp, a.email, m.full_name as manager
      from public.accounts a left join public.profiles m on m.id = a.account_manager_id
      where a.id = ${accountId}::uuid`)[0] ?? null,
    members: await tx<Member[]>`
      select m.profile_id::text as profile_id, p.full_name, p.role::text as role, m.is_primary, u.email
      from public.account_members m
      join public.profiles p on p.id = m.profile_id
      left join auth.users u on u.id = p.id
      where m.account_id = ${accountId}::uuid order by m.is_primary desc, p.full_name`,
    sites: await tx<Site[]>`
      select id::text as id, name, address, zone::text as zone, is_default, sort
      from public.account_sites where account_id = ${accountId}::uuid order by is_default desc, sort, name`,
    invoices: await tx<InvoiceRow[]>`
      select i.id::text as id, i.number, o.number as order_number, i.issued_at, i.due_at, i.paid_at, i.voided_at,
             i.total_idr::text as total_idr, i.kind::text as kind
      from public.invoices i join public.orders o on o.id = i.order_id
      where o.account_id = ${accountId}::uuid and i.issued_at is not null
      order by i.issued_at desc`,
    me: (await tx<{ full_name: string; locale: string }[]>`select full_name, locale from public.profiles where id = ${uid}::uuid`)[0] ?? null,
  }));
}

/** The account's delivery addresses, for the basket's per-line destination select. */
export async function accountSites(uid: string, accountId: string): Promise<Site[]> {
  return withRls({ uid }, tx => tx<Site[]>`
    select id::text as id, name, address, zone::text as zone, is_default, sort
    from public.account_sites where account_id = ${accountId}::uuid order by is_default desc, sort, name`);
}

export type BasketLineInput = { sku: string; qty: number; site_id: string | null };

export async function deliveryForLines(uid: string, accountId: string, lines: BasketLineInput[]): Promise<DeliveryLeg[]> {
  if (!lines.length) return [];
  const rows = await withRls({ uid }, tx => tx<RawLeg[]>`
    select site_id::text, site_name, zone::text, units, charge_idr
    from axiom.delivery_for_lines(${tx.json(lines.map(l => ({ site_id: l.site_id, qty: l.qty })))}, ${accountId}::uuid)`);
  return legsOf(rows);
}

/** The bank the invoice was issued against; the account reads site_settings only when signed in. */
export async function bankDetails(uid: string): Promise<Record<string, string> | null> {
  const rows = await withRls({ uid }, tx => tx<{ value: Record<string, string> }[]>`
    select value from public.site_settings where key = 'bank'`);
  return rows[0]?.value ?? null;
}

export type AccountEvent = {
  key: string; kind: string; tone: 'info' | 'warn' | 'err';
  subject_type: string; subject_id: string; ref: string | null;
  amount_idr: string | null; due_at: Date | null;
};

/** The same `axiom.events()` the Console reads, from the account's side, with a route per row. */
export async function accountEvents(uid: string) {
  return withRls({ uid }, async tx => {
    const rows = await tx<AccountEvent[]>`select key, kind, tone, subject_type, subject_id::text, ref, amount_idr::text, due_at from axiom.events()`;
    const orderIds = rows.filter(r => r.subject_type === 'order').map(r => r.subject_id);
    const quoteIds = rows.filter(r => r.subject_type === 'quote').map(r => r.subject_id);
    const orders = orderIds.length
      ? await tx<{ id: string; number: string }[]>`select id::text as id, number from public.orders where id = any(${orderIds}::uuid[])`
      : [];
    const quotes = quoteIds.length
      ? await tx<{ id: string; number: string }[]>`select id::text as id, number from public.quotes where id = any(${quoteIds}::uuid[])`
      : [];
    const numbers = new Map([...orders, ...quotes].map(r => [r.id, r.number]));
    return rows.map(r => ({ ...r, href: r.subject_type === 'quote' ? `/account/quotes/${numbers.get(r.subject_id) ?? ''}` : `/account/orders/${numbers.get(r.subject_id) ?? ''}` }));
  });
}

export type Hit = { kind: 'quote' | 'order' | 'invoice' | 'product'; ref: string; title: string; sub: string; amount: string | null; href: string };

/** Search over the account's own records and the catalogue it is allowed to see. */
export async function searchAccount(uid: string, accountId: string, q: string): Promise<Hit[]> {
  const like = `%${q}%`;
  return withRls({ uid }, async tx => {
    const quotes = await tx<{ number: string; state: string; created_at: Date; total: string | null }[]>`
      select q.number, axiom.quote_state(q.*) as state, q.created_at,
             (select sum(qi.line_total_idr)::text from public.quote_items qi where qi.quote_id = q.id) as total
      from public.quotes q where q.account_id = ${accountId}::uuid and q.number ilike ${like}
      order by q.created_at desc limit 8`;
    const orders = await tx<{ number: string; state: string; placed_at: Date; total_idr: string }[]>`
      select number, state::text as state, placed_at, total_idr::text as total_idr from public.orders
      where account_id = ${accountId}::uuid and number ilike ${like} order by placed_at desc limit 8`;
    const invoices = await tx<{ number: string; order_number: string; due_at: Date | null; paid_at: Date | null; total_idr: string }[]>`
      select i.number, o.number as order_number, i.due_at, i.paid_at, i.total_idr::text as total_idr
      from public.invoices i join public.orders o on o.id = i.order_id
      where o.account_id = ${accountId}::uuid and i.number ilike ${like} and i.issued_at is not null
      order by i.issued_at desc limit 8`;
    const products = await tx<{ slug: string; name: string; dose: string; content: string; price_idr: string | null; sku: string }[]>`
      select slug, name, dose, content, price_idr::text as price_idr, sku from public.v_catalogue
      where is_published and (name ilike ${like} or sku ilike ${like} or dose ilike ${like})
      order by name, variant_sort limit 12`;
    return [
      ...quotes.map(r => ({ kind: 'quote' as const, ref: r.number, title: r.number, sub: r.state, amount: r.total, href: `/account/quotes/${r.number}` })),
      ...orders.map(r => ({ kind: 'order' as const, ref: r.number, title: r.number, sub: r.state, amount: r.total_idr, href: `/account/orders/${r.number}` })),
      ...invoices.map(r => ({ kind: 'invoice' as const, ref: r.number, title: r.number, sub: r.order_number, amount: r.total_idr, href: `/account/orders/${r.order_number}` })),
      ...products.map(r => ({ kind: 'product' as const, ref: r.sku, title: `${r.name} · ${r.dose}`, sub: r.content, amount: r.price_idr, href: `/account/shop/${r.slug}` })),
    ];
  });
}
