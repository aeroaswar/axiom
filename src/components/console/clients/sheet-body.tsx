import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { Icon } from '@/components/shell/sprite';
import { ActionButton, ActionForm } from '../shared/action-form';
import { addSite, changeMemberRole, deleteSite, linkMember, saveAccount, unlinkMember } from './actions';
import { AckChip } from './list';
import { reorderDue, type ClientRow, type DocRow, type InvoiceRow, type Manager, type Member, type Site, type Unlinked, type Zone } from './data';

export type Detail = {
  members: Member[]; sites: Site[]; quotes: DocRow[]; orders: DocRow[]; invoices: InvoiceRow[]; managers: Manager[];
  unlinked: Unlinked[]; ackState: string;
};

const ZONES = ['jabodetabek', 'jawa', 'luar_jawa', 'other'] as const;

export async function ClientSheetBody({ c, d, zones }: { c: ClientRow; d: Detail; zones: Zone[] }) {
  const t = await getTranslations('console.clients');
  const ts = await getTranslations('states');
  const tc = await getTranslations('console.common');
  const locale = await getLocale();
  const df = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const day = (d: Date | null | undefined) => (d ? df.format(new Date(d)) : '—');
  const rd = reorderDue(c);
  const priced = new Set(zones.filter(z => z.per_three_idr !== null).map(z => z.zone));

  return (
    <>
      <div className="hrow" style={{ marginBottom: 14 }}><AckChip state={c.ack} /></div>

      <div className="kv"><span className="k">{t('sheet.manager')}</span><span className="v">{c.manager ?? t('no_manager')}</span></div>
      <div className="kv"><span className="k">{t('sheet.lifetime')}</span><span className="v">{idr(c.lifetime ?? 0)}</span></div>
      <div className="kv"><span className="k">{t('sheet.orders')}</span><span className="v">{c.orders_n}</span></div>
      <div className="kv">
        <span className="k">{t('sheet.cadence')}</span>
        <span className="v">
          {c.cadence == null ? <span className="dim-2">{t('sheet.cadence_none')}</span>
            : c.orders_n >= 3 ? t('sheet.cadence_derived', { days: c.cadence })
              : t('sheet.cadence_agreed', { days: c.cadence })}
        </span>
      </div>
      {rd ? (
        <div className="kv">
          <span className="k">{t('sheet.next_reorder')}</span>
          <span className={`v${rd.overdue ? ' tone-warn' : ''}`}>
            {day(rd.due)} · {(rd.days < 0 ? t('overdue', { days: -rd.days }) : rd.days === 0 ? t('due_today') : t('due_in', { days: rd.days })).toLowerCase()}
          </span>
        </div>
      ) : null}
      <div className="kv">
        <span className="k">{t('sheet.ack')}</span>
        <span className={`v${c.ack === 'lapsed' ? ' tone-err' : c.ack === 'current' ? '' : ' tone-warn'}`}>
          {c.ack === 'none' ? t('sheet.ack_none')
            : c.ack === 'lapsed' ? t('sheet.ack_lapsed', { date: day(c.ack_expires) })
              : c.ack === 'expiring' ? t('sheet.ack_expires', { date: day(c.ack_expires) })
                : t('sheet.ack_valid_to', { date: day(c.ack_expires) })}
        </span>
      </div>
      {c.whatsapp ? <div className="kv"><span className="k">{t('sheet.whatsapp')}</span><span className="v">{c.whatsapp}</span></div> : null}
      {c.email ? <div className="kv"><span className="k">{t('sheet.email')}</span><span className="v">{c.email}</span></div> : null}

      {c.ack === 'lapsed' || c.ack === 'none' ? <p className="note" style={{ marginTop: 14 }}>{t('sheet.ack_lapsed_note')}</p> : null}
      {c.ack === 'expiring' ? <p className="note" style={{ marginTop: 14 }}>{t('sheet.ack_expiring_note')}</p> : null}

      {/* members ------------------------------------------------------------------ */}
      <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('members.title')}</span></div>
      {d.members.length ? (
        <div className="rows">
          {d.members.map(m => (
            <div className="row" key={m.profile_id}>
              <span className="bd">
                <span className="t1">{m.full_name}</span>
                <span className="t2">{t(`members.roles.${m.role}`)}{m.email ? ` · ${m.email}` : ''}</span>
              </span>
              <span className="rt">
                {m.is_primary ? <span className="chip quiet"><span className="dot" />{t('members.primary')}</span> : null}
                <ActionButton action={unlinkMember} submit={t('members.unlink')} hidden={{ profile_id: m.profile_id }} />
              </span>
            </div>
          ))}
        </div>
      ) : <p className="empty">{t('members.empty')}</p>}

      {/* Linking is what finishes a request raised from the public site: until someone belongs to
          this account they see none of it, and no acknowledgement can be recorded against it —
          which is what stops a peptide quote being sent. */}
      {d.unlinked.length ? (
        <ActionForm action={linkMember} submit={t('members.link')}>
          <input type="hidden" name="account_id" value={c.id} />
          <div className="fgrid">
            <div className="field">
              <label htmlFor="link_profile">{t('members.person')}</label>
              <select id="link_profile" name="profile_id" defaultValue={d.unlinked[0].id}>
                {d.unlinked.map(p => <option key={p.id} value={p.id}>{p.label}{p.email ? ` · ${p.email}` : ''}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="is_primary">{t('members.as_primary')}</label>
              <input id="is_primary" name="is_primary" type="checkbox" />
            </div>
          </div>
        </ActionForm>
      ) : null}
      {!d.members.length && !d.unlinked.length ? <p className="note">{t('members.nobody_waiting')}</p> : null}
      {d.ackState === 'none' ? <p className="note err">{t('members.ack_blocked')}</p> : null}
      {d.members.length ? (
        <ActionForm action={changeMemberRole} submit={t('members.change_role')}>
          <div className="fgrid">
            <div className="field">
              <label htmlFor="profile_id">{t('members.member')}</label>
              <select id="profile_id" name="profile_id" defaultValue={d.members[0].profile_id}>
                {d.members.map(m => <option key={m.profile_id} value={m.profile_id}>{m.full_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="member_role">{t('members.role')}</label>
              <select id="member_role" name="role" defaultValue={d.members[0].role}>
                {(['client', 'clinic'] as const).map(r => <option key={r} value={r}>{t(`members.roles.${r}`)}</option>)}
              </select>
            </div>
          </div>
        </ActionForm>
      ) : null}
      <p className="note">{t('members.owner_note')}</p>

      {/* sites -------------------------------------------------------------------- */}
      <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('sites.title')}</span></div>
      {d.sites.length ? (
        <div className="rows">
          {d.sites.map(s => (
            <div className="row" key={s.id}>
              <span className="bd">
                <span className="t1">{s.name}{s.is_default ? ` · ${t('sites.default')}` : ''}</span>
                <span className="t2">
                  {t(`sites.zones.${s.zone}`)}{priced.has(s.zone) ? '' : ` · ${t('sites.rate_pending')}`}
                  {s.address ? ` · ${s.address}` : ''}
                </span>
              </span>
              {s.is_default ? null : (
                <span className="rt">
                  <ActionButton action={deleteSite} submit={tc('delete')} hidden={{ site_id: s.id }} />
                </span>
              )}
            </div>
          ))}
        </div>
      ) : <p className="empty">{t('sites.empty')}</p>}
      <ActionForm action={addSite} submit={t('sites.add')} resetOnSuccess>
        <input type="hidden" name="account_id" value={c.id} />
        <div className="fgrid">
          <div className="field">
            <label htmlFor="site_name_new">{t('sites.name')}</label>
            <input id="site_name_new" name="name" required autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="site_zone">{t('sites.zone')}</label>
            <select id="site_zone" name="zone" defaultValue="jabodetabek">
              {ZONES.map(z => <option key={z} value={z}>{t(`sites.zones.${z}`)}</option>)}
            </select>
          </div>
          <div className="field wide">
            <label htmlFor="site_address">{t('sites.address')}</label>
            <input id="site_address" name="address" autoComplete="off" />
          </div>
        </div>
      </ActionForm>

      {/* history ------------------------------------------------------------------ */}
      <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('history.quotes')}</span></div>
      {d.quotes.length ? (
        <div className="rows">
          {d.quotes.map(q => (
            <Link className="row" key={q.id} href={`/console/orders/${q.number}`}>
              <span className="ic"><Icon name="send" /></span>
              <span className="bd"><span className="t1">{q.number}</span><span className="t2">{day(q.at)}</span></span>
              <span className="rt">
                <span className="amt">{idr(q.total ?? 0)}</span>
                <span className="t2">{ts(`quote.${q.state}`)}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : <p className="empty">{t('history.empty')}</p>}

      <div className="sec-h" style={{ marginTop: 20 }}><span className="kicker">{t('history.orders')}</span></div>
      {d.orders.length ? (
        <div className="rows">
          {d.orders.map(o => (
            <Link className="row" key={o.id} href={`/console/orders/${o.number}`}>
              <span className="ic"><Icon name="receipt" /></span>
              <span className="bd"><span className="t1">{o.number}</span><span className="t2">{day(o.at)}</span></span>
              <span className="rt">
                <span className="amt">{idr(o.total ?? 0)}</span>
                <span className="t2">{ts(`order.${o.state}`)}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : <p className="empty">{t('history.empty')}</p>}

      <div className="sec-h" style={{ marginTop: 20 }}><span className="kicker">{t('history.invoices')}</span></div>
      {d.invoices.length ? (
        <div className="rows">
          {d.invoices.map(i => (
            <Link className="row" key={i.id} href={`/console/invoices/${i.number}`}>
              <span className="ic"><Icon name="file" /></span>
              <span className="bd"><span className="t1">{i.number}</span><span className="t2">{day(i.issued_at)}</span></span>
              <span className="rt">
                <span className="amt">{idr(i.total_idr)}</span>
                <span className="t2">{ts(`invoice.${i.voided_at ? 'void' : i.paid_at ? 'paid' : i.due_at && new Date(i.due_at) < new Date() ? 'overdue' : 'issued'}`)}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : <p className="empty">{t('history.empty')}</p>}

      {/* the account record ------------------------------------------------------- */}
      <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('edit.title')}</span></div>
      <ActionForm action={saveAccount} submit={t('edit.submit')}>
        <input type="hidden" name="account_id" value={c.id} />
        <div className="fgrid">
          <div className="field wide">
            <label htmlFor="acc_name">{t('edit.name')}</label>
            <input id="acc_name" name="name" defaultValue={c.name} required />
          </div>
          <div className="field">
            <label htmlFor="acc_type">{t('edit.type')}</label>
            <select id="acc_type" name="type" defaultValue={c.type}>
              {(['individual', 'clinic', 'institution'] as const).map(k => <option key={k} value={k}>{t(`types.${k}`)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="acc_manager">{t('edit.manager')}</label>
            <select id="acc_manager" name="manager_id" defaultValue={c.manager_id ?? ''}>
              <option value="">{tc('none')}</option>
              {d.managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="acc_wa">{t('edit.whatsapp')}</label>
            <input id="acc_wa" name="whatsapp" defaultValue={c.whatsapp ?? ''} inputMode="numeric" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="acc_email">{t('edit.email')}</label>
            <input id="acc_email" name="email" type="email" defaultValue={c.email ?? ''} autoComplete="off" />
          </div>
          <div className="field wide">
            <label htmlFor="acc_cadence">{t('edit.cadence')}</label>
            <input id="acc_cadence" name="agreed_cadence_days" type="number" min="1" step="1" defaultValue={c.agreed_cadence_days ?? ''} />
            <span className="hint">{t('edit.cadence_note')}</span>
          </div>
          <div className="field wide">
            <label htmlFor="acc_notes">{t('edit.notes')}</label>
            <textarea id="acc_notes" name="notes" rows={3} defaultValue={c.notes ?? ''} />
          </div>
        </div>
      </ActionForm>
    </>
  );
}
