import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { getSettings } from '@/lib/settings';
import { consolePipeline } from '@/lib/queries/pipeline';
import { OrdersList } from '@/components/console/orders/list';

export const dynamic = 'force-dynamic';

/**
 * Master-detail. The one list lives in the layout, so opening a quote or an order docks a panel
 * beside a list that keeps its scroll, keeps its filter and marks the row being worked on.
 */
export default async function OrdersLayout({ children }: { children: React.ReactNode }) {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('commerce.orders');
  const settings = await getSettings();
  const data = await consolePipeline(session.uid, {
    cutoff: settings.cutoff,
    quoteDays: settings.quote_valid_days,
  });
  return (
    <>
      <PageTitle title={t('title')} />
      <Suspense><OrdersList data={data} cutoff={settings.cutoff} /></Suspense>
      {children}
    </>
  );
}
