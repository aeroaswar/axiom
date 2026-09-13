'use client';
import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { idr, planNet } from '@/lib/money';
import { addToBasketAction, type BasketResult } from '@/app/[locale]/(public)/actions';
import { ADDED_EVENT, BASKET_EVENT } from './basket-badge';
import { addDays, fmtLong, now } from '@/lib/domain/dates';
import { NotifyForm } from './notify-form';

/**
 * The purchase box on a product page: the size chips, the price, one-time or a delivery plan, the
 * interval, the quantity, and one real form that posts to the basket. Every figure arrives as a
 * prop from the server (the catalogue row and `site_settings.subscribe_tiers`); nothing numeric is
 * typed here. The net price shown is `planNet`, the same arithmetic `axiom.send_quote` freezes, so
 * the reader sees before requesting what the quote will carry.
 *
 * A size that is sold out stays in the row, hatched and struck, and cannot be chosen. Without
 * JavaScript the form still posts the first size as a one-time purchase.
 */
export type BuyVariant = { sku: string; dose: string; content: string; price_idr: number | null; available: number; is_cold_chain: boolean };
export type BuyTier = { days: number; pct: number };

function Submit({ label, busy, done, disabled }: { label: string; busy: string; done: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-solid" disabled={pending || disabled} data-added={done ? '1' : undefined}>
      {pending ? busy : done ? <><Icon name="check" /> {label}</> : label}
    </button>
  );
}

export function BuyBox({ name, kind, variants, tiers, initialSku, basketHref, whatsapp, priceNote, cutoffNote, locale }: {
  name: string; kind: 'peptide' | 'device' | 'apparel'; variants: BuyVariant[]; tiers: BuyTier[]; initialSku?: string;
  basketHref: string; whatsapp: string; priceNote: string; cutoffNote: string; locale: string;
}) {
  const t = useTranslations('site.product');
  // the next delivery dates are the device's today plus the interval: read after mount so the
  // server's HTML and the client's first paint agree
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => { setToday(now()); }, []);
  const firstOpen = variants.find(v => v.available > 0) ?? variants[0];
  const [sku, setSku] = useState(() => {
    const asked = variants.find(v => v.sku === initialSku);
    return asked && asked.available > 0 ? asked.sku : firstOpen?.sku ?? '';
  });
  const [plan, setPlan] = useState<'once' | 'sub'>('once');
  const [days, setDays] = useState<number>(tiers[0]?.days ?? 0);
  const [qty, setQty] = useState(1);
  const [state, action] = useActionState<BasketResult | null, FormData>(addToBasketAction, null);
  // "Added" describes the selection that was added; change the selection and the button is a fresh ask.
  const [doneKey, setDoneKey] = useState<string | null>(null);
  const selectionKey = `${sku}|${plan}|${days}|${qty}`;
  useEffect(() => {
    if (state?.ok) {
      window.dispatchEvent(new Event(BASKET_EVENT));
      window.dispatchEvent(new CustomEvent(ADDED_EVENT, { detail: { sku, plan: plan === 'sub' && canPlan && tier ? tier.days : null } }));
      setDoneKey(selectionKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.at, state?.ok]);

  const v = useMemo(() => variants.find(x => x.sku === sku) ?? firstOpen, [variants, sku, firstOpen]);
  const canPlan = kind === 'peptide' && tiers.length > 0;
  const tier = tiers.find(x => x.days === days) ?? tiers[0];
  const maxPct = tiers.reduce((m, x) => Math.max(m, x.pct), 0);
  const list = v?.price_idr ?? null;
  const net = list === null ? null : plan === 'sub' && canPlan && tier ? planNet(list, tier.pct) : list;
  const saving = list !== null && net !== null ? list - net : 0;
  const bestSaving = list === null ? null : list - planNet(list, maxPct);
  const out = !v || v.available <= 0;
  const added = !!state?.ok && doneKey === selectionKey;

  return (
    <div className="buy">
    <form action={action} className="buy-form" aria-label={t('add')}>
      <input type="hidden" name="sku" value={v?.sku ?? ''} />
      <input type="hidden" name="delta" value={qty} />
      <input type="hidden" name="interval_days" value={plan === 'sub' && canPlan && tier ? tier.days : ''} />

      {variants.length > 1 ? (
        <>
          <span className="lab" id="size-label">{kind === 'peptide' ? t('size') : t('option')}</span>
          <div className="sizes" role="radiogroup" aria-labelledby="size-label">
            {variants.map(x => {
              const soldOut = x.available <= 0;
              return (
                <button
                  key={x.sku} type="button" role="radio" aria-checked={x.sku === v?.sku} aria-disabled={soldOut || undefined}
                  className={`size${x.sku === v?.sku ? ' on' : ''}${soldOut ? ' out' : ''}`}
                  onClick={() => { if (!soldOut) setSku(x.sku); }}
                  title={soldOut ? t('sold_out') : undefined}
                >
                  <span className="d">{x.dose}</span>
                  {soldOut ? <span className="so">{t('sold_out')}</span> : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="price-big" aria-live="polite">
        <span className="now">{net === null ? '—' : idr(net)}</span>
        {list !== null && net !== null && net !== list ? <span className="strike">{idr(list)}</span> : null}
        {v ? <span className="per">{t('per', { dose: v.dose })}</span> : null}
      </div>
      {list !== null ? <p className="price-note">{priceNote}</p> : null}
      <div className={`avail-line${out ? ' none' : v && v.available <= 3 ? ' low' : ''}`}>
        <span className="dot" />
        {out ? t('none_left') : v && v.available <= 3 ? t('low', { count: v.available }) : t('available', { count: v?.available ?? 0 })}
      </div>
      {!out && cutoffNote ? <p className="cutoff-line"><Icon name="clock" /> {cutoffNote}</p> : null}

      {out ? null : canPlan ? (
        <>
          <div className="opts" role="radiogroup" aria-label={t('once_title')}>
            <button type="button" role="radio" aria-checked={plan === 'once'} className={`opt${plan === 'once' ? ' on' : ''}`} onClick={() => setPlan('once')}>
              <span className="rad" aria-hidden="true" />
              <span>
                <span className="t">{t('once_title')}</span>
                <span className="s">{list === null ? '—' : t('once_sub', { price: idr(list) })}</span>
              </span>
            </button>
            <button type="button" role="radio" aria-checked={plan === 'sub'} className={`opt${plan === 'sub' ? ' on' : ''}`} onClick={() => setPlan('sub')}>
              <span className="rad" aria-hidden="true" />
              <span>
                <span className="t">{t('sub_title')} <span className="chip">{t('sub_badge', { pct: maxPct })}</span></span>
                <span className="s">{bestSaving === null ? t('sub_sub_gated') : t('sub_sub', { amount: idr(plan === 'sub' ? saving : bestSaving) })}</span>
              </span>
            </button>
          </div>
          {plan === 'sub' ? (
            <div className="freq-box">
              <span className="lab" id="freq-label">{t('freq')}</span>
              <div className="freq" role="radiogroup" aria-labelledby="freq-label">
                {tiers.map(x => (
                  <button key={x.days} type="button" role="radio" aria-checked={x.days === tier?.days} className={x.days === tier?.days ? 'on' : ''} onClick={() => setDays(x.days)}>
                    <span className="e">{t('freq_every', { days: x.days })}</span>
                    <span className="sv">{t('freq_save', { pct: x.pct })}</span>
                  </button>
                ))}
              </div>
              {tier && today ? (
                <p className="freq-dates">
                  {t.rich('freq_dates', { days: tier.days, d1: fmtLong(addDays(today, tier.days), locale), d2: fmtLong(addDays(today, tier.days * 2), locale), b: c => <b>{c}</b> })}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <p className="note" style={{ marginBottom: 6 }}>{t('once_only')}</p>
      )}

      <div className="buy-foot" hidden={out}>
        <span className="qty" aria-label={t('qty')}>
          <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="−"><Icon name="minus" /></button>
          <span className="tnum">{qty}</span>
          <button type="button" onClick={() => setQty(q => Math.min(99, q + 1))} aria-label="+"><Icon name="plus" /></button>
        </span>
        {out ? null : (
          <Submit label={added ? t('added') : t('add')} busy={t('adding')} done={added} disabled={net === null} />
        )}
      </div>
      {added ? <p className="go-basket"><Link href={basketHref} className="tlink">{t('go_basket')} <Icon name="arrow" className="ar" /></Link></p> : null}

      {canPlan && !out ? (
        <div className="how"><b>{t('plan_how')}</b>{t('plan_how_body')}</div>
      ) : null}
    </form>
    {out && v ? <NotifyForm sku={v.sku} name={name} dose={v.dose} whatsapp={whatsapp} /> : null}
    </div>
  );
}
