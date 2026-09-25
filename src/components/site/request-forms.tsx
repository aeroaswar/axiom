'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { submitPublicLead, submitSignedInRequest, type RequestState } from '@/app/[locale]/(public)/request/actions';

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-solid" disabled={pending}>{pending ? busy : label}</button>;
}

/** Signed in: the basket becomes a request against the account, and that is the whole form. */
export function AccountRequestForm({ account }: { account: string }) {
  const t = useTranslations('site.request');
  const locale = useLocale();
  const [state, action] = useActionState<RequestState | null, FormData>(submitSignedInRequest, null);
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <p className="note" style={{ marginBottom: 20 }}>{t('signed_as', { account })}</p>
      {state?.error ? <p className="field"><span className="err">{t('error')}</span></p> : null}
      <Submit label={t('submit')} busy={t('submitting')} />
    </form>
  );
}

/** Signed out: the same request, plus who is asking. Nothing peptide-priced is shown until the
 *  acknowledgement is recorded — this form is what starts that. */
export function LeadRequestForm() {
  const t = useTranslations('site.request');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [state, action] = useActionState<RequestState | null, FormData>(submitPublicLead, null);
  return (
    <form action={action}>
      <input type="hidden" name="locale" value={locale} />
      <span className="kicker">{t('who')}</span>
      <p className="note" style={{ margin: '14px 0 26px' }}>{t('who_lead')}</p>
      <div className="f2">
        <div className="field">
          <label htmlFor="rq-name">{t('name')} <span className="req">*</span></label>
          <input id="rq-name" name="name" required autoComplete="name" />
          {state?.error === 'name' ? <span className="err">{t('name')}</span> : null}
        </div>
        <div className="field">
          <label htmlFor="rq-clinic">{t('clinic')}</label>
          <input id="rq-clinic" name="clinic" autoComplete="organization" />
        </div>
        <div className="field">
          <label htmlFor="rq-role">{t('role')}</label>
          <input id="rq-role" name="role" autoComplete="organization-title" />
        </div>
        <div className="field">
          <label htmlFor="rq-email">{t('email')}</label>
          <input id="rq-email" name="email" type="email" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="rq-wa">{t('whatsapp')}</label>
          <input id="rq-wa" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" />
        </div>
      </div>
      <p className="note" style={{ marginTop: 18 }}>{t('contact_hint')}</p>
      {state?.error && state.error !== 'name' ? <p className="field" style={{ marginTop: 12 }}><span className="err">{t('error')}</span></p> : null}
      <div className="acts" style={{ marginTop: 30 }}>
        <Submit label={t('send')} busy={t('submitting')} />
        <Link href={{ pathname: '/sign-in', query: { next: '/request' } }} className="tlink">{t('have_account')} {tc('sign_in')}</Link>
      </div>
      <p className="note" style={{ marginTop: 22 }}>{t('privacy_note')}</p>
    </form>
  );
}
