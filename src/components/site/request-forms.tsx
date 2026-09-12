'use client';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { submitPublicLead, submitSignedInRequest, type RequestState } from '@/app/[locale]/(public)/request/actions';

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-solid" disabled={pending}>{pending ? busy : <>{label} <Icon name="arrow" /></>}</button>;
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

type Field = 'name' | 'email' | 'wa' | 'ack';
type Errors = Partial<Record<Field, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WA = /^(\+?62|0)8\d{7,12}$/;

/**
 * Signed out: the same request, plus who is asking. Each field carries its own message, shown as
 * the field is left and again on submit, so a reader knows which one to fix; the server's refusal
 * (the database decides whether a declaration is due) is shown the same way. The browser's own
 * validation is off so the messages are these, in the reader's language.
 */
export function LeadRequestForm({ needsAck }: { needsAck: boolean }) {
  const t = useTranslations('site.request');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [state, action] = useActionState<RequestState | null, FormData>(submitPublicLead, null);
  const [errors, setErrors] = useState<Errors>({});

  const check = (form: HTMLFormElement, all: boolean): Errors => {
    const val = (n: string) => String((form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
    const name = val('name'), email = val('email'), wa = val('whatsapp').replace(/[\s.-]/g, '');
    const ack = (form.elements.namedItem('ack') as HTMLInputElement | null)?.checked ?? true;
    const e: Errors = {};
    if (!name) e.name = t('err_name');
    if (email && !EMAIL.test(email)) e.email = t('err_email');
    if (wa && !WA.test(wa)) e.wa = t('err_wa');
    if (!email && !wa && all) { e.email = e.email ?? t('err_contact'); e.wa = e.wa ?? t('err_contact'); }
    if (needsAck && !ack && all) e.ack = t('err_ack');
    return e;
  };
  const serverError: Errors = state?.error === 'name' ? { name: t('err_name') } : state?.error === 'contact' ? { email: t('err_contact'), wa: t('err_contact') } : {};
  const shown = { ...serverError, ...errors };
  const err = (f: Field, id: string) => shown[f] ? <span className="err" id={id}>{shown[f]}</span> : null;

  return (
    <form
      action={action} noValidate
      onBlur={e => { if ((e.target as HTMLElement).matches('input')) setErrors(check(e.currentTarget, false)); }}
      onSubmit={e => {
        const found = check(e.currentTarget, true);
        setErrors(found);
        const first = (['name', 'email', 'wa', 'ack'] as Field[]).find(f => found[f]);
        if (first) { e.preventDefault(); (e.currentTarget.querySelector(`#rq-${first}`) as HTMLElement | null)?.focus(); }
      }}
    >
      <input type="hidden" name="locale" value={locale} />
      <span className="kicker">{t('who')}</span>
      <p className="note" style={{ margin: '14px 0 26px' }}>{t('who_lead')}</p>
      <div className="f2">
        <div className="field">
          <label htmlFor="rq-name">{t('name')} <span className="req">*</span></label>
          <input id="rq-name" name="name" required autoComplete="name" aria-invalid={shown.name ? true : undefined} aria-describedby="rq-name-err" />
          {err('name', 'rq-name-err')}
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
          <label htmlFor="rq-email">{t('email')} <span className="req">*</span></label>
          <input id="rq-email" name="email" type="email" autoComplete="email" aria-invalid={shown.email ? true : undefined} aria-describedby="rq-email-err rq-contact-hint" />
          {err('email', 'rq-email-err')}
        </div>
        <div className="field">
          <label htmlFor="rq-wa">{t('whatsapp')} <span className="req">*</span></label>
          <input id="rq-wa" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder={t('wa_placeholder')} aria-invalid={shown.wa ? true : undefined} aria-describedby="rq-wa-err rq-contact-hint" />
          {err('wa', 'rq-wa-err')}
        </div>
      </div>
      <p className="note" id="rq-contact-hint" style={{ marginTop: 18 }}>{t('contact_hint')}</p>
      {needsAck ? (
        <>
          <label className="check" htmlFor="rq-ack">
            <input id="rq-ack" type="checkbox" name="ack" value="1" required aria-invalid={shown.ack ? true : undefined} aria-describedby="rq-ack-err" onChange={e => setErrors(x => ({ ...x, ack: e.target.checked ? undefined : x.ack }))} />
            <span><b>{t('ack_label')}</b>{shown.ack ? <span className="err" id="rq-ack-err" style={{ display: 'block', marginTop: 6 }}>{shown.ack}</span> : null}</span>
          </label>
          <p className="note" style={{ marginTop: 10 }}>{t('ack_note')}</p>
        </>
      ) : null}
      {state?.error && state.error !== 'name' && state.error !== 'contact' ? <p className="field" style={{ marginTop: 12 }}><span className="err">{t('error')}</span></p> : null}
      <div className="acts" style={{ marginTop: 30 }}>
        <Submit label={t('send')} busy={t('submitting')} />
        <Link href={{ pathname: '/sign-in', query: { next: '/request' } }} className="tlink">{t('have_account')} {tc('sign_in')}</Link>
      </div>
      <p className="note" style={{ marginTop: 22 }}>{t('privacy_note')}</p>
    </form>
  );
}
