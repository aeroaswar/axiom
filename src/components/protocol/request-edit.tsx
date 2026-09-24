'use client';
import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { requestProtocolEdit, type EditRequest } from '@/app/k/[code]/actions';

/**
 * The only interactive thing on a scanned card, and it takes no input at all — the address the link
 * goes to is the one already on the account's row. There is nothing here to type, so there is
 * nothing here to phish with and nothing to enumerate.
 */
export function RequestEdit({ code }: { code: string }) {
  const t = useTranslations('protocol.edit');
  const [state, setState] = useState<EditRequest | null>(null);
  const [pending, start] = useTransition();

  return (
    <section className="pc pc-sec pc-edit">
      <h2>{t('title')}</h2>
      <p className="pc-note">{t('body')}</p>
      {state?.sent ? <p className="pc-ok">{t('sent')}</p> : null}
      {state?.noContact ? (
        <p className="pc-note">
          {t('no_contact')}{' '}
          <a className="pc-link" href={state.whatsapp} target="_blank" rel="noreferrer noopener">{t('whatsapp')}</a>
        </p>
      ) : null}
      {state ? null : (
        <button
          type="button"
          className="pc-btn"
          disabled={pending}
          onClick={() => start(async () => setState(await requestProtocolEdit(code)))}
        >
          {pending ? t('sending') : t('send')}
        </button>
      )}
    </section>
  );
}
