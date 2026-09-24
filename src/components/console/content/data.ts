import 'server-only';
import { withRls } from '@/lib/db';

export type ContentRow = {
  id: string; slug: string; name: string; kind: 'peptide' | 'device' | 'apparel';
  pathway_no: string; name_en: string; name_id: string;
  is_published: boolean; published_at: Date | null;
  ref_count: number; has_research: boolean; lots: number;
};

export async function contentRows(uid: string) {
  return withRls({ uid }, tx => tx<ContentRow[]>`
    select p.id, p.slug, p.name, p.kind, pw.no as pathway_no, pw.name_en, pw.name_id,
           p.is_published, p.published_at,
           axiom.reference_count(p.id) as ref_count,
           (coalesce(p.research_en, '') <> '' or coalesce(p.research_id, '') <> '') as has_research,
           (select count(*)::int from public.product_variants v where v.product_id = p.id) as lots
    from public.products p
    join public.pathways pw on pw.id = p.pathway_id
    order by pw.sort, pw.no, p.sort, p.name`);
}

export type ProductContent = {
  id: string; slug: string; name: string; kind: string; synonyms: string[];
  compound_class_en: string | null; compound_class_id: string | null;
  molecular_class_en: string | null; molecular_class_id: string | null;
  cas_no: string | null;
  identity_en: string | null; identity_id: string | null;
  research_en: string | null; research_id: string | null;
  handling_en: string | null; handling_id: string | null;
  is_published: boolean; published_at: Date | null;
  pathway_no: string; name_en: string; name_id: string;
};

export type Reference = { id: string; claim_key: string; citation: string; pubmed_id: string | null; doi: string | null; url: string | null };
export type Lot = { sku: string; dose: string; content: string; price_idr: string };

export async function productBySlug(uid: string, slug: string) {
  return withRls({ uid }, async tx => {
    const rows = await tx<ProductContent[]>`
      select p.id, p.slug, p.name, p.kind::text as kind, p.synonyms,
             p.compound_class_en, p.compound_class_id, p.molecular_class_en, p.molecular_class_id, p.cas_no,
             p.identity_en, p.identity_id, p.research_en, p.research_id, p.handling_en, p.handling_id,
             p.is_published, p.published_at, pw.no as pathway_no, pw.name_en, pw.name_id
      from public.products p join public.pathways pw on pw.id = p.pathway_id
      where p.slug = ${slug}`;
    const product = rows[0];
    if (!product) return null;
    const references = await tx<Reference[]>`
      select id::text as id, claim_key, citation, pubmed_id, doi, url
      from public.product_references where product_id = ${product.id}::uuid order by claim_key, citation`;
    const lots = await tx<Lot[]>`
      select sku, dose, content, price_idr from public.product_variants
      where product_id = ${product.id}::uuid order by sort, dose`;
    return { product, references, lots };
  });
}
