import { getTranslations } from 'next-intl/server';
import { Sheet } from '@/components/shell/sheet';
import { ActionForm } from '@/components/console/shared/action-form';
import { staffSession } from '@/components/console/shared/act';
import { issuableAccounts } from '@/components/console/protocols/data';
import { issueProtocol } from '@/components/console/protocols/actions';

export const dynamic = 'force-dynamic';

export default async function NewProtocol() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.protocols');
  const tc = await getTranslations('console.common');
  // Only accounts the acknowledgement gate already lets through. `axiom.issue_protocol` refuses
  // the rest anyway; offering them here would just be a refusal waiting to happen.
  const accounts = await issuableAccounts(session.uid);

  return (
    <Sheet kicker={t('title')} title={t('new_form.title')} backHref="/console/protocols" closeLabel={tc('close')}>
      <p className="note">{t('new_form.note')}</p>
      {accounts.length === 0 ? <p className="empty">{t('new_form.none_eligible')}</p> : (
        <ActionForm action={issueProtocol} submit={t('new_form.submit')} tone="accent">
          <label className="field">
            <span>{t('new_form.account')}</span>
            <select name="account_id" required defaultValue="">
              <option value="" disabled>{t('new_form.choose')}</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <span className="hint">{t('new_form.account_hint')}</span>
          </label>
          <label className="field"><span>{t('new_form.study')}</span><input name="title" /></label>
          <label className="field">
            <span>{t('new_form.subject')}</span>
            <input name="subject_label" />
            <span className="hint">{t('new_form.subject_hint')}</span>
          </label>
          <div className="grid2">
            <label className="field">
              <span>{t('new_form.locale')}</span>
              <select name="locale" defaultValue="id">
                <option value="id">{t('new_form.locale_id')}</option>
                <option value="en">{t('new_form.locale_en')}</option>
              </select>
              <span className="hint">{t('new_form.locale_hint')}</span>
            </label>
            <label className="field"><span>{t('new_form.starts_on')}</span><input name="starts_on" type="date" /></label>
          </div>
        </ActionForm>
      )}
    </Sheet>
  );
}
