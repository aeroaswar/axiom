import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { DocLine, DocumentData } from '@/components/document/document';
import { callerSettings } from '@/lib/queries/settings';
import { fmtLong } from '@/lib/domain/dates';
import { idr } from '@/lib/money';
import { quoteBody, quoteByNumber } from '@/lib/queries/quotes';
import { quoteExpires } from '@/lib/domain/next-action';

/**
 * The quotation on letterhead. A procurement office cannot put a WhatsApp message through its
 * process, so the same document template that prints the invoice prints the quote — same header,
 * same numerals, same footer, so the two are visibly one system.
 *
 * Its arithmetic is the quote's own: goods, then one delivery charge per destination. PPN is applied
 * when the quote is accepted and the invoice is issued, and the notes say so rather than leaving the
 * total on this page disagreeing with the message the same quote was sent in.
 */
const pick = (locale: string, en: string, id: string) => (locale === 'en' ? en : id);

export async function quoteDocument(locale: string, uid: string, number: string): Promise<DocumentData | null> {
  const quote = await quoteByNumber(uid, number);
  if (!quote) return null;
  const [{ lines: rows, legs }, settings] = await Promise.all([quoteBody(uid, quote), callerSettings(uid)]);
  const t = await getTranslations({ locale, namespace: 'commerce.document' });

  const entity = settings.entity ?? { name: 'AXIOM', address: '', npwp: '', pkp: false };
  const anyPeptide = quote.has_peptide;
  const total = (BigInt(quote.subtotal_idr) + BigInt(quote.delivery_idr)).toString();
  const expires = quoteExpires({
    state: quote.state, created_at: quote.created_at, sent_at: quote.sent_at,
    quote_days: settings.quote_valid_days,
  });

  const lines: DocLine[] = rows.map((l, n) => ({
    ix: String(n + 1).padStart(2, '0'),
    title: l.name,
    sub: [l.kind === 'peptide' ? l.dose : '', l.content, l.site_name].filter(Boolean).join(' · '),
    qty: l.qty,
    unit: BigInt(l.unit_price_idr),
    total: BigInt(l.line_total_idr),
    is_peptide: l.kind === 'peptide',
  }));

  const totals = [{ k: t('subtotal'), v: idr(quote.subtotal_idr) }];
  if (BigInt(quote.delivery_idr) !== 0n || !quote.delivery_priced) {
    totals.push({
      k: legs.length > 1 ? t('delivery_to', { sites: legs.map(l => l.site_name).join(', ') }) : t('delivery'),
      v: quote.delivery_priced ? idr(quote.delivery_idr) : t('rate_pending'),
    });
  }

  const notes = [
    t('quote_notes'),
    Number(settings.ppn_rate) > 0 ? t('quote_ppn_note', { rate: Number(settings.ppn_rate), days: settings.payment_terms_days }) : '',
  ].filter(Boolean).join('\n\n');

  return {
    kind: 'quote',
    title: t('quote'),
    number: quote.number,
    meta: [
      { k: t('issued'), v: fmtLong(quote.sent_at ?? quote.created_at, locale) },
      ...(expires ? [{ k: t('valid_to'), v: fmtLong(expires, locale) }] : []),
    ],
    amountDue: { label: t('quote_total'), value: idr(total) },
    columns: { a: t('quoted_to'), b: t('issued_by'), c: t('details'), sub: '' },
    parties: {
      billedTo: { name: quote.account, lines: quote.account_whatsapp ?? '' },
      issuedBy: { name: entity.name, lines: entity.address },
      details: [
        { k: t('quote_no'), v: quote.number },
        { k: t('terms'), v: t('net', { days: settings.payment_terms_days }) },
        { k: t('currency'), v: 'IDR' },
        { k: t('handling'), v: anyPeptide ? t('cold_chain') : t('insured') },
        ...(entity.npwp ? [{ k: t('npwp'), v: entity.npwp }] : []),
      ],
    },
    headings: { ix: t('h_ix'), item: t('h_item'), qty: t('h_qty'), unit: t('h_unit'), amount: t('h_amount') },
    lines,
    totals,
    grand: { k: t('total'), v: idr(total) },
    payment: null,
    notes: { label: t('notes'), text: notes },
    delivery: null,
    ruo: anyPeptide ? pick(locale, settings.ruo_notice.en, settings.ruo_notice.id) : null,
    footer: { brand: t('brand'), line: t('line') },
    lang: locale,
  };
}

export const quoteFilename = (number: string) => `${number}.pdf`;
