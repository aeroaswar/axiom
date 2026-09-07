'use client';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import type { ActionState } from '@/components/console/shared/action-form';
import {
  acceptQuoteAction, acknowledgeAction, addToBasketAction, cancelOrderAction, moveBasketLineAction,
  removeSiteAction, reorderAction, reportTransferAction, requestQuoteAction, saveMeAction,
  requoteAction, saveSiteAction, setBasketLineAction, toggleSavedAction, type BasketResult,
} from './actions';

/**
 * Every control here is a real form posting to a server action: it is reachable by keyboard, it
 * states its own result where it happened, and it works with JavaScript off. Nothing on this
 * surface decides anything — the database does, and its refusal is rendered verbatim.
 */

function Submit({ label, busy, tone, wide, icon }: { label: string; busy?: string; tone?: 'accent'; wide?: boolean; icon?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`btn btn-sm${tone === 'accent' ? ' btn-primary' : ''}${wide ? ' btn-wide' : ''}`}>
      {icon && !pending ? <Icon name={icon} /> : null}
      {pending && busy ? busy : label}
    </button>
  );
}

function Message({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error) return <span className="msg err" role="status">{state.error}</span>;
  if (state.ok) return <span className="msg ok" role="status">{state.ok}</span>;
  return null;
}

// ------------------------------------------------------------------ the spine

export function AcceptQuote({ number, label }: { number: string; label: string }) {
  const [state, action] = useActionState<ActionState, FormData>(acceptQuoteAction, null);
  const t = useTranslations('account.action');
  return (
    <form action={action} className="actform">
      <input type="hidden" name="number" value={number} />
      <Submit label={label} busy={t('working')} tone="accent" icon="check" />
      <Message state={state} />
    </form>
  );
}

export function ReorderButton({ number, label, solid }: { number: string; label: string; solid?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(reorderAction, null);
  const t = useTranslations('account.action');
  return (
    <form action={action} className="actform">
      <input type="hidden" name="number" value={number} />
      <Submit label={label} busy={t('working')} tone={solid ? 'accent' : undefined} icon="reorder" />
      <Message state={state} />
    </form>
  );
}

export function RequoteButton({ number, label, solid }: { number: string; label: string; solid?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(requoteAction, null);
  const t = useTranslations('account.action');
  return (
    <form action={action} className="actform">
      <input type="hidden" name="number" value={number} />
      <Submit label={label} busy={t('working')} tone={solid ? 'accent' : undefined} icon="send" />
      <Message state={state} />
    </form>
  );
}

export function TransferForm({ number }: { number: string }) {
  const [state, action] = useActionState<ActionState, FormData>(reportTransferAction, null);
  const t = useTranslations('account');
  const ta = useTranslations('account.action');
  return (
    <form action={action} className="tf">
      <input type="hidden" name="number" value={number} />
      <div className="field">
        <label htmlFor="ref">{t('order.transferred_ref')}</label>
        <input id="ref" name="ref" type="text" autoComplete="off" inputMode="text" />
      </div>
      <p className="note">{t('order.transferred_note')}</p>
      <div className="formfoot">
        <Submit label={t('order.transferred')} busy={ta('working')} tone="accent" icon="check" />
        <Message state={state} />
      </div>
    </form>
  );
}

export function CancelForm({ number }: { number: string }) {
  const [state, action] = useActionState<ActionState, FormData>(cancelOrderAction, null);
  const [open, setOpen] = useState(false);
  const t = useTranslations('account');
  const ta = useTranslations('account.action');
  if (!open) {
    return (
      <p style={{ marginTop: 18 }}>
        <button type="button" className="tlink danger" onClick={() => setOpen(true)}>{t('order.cancel')}</button>
      </p>
    );
  }
  return (
    <form action={action} className="tf" style={{ marginTop: 18 }}>
      <input type="hidden" name="number" value={number} />
      <div className="field">
        <label htmlFor="reason">{t('order.cancel_reason')}</label>
        <input id="reason" name="reason" type="text" autoComplete="off" />
      </div>
      <p className="note">{t('order.cancel_note')}</p>
      <div className="formfoot">
        <Submit label={t('order.cancel')} busy={ta('working')} />
        <button type="button" className="tlink" onClick={() => setOpen(false)}>{ta('keep')}</button>
        <Message state={state} />
      </div>
    </form>
  );
}

export function RequestQuoteForm({ disabled }: { disabled?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(requestQuoteAction, null);
  const t = useTranslations('account.basket');
  const ta = useTranslations('account.action');
  return (
    <form action={action} className="tf">
      <div className="field">
        <label htmlFor="note">{t('note_label')}</label>
        <textarea id="note" name="note" rows={2} />
      </div>
      <div className="formfoot">
        {disabled ? <button type="submit" className="btn btn-sm btn-primary" disabled>{t('request')}</button>
          : <Submit label={t('request')} busy={ta('working')} tone="accent" icon="send" />}
        <Message state={state} />
      </div>
      <p className="note" style={{ marginTop: 12 }}>{t('request_note')}</p>
    </form>
  );
}

// ------------------------------------------------------------------ the basket

export function AddToBasket({ sku, qty = 1, label, done, solid, bare }: {
  sku: string; qty?: number; label: string; done: string; solid?: boolean;
  /** On a catalogue card there is room for a word, not for a word and an icon. */
  bare?: boolean;
}) {
  const [state, action] = useActionState<BasketResult | null, FormData>(addToBasketAction, null);
  const t = useTranslations('account.action');
  return (
    <form action={action} className="actform">
      <input type="hidden" name="sku" value={sku} />
      <input type="hidden" name="qty" value={qty} />
      <Submit label={state?.ok ? done : label} busy={t('working')} tone={solid ? 'accent' : undefined}
        icon={bare ? undefined : state?.ok ? 'check' : 'basket'} />
    </form>
  );
}

export function QtyControl({ sku, qty, siteId }: { sku: string; qty: number; siteId: string | null }) {
  const [, action] = useActionState<BasketResult | null, FormData>(setBasketLineAction, null);
  const t = useTranslations('account.basket');
  return (
    <span className="qty">
      <form action={action}>
        <input type="hidden" name="sku" value={sku} />
        <input type="hidden" name="site_id" value={siteId ?? ''} />
        <button type="submit" name="qty" value={Math.max(qty - 1, 0)} aria-label={t('less')}><Icon name="minus" /></button>
      </form>
      <span className="tnum" aria-label={t('qty')}>{qty}</span>
      <form action={action}>
        <input type="hidden" name="sku" value={sku} />
        <input type="hidden" name="site_id" value={siteId ?? ''} />
        <button type="submit" name="qty" value={qty + 1} aria-label={t('more')}><Icon name="plus" /></button>
      </form>
    </span>
  );
}

export function RemoveLine({ sku, siteId }: { sku: string; siteId: string | null }) {
  const [, action] = useActionState<BasketResult | null, FormData>(setBasketLineAction, null);
  const t = useTranslations('account.basket');
  return (
    <form action={action}>
      <input type="hidden" name="sku" value={sku} />
      <input type="hidden" name="site_id" value={siteId ?? ''} />
      <input type="hidden" name="qty" value="0" />
      <button type="submit" className="tlink danger">{t('remove')}</button>
    </form>
  );
}

/** The destination is chosen here, where its cost is on screen — not discovered on the invoice. */
export function DestinationSelect({ sku, qty, siteId, sites }: {
  sku: string; qty: number; siteId: string | null; sites: { id: string; name: string; zone: string }[];
}) {
  const [, action] = useActionState<BasketResult | null, FormData>(moveBasketLineAction, null);
  const t = useTranslations('account.basket');
  const id = `dest-${sku}-${siteId ?? 'default'}`;
  return (
    <form action={action} className="field destfield">
      <input type="hidden" name="sku" value={sku} />
      <input type="hidden" name="qty" value={qty} />
      <input type="hidden" name="from_site_id" value={siteId ?? ''} />
      <label htmlFor={id}>{t('destination')}</label>
      <select id={id} name="site_id" defaultValue={siteId ?? ''} onChange={e => e.currentTarget.form?.requestSubmit()}>
        <option value="">{t('default_site')}</option>
        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button type="submit" className="sr-only">{t('destination')}</button>
    </form>
  );
}

// ------------------------------------------------------------------ saved

export function SaveToggle({ sku, saved }: { sku: string; saved: boolean }) {
  const [state, action] = useActionState<{ saved: boolean } | null, FormData>(toggleSavedAction, null);
  const on = state ? state.saved : saved;
  const t = useTranslations('account.shop');
  return (
    <form action={action} className="actform">
      <input type="hidden" name="sku" value={sku} />
      <button type="submit" className="btn btn-sm" aria-pressed={on}>
        <Icon name={on ? 'bookmark-f' : 'bookmark'} />{on ? t('unsave') : t('save')}
      </button>
    </form>
  );
}

/** The bookmark on a card: an icon control, not a second button competing with Add. */
export function SaveMark({ sku, saved }: { sku: string; saved: boolean }) {
  const [state, action] = useActionState<{ saved: boolean } | null, FormData>(toggleSavedAction, null);
  const on = state ? state.saved : saved;
  const t = useTranslations('account.shop');
  return (
    <form action={action} className="sv">
      <input type="hidden" name="sku" value={sku} />
      <button type="submit" className={`svbtn${on ? ' on' : ''}`} aria-pressed={on} aria-label={on ? t('unsave') : t('save')}>
        <Icon name={on ? 'bookmark-f' : 'bookmark'} />
      </button>
    </form>
  );
}

// ------------------------------------------------------------------ the account

export function AckForm({ version, primary = true }: { version: string; primary?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(acknowledgeAction, null);
  const t = useTranslations('account.ack');
  const ta = useTranslations('account.action');
  return (
    <form action={action} className="tf">
      <label className="check"><input type="checkbox" name="age_18" value="1" /><span>{t('statement_age')}</span></label>
      <label className="check"><input type="checkbox" name="qualified_researcher" value="1" /><span>{t('statement_researcher')}</span></label>
      <p className="note">{t('version')} {version}</p>
      <div className="formfoot">
        <Submit label={t('submit')} busy={ta('working')} tone={primary ? 'accent' : undefined} />
        <Message state={state} />
      </div>
    </form>
  );
}

export function MeForm({ name, locale }: { name: string; locale: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveMeAction, null);
  const t = useTranslations('account.profile');
  const ta = useTranslations('account.action');
  const tc = useTranslations('common');
  return (
    <form action={action} className="tf">
      <div className="field">
        <label htmlFor="full_name">{t('full_name')}</label>
        <input id="full_name" name="full_name" defaultValue={name} required autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="locale">{t('locale')}</label>
        <select id="locale" name="locale" defaultValue={locale}>
          <option value="id">{tc('indonesian')}</option>
          <option value="en">{tc('english')}</option>
        </select>
      </div>
      <div className="formfoot">
        <Submit label={t('save')} busy={ta('working')} />
        <Message state={state} />
      </div>
    </form>
  );
}

export function SiteForm({ site, zones }: {
  site?: { id: string; name: string; address: string | null; zone: string; is_default: boolean };
  zones: { zone: string; label: string; pending: boolean }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveSiteAction, null);
  const [open, setOpen] = useState(!site);
  const t = useTranslations('account.profile');
  const ta = useTranslations('account.action');
  const key = site?.id ?? 'new';
  if (site && !open) {
    return <button type="button" className="tlink" onClick={() => setOpen(true)}>{t('edit_site')}</button>;
  }
  return (
    <form action={action} className="tf sitef">
      {site ? <input type="hidden" name="id" value={site.id} /> : null}
      <div className="fgrid">
        <div className="field">
          <label htmlFor={`name-${key}`}>{t('site_name')}</label>
          <input id={`name-${key}`} name="name" defaultValue={site?.name ?? ''} required />
        </div>
        <div className="field">
          <label htmlFor={`zone-${key}`}>{t('site_zone')}</label>
          <select id={`zone-${key}`} name="zone" defaultValue={site?.zone ?? 'jabodetabek'}>
            {zones.map(z => <option key={z.zone} value={z.zone}>{z.label}{z.pending ? ` · ${t('rate_pending')}` : ''}</option>)}
          </select>
        </div>
        <div className="field wide">
          <label htmlFor={`address-${key}`}>{t('site_address')}</label>
          <input id={`address-${key}`} name="address" defaultValue={site?.address ?? ''} />
        </div>
      </div>
      <label className="check"><input type="checkbox" name="is_default" value="1" defaultChecked={site?.is_default} /><span>{t('site_default')}</span></label>
      <div className="formfoot">
        <Submit label={t('save')} busy={ta('working')} />
        {site ? <button type="button" className="tlink" onClick={() => setOpen(false)}>{ta('keep')}</button> : null}
        {site ? <RemoveSite id={site.id} label={t('delete_site')} /> : null}
        <Message state={state} />
      </div>
    </form>
  );
}

function RemoveSite({ id, label }: { id: string; label: string }) {
  const [state, action] = useActionState<ActionState, FormData>(removeSiteAction, null);
  return (
    <span className="actform">
      <form action={action} style={{ display: 'contents' }}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="tlink danger">{label}</button>
      </form>
      <Message state={state} />
    </span>
  );
}

