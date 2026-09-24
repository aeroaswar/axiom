import { getTranslations } from 'next-intl/server';
import { Sheet } from '@/components/shell/sheet';
import { staffSession } from '@/components/console/shared/act';
import { ActionForm } from '@/components/console/shared/action-form';
import { createAccount } from '@/components/console/clients/actions';

export const dynamic = 'force-dynamic';

const ZONES = ['jabodetabek', 'jawa', 'luar_jawa', 'other'] as const;
const TYPES = ['clinic', 'institution', 'individual'] as const;

export default async function NewClientPage() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.clients');
  const tc = await getTranslations('console.common');
  return (
    <Sheet backHref="/console/clients" closeLabel={tc('close')} kicker={t('new_form.kicker')} title={t('new_form.title')}>
      <ActionForm action={createAccount} submit={t('new_form.submit')}>
        <div className="fgrid">
          <div className="field wide">
            <label htmlFor="name">{t('edit.name')}</label>
            <input id="name" name="name" required autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="type">{t('edit.type')}</label>
            <select id="type" name="type" defaultValue="clinic">
              {TYPES.map(k => <option key={k} value={k}>{t(`types.${k}`)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="whatsapp">{t('edit.whatsapp')}</label>
            <input id="whatsapp" name="whatsapp" inputMode="numeric" autoComplete="off" />
          </div>
          <div className="field wide">
            <label htmlFor="email">{t('edit.email')}</label>
            <input id="email" name="email" type="email" autoComplete="off" />
          </div>
        </div>

        <div className="sec-h" style={{ marginTop: 14 }}><span className="kicker">{t('new_form.first_site')}</span></div>
        <div className="fgrid">
          <div className="field">
            <label htmlFor="site_name">{t('new_form.site_name')}</label>
            <input id="site_name" name="site_name" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="zone">{t('sites.zone')}</label>
            <select id="zone" name="zone" defaultValue="jabodetabek">
              {ZONES.map(z => <option key={z} value={z}>{t(`sites.zones.${z}`)}</option>)}
            </select>
          </div>
          <div className="field wide">
            <label htmlFor="address">{t('sites.address')}</label>
            <input id="address" name="address" autoComplete="off" />
          </div>
          <div className="field wide">
            <label htmlFor="notes">{t('edit.notes')}</label>
            <textarea id="notes" name="notes" rows={3} />
          </div>
        </div>
      </ActionForm>
      <p className="note" style={{ marginTop: 12 }}>{t('note')}</p>
    </Sheet>
  );
}
