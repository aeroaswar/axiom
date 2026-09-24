'use client';
import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { addToBasketAction, type BasketResult } from '@/app/[locale]/(public)/actions';
import { ADDED_EVENT, BASKET_EVENT } from './basket-badge';

function Submit({ label, busy, done, solid }: { label: string; busy: string; done: string; solid?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`btn btn-sm${solid ? ' btn-solid' : ''}`} disabled={pending} data-added={done ? '1' : undefined}>
      {pending ? busy : done ? done : label}
    </button>
  );
}

/** A real form posting to a server action: keyboard-operable, and it works with JavaScript off. */
export function AddToBasket({ sku, label, busy, done, solid }: { sku: string; label: string; busy: string; done: string; solid?: boolean }) {
  const [state, action] = useActionState<BasketResult | null, FormData>(addToBasketAction, null);
  useEffect(() => {
    if (state?.ok) { window.dispatchEvent(new Event(BASKET_EVENT)); window.dispatchEvent(new CustomEvent(ADDED_EVENT, { detail: { sku, plan: null } })); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.at, state?.ok]);
  return (
    <form action={action}>
      <input type="hidden" name="sku" value={sku} />
      <input type="hidden" name="delta" value="1" />
      <Submit label={label} busy={busy} done={state?.ok ? done : ''} solid={solid} />
    </form>
  );
}
