import 'server-only';
import { pgMessage, withRls } from '@/lib/db';

/** One lot in the margin book. Every figure here is `v_pricing`, which raises for anyone but the owner. */
export type PricingRow = {
  variant_id: string; sku: string; dose: string; content: string; name: string;
  kind: 'peptide' | 'device' | 'apparel'; slug: string;
  pathway_no: string; pathway_en: string; pathway_id_name: string;
  supplier_cost_idr: string; pen_cost_idr: string; cost_assumed: boolean;
  base_idr: string; price_idr: string; margin_idr: string; gm_pct: string;
};

export type PriceChange = { id: string; from_idr: string; to_idr: string; at: Date; who: string | null };

/**
 * The book, or the database's refusal to show it. An ops session is refused by the policy on
 * `variant_costs`, not by a hidden element, so the refusal is what we render.
 */
export async function pricingBook(uid: string): Promise<{ rows: PricingRow[] } | { refused: string }> {
  try {
    const rows = await withRls({ uid }, tx => tx<PricingRow[]>`
      select variant_id, sku, dose, content, name, kind, slug, pathway_no, pathway_en, pathway_id_name,
             supplier_cost_idr, pen_cost_idr, cost_assumed, base_idr, price_idr, margin_idr, gm_pct
      from public.v_pricing
      order by pathway_no, name, sku`);
    return { rows };
  } catch (e) {
    return { refused: pgMessage(e) };
  }
}

export async function pricingLot(uid: string, sku: string): Promise<{ row: PricingRow | null; changes: PriceChange[] } | { refused: string }> {
  try {
    return await withRls({ uid }, async tx => {
      const rows = await tx<PricingRow[]>`
        select variant_id, sku, dose, content, name, kind, slug, pathway_no, pathway_en, pathway_id_name,
               supplier_cost_idr, pen_cost_idr, cost_assumed, base_idr, price_idr, margin_idr, gm_pct
        from public.v_pricing where sku = ${sku}`;
      if (!rows[0]) return { row: null, changes: [] };
      const changes = await tx<PriceChange[]>`
        select c.id::text as id, c.from_idr, c.to_idr, c.changed_at as at, p.full_name as who
        from public.price_changes c
        left join public.profiles p on p.id = c.changed_by
        where c.variant_id = ${rows[0].variant_id}::uuid
        order by c.changed_at desc limit 30`;
      return { row: rows[0], changes };
    });
  } catch (e) {
    return { refused: pgMessage(e) };
  }
}

/** The reporting floor is a setting, never a constant in a component. */
export async function gmFloor(uid: string): Promise<number> {
  const rows = await withRls({ uid }, tx => tx<{ v: number }[]>`
    select (value #>> '{}')::numeric as v from public.site_settings where key = 'gm_floor_pct'`);
  return Number(rows[0]?.v ?? 45);
}

// ---------------------------------------------------------------- arithmetic
// base = supplier + pen · margin = selling − base · selling is set per lot and never derived.
// Every total below is a sum of the rows above it: nothing on this screen is typed.

export type Totals = { lots: number; supplier: bigint; pen: bigint; base: bigint; selling: bigint; margin: bigint };

export function total(rows: PricingRow[]): Totals {
  return rows.reduce<Totals>((a, r) => ({
    lots: a.lots + 1,
    supplier: a.supplier + BigInt(r.supplier_cost_idr),
    pen: a.pen + BigInt(r.pen_cost_idr),
    base: a.base + BigInt(r.base_idr),
    selling: a.selling + BigInt(r.price_idr),
    margin: a.margin + BigInt(r.margin_idr),
  }), { lots: 0, supplier: 0n, pen: 0n, base: 0n, selling: 0n, margin: 0n });
}

/** A percentage of one bigint over another, to one decimal, without leaving integer rupiah. */
export function share(part: bigint, whole: bigint): number {
  if (whole === 0n) return 0;
  return Number((part * 1000n + whole / 2n) / whole) / 10;
}
