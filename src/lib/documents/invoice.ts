import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { DocLine, DocumentData } from '@/components/document/document';
import { callerSettings } from '@/lib/queries/settings';
import { fmtLong } from '@/lib/domain/dates';
import { idr } from '@/lib/money';
import { invoiceByNumber, invoiceDetail } from '@/lib/queries/invoices';

/**
 * The invoice, as data for the one document template. The preview on the builder and the PDF the
 * client receives are this same object rendered by the same component, so they cannot drift.
 *
 * The margin block is never here: it is shown beside the preview, for the owner, and is not part of
 * the printed document. The Research Use Only notice is here whenever a line is peptide-adjacent,
 * verbatim, and absent when none is.
 */
const pick = (locale: string, en: string, id: string) => (locale === 'en' ? en : id);

export async function invoiceDocument(locale: string, uid: string, number: string): Promise<DocumentData | null> {
  const invoice = await invoiceByNumber(uid, number);
  if (!invoice) return null;
  const [{ full, items, destinations }, settings] = await Promise.all([
    invoiceDetail(uid, invoice.id, invoice.order_id),
    callerSettings(uid),
  ]);
  const t = await getTranslations({ locale, namespace: 'commerce.document' });

  const credit = invoice.kind === 'credit_note';
  const anyPeptide = items.some(i => i.is_peptide);
  const entity = settings.entity ?? { name: 'AXIOM', address: '', npwp: '', pkp: false };
  const bank = full.bank_details ?? settings.bank ?? {};

  const lines: DocLine[] = items.map((i, n) => ({
    ix: String(n + 1).padStart(2, '0'),
    title: i.description,
    sub: i.spec ?? undefined,
    qty: i.qty,
    unit: BigInt(i.unit_price_idr),
    total: BigInt(i.line_total_idr),
    is_peptide: i.is_peptide,
  }));

  // Every row whose value is zero is left off, and a split order names its destinations beside the
  // delivery charge rather than in a notes paragraph that would cost a whole A4 page.
  const totals = [{ k: t('subtotal'), v: idr(full.subtotal_idr) }];
  if (BigInt(full.delivery_idr) !== 0n) {
    totals.push({
      k: destinations.length > 1
        ? t('delivery_to', { sites: destinations.map(d => d.site_name).join(', ') })
        : t('delivery'),
      v: idr(full.delivery_idr),
    });
  }
  if (Number(full.ppn_rate) > 0) totals.push({ k: t('ppn', { rate: Number(full.ppn_rate) }), v: idr(full.ppn_idr) });

  const details = [
    { k: t('order'), v: invoice.order_number },
    { k: t('terms'), v: full.terms_days > 0 ? t('net', { days: full.terms_days }) : t('on_receipt') },
    { k: t('currency'), v: 'IDR' },
    { k: t('handling'), v: anyPeptide ? t('cold_chain') : t('insured') },
  ];
  if (credit && invoice.parent_number) details.unshift({ k: t('invoice_no'), v: invoice.parent_number });
  if (entity.npwp) details.push({ k: t('npwp'), v: entity.npwp });

  const notes = full.notes?.trim()
    || t('default_notes', { token: invoice.number, days: full.terms_days });

  return {
    kind: credit ? 'credit_note' : 'invoice',
    title: t(credit ? 'credit_note' : 'invoice'),
    number: invoice.number,
    meta: [
      { k: t('issued'), v: fmtLong(invoice.issued_at, locale) },
      ...(credit ? [] : [{ k: t('due'), v: fmtLong(invoice.due_at, locale) }]),
    ],
    amountDue: { label: t(credit ? 'amount_credited' : 'amount_due'), value: idr(invoice.total_idr) },
    columns: { a: t('billed_to'), b: t('issued_by'), c: t('details'), sub: '' },
    parties: {
      billedTo: {
        name: full.billed_name,
        lines: [full.billed_address, full.billed_email, full.billed_whatsapp].filter(Boolean).join('\n'),
      },
      issuedBy: { name: entity.name, lines: entity.address },
      details,
    },
    headings: { ix: t('h_ix'), item: t('h_item'), qty: t('h_qty'), unit: t('h_unit'), amount: t('h_amount') },
    lines,
    totals,
    grand: { k: t(credit ? 'amount_credited' : 'total_due'), v: idr(invoice.total_idr) },
    payment: credit ? null : {
      label: t('payment'),
      lines: [
        `${t('bank')}: ${bank.bank ?? ''}`,
        `${t('account_name')}: ${bank.account_name ?? ''}`,
        `${t('account_no')}: ${bank.account_no ?? ''}`,
        `${t('transfer_ref')}: ${invoice.number}`,
      ],
    },
    notes: { label: t('notes'), text: notes },
    delivery: null,
    ruo: anyPeptide ? pick(locale, settings.ruo_notice.en, settings.ruo_notice.id) : null,
    footer: { brand: t('brand'), line: t('line') },
    lang: locale,
  };
}

export const invoiceFilename = (number: string) => `${number}.pdf`;
