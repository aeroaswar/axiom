'use client';
import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/shell/sprite';
import { updateBasketLineAction, type BasketResult } from '@/app/[locale]/(public)/actions';
import { BASKET_EVENT } from './basket-badge';

function useBasketAction() {
  const [state, action] = useActionState<BasketResult | null, FormData>(updateBasketLineAction, null);
  useEffect(() => { if (state?.ok) window.dispatchEvent(new Event(BASKET_EVENT)); }, [state?.at, state?.ok]);
  return action;
}

/** Quantity: two buttons in one form, each carrying the quantity it would set. Works without JS. */
export function QtyControl({ sku, qty, siteId }: { sku: string; qty: number; siteId: string | null }) {
  const action = useBasketAction();
  const t = useTranslations('site.request');
  return (
    <span className="qty">
      <form action={action}>
        <input type="hidden" name="sku" value={sku} />
        <input type="hidden" name="site_id" value={siteId ?? ''} />
        <button type="submit" name="qty" value={Math.max(qty - 1, 0)} aria-label={t('decrease')}><Icon name="minus" /></button>
      </form>
      <span className="tnum" aria-label={t('qty')}>{qty}</span>
      <form action={action}>
        <input type="hidden" name="sku" value={sku} />
        <input type="hidden" name="site_id" value={siteId ?? ''} />
        <button type="submit" name="qty" value={qty + 1} aria-label={t('increase')}><Icon name="plus" /></button>
      </form>
    </span>
  );
}

export function RemoveLine({ sku, siteId }: { sku: string; siteId: string | null }) {
  const action = useBasketAction();
  const t = useTranslations('site.request');
  return (
    <form action={action}>
      <input type="hidden" name="sku" value={sku} />
      <input type="hidden" name="site_id" value={siteId ?? ''} />
      <input type="hidden" name="qty" value="0" />
      <button type="submit" className="link-x">{t('remove')}</button>
    </form>
  );
}

/** Destination per line. The select submits on change; the button keeps it usable without JS. */
export function DestinationSelect({ sku, qty, siteId, sites }: { sku: string; qty: number; siteId: string | null; sites: { id: string; name: string }[] }) {
  const action = useBasketAction();
  const t = useTranslations('site.request');
  const id = `dest-${sku}`;
  return (
    <form action={action} className="field" style={{ marginTop: 12, maxWidth: 260 }}>
      <input type="hidden" name="sku" value={sku} />
      <input type="hidden" name="qty" value={qty} />
      <label htmlFor={id}>{t('col_destination')}</label>
      <select
        id={id}
        name="site_id"
        defaultValue={siteId ?? ''}
        onChange={e => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">{t('destination_default')}</option>
        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button type="submit" className="btn btn-sm sr-only sr-only-focusable">{t('col_destination')}</button>
    </form>
  );
}
