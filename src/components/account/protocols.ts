import 'server-only';
import { withRls } from '@/lib/db';

/**
 * The client's own protocol cards. The reads are the same rows the Console reads, scoped by the
 * `protocols_read` policy to the account's own; the writes are the same `axiom.*` functions, which
 * accept a member of the owning account and refuse everyone else — so nothing here has to remember
 * who is allowed to do what.
 */

export type AccountProtocol = {
  id: string; number: string; code: string; subject_label: string; title: string;
  state: 'draft' | 'issued' | 'revoked'; locale: string; issued_at: Date | null; updated_at: Date;
  items_n: number;
};

export async function myProtocols(uid: string, accountId: string) {
  return withRls({ uid }, tx => tx<AccountProtocol[]>`
    select p.id, p.number, p.code, p.subject_label, p.title, p.state::text as state, p.locale,
           p.issued_at, p.updated_at,
           (select count(*) from public.protocol_items where protocol_id = p.id and is_active)::int as items_n
    from public.protocols p
    where p.account_id = ${accountId}::uuid and p.state = 'issued'
    order by p.issued_at desc`);
}

export async function myProtocol(uid: string, accountId: string, id: string) {
  const rows = await withRls({ uid }, tx => tx<AccountProtocol[]>`
    select p.id, p.number, p.code, p.subject_label, p.title, p.state::text as state, p.locale,
           p.issued_at, p.updated_at,
           (select count(*) from public.protocol_items where protocol_id = p.id and is_active)::int as items_n
    from public.protocols p
    where p.id = ${id}::uuid and p.account_id = ${accountId}::uuid and p.state = 'issued'`);
  return rows[0] ?? null;
}

/**
 * What the account may add to its own card: the peptides it has actually been sent. A client
 * choosing from the whole catalogue would be describing a schedule for something they do not hold.
 */
export async function orderedPeptides(uid: string, accountId: string) {
  return withRls({ uid }, tx => tx<{ id: string; name: string; pack: string }[]>`
    select distinct v.id, p.name, v.dose as pack
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.product_variants v on v.id = oi.variant_id
    join public.products p on p.id = v.product_id
    where o.account_id = ${accountId}::uuid and o.state <> 'cancelled' and p.kind = 'peptide'
    order by p.name`);
}
