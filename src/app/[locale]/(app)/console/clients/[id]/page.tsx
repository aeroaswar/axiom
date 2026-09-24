import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Sheet } from '@/components/shell/sheet';
import { Icon } from '@/components/shell/sprite';
import { Link } from '@/i18n/navigation';
import { getSettings } from '@/lib/settings';
import { staffSession } from '@/components/console/shared/act';
import { clientById, clientDetail, deliveryZones, reorderDue } from '@/components/console/clients/data';
import { ClientSheetBody } from '@/components/console/clients/sheet-body';

export const dynamic = 'force-dynamic';

export default async function ClientSheet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await staffSession();
  if (!session) return null;
  const c = await clientById(session.uid, id);
  if (!c) notFound();
  const [d, zones, settings] = await Promise.all([
    clientDetail(session.uid, c.id),
    deliveryZones(session.uid),
    getSettings(),
  ]);
  const t = await getTranslations('console.clients');
  const tc = await getTranslations('console.common');

  // Pre-filled, never sent from here: the message opens in WhatsApp, which is where this market closes.
  const number = (c.whatsapp || settings.whatsapp?.number || '').replace(/[^\d]/g, '');
  const wa = (text: string) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  const rd = reorderDue(c);
  const expiry = c.ack_expires ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(c.ack_expires)) : '';
  const renewal = wa(t('wa.renewal', {
    name: c.name,
    state: c.ack === 'lapsed' ? t('wa.state_lapsed', { date: expiry })
      : c.ack === 'expiring' ? t('wa.state_expiring', { date: expiry })
        : t('wa.state_none'),
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/account/profile`,
  }));

  const footer = (
    <>
      <a className="btn btn-sm" href={wa(t('wa.hello', { name: c.name }))} target="_blank" rel="noopener noreferrer">
        <Icon name="wa" />{t('sheet.message')}
      </a>
      {rd?.overdue && c.ack === 'current' ? (
        <a className="btn btn-sm" href={wa(t('wa.nudge', { name: c.name, days: -rd.days }))} target="_blank" rel="noopener noreferrer">
          <Icon name="reorder" />{t('sheet.nudge')}
        </a>
      ) : null}
      {c.ack === 'current' ? (
        <Link className="btn btn-sm btn-accent" href={`/console/orders/new?account=${c.id}`}>
          <Icon name="plus" />{t('sheet.new_quote')}
        </Link>
      ) : (
        <a className="btn btn-sm btn-accent" href={renewal} target="_blank" rel="noopener noreferrer">
          {c.ack === 'none' ? t('sheet.request_ack') : t('sheet.request_renewal')}
        </a>
      )}
    </>
  );

  return (
    <Sheet backHref="/console/clients" closeLabel={tc('close')} footer={footer}
      kicker={`${t(`types.${c.type}`)}${c.manager ? ` · ${c.manager}` : ''}`} title={c.name}>
      <ClientSheetBody c={c} d={d} zones={zones} />
    </Sheet>
  );
}
