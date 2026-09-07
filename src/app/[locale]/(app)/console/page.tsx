import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { getSettings } from '@/lib/settings';
import { consolePipeline } from '@/lib/queries/pipeline';
import { dashboardFigures, deliveredMargin } from '@/lib/queries/dashboard';
import { invoiceRows, receivables } from '@/lib/queries/invoices';
import { events } from '@/components/console/notifications/feed';
import { Dashboard } from '@/components/console/dashboard/screen';

export const dynamic = 'force-dynamic';

/**
 * The dashboard is last because every figure on it is derived from the modules above: the pipeline
 * strip is the Orders list grouped by stage, Today is the one `axiom.events()` feed the bell and the
 * badge also read, and the receivables line under Invoices is the invoices table summed.
 */
export default async function ConsoleHome() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('commerce.dashboard');
  const settings = await getSettings();

  const [figures, gm, pipeline, feed, invoices] = await Promise.all([
    dashboardFigures(session.uid),
    deliveredMargin(session.uid),
    consolePipeline(session.uid, { cutoff: settings.cutoff, quoteDays: settings.quote_valid_days }),
    events(session.uid),
    invoiceRows(session.uid),
  ]);
  const r = receivables(invoices);

  return (
    <>
      <PageTitle title={t('title')} />
      <Dashboard figures={figures} gm={gm} pipeline={pipeline} events={feed}
        receivable={{ open: r.open, overN: r.overN }}
        owner={session.role === 'owner'} cutoff={settings.cutoff} />
    </>
  );
}
