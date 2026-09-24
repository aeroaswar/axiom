import 'server-only';
import { pgMessage, withRls } from '@/lib/db';

/**
 * Every figure on the dashboard is a sum over the tables as they stand, and every one of them
 * carries its definition. Where there is no data there is no number: marketing spend is not
 * recorded anywhere in this schema, so CAC reads "not recorded" rather than a figure invented to
 * fill the tile.
 *
 * The twelve monthly readings behind each sparkline come from the same statement as the headline,
 * so the line and the number can never disagree.
 */
export type MonthPoint = { k: string; revenue: string; sent: number; accepted: number; reorder_pct: string };

export type Figures = {
  revenue_mtd: string; revenue_prior: string;
  sent_30: number; accepted_30: number;
  reorder_pct: string; reorder_prior: string;
  aov: string; aov_orders: number;
  ltv: string; accounts_with_orders: number;
  months: MonthPoint[];
  pillars: { kind: 'peptide' | 'device' | 'apparel'; revenue: string }[];
};

export async function dashboardFigures(uid: string): Promise<Figures> {
  return withRls({ uid }, async tx => {
    const months = await tx<MonthPoint[]>`
      with m as (
        select generate_series(date_trunc('month', now()) - interval '11 months',
                               date_trunc('month', now()), interval '1 month') as ms)
      select to_char(m.ms, 'YYYY-MM') as k,
             coalesce((select sum(o.total_idr) from public.orders o
                        where o.state = 'delivered' and o.delivered_at >= m.ms and o.delivered_at < m.ms + interval '1 month'), 0)::text as revenue,
             (select count(*)::int from public.quotes q
               where q.sent_at >= m.ms and q.sent_at < m.ms + interval '1 month') as sent,
             (select count(*)::int from public.quotes q
               where q.sent_at >= m.ms and q.sent_at < m.ms + interval '1 month' and q.accepted_at is not null) as accepted,
             coalesce((
               with f as (
                 select o.account_id,
                        min(o.placed_at) as first_at,
                        min(o.placed_at) filter (where o.placed_at > (
                          select min(x.placed_at) from public.orders x
                           where x.account_id = o.account_id and x.state <> 'cancelled')) as second_at
                 from public.orders o
                 where o.state <> 'cancelled' and o.placed_at < m.ms + interval '1 month'
                 group by o.account_id)
               select round(count(*) filter (where second_at is not null and second_at <= first_at + interval '90 days')::numeric
                            / nullif(count(*), 0) * 100, 1) from f), 0)::text as reorder_pct
      from m order by m.ms`;

    const [head] = await tx<{
      revenue_mtd: string; revenue_prior: string; sent_30: number; accepted_30: number;
      aov: string; aov_orders: number; ltv: string; accounts_with_orders: number;
    }[]>`
      select
        coalesce((select sum(total_idr) from public.orders
                   where state = 'delivered' and delivered_at >= date_trunc('month', now())), 0)::text as revenue_mtd,
        coalesce((select sum(total_idr) from public.orders
                   where state = 'delivered' and delivered_at >= date_trunc('month', now()) - interval '1 month'
                     and delivered_at < date_trunc('month', now())), 0)::text as revenue_prior,
        (select count(*)::int from public.quotes where sent_at >= now() - interval '30 days') as sent_30,
        (select count(*)::int from public.quotes where sent_at >= now() - interval '30 days' and accepted_at is not null) as accepted_30,
        coalesce((select round(avg(total_idr)) from public.orders
                   where state = 'delivered' and delivered_at >= now() - interval '12 months'), 0)::text as aov,
        (select count(*)::int from public.orders
          where state = 'delivered' and delivered_at >= now() - interval '12 months') as aov_orders,
        coalesce((select round(avg(t)) from (
           select sum(total_idr) as t from public.orders where state = 'delivered' group by account_id) x), 0)::text as ltv,
        (select count(distinct account_id)::int from public.orders where state <> 'cancelled') as accounts_with_orders`;

    const pillars = await tx<{ kind: 'peptide' | 'device' | 'apparel'; revenue: string }[]>`
      select p.kind, coalesce(sum(oi.line_total_idr), 0)::text as revenue
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      join public.product_variants v on v.id = oi.variant_id
      join public.products p on p.id = v.product_id
      where o.state = 'delivered'
      group by p.kind order by sum(oi.line_total_idr) desc`;

    const last = months[months.length - 1];
    const prior = months[months.length - 2];
    return {
      ...head,
      reorder_pct: last?.reorder_pct ?? '0',
      reorder_prior: prior?.reorder_pct ?? '0',
      months, pillars,
    };
  });
}

/** Gross margin on goods delivered. Owner-only at the database; ops gets the refusal, not a blank. */
export async function deliveredMargin(uid: string): Promise<{ gm_pct: string; margin: string } | { refused: string }> {
  try {
    const rows = await withRls({ uid }, tx => tx<{ gm_pct: string; margin: string }[]>`
      select case when coalesce(sum(oi.line_total_idr), 0) > 0
                  then round(sum(oi.line_total_idr - (c.unit_supplier_cost_idr + c.unit_pen_cost_idr) * oi.qty)::numeric
                             / sum(oi.line_total_idr) * 100, 1) else 0 end::text as gm_pct,
             coalesce(sum(oi.line_total_idr - (c.unit_supplier_cost_idr + c.unit_pen_cost_idr) * oi.qty), 0)::text as margin
      from public.order_items oi
      join public.order_item_costs c on c.order_item_id = oi.id
      join public.orders o on o.id = oi.order_id
      where o.state = 'delivered'`);
    return rows[0];
  } catch (e) {
    return { refused: pgMessage(e) };
  }
}

/** Percentage of two counts, one decimal, without a float creeping into money. */
export const rate = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
