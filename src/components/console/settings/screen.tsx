import { getTranslations } from 'next-intl/server';
import type { Session } from '@/lib/auth';
import { signOutAction } from '@/app/[locale]/(public)/sign-in/actions';
import { ActionForm } from '../shared/action-form';
import { saveProfile, saveSiteSettings, saveZones, changeStaffRole } from './actions';
import { boolOf, numberOf, objOf, text, type StaffRow, type ZoneRow } from './data';

export async function SettingsScreen({ session, map, zones, staff }: {
  session: Session; map: Record<string, unknown>; zones: ZoneRow[]; staff: StaffRow[];
}) {
  const t = await getTranslations('console.settings');
  const tz = await getTranslations('console.clients.sites.zones');
  const tc = await getTranslations('common');
  const tsh = await getTranslations('shell');
  const owner = session.role === 'owner';
  const entity = objOf(map.entity), bank = objOf(map.bank), wa = objOf(map.whatsapp), cutoff = objOf(map.cutoff);

  return (
    <section className="screen on">
      <div className="stack">
        <div>
          <div className="sec-h"><span className="kicker">{t('profile.title')}</span></div>
          <ActionForm action={saveProfile} submit={t('profile.submit')}>
            <div className="fgrid">
              <div className="field">
                <label htmlFor="full_name">{t('profile.name')}</label>
                <input id="full_name" name="full_name" defaultValue={session.name} required />
              </div>
              <div className="field">
                <label htmlFor="locale">{t('profile.language')}</label>
                <select id="locale" name="locale" defaultValue={session.locale}>
                  <option value="id">{tc('indonesian')}</option>
                  <option value="en">{tc('english')}</option>
                </select>
              </div>
            </div>
            <div className="kv"><span className="k">{t('profile.role')}</span><span className="v">{tsh(session.role)}</span></div>
          </ActionForm>
        </div>

        <form action={signOutAction}>
          <button className="btn btn-sm" type="submit">{t('sign_out')}</button>
        </form>
      </div>

      {!owner ? <p className="note" style={{ marginTop: 26 }}>{t('owner_note')}</p> : (
        <div className="split settings-split" style={{ marginTop: 34 }}>
          <div>
            <div className="sec-h"><span className="kicker">{t('site.title')}</span></div>
            <ActionForm action={saveSiteSettings} submit={t('site.submit')}>
              <input type="hidden" name="cutoff_tz" value={text(cutoff.tz, 'Asia/Jakarta')} />
              <div className="fgrid">
                <div className="field">
                  <label htmlFor="price_visibility">{t('site.price_visibility')}</label>
                  <select id="price_visibility" name="price_visibility" defaultValue={text(map.price_visibility, 'acknowledged')}>
                    <option value="open">{t('site.visibility.open')}</option>
                    <option value="acknowledged">{t('site.visibility.acknowledged')}</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="ppn_rate">{t('site.ppn_rate')}</label>
                  <input id="ppn_rate" name="ppn_rate" type="number" step="0.1" min="0" defaultValue={numberOf(map.ppn_rate)} />
                </div>
                <div className="field">
                  <label htmlFor="payment_terms_days">{t('site.payment_terms_days')}</label>
                  <input id="payment_terms_days" name="payment_terms_days" type="number" min="0" step="1" defaultValue={numberOf(map.payment_terms_days, 7)} />
                </div>
                <div className="field">
                  <label htmlFor="quote_valid_days">{t('site.quote_valid_days')}</label>
                  <input id="quote_valid_days" name="quote_valid_days" type="number" min="1" step="1" defaultValue={numberOf(map.quote_valid_days, 7)} />
                </div>
                <div className="field">
                  <label htmlFor="gm_floor_pct">{t('site.gm_floor_pct')}</label>
                  <input id="gm_floor_pct" name="gm_floor_pct" type="number" min="0" max="100" step="0.5" defaultValue={numberOf(map.gm_floor_pct, 45)} />
                </div>
                <div className="field">
                  <label htmlFor="cutoff_cold">{t('site.cutoff_cold')}</label>
                  <input id="cutoff_cold" name="cutoff_cold" defaultValue={text(cutoff.cold)} placeholder="15:00" />
                </div>
                <div className="field">
                  <label htmlFor="cutoff_ambient">{t('site.cutoff_ambient')}</label>
                  <input id="cutoff_ambient" name="cutoff_ambient" defaultValue={text(cutoff.ambient)} placeholder="17:00" />
                </div>
              </div>
              <label className="check"><input type="checkbox" name="delivery_in_dpp" defaultChecked={boolOf(map.delivery_in_dpp)} />{t('site.delivery_in_dpp')}</label>
              <label className="check"><input type="checkbox" name="paid_by_owner_only" defaultChecked={boolOf(map.paid_by_owner_only)} />{t('site.paid_by_owner_only')}</label>

              <div className="sec-h" style={{ marginTop: 16 }}><span className="kicker">{t('site.entity')}</span></div>
              <div className="fgrid">
                <div className="field">
                  <label htmlFor="entity_name">{t('site.entity_name')}</label>
                  <input id="entity_name" name="entity_name" defaultValue={text(entity.name)} />
                </div>
                <div className="field">
                  <label htmlFor="entity_npwp">{t('site.entity_npwp')}</label>
                  <input id="entity_npwp" name="entity_npwp" defaultValue={text(entity.npwp)} />
                </div>
                <div className="field wide">
                  <label htmlFor="entity_address">{t('site.entity_address')}</label>
                  <input id="entity_address" name="entity_address" defaultValue={text(entity.address)} />
                </div>
              </div>
              <label className="check"><input type="checkbox" name="entity_pkp" defaultChecked={boolOf(entity.pkp)} />{t('site.entity_pkp')}</label>

              <div className="sec-h" style={{ marginTop: 16 }}><span className="kicker">{t('site.bank')}</span></div>
              <div className="fgrid">
                <div className="field">
                  <label htmlFor="bank_bank">{t('site.bank_bank')}</label>
                  <input id="bank_bank" name="bank_bank" defaultValue={text(bank.bank)} />
                </div>
                <div className="field">
                  <label htmlFor="bank_account_no">{t('site.bank_account_no')}</label>
                  <input id="bank_account_no" name="bank_account_no" defaultValue={text(bank.account_no)} />
                </div>
                <div className="field wide">
                  <label htmlFor="bank_account_name">{t('site.bank_account_name')}</label>
                  <input id="bank_account_name" name="bank_account_name" defaultValue={text(bank.account_name)} />
                </div>
              </div>

              <div className="sec-h" style={{ marginTop: 16 }}><span className="kicker">{t('site.whatsapp')}</span></div>
              <div className="fgrid">
                <div className="field">
                  <label htmlFor="whatsapp_number">{t('site.whatsapp_number')}</label>
                  <input id="whatsapp_number" name="whatsapp_number" defaultValue={text(wa.number)} inputMode="numeric" />
                </div>
                <div className="field">
                  <label htmlFor="whatsapp_display">{t('site.whatsapp_display')}</label>
                  <input id="whatsapp_display" name="whatsapp_display" defaultValue={text(wa.display)} />
                </div>
              </div>
            </ActionForm>
          </div>

          <div className="stack">
            <div>
            <div className="sec-h"><span className="kicker">{t('zones.title')}</span></div>
            <ActionForm action={saveZones} submit={t('zones.submit')}>
              <div className="tblwrap">
                <table className="tbl zones">
                  <thead>
                    <tr>
                      <th>{t('zones.zone')}</th>
                      <th className="n">{t('zones.per_three')}</th>
                      <th className="n">{t('zones.cap_per_destination')}</th>
                      <th className="n">{t('zones.eta')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map(z => (
                      <tr key={z.zone}>
                        <td className="k">
                          <input type="hidden" name="zone" value={z.zone} />
                          {tz(z.zone)}
                        </td>
                        <td className="n"><input name={`per_three_${z.zone}`} defaultValue={z.per_three_idr ?? ''} inputMode="numeric" /></td>
                        <td className="n"><input name={`cap_${z.zone}`} defaultValue={z.cap_idr ?? ''} inputMode="numeric" /></td>
                        <td className="n"><input name={`eta_${z.zone}`} type="number" min="1" step="1" defaultValue={z.eta_days} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="note" style={{ margin: '10px 0' }}>{t('zones.note')}</p>
            </ActionForm>
            </div>

            <div>
            <div className="sec-h"><span className="kicker">{t('staff.title')}</span></div>
            <div className="rows">
              {staff.map(s => (
                <div className="row" key={s.id}>
                  <span className="bd">
                    <span className="t1">{s.full_name}</span>
                    <span className="t2">{s.role === 'owner' ? t('staff.owner') : t('staff.ops')}{s.email ? ` · ${s.email}` : ''}</span>
                  </span>
                </div>
              ))}
            </div>
            <ActionForm action={changeStaffRole} submit={t('staff.submit')}>
              <div className="fgrid">
                <div className="field">
                  <label htmlFor="staff_profile">{t('staff.title')}</label>
                  <select id="staff_profile" name="profile_id" defaultValue={staff[0]?.id ?? ''}>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="staff_role">{t('staff.role')}</label>
                  <select id="staff_role" name="role" defaultValue={staff[0]?.role ?? 'ops'}>
                    <option value="ops">{t('staff.ops')}</option>
                    <option value="owner">{t('staff.owner')}</option>
                  </select>
                </div>
              </div>
            </ActionForm>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
