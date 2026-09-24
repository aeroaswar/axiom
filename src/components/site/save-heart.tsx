'use client';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/shell/sprite';
import { toggleSavedAction } from '@/app/[locale]/(public)/actions';
import { SAVED_EVENT, useSavedList } from './saved-badge';

/** The bookmark on a card: one form, one button, its state stated by the icon. Cookie-backed, so
 *  it works signed out; the account's Saved page reads the same list. The state is learned in the
 *  browser so the page around it can stay static. */
export function SaveHeart({ sku }: { sku: string }) {
  const list = useSavedList();
  const [state, action] = useActionState<{ saved: boolean } | null, FormData>(
    async (prev, form) => { const r = await toggleSavedAction(prev, form); window.dispatchEvent(new Event(SAVED_EVENT)); return r; },
    null,
  );
  const on = state ? state.saved : !!list?.includes(sku);
  const t = useTranslations('site.shop');
  return (
    <form action={action} className="save">
      <input type="hidden" name="sku" value={sku} />
      <button type="submit" className={on ? 'on' : ''} aria-pressed={on} aria-label={on ? t('unsave') : t('save')} title={on ? t('unsave') : t('save')}>
        <Icon name={on ? 'bookmark-f' : 'bookmark'} />
      </button>
    </form>
  );
}
