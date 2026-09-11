import 'server-only';
import { createElement } from 'react';
import { getTranslations } from 'next-intl/server';
import { CoaDocument, coaIssued, type CoaDocData } from '@/components/site/coa-document';
import { getCoa, pick, type Coa } from '@/lib/site/catalogue';
import { getSettings } from '@/lib/settings';
import { elementHtml, htmlPdf } from '@/lib/pdf';

/** The certificate's document data from its row, the settings and the catalogue — never typed. */
export async function coaDocument(locale: string, coa: Coa): Promise<CoaDocData> {
  const [settings, t] = await Promise.all([getSettings(), getTranslations({ locale, namespace: 'site.coas' })]);
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const entity = settings.entity && !/«/.test(settings.entity.name) ? settings.entity : { name: 'AXIOM', address: 'Jakarta' };
  return {
    title: t('doc_title'),
    specimen: coa.is_sample ? t('doc_specimen') : null,
    sampleNote: coa.is_sample ? t('doc_sample_note') : null,
    number: coa.lot_code ?? coa.id.slice(0, 8),
    lang: locale,
    compound: coa.product ?? '—',
    dose: coa.dose ?? '—',
    lotCode: coa.lot_code ?? '—',
    issued: coaIssued(coa.issued_at, locale),
    method: coa.method,
    purity: coa.purity_pct,
    threshold,
    labels: {
      compound: t('doc_compound'), lot: t('doc_lot'), dose: t('doc_dose'), issued: t('doc_issued'), method: t('doc_method'), threshold: t('doc_threshold'),
      test: t('doc_test'), result: t('doc_result'), spec: t('doc_spec'),
      identity: t('doc_identity'), identityResult: t('doc_identity_result'), identitySpec: t('doc_identity_spec'),
      purity: t('doc_purity'), puritySpec: t('doc_purity_spec', { threshold }),
      issuedBy: t('doc_supplier'), forLabel: t('doc_for'), forValue: t('doc_for_value'), details: t('doc_details'),
      footer: t('doc_footer'),
    },
    issuer: { name: entity.name, lines: entity.address },
    ruo: coa.kind === 'peptide' || coa.kind === null ? pick(locale, settings.ruo_notice.en, settings.ruo_notice.id) : null,
    brand: 'AXIOM',
  };
}

export async function coaHtml(locale: string, id: string): Promise<{ html: string; filename: string } | null> {
  const coa = await getCoa(id);
  if (!coa) return null;
  const d = await coaDocument(locale, coa);
  const html = await elementHtml(createElement(CoaDocument, { d }), d.number, locale);
  return { html, filename: coaFilename(coa) };
}

export async function coaPdf(locale: string, id: string): Promise<{ pdf: Buffer; filename: string } | null> {
  const r = await coaHtml(locale, id);
  if (!r) return null;
  return { pdf: await htmlPdf(r.html), filename: r.filename };
}

export const coaFilename = (coa: Coa) => `axiom-coa-${(coa.sku ?? 'lot')}-${(coa.lot_code ?? coa.id.slice(0, 8)).toLowerCase()}.pdf`;
