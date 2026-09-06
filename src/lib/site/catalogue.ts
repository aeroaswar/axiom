import 'server-only';
import { asAnon, withRls, type Tx } from '@/lib/db';

// The public site's only read path into the catalogue. Every name, dose, price and count on the
// site comes through here, from public.v_catalogue (price gated at the database) and the
// content columns of public.products (education, public). Static pages call this as anon.

export type Kind = 'peptide' | 'device' | 'apparel';

export type Pathway = {
  id: number; no: string; slug: string; kind: Kind;
  name_en: string; name_id: string; summary_en: string; summary_id: string; sort: number;
  compounds: number; lots: number;
};

export type Variant = {
  variant_id: string; sku: string; dose: string; content: string; is_cold_chain: boolean; sort: number;
  price_idr: number | null;   // null = gated for this caller (peptides) — never a zero
  available: number;
};

export type Compound = {
  id: string; slug: string; name: string; kind: Kind; synonyms: string[]; sort: number;
  compound_class_en: string | null; compound_class_id: string | null;
  molecular_class_en: string | null; molecular_class_id: string | null;
  cas_no: string | null;
  pathway: Pick<Pathway, 'id' | 'no' | 'slug' | 'kind' | 'name_en' | 'name_id' | 'summary_en' | 'summary_id'>;
  variants: Variant[];
};

export type CompoundFull = Compound & {
  identity_en: string | null; identity_id: string | null;
  research_en: string | null; research_id: string | null;
  handling_en: string | null; handling_id: string | null;
  reference_count: number;
  published_at: string | null; updated_at: string;
  related: { slug: string; name: string; compound_class_en: string | null; compound_class_id: string | null; lots: number }[];
};

export type CatalogueRow = Variant & {
  product_id: string; slug: string; name: string; kind: Kind; product_sort: number;
  compound_class_en: string | null; compound_class_id: string | null;
  pathway_no: string; pathway_slug: string; pathway_en: string; pathway_id_name: string; pathway_kind: Kind; pathway_sort: number;
};

type Raw = Record<string, unknown>;
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function variantOf(r: Raw): Variant {
  return {
    variant_id: String(r.variant_id), sku: String(r.sku), dose: String(r.dose), content: String(r.content),
    is_cold_chain: Boolean(r.is_cold_chain), sort: Number(r.variant_sort ?? 0),
    price_idr: n(r.price_idr), available: Number(r.available ?? 0),
  };
}

const CAT = (tx: Tx) => tx<Raw[]>`
  select c.*, p.sort as product_sort, pw.sort as pathway_sort
  from public.v_catalogue c
  join public.products p on p.id = c.product_id
  join public.pathways pw on pw.id = c.pathway_id
  where c.is_published
  order by pw.sort, p.sort, p.name, c.variant_sort, c.dose`;

function rowsOf(raw: Raw[]): CatalogueRow[] {
  return raw.map(r => ({
    ...variantOf(r),
    product_id: String(r.product_id), slug: String(r.slug), name: String(r.name), kind: r.kind as Kind, product_sort: Number(r.product_sort ?? 0),
    compound_class_en: (r.compound_class_en as string | null) ?? null, compound_class_id: (r.compound_class_id as string | null) ?? null,
    pathway_no: String(r.pathway_no), pathway_slug: String(r.pathway_slug), pathway_en: String(r.pathway_en), pathway_id_name: String(r.pathway_id_name),
    pathway_kind: r.pathway_kind as Kind, pathway_sort: Number(r.pathway_sort ?? 0),
  }));
}

/** Every active lot of every published product, in price-list order. Anon unless a uid is given. */
export async function getCatalogue(uid: string | null = null): Promise<CatalogueRow[]> {
  const raw = await withRls({ uid }, CAT);
  return rowsOf(raw);
}

/** Pathways with the number of published compounds and active lots in each. */
export async function getPathways(): Promise<Pathway[]> {
  const raw = await asAnon(tx => tx<Raw[]>`
    select pw.id, pw.no, pw.slug, pw.kind, pw.name_en, pw.name_id, pw.summary_en, pw.summary_id, pw.sort,
           (select count(distinct c.product_id) from public.v_catalogue c where c.pathway_id = pw.id and c.is_published)::int as compounds,
           (select count(*) from public.v_catalogue c where c.pathway_id = pw.id and c.is_published)::int as lots
    from public.pathways pw order by pw.sort`);
  return raw.map(r => ({
    id: Number(r.id), no: String(r.no), slug: String(r.slug), kind: r.kind as Kind,
    name_en: String(r.name_en), name_id: String(r.name_id), summary_en: String(r.summary_en), summary_id: String(r.summary_id),
    sort: Number(r.sort), compounds: Number(r.compounds), lots: Number(r.lots),
  }));
}

export async function getPathway(slug: string): Promise<Pathway | null> {
  const all = await getPathways();
  return all.find(p => p.slug === slug) ?? null;
}

/** One card per compound, with its lots as dose rows. */
export function groupCompounds(rows: CatalogueRow[]): Compound[] {
  const map = new Map<string, Compound>();
  for (const r of rows) {
    let c = map.get(r.product_id);
    if (!c) {
      c = {
        id: r.product_id, slug: r.slug, name: r.name, kind: r.kind, synonyms: [], sort: r.product_sort,
        compound_class_en: r.compound_class_en, compound_class_id: r.compound_class_id,
        molecular_class_en: null, molecular_class_id: null, cas_no: null,
        pathway: { id: 0, no: r.pathway_no, slug: r.pathway_slug, kind: r.pathway_kind, name_en: r.pathway_en, name_id: r.pathway_id_name, summary_en: '', summary_id: '' },
        variants: [],
      };
      map.set(r.product_id, c);
    }
    c.variants.push({ variant_id: r.variant_id, sku: r.sku, dose: r.dose, content: r.content, is_cold_chain: r.is_cold_chain, sort: r.sort, price_idr: r.price_idr, available: r.available });
  }
  return [...map.values()];
}

export async function getCompoundsInPathway(pathwaySlug: string): Promise<Compound[]> {
  const rows = await getCatalogue();
  return groupCompounds(rows.filter(r => r.pathway_slug === pathwaySlug));
}

/** The full compound record for its guide page. Null when unpublished or unknown. */
export async function getCompound(slug: string, uid: string | null = null): Promise<CompoundFull | null> {
  return withRls({ uid }, async tx => {
    const prod = await tx<Raw[]>`
      select p.id, p.slug, p.name, p.kind, p.synonyms, p.sort, p.compound_class_en, p.compound_class_id, p.molecular_class_en, p.molecular_class_id, p.cas_no,
             p.identity_en, p.identity_id, p.research_en, p.research_id, p.handling_en, p.handling_id, p.published_at, p.updated_at,
             axiom.reference_count(p.id) as reference_count,
             pw.id as pw_id, pw.no as pw_no, pw.slug as pw_slug, pw.kind as pw_kind, pw.name_en as pw_name_en, pw.name_id as pw_name_id, pw.summary_en as pw_summary_en, pw.summary_id as pw_summary_id
      from public.products p join public.pathways pw on pw.id = p.pathway_id
      where p.slug = ${slug} and p.is_published`;
    const p = prod[0];
    if (!p) return null;
    const vars = await tx<Raw[]>`select * from public.v_catalogue where product_id = ${String(p.id)}::uuid order by variant_sort, dose`;
    const related = await tx<Raw[]>`
      select q.slug, q.name, q.compound_class_en, q.compound_class_id, (select count(*) from public.v_catalogue c where c.product_id = q.id)::int as lots
      from public.products q where q.pathway_id = ${Number(p.pw_id)} and q.is_published and q.id <> ${String(p.id)}::uuid
      order by q.sort, q.name limit 6`;
    return {
      id: String(p.id), slug: String(p.slug), name: String(p.name), kind: p.kind as Kind, synonyms: (p.synonyms as string[]) ?? [], sort: Number(p.sort),
      compound_class_en: (p.compound_class_en as string | null) ?? null, compound_class_id: (p.compound_class_id as string | null) ?? null,
      molecular_class_en: (p.molecular_class_en as string | null) ?? null, molecular_class_id: (p.molecular_class_id as string | null) ?? null,
      cas_no: (p.cas_no as string | null) ?? null,
      identity_en: (p.identity_en as string | null) ?? null, identity_id: (p.identity_id as string | null) ?? null,
      research_en: (p.research_en as string | null) ?? null, research_id: (p.research_id as string | null) ?? null,
      handling_en: (p.handling_en as string | null) ?? null, handling_id: (p.handling_id as string | null) ?? null,
      reference_count: Number(p.reference_count ?? 0),
      published_at: p.published_at ? new Date(p.published_at as string).toISOString() : null,
      updated_at: new Date(p.updated_at as string).toISOString(),
      pathway: { id: Number(p.pw_id), no: String(p.pw_no), slug: String(p.pw_slug), kind: p.pw_kind as Kind, name_en: String(p.pw_name_en), name_id: String(p.pw_name_id), summary_en: String(p.pw_summary_en), summary_id: String(p.pw_summary_id) },
      variants: vars.map(variantOf),
      related: related.map(r => ({ slug: String(r.slug), name: String(r.name), compound_class_en: (r.compound_class_en as string | null) ?? null, compound_class_id: (r.compound_class_id as string | null) ?? null, lots: Number(r.lots) })),
    };
  });
}

/** Every published product, for static params and the sitemap. */
export async function getPublishedSlugs(): Promise<{ slug: string; kind: Kind; pathway_slug: string; updated_at: string }[]> {
  const raw = await asAnon(tx => tx<Raw[]>`
    select p.slug, p.kind, pw.slug as pathway_slug, p.updated_at from public.products p join public.pathways pw on pw.id = p.pathway_id
    where p.is_published and exists (select 1 from public.v_catalogue c where c.product_id = p.id) order by pw.sort, p.sort`);
  return raw.map(r => ({ slug: String(r.slug), kind: r.kind as Kind, pathway_slug: String(r.pathway_slug), updated_at: new Date(r.updated_at as string).toISOString() }));
}

/** The hero meta strip: derived counts, never typed. */
export async function getCounts(): Promise<{ compounds: number; lots: number; pathways: number; devices: number; apparel: number }> {
  const [r] = await asAnon(tx => tx<Raw[]>`
    select (select count(distinct product_id) from public.v_catalogue where is_published and kind = 'peptide')::int as compounds,
           (select count(*) from public.v_catalogue where is_published and kind = 'peptide')::int as lots,
           (select count(*) from public.pathways where kind = 'peptide')::int as pathways,
           (select count(distinct product_id) from public.v_catalogue where is_published and kind = 'device')::int as devices,
           (select count(distinct product_id) from public.v_catalogue where is_published and kind = 'apparel')::int as apparel`);
  return { compounds: Number(r.compounds), lots: Number(r.lots), pathways: Number(r.pathways), devices: Number(r.devices), apparel: Number(r.apparel) };
}

export type SampleCoa = { id: string; lot_code: string | null; file_path: string; issued_at: string | null; method: string; purity_pct: number | null; product: string | null; dose: string | null };

/** The published sample CoA row, if one exists. The file itself may not. */
export async function getSampleCoa(): Promise<SampleCoa | null> {
  const [r] = await asAnon(tx => tx<Raw[]>`
    select d.id, d.lot_code, d.file_path, d.issued_at, d.method, d.purity_pct, p.name as product, v.dose
    from public.coa_documents d left join public.product_variants v on v.id = d.variant_id left join public.products p on p.id = v.product_id
    where d.is_sample order by d.issued_at desc nulls last limit 1`);
  if (!r) return null;
  return { id: String(r.id), lot_code: (r.lot_code as string | null) ?? null, file_path: String(r.file_path), issued_at: r.issued_at ? new Date(r.issued_at as string).toISOString() : null, method: String(r.method), purity_pct: n(r.purity_pct), product: (r.product as string | null) ?? null, dose: (r.dose as string | null) ?? null };
}

export type DeliveryZone = { zone: string; label_en: string; label_id: string; per_three_idr: number | null; cap_idr: number | null; eta_days: number };

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  const raw = await asAnon(tx => tx<Raw[]>`select zone, label_en, label_id, per_three_idr, cap_idr, eta_days from public.delivery_zones order by eta_days, zone`);
  return raw.map(r => ({ zone: String(r.zone), label_en: String(r.label_en), label_id: String(r.label_id), per_three_idr: n(r.per_three_idr), cap_idr: n(r.cap_idr), eta_days: Number(r.eta_days) }));
}

/** "Prices as at" — the most recent price change. */
export async function getPricesAsAt(): Promise<Date | null> {
  const [r] = await asAnon(tx => tx<{ prices_as_at: string | null }[]>`select axiom.prices_as_at()`);
  return r?.prices_as_at ? new Date(r.prices_as_at) : null;
}

/** Live prices for a signed-in caller; the database returns null where the acknowledgement is missing. */
export async function getPricesFor(uid: string, skus: string[]): Promise<Record<string, number | null>> {
  if (!skus.length) return {};
  const raw = await withRls({ uid }, tx => tx<Raw[]>`select sku, price_idr from public.v_catalogue where sku = any(${skus})`);
  return Object.fromEntries(raw.map(r => [String(r.sku), n(r.price_idr)]));
}

/** Rows for a set of skus — the basket needs name, dose, kind and (gated) price per line. */
export async function getRowsForSkus(uid: string | null, skus: string[]): Promise<CatalogueRow[]> {
  if (!skus.length) return [];
  const raw = await withRls({ uid }, tx => tx<Raw[]>`
    select c.*, p.sort as product_sort, pw.sort as pathway_sort
    from public.v_catalogue c join public.products p on p.id = c.product_id join public.pathways pw on pw.id = c.pathway_id
    where c.sku = any(${skus})`);
  return rowsOf(raw);
}

/** Locale pick for the bilingual columns. */
export const pick = (locale: string, en: string | null | undefined, id: string | null | undefined) =>
  (locale === 'id' ? (id || en) : (en || id)) ?? '';
