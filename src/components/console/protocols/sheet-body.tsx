import { getTranslations } from 'next-intl/server';
import { ActionButton, ActionForm } from '../shared/action-form';
import { addProtocolItem, endProtocolItem, updateProtocolItem } from './actions';
import { WEEKDAYS } from '@/lib/protocol/schedule';
import type { ProtocolEventRow, ProtocolItemRow, ProtocolRow } from './data';

// The card's editor. Every field on a line is per-client operational data; the compound, its pack
// size and its lots come from the catalogue and cannot be typed in here.

type Variant = { id: string; sku: string; name: string; pack: string };
type Lot = { id: string; lot_code: string; variant_id?: string };

const iso = (d: Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : '');

/**
 * The recurrence controls, shared by the add form and every line's edit form so the two cannot
 * drift. `byday` is a set of checkboxes with one name, which is why `act.ts` needed `list()`.
 */
async function ScheduleFields({ item, lots }: { item?: ProtocolItemRow; lots: Lot[] }) {
  const t = await getTranslations('console.protocols.item');
  const td = await getTranslations('protocol.schedule.day');
  return (
    <>
      <div className="fgrid">
        <label className="field">
          <span>{t('freq')}</span>
          <select name="freq" defaultValue={item?.freq ?? 'weekly'}>
            {(['once', 'daily', 'weekly', 'monthly'] as const).map(f => (
              <option key={f} value={f}>{t(`freq_${f}`)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t('every_n')}</span>
          <input name="every_n" type="number" min={1} max={52} defaultValue={item?.every_n ?? 1} />
        </label>
      </div>
      <fieldset className="field">
        <legend>{t('byday')}</legend>
        <span className="daypick">
          {WEEKDAYS.map(d => (
            <label key={d} className="daybox">
              <input type="checkbox" name="byday" value={d} defaultChecked={item?.byday?.includes(d)} />
              <span>{td(d.toLowerCase())}</span>
            </label>
          ))}
        </span>
        <span className="hint">{t('byday_hint')}</span>
      </fieldset>
      <div className="fgrid">
        <label className="field">
          <span>{t('at_time')}</span>
          <input name="at_time" type="time" defaultValue={item?.at_time ?? '08:00'} />
        </label>
        <label className="field">
          <span>{t('reminder')}</span>
          <input name="reminder_min" type="number" min={0} max={10080} defaultValue={item?.reminder_min ?? 30} />
        </label>
      </div>
      <div className="fgrid">
        <label className="field">
          <span>{t('starts_on')}</span>
          <input name="starts_on" type="date" defaultValue={iso(item?.starts_on)} />
        </label>
        <label className="field">
          <span>{t('ends_on')}</span>
          <input name="ends_on" type="date" defaultValue={iso(item?.ends_on)} />
        </label>
      </div>
      <label className="field">
        <span>{t('occurrences')}</span>
        <input name="occurrences" type="number" min={1} defaultValue={item?.occurrences ?? ''} />
        <span className="hint">{t('occurrences_hint')}</span>
      </label>
      <label className="field">
        <span>{t('lot')}</span>
        <select name="lot_id" defaultValue={item?.lot_id ?? ''}>
          <option value="">{t('no_lot')}</option>
          {lots.map(l => <option key={l.id} value={l.id}>{l.lot_code}</option>)}
        </select>
      </label>
    </>
  );
}

async function ItemCard({ item, lots }: { item: ProtocolItemRow; lots: Lot[] }) {
  const t = await getTranslations('console.protocols.item');
  return (
    <details className={`itemcard${item.is_active ? '' : ' is-ended'}`}>
      <summary>
        <span className="t1">{item.name}</span>
        <span className="t2">{item.pack} · {item.sku}{item.lot_code ? ` · ${item.lot_code}` : ''}</span>
        {item.is_active ? null : <span className="chip warn"><span className="dot" />{t('ended')}</span>}
      </summary>
      {item.is_active ? (
        <>
          <ActionForm action={updateProtocolItem} submit={t('save')} tone="accent">
            <input type="hidden" name="item_id" value={item.id} />
            <label className="field"><span>{t('brief')}</span>
              <textarea name="brief" rows={2} defaultValue={item.brief} /></label>
            <div className="fgrid">
              <label className="field"><span>{t('amount')}</span>
                <input name="amount" defaultValue={item.amount ?? ''} /></label>
              <label className="field"><span>{t('route')}</span>
                <input name="route" defaultValue={item.route ?? ''} /></label>
            </div>
            <ScheduleFields item={item} lots={lots} />
          </ActionForm>
          <div className="hrow" style={{ marginTop: 12 }}>
            {/* Ended, never deleted: a deleted line vanishes from the feed, and a calendar keeps an
                event it stops being told about. Ending it sends the cancellation that clears it. */}
            <ActionButton action={endProtocolItem} submit={t('end')} tone="danger" hidden={{ item_id: item.id }} />
          </div>
        </>
      ) : (
        <p className="note">{t('ended_note')}</p>
      )}
    </details>
  );
}

export async function ProtocolSheetBody({ p, items, events, variants, lots }: {
  p: ProtocolRow; items: ProtocolItemRow[]; events: ProtocolEventRow[];
  variants: Variant[]; lots: Lot[];
}) {
  const t = await getTranslations('console.protocols');
  const ti = await getTranslations('console.protocols.item');

  return (
    <>
      <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('sheet.compounds')}</span></div>
      <section>
        {items.length === 0 ? <p className="empty">{t('sheet.no_items')}</p>
          : items.map(i => <ItemCard key={i.id} item={i} lots={lots} />)}
      </section>

      {p.state === 'issued' ? (
        <>
        <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('sheet.add')}</span></div>
        <section>
          <ActionForm action={addProtocolItem} submit={ti('add')} tone="accent" resetOnSuccess>
            <input type="hidden" name="protocol_id" value={p.id} />
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
            <ScheduleFields lots={lots} />
          </ActionForm>
        </section>
        </>
      ) : null}

      <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('sheet.history')}</span></div>
      <section>
        <ul className="tl">
          {events.map((e, i) => (
            <li key={i}>
              <span className="t1">{t(`events.${e.kind}`)}{e.detail ? ` · ${e.detail}` : ''}</span>
              <span className="t2">
                {e.actor_label} · {new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(e.at))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
