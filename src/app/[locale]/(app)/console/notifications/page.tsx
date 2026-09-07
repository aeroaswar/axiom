import '@/styles/console.css';
import { getTranslations } from 'next-intl/server';
import { Sheet } from '@/components/shell/sheet';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { EventFeed, events } from '@/components/console/notifications/feed';

export const dynamic = 'force-dynamic';

/**
 * The bell. Every row is derived from orders, invoices, stock and accounts as they stand and clears
 * itself when the work is done — which is also why the badge behind it is a count, never a flag.
 */
export default async function NotificationsPage() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.notifications');
  const tc = await getTranslations('console.common');
  const rows = await events(session.uid);

  return (
    <>
      <PageTitle title={t('title')} />
      <section className="screen on">
        <p className="eyebrow" style={{ marginBottom: 14 }}>{t('kicker')}</p>
        <p className="note" style={{ maxWidth: '62ch' }}>{t('note')}</p>
      </section>
      <Sheet backHref="/console" closeLabel={tc('close')} kicker={t('open', { count: rows.length })} title={t('title')}>
        {rows.length ? <EventFeed rows={rows} /> : <p className="empty">{t('empty')}</p>}
        <p className="note" style={{ marginTop: 14 }}>{t('note')}</p>
      </Sheet>
    </>
  );
}
