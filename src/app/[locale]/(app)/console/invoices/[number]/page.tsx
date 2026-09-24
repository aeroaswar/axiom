import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { invoiceByNumber, invoiceDetail, invoiceMargin } from '@/lib/queries/invoices';
import { getSettings } from '@/lib/settings';
import { invoiceDocument } from '@/lib/documents/invoice';
import { InvoiceBuilder } from '@/components/console/invoices/builder';

export const dynamic = 'force-dynamic';

/**
 * One invoice. The preview beside the form is the same `AxiomDocument` the PDF route prints, built
 * from the same `invoiceDocument` data, so the two cannot drift.
 */
export default async function InvoicePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const session = await staffSession();
  if (!session) return null;

  const invoice = await invoiceByNumber(session.uid, number);
  if (!invoice) notFound();

  const locale = await getLocale();
  const [detail, margin, doc] = await Promise.all([
    invoiceDetail(session.uid, invoice.id, invoice.order_id),
    invoiceMargin(session.uid, invoice.order_id),
    invoiceDocument(locale, session.uid, number),
  ]);
  if (!doc) notFound();
  const t = await getTranslations('commerce.invoices');
  const settings = await getSettings();
  const pdfHref = `/api/documents/invoice/${invoice.number}?locale=${locale}`;

  return (
    <>
      <PageTitle title={`${t('title')} · ${invoice.number}`} />
      <InvoiceBuilder invoice={invoice} full={detail.full} events={detail.events}
        credits={detail.credits} doc={doc} margin={margin} owner={session.role === 'owner'} floor={settings.gm_floor_pct}
        pdfHref={pdfHref} pdfUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}${pdfHref}`}
        ruo={locale === 'en' ? settings.ruo_notice.en : settings.ruo_notice.id}
        peptide={detail.items.some(i => i.is_peptide)} />
    </>
  );
}
