import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { allSubscriptions, renewalsDue } from '@/lib/queries/subscriptions';
import { SubscriptionsList } from '@/components/console/subscriptions/list';

export const dynamic = 'force-dynamic';

export default async function SubscriptionsPage() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.subscriptions');
  const [rows, due] = await Promise.all([allSubscriptions(session.uid), renewalsDue(session.uid)]);
  return (
    <>
      <PageTitle title={t('title')} />
      <SubscriptionsList rows={rows} due={due} />
    </>
  );
}
