import 'server-only';
import { withRls } from '@/lib/db';

/**
 * An account as the Console reads it. Acknowledgement state, its expiry and the reorder cadence are
 * all SQL functions — `ack_state_for`, `ack_expires_for`, `cadence_days` — never re-derived here.
 */
export type ClientRow = {
  id: string; name: string; type: 'individual' | 'clinic' | 'institution';
  whatsapp: string | null; email: string | null; notes: string | null;
  agreed_cadence_days: number | null; manager: string | null; manager_id: string | null;
  lifetime: string | null; orders_n: number; last_order: Date | null;
  ack: 'current' | 'expiring' | 'lapsed' | 'none'; ack_expires: Date | null; cadence: number | null;
};

const SELECT = `
  select a.id, a.name, a.type::text as type, a.whatsapp, a.email, a.notes, a.agreed_cadence_days,
         m.full_name as manager, a.account_manager_id as manager_id,
         l.lifetime, coalesce(l.orders_n, 0)::int as orders_n, l.last_order,
         axiom.ack_state_for(a.id) as ack, axiom.ack_expires_for(a.id) as ack_expires,
         axiom.cadence_days(a.id) as cadence
  from public.accounts a
  left join public.profiles m on m.id = a.account_manager_id
  left join lateral (
    select sum(o.total_idr) filter (where o.state = 'delivered') as lifetime,
           count(*) filter (where o.state <> 'cancelled') as orders_n,
           max(o.placed_at) filter (where o.state <> 'cancelled') as last_order
    from public.orders o where o.account_id = a.id) l on true`;

export async function clientRows(uid: string) {
  return withRls({ uid }, tx => tx.unsafe(`${SELECT} order by a.name`) as unknown as Promise<ClientRow[]>);
}

export async function clientById(uid: string, id: string) {
  const rows = await withRls({ uid }, tx => tx.unsafe(`${SELECT} where a.id = $1`, [id]) as unknown as Promise<ClientRow[]>);
  return rows[0] ?? null;
}

/** Reorder due is last order plus cadence. Cadence is the database's; this only adds the days. */
export function reorderDue(c: Pick<ClientRow, 'last_order' | 'cadence'>) {
  if (!c.last_order || !c.cadence) return null;
  const due = new Date(new Date(c.last_order).getTime() + c.cadence * 86400_000);
  const days = Math.round((due.getTime() - Date.now()) / 86400_000);
  return { due, days, overdue: days < 0, soon: days >= 0 && days <= 7 };
}

export type Member = { profile_id: string; full_name: string; role: string; is_primary: boolean; email: string | null };
export type Site = { id: string; name: string; address: string | null; zone: string; is_default: boolean };
export type DocRow = { id: string; number: string; state: string; at: Date | null; total: string | null };
export type InvoiceRow = { id: string; number: string; order_number: string; issued_at: Date | null; due_at: Date | null; paid_at: Date | null; voided_at: Date | null; total_idr: string };
export type Manager = { id: string; full_name: string; role: string };

export async function clientDetail(uid: string, accountId: string) {
  return withRls({ uid }, async tx => ({
    members: await tx<Member[]>`
      select m.profile_id, p.full_name, p.role::text as role, m.is_primary, u.email
      from public.account_members m
      join public.profiles p on p.id = m.profile_id
      left join auth.users u on u.id = p.id
      where m.account_id = ${accountId}::uuid
      order by m.is_primary desc, p.full_name`,
    sites: await tx<Site[]>`
      select id, name, address, zone::text as zone, is_default
      from public.account_sites where account_id = ${accountId}::uuid order by sort, name`,
    quotes: await tx<DocRow[]>`
      select q.id::text as id, q.number, axiom.quote_state(q.*) as state, q.created_at as at,
             (select sum(qi.line_total_idr)::text from public.quote_items qi where qi.quote_id = q.id) as total
      from public.quotes q where q.account_id = ${accountId}::uuid order by q.created_at desc limit 12`,
    orders: await tx<DocRow[]>`
      select o.id::text as id, o.number, o.state::text as state, o.placed_at as at, o.total_idr::text as total
      from public.orders o where o.account_id = ${accountId}::uuid order by o.placed_at desc limit 12`,
    invoices: await tx<InvoiceRow[]>`
      select i.id::text as id, i.number, o.number as order_number, i.issued_at, i.due_at, i.paid_at, i.voided_at, i.total_idr
      from public.invoices i join public.orders o on o.id = i.order_id
      where o.account_id = ${accountId}::uuid and i.issued_at is not null
      order by i.issued_at desc limit 12`,
    managers: await tx<Manager[]>`
      select id, full_name, role::text as role from public.profiles
      where role in ('ops','owner') order by role desc, full_name`,
  }));
}

export async function managers(uid: string) {
  return withRls({ uid }, tx => tx<Manager[]>`
    select id, full_name, role::text as role from public.profiles
    where role in ('ops','owner') order by role desc, full_name`);
}

export type Zone = { zone: string; label_en: string; label_id: string; per_three_idr: string | null };

export async function deliveryZones(uid: string) {
  return withRls({ uid }, tx => tx<Zone[]>`
    select zone::text as zone, label_en, label_id, per_three_idr from public.delivery_zones order by zone`);
}
