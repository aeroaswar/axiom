import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Sheet } from '@/components/shell/sheet';
import { staffSession } from '@/components/console/shared/act';
import { ActionForm } from '@/components/console/shared/action-form';
import { newQuote } from '@/components/console/orders/actions';
import { accountOptions, variantOptions } from '@/lib/queries/quotes';
import { getSettings } from '@/lib/settings';
import { idr } from '@/lib/money';

export const dynamic = 'force-dynamic';

/**
 * A new quote is an account and, if it is already known, its first line. Everything after that is
 * the same builder every other draft opens in, so there is one place a quote is priced and one
 * place Send is gated.
 */
export default async function NewQuotePage() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('commerce.builder');
  const tq = await getTranslations('commerce.quote');
  const ts = await getTranslations('states.ack');
  const tc = await getTranslations('console.common');
  const tcl = await getTranslations('console.clients');

  const [accounts, settings] = await Promise.all([accountOptions(session.uid), getSettings()]);

  // A database with no clients in it is a first day, not a fault: say what the first step is
  // rather than offering a form whose only field cannot be filled.
  if (!accounts.length) {
    return (
      <Sheet backHref="/console/orders" closeLabel={tc('close')} kicker={t('kicker')} title={t('title')}>
        <p className="note">{t('no_accounts')}</p>
        <Link className="btn accent" href="/console/clients/new">{tcl('new')}</Link>
      </Sheet>
    );
  }

  const options = await variantOptions(session.uid, accounts[0].id);

  return (
    <Sheet backHref="/console/orders" closeLabel={tc('close')} kicker={t('kicker')} title={t('title')}>
      <ActionForm action={newQuote} submit={t('start')} tone="accent">
        <div className="field">
          <label htmlFor="account_id">{t('account')}</label>
          <select id="account_id" name="account_id" required defaultValue="">
            <option value="" disabled>{t('pick')}</option>
            {accounts.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}{a.ack === 'current' ? '' : ` · ${ts(a.ack as 'none' | 'expiring' | 'lapsed')}`}
              </option>
            ))}
          </select>
        </div>
        <div className="fgrid">
          <div className="field wide">
            <label htmlFor="variant_id">{t('first_line')}</label>
            <select id="variant_id" name="variant_id" defaultValue="">
              <option value="">{tq('add_placeholder')}</option>
              {options.map(o => (
                <option key={o.variant_id} value={o.variant_id} disabled={o.available <= 0}>
                  {o.label} · {idr(o.price_idr)}{o.available <= 0 ? ` · ${tq('out')}` : o.available <= 3 ? ` · ${tq('left', { n: o.available })}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="qty">{t('qty')}</label>
            <input id="qty" name="qty" type="number" min="1" step="1" defaultValue="1" inputMode="numeric" />
          </div>
        </div>
      </ActionForm>
      <p className="note" style={{ marginTop: 14 }}>{t('note', { days: settings.quote_valid_days })}</p>
    </Sheet>
  );
}
