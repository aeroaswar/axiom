import { getLocale, getTranslations } from 'next-intl/server';
import { idr, pct } from '@/lib/money';
import { ActionForm } from '../shared/action-form';
import { setCost, setPrice } from './actions';
import type { PriceChange, PricingRow } from './data';

/** One lot's arithmetic, the two numbers that can be set, and the audit of every price it has held. */
export async function PricingSheetBody({ r, changes, floor }: { r: PricingRow; changes: PriceChange[]; floor: number }) {
  const t = await getTranslations('console.pricing');
  const tc = await getTranslations('console.common');
  const locale = await getLocale();
  const df = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const low = !r.cost_assumed && Number(r.gm_pct) < floor;

  return (
    <>
      <div className="hrow" style={{ marginBottom: 14 }}>
        {low ? <span className="chip warn"><span className="dot" />{t('under_floor', { floor })}</span> : null}
        {r.cost_assumed ? <span className="chip"><span className="dot" />{t('assumed')}</span> : null}
      </div>

      <div className="kv"><span className="k">{t('sheet.supplier')}</span><span className="v">{idr(r.supplier_cost_idr)}</span></div>
      <div className="kv"><span className="k">{t('sheet.pen')}</span><span className="v">{Number(r.pen_cost_idr) ? idr(r.pen_cost_idr) : <span className="dim-2">—</span>}</span></div>
      <div className="kv"><span className="k">{t('sheet.base')}</span><span className="v">{idr(r.base_idr)}</span></div>
      <div className="kv"><span className="k">{t('sheet.selling')}</span><span className="v">{idr(r.price_idr)}</span></div>
      <div className="big-total">
        <span className="k">{t('sheet.margin')}</span>
        <span className="v">{idr(r.margin_idr)} · {pct(r.gm_pct)}</span>
      </div>

      <div className="sec-h" style={{ marginTop: 20 }}><span className="kicker">{t('sheet.price_title')}</span></div>
      <ActionForm action={setPrice} submit={t('sheet.price_submit')}>
        <input type="hidden" name="variant_id" value={r.variant_id} />
        <div className="field">
          <label htmlFor="price">{t('sheet.price_label')}</label>
          <input id="price" name="price" inputMode="numeric" autoComplete="off" defaultValue={r.price_idr} required />
        </div>
      </ActionForm>
      <p className="note" style={{ marginTop: 10 }}>{t('sheet.price_note')}</p>

      <div className="sec-h" style={{ marginTop: 22 }}><span className="kicker">{t('sheet.cost_title')}</span></div>
      <ActionForm action={setCost} submit={t('sheet.cost_submit')}>
        <input type="hidden" name="variant_id" value={r.variant_id} />
        <div className="fgrid">
          <div className="field">
            <label htmlFor="supplier">{t('sheet.supplier_label')}</label>
            <input id="supplier" name="supplier" inputMode="numeric" autoComplete="off" defaultValue={r.supplier_cost_idr} required />
          </div>
          <div className="field">
            <label htmlFor="pen">{t('sheet.pen_label')}</label>
            <input id="pen" name="pen" inputMode="numeric" autoComplete="off" defaultValue={r.pen_cost_idr} required />
          </div>
        </div>
        <label className="check"><input type="checkbox" name="assumed" defaultChecked={r.cost_assumed} />{t('sheet.assumed_label')}</label>
      </ActionForm>

      <div className="sec-h" style={{ marginTop: 22 }}><span className="kicker">{t('sheet.audit_title')}</span></div>
      {changes.length ? (
        <ul className="ledger">
          {changes.map(c => (
            <li key={c.id}>
              <span className="d">{df.format(new Date(c.at))}</span>
              <span className="r">{c.who ? tc('by', { who: c.who }) : ''}</span>
              <span className="q">{t('sheet.audit_row', { from: idr(c.from_idr), to: idr(c.to_idr) })}</span>
            </li>
          ))}
        </ul>
      ) : <p className="empty">{t('sheet.audit_empty')}</p>}
    </>
  );
}
