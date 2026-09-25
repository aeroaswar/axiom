import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { ActionForm } from '../shared/action-form';
import { FilterChips } from '../shared/filter-chips';
import { rv } from '../shared/reveal';
import { setStage } from './actions';
import { pipeline, STAGES, type LeadRow } from './data';

/** Sources with a translation; anything else is shown as it was recorded rather than throwing. */
const SOURCES = new Set(['site', 'whatsapp', 'referral']);

/**
 * The pipeline is one list under a chip row carrying the stage counts: each chip filters in place,
 * each row carries the one thing it is waiting for. A lead that has an account and a quote is a link
 * into the commerce record rather than a copy of it — the stage is a reading of that record, so
 * there is never a second version of the truth to reconcile.
 */
export async function LeadsList({ rows }: { rows: LeadRow[] }) {
  const t = await getTranslations('console.leads');
  const stages = pipeline(rows);

  /** What this lead is waiting for, and who is holding it. */
  const next = (l: LeadRow) => {
    if (l.stage === 'won') return { text: t('n_won', { number: l.quote_number ?? '' }), tone: '' };
    if (l.stage === 'lost') return { text: t('n_lost'), tone: '' };
    if (l.stage === 'quoted') return { text: t('n_quoted', { number: l.quote_number ?? '' }), tone: '' };
    if (!l.account_id) return { text: t('n_no_account'), tone: 'warn' };
    if (l.ack === 'none') return { text: t('n_no_ack'), tone: 'err' };
    if (l.stage === 'new') return { text: t('n_answer'), tone: 'warn' };
    return { text: t('n_price', { number: l.quote_number ?? '' }), tone: 'warn' };
  };

  const wa = (l: LeadRow) => (l.whatsapp ? `https://wa.me/${l.whatsapp.replace(/[^\d]/g, '')}` : null);

  // The chip row is the stage strip: one chip per stage carrying its own count, so the counts and
  // the rows under them are the same list read twice and cannot drift apart.
  const tone = (s: string): 'warn' | 'ok' | undefined =>
    (s === 'new' ? 'warn' : s === 'won' ? 'ok' : undefined);

  return (
    <section className="screen on" data-scope="leads">
      <div className="rv rv-line" style={rv(0)}>
        <FilterChips scope="leads" chips={[
          { value: '', label: `${t('f_all')} · ${rows.length}` },
          ...stages.map(s => ({ value: s.stage, label: `${t(`stages.${s.stage}`)} · ${s.n}`, tone: tone(s.stage) })),
        ]} />
      </div>

      <div className="tblwrap desktop-only rv" style={rv(1)}>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t('who')}</th>
              <th className="col-placed">{t('source')}</th>
              <th>{t('account')}</th>
              <th>{t('quote')}</th>
              <th>{t('next')}</th>
              <th>{t('stage')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(l => {
              const n = next(l);
              return (
                <tr key={l.id} data-tags={l.stage}>
                  <td className="k">
                    {l.name}
                    {l.clinic ? <span className="t2"> · {l.clinic}</span> : null}
                  </td>
                  <td className="col-placed">{SOURCES.has(l.source) ? t(`sources.${l.source}`) : l.source}</td>
                  <td>{l.account_id ? <Link href={`/console/clients/${l.account_id}`}>{l.account}</Link> : <span className="t2">—</span>}</td>
                  <td>{l.quote_number ? <Link href={`/console/orders/quotes/${l.quote_number}`}>{l.quote_number}</Link> : <span className="t2">—</span>}</td>
                  <td className={`nx${n.tone ? ` ${n.tone}` : ''}`}>{n.text}</td>
                  <td><span className="chip quiet"><span className="dot" />{t(`stages.${l.stage}`)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rows mobile-only rv" style={rv(1)}>
        {rows.map(l => {
          const n = next(l);
          return (
            <div className="row" key={l.id} data-tags={l.stage}>
              <span className="bd">
                <span className="t1">{l.name}{l.clinic ? ` · ${l.clinic}` : ''}</span>
                <span className={`t2${n.tone ? ` ${n.tone}` : ''}`}>{n.text}</span>
              </span>
              <span className="rt"><span className="chip quiet"><span className="dot" />{t(`stages.${l.stage}`)}</span></span>
            </div>
          );
        })}
      </div>

      <p className="empty" data-none hidden>{t('empty')}</p>

      {rows.length ? (
        <div className="rv" style={rv(2)}>
          <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('move.title')}</span></div>
          <ActionForm action={setStage} submit={t('move.submit')} resetOnSuccess>
            <div className="fgrid">
              <div className="field">
                <label htmlFor="lead_id">{t('move.lead')}</label>
                <select id="lead_id" name="lead_id" defaultValue={rows[0].id}>
                  {rows.map(l => <option key={l.id} value={l.id}>{l.name}{l.clinic ? ` · ${l.clinic}` : ''}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="stage">{t('move.stage')}</label>
                <select id="stage" name="stage" defaultValue="contacted">
                  {STAGES.map(s => <option key={s} value={s}>{t(`stages.${s}`)}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="note">{t('move.note')}</label>
                <input id="note" name="note" type="text" placeholder={t('move.note_ph')} />
              </div>
            </div>
          </ActionForm>
          <p className="note">{t('move.derived_note')}</p>
        </div>
      ) : null}

      {rows.some(l => l.whatsapp) ? (
        <p className="note">
          {t('wa_note')}{' '}
          {rows.filter(l => l.stage === 'new' && wa(l)).slice(0, 3).map(l => (
            <a key={l.id} className="tlink" href={wa(l)!} target="_blank" rel="noreferrer">{l.name}</a>
          ))}
        </p>
      ) : null}
    </section>
  );
}
