import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Sheet } from '@/components/shell/sheet';
import { PageTitle } from '@/components/shell/shell-client';
import { Icon } from '@/components/shell/sprite';
import { getSettings } from '@/lib/settings';
import { getBasket } from '@/lib/basket';
import { idr } from '@/lib/money';
import { fmtShort } from '@/lib/domain/dates';
import { accountSession, pipeline } from '@/components/account/data';
import { AccountHome } from '@/components/account/home';
import { ReorderButton } from '@/components/account/client-forms';
import { RuoNote } from '@/components/account/ui';

export const dynamic = 'force-dynamic';

/**
 * The centre tab. It opens a sheet over what the account was reading rather than navigating away,
 * because a reorder is one tap on a past order: the same lots to the same destinations, priced at
 * today's list. It is a quote request, never an order.
 */
export default async function ReorderPage() {
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.reorder');
  const th = await getTranslations('account.home');
  const tc = await getTranslations('common');
  const locale = await getLocale();

  const [{ orders }, settings, basket] = await Promise.all([
    pipeline(session.uid, session.accountId), getSettings(), getBasket(),
  ]);
  const past = orders.filter(o => o.state === 'delivered');

  return (
    <>
      <PageTitle title={th('title')} />
      <section className="screen on account">
        <AccountHome uid={session.uid} accountId={session.accountId} cutoff={settings.cutoff} basketCount={basket.items.length} />
      </section>

      <Sheet backHref="/account" closeLabel={tc('close')} kicker={t('kicker')} title={t('title')}>
        {past.length ? (
          <div className="rows">
            {past.map(o => (
              <div className="row rowa" key={o.id}>
                <span className="ic"><Icon name="reorder" /></span>
                <span className="bd">
                  <Link className="t1 lk" href={`/account/orders/${o.number}`}>{o.number}</Link>
                  <span className="t2">{t('lines', { count: o.line_count, date: fmtShort(o.placed_at, locale) })}</span>
                </span>
                <span className="rt"><span className="amt">{idr(o.total_idr)}</span></span>
                <span className="act"><ReorderButton number={o.number} label={t('one_tap')} /></span>
              </div>
            ))}
          </div>
        ) : <p className="empty">{t('empty')}</p>}

        <p className="note" style={{ marginTop: 16 }}>{t('note')}</p>
        <p style={{ marginTop: 14 }}>
          <Link className="tlink" href="/account/basket">{t('from_basket')} <Icon name="arrow" /></Link>
        </p>
        <p style={{ marginTop: 10 }}>
          <Link className="tlink" href="/account/subscriptions">{t('plans_link')} <Icon name="arrow" /></Link>
        </p>
        <RuoNote />
      </Sheet>
    </>
  );
}
