import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { getSettings } from '@/lib/settings';
import { invoiceRows } from '@/lib/queries/invoices';
import { InvoicesList } from '@/components/console/invoices/list';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('commerce.invoices');
  const [rows, settings] = await Promise.all([invoiceRows(session.uid), getSettings()]);
  return (
    <>
      <PageTitle title={t('title')} />
      <InvoicesList rows={rows} payDays={settings.payment_terms_days} />
    </>
  );
}
