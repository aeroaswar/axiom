import 'server-only';
import { withRls } from '@/lib/db';

// The request path. Every rule it depends on — what a destination costs, what a request becomes —
// lives in the database and is called, never reimplemented here.

export type Site = { id: string; name: string; zone: string; is_default: boolean };
export type DeliveryRow = { site_id: string | null; site_name: string; zone: string; units: number; charge_idr: number | null };
export type Line = { sku: string; qty: number; site_id: string | null; interval_days?: number | null };

export async function getAccountSites(uid: string, accountId: string): Promise<Site[]> {
  const rows = await withRls({ uid }, tx => tx<Record<string, unknown>[]>`
    select id, name, zone, is_default from public.account_sites where account_id = ${accountId}::uuid
    order by is_default desc, sort, name`);
  return rows.map(r => ({ id: String(r.id), name: String(r.name), zone: String(r.zone), is_default: Boolean(r.is_default) }));
}

/** The running delivery charge per destination, from axiom.delivery_for_lines. Never recomputed. */
export async function getDeliveryForLines(uid: string, accountId: string, lines: Line[]): Promise<DeliveryRow[]> {
  if (!lines.length) return [];
  const payload = lines.map(l => ({ site_id: l.site_id, qty: l.qty }));
  const rows = await withRls({ uid }, tx => tx<Record<string, unknown>[]>`
    select site_id, site_name, zone, units, charge_idr from axiom.delivery_for_lines(${tx.json(payload)}, ${accountId}::uuid)`);
  return rows.map(r => ({
    site_id: r.site_id ? String(r.site_id) : null,
    site_name: String(r.site_name ?? ''),
    zone: String(r.zone ?? ''),
    units: Number(r.units ?? 0),
    charge_idr: r.charge_idr === null || r.charge_idr === undefined ? null : Number(r.charge_idr),
  }));
}

/** Signed in: the basket becomes a `requested` quote, visible in the Console the same moment. */
export async function requestQuote(uid: string, accountId: string, lines: Line[], note: string | null): Promise<string> {
  const payload = lines.map(l => ({ sku: l.sku, qty: l.qty, site_id: l.site_id, interval_days: l.interval_days ?? null }));
  return withRls({ uid }, async tx => {
    const [{ request_quote: id }] = await tx<{ request_quote: string }[]>`
      select axiom.request_quote(${accountId}::uuid, ${tx.json(payload)}, ${note})`;
    const [q] = await tx<{ number: string }[]>`select number from public.quotes where id = ${id}::uuid`;
    return q?.number ?? '';
  });
}

export type PublicRequest = { name: string; clinic: string | null; role: string | null; email: string | null; whatsapp: string | null; ack: boolean };

/** Signed out: a lead, an unverified account and a requested quote, in one call. */
export async function submitPublicRequest(f: PublicRequest, lines: Line[], locale: string, anonKey: string | null): Promise<{ quoteNumber: string }> {
  const payload = lines.map(l => ({ sku: l.sku, qty: l.qty, interval_days: l.interval_days ?? null }));
  const rows = await withRls({ uid: null }, tx => tx<{ quote_number: string }[]>`
    select quote_number from axiom.submit_public_request(
      ${f.name}, ${f.clinic}, ${f.role}, ${f.email}, ${f.whatsapp}, ${tx.json(payload)}, ${locale}, ${anonKey}, ${f.ack})`);
  return { quoteNumber: rows[0]?.quote_number ?? '' };
}

export type QuoteLine = { name: string; dose: string; qty: number; interval_days: number | null };

/** The lines of a request the caller owns, for the confirmation and its WhatsApp message. */
export async function getQuoteLines(uid: string, number: string): Promise<QuoteLine[]> {
  const rows = await withRls({ uid }, tx => tx<Record<string, unknown>[]>`
    select p.name, v.dose, i.qty, i.interval_days
    from public.quotes q
    join public.quote_items i on i.quote_id = q.id
    join public.product_variants v on v.id = i.variant_id
    join public.products p on p.id = v.product_id
    where q.number = ${number}
    order by p.sort, v.sort`);
  return rows.map(r => ({ name: String(r.name), dose: String(r.dose), qty: Number(r.qty), interval_days: r.interval_days == null ? null : Number(r.interval_days) }));
}

/** A sold-out lot's "tell me when it is back": one row through axiom.request_stock_notice, anon. */
export async function requestStockNotice(sku: string, email: string | null, whatsapp: string | null, locale: string): Promise<string> {
  const [row] = await withRls({ uid: null }, tx => tx<{ request_stock_notice: string }[]>`
    select axiom.request_stock_notice(${sku}, ${email}, ${whatsapp}, ${locale})`);
  return row?.request_stock_notice ?? '';
}
