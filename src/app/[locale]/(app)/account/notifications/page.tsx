import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Sheet } from '@/components/shell/sheet';
import { PageTitle } from '@/components/shell/shell-client';
import { Icon } from '@/components/shell/sprite';
import { idr } from '@/lib/money';
import { fmtShort } from '@/lib/domain/dates';
import { getSettings } from '@/lib/settings';
import { getBasket } from '@/lib/basket';
import { accountEvents, accountSession } from '@/components/account/data';
import { AccountHome } from '@/components/account/home';

export const dynamic = 'force-dynamic';

const ICONS: Record<string, string> = {
  quote_to_accept: 'send', request_being_priced: 'clock', invoice_to_pay: 'file',
  invoice_overdue: 'file', order_packing: 'box', order_dispatched: 'truck', renewal_to_accept: 'reorder',
};
const KEYS = new Set(Object.keys(ICONS));

/**
 * The bell. The same `axiom.events()` the Console reads, from this account's side, so a row
 * appears when the work appears and clears itself when the work is done. Nothing here is typed.
 */
export default async function NotificationsPage() {
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.events');
  const th = await getTranslations('account.home');
  const tc = await getTranslations('common');
  const locale = await getLocale();

  const [rows, settings, basket] = await Promise.all([accountEvents(session.uid), getSettings(), getBasket()]);
  const shown = rows.filter(r => KEYS.has(r.kind));

  return (
    <>
      <PageTitle title={t('title')} />
      <section className="screen on account">
        <AccountHome uid={session.uid} accountId={session.accountId} cutoff={settings.cutoff} basketCount={basket.items.length} />
      </section>

      <Sheet backHref="/account" closeLabel={tc('close')} kicker={th('needs_you')} title={t('title')}>
        {shown.length ? (
          <div className="rows">
            {shown.map(e => (
              <Link className="row" key={e.key} href={e.href}>
                <span className="ic"><Icon name={ICONS[e.kind] ?? 'bell'} /></span>
                <span className="bd">
                  <span className="t1">{t(e.kind as 'quote_to_accept', { ref: e.ref ?? '', date: e.due_at ? fmtShort(e.due_at, locale) : '' })}</span>
                  {e.amount_idr ? <span className={`t2${e.tone === 'err' ? ' err' : ''}`}>{idr(e.amount_idr)}</span> : null}
                </span>
                <span className="rt"><Icon name="caret" /></span>
              </Link>
            ))}
          </div>
        ) : <p className="empty">{t('empty')}</p>}
      </Sheet>
    </>
  );
}
