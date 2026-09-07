import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { Sheet } from '@/components/shell/sheet';
import { staffSession } from '@/components/console/shared/act';
import { getSettings } from '@/lib/settings';
import { orderBody, orderByNumber, orderMargin } from '@/lib/queries/orders';
import { OrderSheetBody, OrderSheetFooter } from '@/components/console/orders/order-sheet';

export const dynamic = 'force-dynamic';

/**
 * One order. A quote number reaching this route (the notifications feed links every subject by its
 * reference) is sent on to the quote sheet rather than shown a not-found page.
 */
export default async function OrderSheet({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const session = await staffSession();
  if (!session) return null;

  const order = await orderByNumber(session.uid, number);
  if (!order) {
    const locale = await getLocale();
    if (/-Q-/.test(number)) redirect({ href: `/console/orders/quotes/${number}`, locale });
    notFound();
  }

  const [{ lines, legs, events }, margin, settings] = await Promise.all([
    orderBody(session.uid, order),
    orderMargin(session.uid, order.id),
    getSettings(),
  ]);
  const locale = await getLocale();
  const t = await getTranslations('commerce.order');
  const tc = await getTranslations('console.common');
  const ruo = locale === 'en' ? settings.ruo_notice.en : settings.ruo_notice.id;

  return (
    <Sheet backHref="/console/orders" closeLabel={tc('close')}
      kicker={`${t('kicker')} · ${order.account}`} title={order.number}
      footer={<OrderSheetFooter order={order} ruo={ruo} />}>
      <OrderSheetBody order={order} lines={lines} legs={legs} events={events} margin={margin}
        owner={session.role === 'owner'} cutoff={settings.cutoff} ruo={ruo} floor={settings.gm_floor_pct} />
    </Sheet>
  );
}
