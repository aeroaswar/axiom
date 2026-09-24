'use server';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { attempt, int, str } from '../shared/act';
import type { ActionState } from '../shared/action-form';
import type { Tx } from '@/lib/db';

/**
 * Every write on this surface is one call to one database function. Nothing here decides whether a
 * transition is legal, whether stock is available, whether a destination has a rate or whether an
 * order may be dispatched — the function refuses, and its own words are what the reader sees.
 */

type Line = { variant_id: string; qty: number; site_id: string | null };

async function currentLines(tx: Tx, quoteId: string) {
  return tx<{ id: string; variant_id: string; qty: number; site_id: string | null }[]>`
    select id::text as id, variant_id::text as variant_id, qty, site_id::text as site_id
    from public.quote_items where quote_id = ${quoteId}::uuid order by id`;
}

const save = (tx: Tx, quoteId: string, lines: Line[]) =>
  tx`select axiom.save_quote_draft(${quoteId}::uuid, ${JSON.stringify(lines)}::text::jsonb, null)`;

// ---------------------------------------------------------------- the quote builder
export async function editLine(_: ActionState, form: FormData): Promise<ActionState> {
  const quoteId = str(form, 'quote_id');
  const lineId = str(form, 'line_id');
  const op = str(form, 'op');
  const siteId = str(form, 'site_id');
  return attempt(async tx => {
    const rows = await currentLines(tx, quoteId);
    const lines: Line[] = [];
    for (const r of rows) {
      if (r.id !== lineId) { lines.push({ variant_id: r.variant_id, qty: r.qty, site_id: r.site_id }); continue; }
      if (op === 'remove') continue;
      const qty = op === 'inc' ? r.qty + 1 : op === 'dec' ? r.qty - 1 : r.qty;
      if (qty <= 0) continue;
      lines.push({ variant_id: r.variant_id, qty, site_id: op === 'site' ? (siteId || null) : r.site_id });
    }
    await save(tx, quoteId, lines);
  });
}

export async function addLine(_: ActionState, form: FormData): Promise<ActionState> {
  const quoteId = str(form, 'quote_id');
  const variantId = str(form, 'variant_id');
  if (!variantId) return null;
  return attempt(async tx => {
    const rows = await currentLines(tx, quoteId);
    const lines: Line[] = rows.map(r => ({ variant_id: r.variant_id, qty: r.qty, site_id: r.site_id }));
    const seen = lines.find(l => l.variant_id === variantId);
    if (seen) seen.qty += 1;
    else lines.push({ variant_id: variantId, qty: 1, site_id: null });
    await save(tx, quoteId, lines);
  });
}

export async function saveNotes(_: ActionState, form: FormData): Promise<ActionState> {
  const quoteId = str(form, 'quote_id');
  const notes = str(form, 'notes');
  return attempt(async tx => {
    const rows = await currentLines(tx, quoteId);
    await tx`select axiom.save_quote_draft(${quoteId}::uuid,
      ${JSON.stringify(rows.map(r => ({ variant_id: r.variant_id, qty: r.qty, site_id: r.site_id })))}::text::jsonb,
      ${notes})`;
  });
}

// ---------------------------------------------------------------- the spine
export async function sendQuote(_: ActionState, form: FormData): Promise<ActionState> {
  const quoteId = str(form, 'quote_id');
  return attempt(tx => tx`select axiom.send_quote(${quoteId}::uuid)`.then(() => undefined));
}

export async function markLost(_: ActionState, form: FormData): Promise<ActionState> {
  const quoteId = str(form, 'quote_id');
  return attempt(tx => tx`select axiom.mark_quote_lost(${quoteId}::uuid)`.then(() => undefined));
}

/** Acceptance is one call: the order, its frozen lines, the issued invoice and both logs. */
export async function acceptQuote(_: ActionState, form: FormData): Promise<ActionState> {
  const quoteId = str(form, 'quote_id');
  let number = '';
  const res = await attempt(async tx => {
    const [r] = await tx<{ oid: string }[]>`select axiom.accept_quote(${quoteId}::uuid) as oid`;
    const [o] = await tx<{ number: string }[]>`select number from public.orders where id = ${r.oid}::uuid`;
    number = o.number;
  });
  if (res?.ok && number) redirect({ href: `/console/orders/${number}`, locale: await getLocale() });
  return res;
}

export async function markPaid(_: ActionState, form: FormData): Promise<ActionState> {
  const orderId = str(form, 'order_id');
  const ref = str(form, 'reference');
  return attempt(tx => tx`select axiom.mark_paid(${orderId}::uuid, ${ref})`.then(() => undefined));
}

/** packing → dispatched writes the sale and lifts the hold; dispatched → delivered closes the order. */
export async function advanceOrder(_: ActionState, form: FormData): Promise<ActionState> {
  const orderId = str(form, 'order_id');
  const carrier = str(form, 'carrier') || null;
  const tracking = str(form, 'tracking') || null;
  return attempt(tx => tx`select axiom.advance_order(${orderId}::uuid, ${carrier}, ${tracking})`.then(() => undefined));
}

export async function cancelOrder(_: ActionState, form: FormData): Promise<ActionState> {
  const orderId = str(form, 'order_id');
  const reason = str(form, 'reason') || null;
  return attempt(tx => tx`select axiom.cancel_order(${orderId}::uuid, ${reason})`.then(() => undefined));
}

// ---------------------------------------------------------------- new work
/** A new quote, or a repeat of one: both are `axiom.new_quote`, and both land on the same builder. */
export async function newQuote(_: ActionState, form: FormData): Promise<ActionState> {
  const accountId = str(form, 'account_id');
  const variantId = str(form, 'variant_id');
  const qty = Math.max(1, int(form, 'qty', 1));
  let number = '';
  const res = await attempt(async tx => {
    const lines: Line[] = variantId ? [{ variant_id: variantId, qty, site_id: null }] : [];
    const [r] = await tx<{ qid: string }[]>`
      select axiom.new_quote(${accountId}::uuid, ${JSON.stringify(lines)}::text::jsonb, null) as qid`;
    const [q] = await tx<{ number: string }[]>`select number from public.quotes where id = ${r.qid}::uuid`;
    number = q.number;
  });
  if (res?.ok && number) redirect({ href: `/console/orders/quotes/${number}`, locale: await getLocale() });
  return res;
}

/** Requote: the same lines at today's list price, as a fresh draft. Nothing is copied but the shape. */
export async function requote(_: ActionState, form: FormData): Promise<ActionState> {
  const orderNumber = str(form, 'order_number');
  const quoteNumber = str(form, 'quote_number');
  let number = '';
  const res = await attempt(async tx => {
    const lines = orderNumber
      ? await tx<Line[]>`
          select oi.variant_id::text as variant_id, oi.qty, oi.site_id::text as site_id
          from public.order_items oi join public.orders o on o.id = oi.order_id where o.number = ${orderNumber}`
      : await tx<Line[]>`
          select qi.variant_id::text as variant_id, qi.qty, qi.site_id::text as site_id
          from public.quote_items qi join public.quotes q on q.id = qi.quote_id where q.number = ${quoteNumber}`;
    const [acct] = orderNumber
      ? await tx<{ id: string }[]>`select account_id::text as id from public.orders where number = ${orderNumber}`
      : await tx<{ id: string }[]>`select account_id::text as id from public.quotes where number = ${quoteNumber}`;
    const [r] = await tx<{ qid: string }[]>`
      select axiom.new_quote(${acct.id}::uuid, ${JSON.stringify(lines)}::text::jsonb, null) as qid`;
    const [q] = await tx<{ number: string }[]>`select number from public.quotes where id = ${r.qid}::uuid`;
    number = q.number;
  });
  if (res?.ok && number) redirect({ href: `/console/orders/quotes/${number}`, locale: await getLocale() });
  return res;
}

// ---------------------------------------------------------------- plain-form entry points
// A stepper, a destination select and an "add line" have nothing to report but the row they
// changed, so they post as ordinary forms and the re-rendered list is the confirmation.
export async function editLineForm(form: FormData) { await editLine(null, form); }
export async function addLineForm(form: FormData) { await addLine(null, form); }
