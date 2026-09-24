import 'server-only';
import { withRls } from '@/lib/db';

/**
 * Protocol cards as the Console reads them. Reads go through row-level security like every other
 * Console query; writes do not happen here at all — `actions.ts` calls the `axiom.*` functions,
 * which are the only door, so every change leaves a `protocol_events` row behind it.
 */

export type ProtocolRow = {
  id: string; number: string; code: string; account_id: string; account: string;
  subject_label: string; title: string; state: 'draft' | 'issued' | 'revoked';
  locale: string; starts_on: Date; issued_at: Date | null; revoked_at: Date | null;
  updated_at: Date; items_n: number; ended_n: number;
};

const SELECT = `
  select p.id, p.number, p.code, p.account_id, a.name as account, p.subject_label, p.title,
         p.state::text as state, p.locale, p.starts_on, p.issued_at, p.revoked_at, p.updated_at,
         coalesce(i.live, 0)::int as items_n, coalesce(i.ended, 0)::int as ended_n
  from public.protocols p
  join public.accounts a on a.id = p.account_id
  left join lateral (
    select count(*) filter (where is_active) as live,
           count(*) filter (where not is_active) as ended
    from public.protocol_items where protocol_id = p.id) i on true`;

export async function protocolRows(uid: string) {
  return withRls({ uid }, tx => tx.unsafe(`${SELECT} order by p.issued_at desc nulls first, p.number desc`) as unknown as Promise<ProtocolRow[]>);
}

export async function protocolById(uid: string, id: string) {
  const rows = await withRls({ uid }, tx => tx.unsafe(`${SELECT} where p.id = $1`, [id]) as unknown as Promise<ProtocolRow[]>);
  return rows[0] ?? null;
}

export async function protocolsForAccount(uid: string, accountId: string) {
  return withRls({ uid }, tx => tx.unsafe(`${SELECT} where p.account_id = $1 order by p.issued_at desc nulls first`, [accountId]) as unknown as Promise<ProtocolRow[]>);
}

export type ProtocolItemRow = {
  id: string; variant_id: string; lot_id: string | null; sku: string; name: string; pack: string;
  brief: string; amount: string | null; route: string | null;
  freq: 'once' | 'daily' | 'weekly' | 'monthly'; every_n: number; byday: string[];
  at_time: string; starts_on: Date | null; ends_on: Date | null; occurrences: number | null;
  reminder_min: number; sort: number; is_active: boolean; ended_at: Date | null; lot_code: string | null;
};

export async function protocolItems(uid: string, id: string) {
  return withRls({ uid }, tx => tx<ProtocolItemRow[]>`
    select it.id, it.variant_id, it.lot_id, v.sku, p.name, v.dose as pack, it.brief, it.amount, it.route,
           it.freq::text as freq, it.every_n, it.byday, to_char(it.at_time, 'HH24:MI') as at_time,
           it.starts_on, it.ends_on, it.occurrences, it.reminder_min, it.sort, it.is_active, it.ended_at,
           l.lot_code
    from public.protocol_items it
    join public.product_variants v on v.id = it.variant_id
    join public.products p on p.id = v.product_id
    left join public.lots l on l.id = it.lot_id
    where it.protocol_id = ${id}::uuid
    order by it.is_active desc, it.sort, it.created_at`);
}

export type ProtocolEventRow = { at: Date; actor_label: string; kind: string; detail: string };

export async function protocolEvents(uid: string, id: string) {
  return withRls({ uid }, tx => tx<ProtocolEventRow[]>`
    select at, actor_label, kind, detail from public.protocol_events
    where protocol_id = ${id}::uuid order by at desc, id desc limit 40`);
}

/** Peptide lines only: a card is a research schedule, not a device or an apparel order. */
export async function peptideVariants(uid: string) {
  return withRls({ uid }, tx => tx<{ id: string; sku: string; name: string; pack: string }[]>`
    select v.id, v.sku, p.name, v.dose as pack
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where p.kind = 'peptide' and v.is_active
    order by p.name, v.sort`);
}

export async function lotsForVariant(uid: string, variantId: string) {
  return withRls({ uid }, tx => tx<{ id: string; lot_code: string; expires_at: Date | null }[]>`
    select id, lot_code, expires_at from public.lots
    where variant_id = ${variantId}::uuid order by received_at desc nulls last, lot_code`);
}

/** Accounts a card may be issued to: the acknowledgement gate, stated where the form is built. */
export async function issuableAccounts(uid: string) {
  return withRls({ uid }, tx => tx<{ id: string; name: string; ack: string }[]>`
    select a.id, a.name, axiom.ack_state_for(a.id) as ack
    from public.accounts a
    where axiom.account_has_ack(a.id)
    order by a.name`);
}
