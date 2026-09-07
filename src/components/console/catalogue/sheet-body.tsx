import { getLocale, getTranslations } from 'next-intl/server';
import { idr } from '@/lib/money';
import { ActionForm } from '../shared/action-form';
import { recordMovement, saveVariant } from './actions';
import type { Movement, VariantDetail } from './data';
import { isLow, isOut } from './list';

const REASONS = ['intake', 'adjust', 'return', 'loss', 'expiry', 'sale'] as const;

/** The lot: what it is, what is on the shelf, how the shelf got there, and how to correct it. */
export async function VariantSheetBody({ v, moves }: { v: VariantDetail; moves: Movement[] }) {
  const t = await getTranslations('console.catalogue');
  const tc = await getTranslations('console.common');
  const locale = await getLocale();
  const df = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* Only an exception earns a chip. In stock is the norm and says nothing. */}
      <div className="hrow" style={{ marginBottom: 14 }}>
        {isOut(v) ? <span className="chip err"><span className="dot" />{t('out')}</span>
          : isLow(v) ? <span className="chip warn"><span className="dot" />{t('left', { n: v.available })}</span> : null}
        {v.is_cold_chain ? <span className="chip"><span className="dot" />{t('sheet.cold')}</span> : null}
        {v.is_active ? null : <span className="chip warn"><span className="dot" />{t('inactive')}</span>}
      </div>

      <div className="kv"><span className="k">{t('sheet.content')}</span><span className="v">{v.content}</span></div>
      <div className="kv">
        <span className="k">{t('sheet.price')}</span>
        <span className="v">
          {Number(v.price_idr) > 0 ? idr(v.price_idr) : <span className="dim-2">{t('sheet.price_unset')}</span>}
        </span>
      </div>
      <div className="kv"><span className="k">{t('sheet.threshold')}</span><span className="v">{v.low_stock_threshold}</span></div>

      {/* Three figures, and only three: on hand is the ledger, reserved is what is held, available is
          what may still be promised. */}
      <div className="figs">
        <div><span className="lab">{t('cols.on_hand')}</span><span className="val">{v.on_hand}</span></div>
        <div><span className="lab">{t('cols.reserved')}</span><span className={`val${v.reserved ? '' : ' dim'}`}>{v.reserved}</span></div>
        <div><span className="lab">{t('cols.available')}</span><span className={`val${isOut(v) ? ' err' : isLow(v) ? ' warn' : ''}`}>{v.available}</span></div>
      </div>

      <div className="sec-h"><span className="kicker">{t('movement.title')}</span></div>
      <ActionForm action={recordMovement} submit={t('movement.submit')} resetOnSuccess>
        <input type="hidden" name="variant_id" value={v.variant_id} />
        <div className="fgrid">
          <div className="field">
            <label htmlFor="delta">{t('movement.delta')}</label>
            <input id="delta" name="delta" type="number" step="1" defaultValue="1" required inputMode="numeric" />
          </div>
          <div className="field">
            <label htmlFor="reason">{t('movement.reason')}</label>
            <select id="reason" name="reason" defaultValue="intake">
              {REASONS.map(r => <option key={r} value={r}>{t(`movement.reasons.${r}`)}</option>)}
            </select>
          </div>
          <div className="field wide">
            <label htmlFor="ref">{t('movement.ref')}</label>
            <input id="ref" name="ref" autoComplete="off" />
          </div>
        </div>
      </ActionForm>
      <p className="note" style={{ marginTop: 10 }}>{t('movement.note')}</p>

      <div className="sec-h" style={{ marginTop: 22 }}><span className="kicker">{t('ledger.title')}</span></div>
      {moves.length ? (
        <ul className="ledger">
          {moves.map(m => (
            <li key={m.id}>
              <span className="d">{df.format(new Date(m.at))}</span>
              <span className="r">{t(`movement.reasons.${m.reason}`)}{m.ref ? ` · ${m.ref}` : ''}{m.actor ? ` · ${tc('by', { who: m.actor })}` : ''}</span>
              <span className={`q${m.delta < 0 ? ' neg' : ''}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
            </li>
          ))}
        </ul>
      ) : <p className="empty">{t('ledger.empty')}</p>}

      <div className="sec-h" style={{ marginTop: 22 }}><span className="kicker">{t('edit.title')}</span></div>
      <ActionForm action={saveVariant} submit={t('edit.submit')}>
        <input type="hidden" name="variant_id" value={v.variant_id} />
        <div className="fgrid">
          <div className="field">
            <label htmlFor="dose">{t('edit.dose')}</label>
            <input id="dose" name="dose" defaultValue={v.dose} required />
          </div>
          <div className="field">
            <label htmlFor="content">{t('edit.content')}</label>
            <input id="content" name="content" defaultValue={v.content} required />
          </div>
          <div className="field">
            <label htmlFor="low_stock_threshold">{t('edit.threshold')}</label>
            <input id="low_stock_threshold" name="low_stock_threshold" type="number" min="0" step="1" defaultValue={v.low_stock_threshold} />
          </div>
        </div>
        <label className="check"><input type="checkbox" name="is_cold_chain" defaultChecked={v.is_cold_chain} />{t('edit.cold')}</label>
        <label className="check"><input type="checkbox" name="is_active" defaultChecked={v.is_active} />{t('edit.active')}</label>
      </ActionForm>

      {v.kind === 'peptide' ? <div className="ruo" style={{ marginTop: 18 }}>{t('ruo')}</div> : null}
    </>
  );
}
