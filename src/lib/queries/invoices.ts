import 'server-only';
import { pgMessage, withRls } from '@/lib/db';
import { now } from '@/lib/domain/dates';
import type { Margin } from './orders';

/**
 * The receivables book. `overdue` and `void` are derived, never stored: overdue is an issued,
 * unpaid, unvoided invoice past its due date; void is what cancelling an unpaid order wrote.
 */
export type InvoiceState = 'draft' | 'issued' | 'overdue' | 'paid' | 'void';

export type InvoiceRow = {
  id: string; number: string; kind: 'invoice' | 'credit_note'; parent_number: string | null;
  order_id: string; order_number: string; order_state: string;
  account_id: string; account: string;
  issued_at: Date | null; due_at: Date | null; paid_at: Date | null; paid_ref: string | null; voided_at: Date | null;
  total_idr: string; paid_claim_at: Date | null; paid_claim_ref: string | null; sent_at: Date | null;
};

export function invoiceState(i: Pick<InvoiceRow, 'issued_at' | 'paid_at' | 'voided_at' | 'due_at'>, ref = now()): InvoiceState {
  if (!i.issued_at) return 'draft';
  if (i.voided_at) return 'void';
  if (i.paid_at) return 'paid';
  return i.due_at && new Date(i.due_at) < ref ? 'overdue' : 'issued';
}

const SELECT = `
  select i.id::text as id, i.number, i.kind::text as kind, pi.number as parent_number,
         o.id::text as order_id, o.number as order_number, o.state::text as order_state,
         a.id::text as account_id, a.name as account,
         i.issued_at, i.due_at, i.paid_at, i.paid_ref, i.voided_at, i.sent_at,
         i.total_idr::text as total_idr, o.paid_claim_at, o.paid_claim_ref
  from public.invoices i
  join public.orders o on o.id = i.order_id
  join public.accounts a on a.id = o.account_id
  left join public.invoices pi on pi.id = i.parent_invoice_id`;

export async function invoiceRows(uid: string) {
  return withRls({ uid }, tx => tx.unsafe(`${SELECT} order by i.issued_at desc nulls first, i.created_at desc`) as unknown as Promise<InvoiceRow[]>);
}

export async function invoiceByNumber(uid: string, number: string) {
  const rows = await withRls({ uid }, tx => tx.unsafe(`${SELECT} where i.number = $1`, [number]) as unknown as Promise<InvoiceRow[]>);
  return rows[0] ?? null;
}

export type InvoiceItem = { id: string; description: string; spec: string | null; qty: number; unit_price_idr: string; line_total_idr: string; is_peptide: boolean };
export type InvoiceEvent = { at: Date; actor: string; kind: string; ref: string | null };
export type InvoiceFull = {
  subtotal_idr: string; delivery_idr: string; ppn_idr: string; ppn_rate: string; terms_days: number;
  notes: string | null; bank_details: { bank?: string; account_name?: string; account_no?: string } | null;
  billed_name: string; billed_address: string | null; billed_email: string | null; billed_whatsapp: string | null;
};

export async function invoiceDetail(uid: string, invoiceId: string, orderId: string) {
  return withRls({ uid }, async tx => ({
    full: (await tx<InvoiceFull[]>`
      select i.subtotal_idr::text as subtotal_idr, i.delivery_idr::text as delivery_idr, i.ppn_idr::text as ppn_idr,
             i.ppn_rate::text as ppn_rate, i.terms_days, i.notes, i.bank_details,
             a.name as billed_name, a.email as billed_email, a.whatsapp as billed_whatsapp,
             (select s.address from public.account_sites s where s.account_id = a.id order by s.is_default desc, s.sort limit 1) as billed_address
      from public.invoices i
      join public.orders o on o.id = i.order_id
      join public.accounts a on a.id = o.account_id
      where i.id = ${invoiceId}::uuid`)[0],
    items: await tx<InvoiceItem[]>`
      select id::text as id, description, spec, qty, unit_price_idr::text as unit_price_idr,
             line_total_idr::text as line_total_idr, is_peptide
      from public.invoice_items where invoice_id = ${invoiceId}::uuid order by sort, id`,
    events: await tx<InvoiceEvent[]>`
      select at, actor_label as actor, kind::text as kind, ref
      from public.invoice_events where invoice_id = ${invoiceId}::uuid order by at desc, id desc`,
    credits: await (tx.unsafe(`${SELECT} where i.parent_invoice_id = $1 order by i.created_at`, [invoiceId]) as unknown as Promise<InvoiceRow[]>),
    destinations: await tx<{ site_name: string }[]>`
      select distinct coalesce(st.name, oi.site_name) as site_name
      from public.order_items oi left join public.account_sites st on st.id = oi.site_id
      where oi.order_id = ${orderId}::uuid and coalesce(st.name, oi.site_name) is not null
      order by 1`,
  }));
}

/** Outstanding, overdue and paid this month — summed from the invoices, never stored. */
export function receivables(rows: InvoiceRow[], ref = now()) {
  const out = { open: 0n, openN: 0, over: 0n, overN: 0, paid: 0n, paidN: 0 };
  for (const i of rows) {
    if (i.kind !== 'invoice') continue;
    const s = invoiceState(i, ref);
    if (s === 'draft' || s === 'void') continue;
    if (s === 'paid') {
      const p = new Date(i.paid_at!);
      if (p.getUTCFullYear() === ref.getUTCFullYear() && p.getUTCMonth() === ref.getUTCMonth()) { out.paid += BigInt(i.total_idr); out.paidN++; }
      continue;
    }
    out.open += BigInt(i.total_idr); out.openN++;
    if (s === 'overdue') { out.over += BigInt(i.total_idr); out.overN++; }
  }
  return { open: out.open.toString(), openN: out.openN, over: out.over.toString(), overN: out.overN, paid: out.paid.toString(), paidN: out.paidN };
}

/** The margin behind an invoice: the same frozen line costs the order carries. Owner only. */
export async function invoiceMargin(uid: string, orderId: string): Promise<Margin | { refused: string }> {
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
