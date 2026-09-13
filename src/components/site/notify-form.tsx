'use client';
import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { Icon } from '@/components/shell/sprite';
import { stockNoticeAction, type NoticeResult } from '@/app/[locale]/(public)/actions';

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-solid btn-sm" disabled={pending}>{pending ? busy : label}</button>;
}

/**
 * "Tell me when it is back" on a sold-out lot: one field, an email address or an Indonesian mobile
 * number, one real form posting to the database through axiom.request_stock_notice. WhatsApp stays
 * beside it for the buyer who would rather ask. Not nested in the purchase form: two forms, one
 * box.
 */
export function NotifyForm({ sku, name, dose, whatsapp }: { sku: string; name: string; dose: string; whatsapp: string }) {
  const t = useTranslations('site.product');
  const locale = useLocale();
  const [state, action] = useActionState<NoticeResult | null, FormData>(stockNoticeAction, null);
  const [contact, setContact] = useState('');
  useEffect(() => { if (state?.ok) setContact(''); }, [state?.at, state?.ok]);
  const id = `nb-${sku}`;
  return (
    <div className="notify" data-notify>
      <span className="lab">{t('notice_title')}</span>
      {state?.ok ? (
        <p className="ok-line"><Icon name="check" /> {t('notice_done', { name, dose })}</p>
      ) : (
        <>
          <p className="note">{t('notice_lead')}</p>
          <form action={action} noValidate>
            <input type="hidden" name="sku" value={sku} />
            <input type="hidden" name="locale" value={locale} />
            <div className="field">
              <label htmlFor={id}>{t('notice_label')}</label>
              <input id={id} name="contact" value={contact} onChange={e => setContact(e.target.value)} placeholder={t('notice_placeholder')} autoComplete="email" inputMode="email" aria-invalid={state?.error ? true : undefined} aria-describedby={`${id}-err`} />
              {state?.error ? <span className="err" id={`${id}-err`}>{state.error === 'contact' ? t('notice_err_contact') : t('notice_err_server')}</span> : null}
            </div>
            <div className="acts">
              <Submit label={t('notice_send')} busy={t('notice_sending')} />
              <a className="tlink" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(t('notify_wa', { name, dose }))}`}>{t('notice_wa')} <Icon name="arrow" className="ar" /></a>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
