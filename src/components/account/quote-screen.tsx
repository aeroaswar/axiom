import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { fmtLong, fmtStamp } from '@/lib/domain/dates';
import { nextActionQ, quoteExpires } from '@/lib/domain/next-action';
import { rv } from '@/components/console/shared/reveal';
import type { DeliveryLeg, Line, QuoteRow } from './data';
import { chipToneFor, NextBox, quoteView, RuoNote, StateChip, WaLink } from './ui';
import { AcceptQuote, RequoteButton } from './client-forms';

/**
 * A sent quote is an offer with a life: prices frozen the moment it went out, delivery priced per
 * destination, valid for the stated days. Accepting it is one action — it creates the order with
 * all of that frozen onto it and issues the invoice — so the page says exactly what that means
 * before the button, not after it.
 */
export async function QuoteScreen({ quote, lines, legs, whatsapp, payDays, quoteDays }: {
  quote: QuoteRow; lines: Line[]; legs: DeliveryLeg[]; whatsapp: string; payDays: number; quoteDays: number;
}) {
  const t = await getTranslations('account');
  const tc = await getTranslations('common');
  const locale = await getLocale();
  const q = quote;
  const na = nextActionQ(quoteView(q));
  const expires = quoteExpires({ ...quoteView(q), quote_days: quoteDays });
  const requested = q.state === 'requested' || q.state === 'draft';
  const goods = lines.reduce((a, l) => a + Number(l.line_total_idr ?? 0), 0);
  const deliveryKnown = legs.every(l => l.charge_idr !== null);
  const delivery = legs.reduce((a, l) => a + (l.charge_idr ?? 0), 0);
  const peptide = lines.some(l => l.kind === 'peptide');
  const showPrices = !q.unpriced;

  return (
    <>
      <div className="pagehead rv" style={rv(0)}>
        <span className="kicker">{requested ? t('quote.request_kicker') : t('quote.kicker')}</span>
        <h1 className="pagettl">{q.number}</h1>
        <div className="hrow">
          <StateChip state={q.state} tone={chipToneFor(q.state)} />
          <span className="note">{t('quote.requested_on', { when: fmtLong(q.created_at, locale) })}</span>
          {q.requested_by ? <span className="note">{t('quote.requested_by', { name: q.requested_by })}</span> : null}
        </div>
      </div>

      <NextBox na={na} />

      <div className="split">
        <section className="sec rv" style={rv(1)}>
          <div className="sec-h"><span className="kicker">{t('quote.lines')}</span></div>
          {lines.map(l => (
            <div className="kv" key={l.id}>
              <span className="k">
                {l.name}{l.kind === 'peptide' ? ` · ${l.dose}` : ''} × {l.qty}
                {l.site_name ? <span className="sub">{t('order.destination', { site: l.site_name })}</span> : null}
              </span>
              <span className="v">{l.unit_price_idr === null ? <span className="dim-2">{t('quote.priced_later')}</span> : idr(l.line_total_idr)}</span>
            </div>
          ))}

          {legs.length ? (
            <div className="delivery-legs">
              {legs.map(l => (
                <div className="kv" key={l.site_id ?? l.site_name}>
                  <span className="k">{t('order.delivery_leg', { site: l.site_name, units: l.units })}</span>
                  <span className="v">{l.charge_idr === null ? tc('rate_pending') : idr(l.charge_idr)}</span>
                </div>
              ))}
            </div>
          ) : null}

          {showPrices ? (
            <div className="totals">
              <div className="kv"><span className="k">{t('order.subtotal')}</span><span className="v">{idr(goods)}</span></div>
              <div className="kv"><span className="k">{t('order.delivery')}</span><span className="v">{deliveryKnown ? idr(delivery) : tc('rate_pending')}</span></div>
              <div className="big-total">
                <span className="kicker">{t('order.total')}</span>
                <span className="v">{deliveryKnown ? idr(goods + delivery) : idr(goods)}</span>
              </div>
            </div>
          ) : (
            <p className="note" style={{ marginTop: 16 }}>{t('quote.being_priced')}</p>
          )}

          {peptide ? <RuoNote /> : null}
        </section>

        <section className="sec rv" style={rv(2)}>
          <div className="sec-h"><span className="kicker">{t('quote.decide')}</span></div>

          {q.state === 'sent' ? (
            <>
              <div className="kv"><span className="k">{t('quote.sent_on', { when: fmtStamp(q.sent_at, locale) })}</span><span className="v" /></div>
              <div className="kv"><span className="k">{t('quote.valid_until', { date: fmtLong(expires, locale) })}</span><span className="v" /></div>
              <p className="note" style={{ margin: '14px 0 18px' }}>{t('quote.accept_note', { days: payDays })}</p>
              <AcceptQuote number={q.number} label={t('quote.accept')} />
            </>
          ) : null}

          {q.state === 'expired' ? (
            <>
              <p className="note">{t('quote.expired', { date: fmtLong(expires, locale) })}</p>
              <div className="hrow" style={{ marginTop: 16 }}>
                <RequoteButton number={q.number} label={t('quote.reorder')} solid />
              </div>
            </>
          ) : null}

          {q.state === 'accepted' && q.order_number ? (
            <>
              <p className="note">{t('quote.accepted', { when: fmtLong(q.accepted_at, locale), number: q.order_number })}</p>
              <div className="hrow" style={{ marginTop: 16 }}>
                <Link className="btn btn-sm btn-accent" href={`/account/orders/${q.order_number}`}>{t('quote.open_order', { number: q.order_number })}</Link>
              </div>
            </>
          ) : null}

          {q.state === 'lost' ? (
            <>
              <p className="note">{t('quote.lost')}</p>
              <div className="hrow" style={{ marginTop: 16 }}><RequoteButton number={q.number} label={t('quote.reorder')} /></div>
            </>
          ) : null}

          {requested ? <p className="note">{t('quote.being_priced')}</p> : null}

          <div className="pagefoot">
            <WaLink number={whatsapp} label={t('quote.ask')}
              text={q.state === 'expired' ? t('quote.wa_requote', { number: q.number }) : t('quote.wa_message', { number: q.number })} />
          </div>
        </section>
      </div>
    </>
  );
}
