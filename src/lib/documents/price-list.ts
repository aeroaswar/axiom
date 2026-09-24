import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { DocLine, DocumentData } from '@/components/document/document';
import { getCatalogue, getPricesAsAt, pick } from '@/lib/site/catalogue';
import { getSettings } from '@/lib/settings';
import { fmtLong } from '@/lib/domain/dates';

// The price list a clinic files and the invoice it later receives are visibly the same system:
// this builds the shared document template's data from the same catalogue rows the page renders,
// through the same gate. A caller without a current acknowledgement gets a document with the
// peptide prices absent, exactly as the page shows them.

export async function priceListDocument(locale: string, uid: string | null = null): Promise<DocumentData> {
  const [rows, settings, asAt] = await Promise.all([getCatalogue(uid), getSettings(), getPricesAsAt()]);
  const t = await getTranslations({ locale, namespace: 'site.price_list' });
  const tc = await getTranslations({ locale, namespace: 'common' });

  const lines: DocLine[] = [];
  let lastPathway = '';
  let lastProduct = '';
  let ix = 0;
  for (const r of rows) {
    if (r.pathway_slug !== lastPathway) {
      lastPathway = r.pathway_slug;
      lastProduct = '';
      lines.push({ group: true, title: `${r.pathway_no} · ${pick(locale, r.pathway_en, r.pathway_id_name)}` });
    }
    const first = r.product_id !== lastProduct;
    lastProduct = r.product_id;
    lines.push({
      ix: String(++ix).padStart(2, '0'),
      title: first ? r.name : '',
      sub: `${r.dose} · ${r.content}`,
      qty: 1,
      unit: r.price_idr,
      total: r.price_idr,
      is_peptide: r.kind === 'peptide',
    });
  }

  // site_settings.entity is readable only to a signed-in caller (RLS); an anonymous download of
  // the price list therefore carries the brand as the issuer and no tax identity.
  const entity = settings.entity ?? { name: 'AXIOM', address: '', npwp: '', pkp: false };
  const asAtText = asAt ? fmtLong(asAt, locale) : '';
  const anyPeptide = rows.some(r => r.kind === 'peptide');
  const peptidePriced = rows.some(r => r.kind === 'peptide' && r.price_idr !== null);

  return {
    kind: 'price_list',
    title: t('doc_title'),
    number: asAt ? asAt.toISOString().slice(0, 10) : '',
    meta: [{ k: t('doc_as_at'), v: asAtText }],
    amountDue: null,
    columns: { a: t('doc_for'), b: t('doc_from'), c: t('doc_details'), sub: '' },
    parties: {
      billedTo: { name: t('doc_for_value'), lines: tc('pen_included') },
      issuedBy: { name: entity.name, lines: entity.address },
      details: [
        { k: t('doc_as_at'), v: asAtText },
        { k: t('doc_currency'), v: 'IDR' },
        { k: t('doc_visibility'), v: peptidePriced ? t('doc_visibility_open') : t('doc_visibility_gated') },
      ],
    },
    headings: { ix: '', item: t('doc_col_item'), qty: t('doc_col_qty'), unit: t('doc_col_unit'), amount: t('doc_col_amount') },
    lines,
    totals: [],
    grand: null,
    payment: null,
    notes: { label: t('doc_notes'), text: `${t('model_body')}\n${tc('pen_included')}` },
    delivery: null,
    ruo: anyPeptide ? pick(locale, settings.ruo_notice.en, settings.ruo_notice.id) : null,
    footer: { brand: 'AXIOM', line: t('doc_footer') },
    lang: locale,
  };
}

/** The filename a clinic files it under. Derived, never typed. */
export const priceListFilename = (asAt: Date | null) =>
  `axiom-price-list${asAt ? `-${asAt.toISOString().slice(0, 10)}` : ''}.pdf`;
