import 'server-only';
import { withRls } from '@/lib/db';

/**
 * One plan as either surface reads it. Row-level security decides whose plans come back: the
 * account's own, or every plan for staff. Nothing here computes a date or a price; `next_due_at`,
 * `discount_pct` and the open renewal are the row's own, written by the functions in 0008.
 */
export type SubscriptionRow = {
  id: string; account_id: string; account: string;
  sku: string; slug: string; name: string; dose: string; content: string;
  site_id: string | null; site_name: string | null;
  qty: number; interval_days: number; discount_pct: string;
  state: 'active' | 'paused' | 'cancelled';
  started_at: Date; next_due_at: Date; updated_at: Date;
  last_order_number: string | null; renewal_quote_number: string | null; renewal_open: boolean;
  price_idr: string | null;
};

const SELECT = `
  select s.id::text as id, s.account_id::text as account_id, a.name as account,
         v.sku, p.slug, p.name, v.dose, v.content,
         s.site_id::text as site_id, st.name as site_name,
         s.qty, s.interval_days, s.discount_pct::text as discount_pct, s.state::text as state,
         s.started_at, s.next_due_at, s.updated_at,
         o.number as last_order_number, q.number as renewal_quote_number,
         (q.id is not null and axiom.quote_state(q.*) in ('requested','draft','sent')) as renewal_open,
         c.price_idr::text as price_idr
  from public.subscriptions s
  join public.accounts a on a.id = s.account_id
  join public.product_variants v on v.id = s.variant_id
  join public.products p on p.id = v.product_id
  left join public.account_sites st on st.id = s.site_id
  left join public.orders o on o.id = s.last_order_id
  left join public.quotes q on q.id = s.renewal_quote_id
  left join public.v_catalogue c on c.variant_id = s.variant_id`;

export async function subscriptionsFor(uid: string, accountId: string): Promise<SubscriptionRow[]> {
  return withRls({ uid }, tx => tx.unsafe(`${SELECT} where s.account_id = $1 order by (s.state = 'cancelled'), s.next_due_at`, [accountId]) as unknown as Promise<SubscriptionRow[]>);
}

export async function allSubscriptions(uid: string): Promise<SubscriptionRow[]> {
  return withRls({ uid }, tx => tx.unsafe(`${SELECT} order by (s.state <> 'active'), s.next_due_at`) as unknown as Promise<SubscriptionRow[]>);
}

/** The ids of plans due within the lead window with no open renewal, as `axiom.renewals_due` says. */
export async function renewalsDue(uid: string): Promise<Set<string>> {
  const rows = await withRls({ uid }, tx => tx<{ id: string }[]>`select id::text as id from axiom.renewals_due()`);
  return new Set(rows.map(r => r.id));
}
