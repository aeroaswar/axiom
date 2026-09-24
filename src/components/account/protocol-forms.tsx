'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { addOwnCompound } from './protocol-actions';
import { WEEKDAYS } from '@/lib/protocol/schedule';
import type { Result } from './act';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-sm btn-accent" disabled={pending}>{label}</button>;
}

/**
 * The account adds a compound to its own card. The choice is limited to peptides the account has
 * actually been sent — a schedule for something it does not hold is not a schedule — and the
 * refusal, if the database gives one, is shown where it happened rather than swallowed.
 */
export function AddCompound({ protocolId, variants }: {
  protocolId: string; variants: { id: string; name: string; pack: string }[];
}) {
  const t = useTranslations('account.protocols.add');
  const ti = useTranslations('console.protocols.item');
  const td = useTranslations('protocol.schedule.day');
  const [state, action] = useActionState<Result | null, FormData>(addOwnCompound, null);

  return (
    <form action={action} className="rv">
      <input type="hidden" name="protocol_id" value={protocolId} />
      <label className="field">
        <span>{ti('compound')}</span>
        <select name="variant_id" required defaultValue="">
          <option value="" disabled>{ti('choose')}</option>
          {variants.map(v => <option key={v.id} value={v.id}>{v.name} · {v.pack}</option>)}
        </select>
      </label>
      <label className="field"><span>{ti('brief')}</span><textarea name="brief" rows={2} /></label>
      <div className="fgrid">
        <label className="field"><span>{ti('amount')}</span><input name="amount" /></label>
        <label className="field"><span>{ti('route')}</span><input name="route" /></label>
      </div>
      <div className="fgrid">
        <label className="field">
          <span>{ti('freq')}</span>
          <select name="freq" defaultValue="weekly">
            {(['once', 'daily', 'weekly', 'monthly'] as const).map(f => (
              <option key={f} value={f}>{ti(`freq_${f}`)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{ti('every_n')}</span>
          <input name="every_n" type="number" min={1} max={52} defaultValue={1} />
        </label>
      </div>
      <fieldset className="field">
        <legend>{ti('byday')}</legend>
        <span className="daypick">
          {WEEKDAYS.map(d => (
            <label key={d} className="daybox">
              <input type="checkbox" name="byday" value={d} />
              <span>{td(d.toLowerCase())}</span>
            </label>
          ))}
        </span>
      </fieldset>
      <div className="fgrid">
        <label className="field"><span>{ti('at_time')}</span><input name="at_time" type="time" defaultValue="08:00" /></label>
        <label className="field"><span>{ti('reminder')}</span><input name="reminder_min" type="number" min={0} defaultValue={30} /></label>
      </div>
      <div className="fgrid">
        <label className="field"><span>{ti('starts_on')}</span><input name="starts_on" type="date" /></label>
        <label className="field"><span>{ti('ends_on')}</span><input name="ends_on" type="date" /></label>
      </div>
      <div className="formfoot">
        <Submit label={t('submit')} />
        {state?.error ? <span className="msg err" role="status">{state.error}</span>
          : state?.ok ? <span className="msg ok" role="status">{state.ok}</span> : null}
      </div>
    </form>
  );
}
