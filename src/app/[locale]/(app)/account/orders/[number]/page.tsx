import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { getSettings } from '@/lib/settings';
import { accountSession, bankDetails, orderByNumber, pipeline, withReorderDue } from '@/components/account/data';
import { OrderScreen } from '@/components/account/order-screen';

export const dynamic = 'force-dynamic';

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.order');

  const [found, settings, bank] = await Promise.all([
    orderByNumber(session.uid, session.accountId, decodeURIComponent(number)),
    getSettings(),
    bankDetails(session.uid),
  ]);
  if (!found) notFound();

  // Reorder due belongs to the account's latest order; the same rule the home reads.
  const { orders, cadence } = await pipeline(session.uid, session.accountId);
  const withDue = withReorderDue(orders, cadence).find(o => o.id === found.order.id) ?? found.order;

  return (
    <section className="screen on account">
      <PageTitle title={t('title', { number: found.order.number })} />
      <OrderScreen order={withDue} lines={found.lines} legs={found.legs} events={found.events}
        cutoff={settings.cutoff} bank={bank} whatsapp={settings.whatsapp.number} />
    </section>
  );
}
