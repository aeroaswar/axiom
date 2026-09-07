import 'server-only';
import { withRls } from '@/lib/db';

/** One lot as the Console reads it: the variant, its product and pathway, and its three stock figures. */
export type CatalogueRow = {
  variant_id: string; sku: string; dose: string; content: string;
  price_idr: string; is_cold_chain: boolean; low_stock_threshold: number; is_active: boolean;
  product_id: string; product_name: string; kind: 'peptide' | 'device' | 'apparel'; slug: string;
  pathway_id: number; pathway_no: string; name_en: string; name_id: string;
  on_hand: number; reserved: number; available: number;
};

/** The whole book, in pathway order. On hand and reserved come from v_stock, never from a column. */
export async function catalogueRows(uid: string) {
  return withRls({ uid }, tx => tx<CatalogueRow[]>`
    select v.id as variant_id, v.sku, v.dose, v.content, v.price_idr, v.is_cold_chain,
           v.low_stock_threshold, v.is_active,
           p.id as product_id, p.name as product_name, p.kind, p.slug,
           pw.id as pathway_id, pw.no as pathway_no, pw.name_en, pw.name_id,
           st.on_hand, st.reserved, st.available
    from public.product_variants v
    join public.products p on p.id = v.product_id
    join public.pathways pw on pw.id = p.pathway_id
    join public.v_stock st on st.variant_id = v.id
    order by pw.sort, pw.no, p.sort, p.name, v.sort, v.dose`);
}

export type VariantDetail = CatalogueRow & { pathway_kind: string };

export async function variantBySku(uid: string, sku: string) {
  const rows = await withRls({ uid }, tx => tx<VariantDetail[]>`
    select v.id as variant_id, v.sku, v.dose, v.content, v.price_idr, v.is_cold_chain,
           v.low_stock_threshold, v.is_active,
           p.id as product_id, p.name as product_name, p.kind, p.slug,
           pw.id as pathway_id, pw.no as pathway_no, pw.name_en, pw.name_id, pw.kind as pathway_kind,
           st.on_hand, st.reserved, st.available
    from public.product_variants v
    join public.products p on p.id = v.product_id
    join public.pathways pw on pw.id = p.pathway_id
    join public.v_stock st on st.variant_id = v.id
    where v.sku = ${sku}`);
  return rows[0] ?? null;
}

export type Movement = { id: string; delta: number; reason: string; ref: string | null; at: Date; actor: string | null };

/** The ledger, newest first. It is append-only, so this is the whole history of the balance above it. */
export async function ledger(uid: string, variantId: string) {
  return withRls({ uid }, tx => tx<Movement[]>`
    select m.id::text as id, m.delta, m.reason::text as reason, m.ref, m.created_at as at, pr.full_name as actor
    from public.stock_movements m
    left join public.profiles pr on pr.id = m.actor_id
    where m.variant_id = ${variantId}::uuid
    order by m.created_at desc, m.id desc
    limit 60`);
}

export type PathwayOption = { id: number; no: string; kind: string; name_en: string; name_id: string };
export type ProductOption = { id: string; name: string; pathway_no: string };

export async function formOptions(uid: string) {
  return withRls({ uid }, async tx => ({
    pathways: await tx<PathwayOption[]>`select id, no, kind::text as kind, name_en, name_id from public.pathways order by sort, no`,
    products: await tx<ProductOption[]>`
      select p.id, p.name, pw.no as pathway_no from public.products p
      join public.pathways pw on pw.id = p.pathway_id order by pw.sort, p.name`,
  }));
}
