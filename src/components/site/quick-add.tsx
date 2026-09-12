'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { idr, planNet } from '@/lib/money';
import { addToBasketAction, type BasketResult } from '@/app/[locale]/(public)/actions';
import { ADDED_EVENT, BASKET_EVENT } from './basket-badge';

/**
 * The card's Add. A card that advertises a plan, or holds more than one size, opens a compact
 * chooser in place — the size, one-time or a plan — so the card honours the tag it carries and the
 * basket line is right the first time. A single-size device or garment adds straight away. One
 * real form throughout: the hidden fields carry the choice, and without JavaScript the button
 * posts the first available size as a one-time line, as before.
 */
export type QuickVariant = { sku: string; dose: string; price_idr: number | null; available: number };
export type QuickTier = { days: number; pct: number };

function Submit({ label, busy, done, className, qa, onClick }: { label: React.ReactNode; busy: string; done: boolean; className: string; qa?: boolean; onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} data-added={done ? '1' : undefined} data-qa-add={qa ? '1' : undefined} data-qa-open={onClick ? '1' : undefined} onClick={onClick}>
      {pending ? busy : label}
    </button>
  );
}

export function QuickAdd({ kind, variants, tiers, ppn, initialSku }: { kind: 'peptide' | 'device' | 'apparel'; variants: QuickVariant[]; tiers: QuickTier[]; ppn: number; initialSku: string }) {
  const t = useTranslations('site.shop');
  const canPlan = kind === 'peptide' && tiers.length > 0;
  const chooser = canPlan || variants.length > 1;
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState(initialSku);
  const [plan, setPlan] = useState(0);
  const [state, action] = useActionState<BasketResult | null, FormData>(addToBasketAction, null);
  const [doneAt, setDoneAt] = useState<number | null>(null);
  const first = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!state?.ok) return;
    window.dispatchEvent(new Event(BASKET_EVENT));
    window.dispatchEvent(new CustomEvent(ADDED_EVENT, { detail: { sku, plan: plan || null } }));
    setOpen(false); setDoneAt(state.at);
    const id = setTimeout(() => setDoneAt(null), 1800);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.at, state?.ok]);
  useEffect(() => { if (open) first.current?.focus(); }, [open]);

  const v = variants.find(x => x.sku === sku) ?? variants[0];
  const tier = tiers.find(x => x.days === plan);
  const net = v.price_idr === null ? null : tier ? planNet(v.price_idr, tier.pct) : v.price_idr;
  const done = doneAt !== null && state?.at === doneAt;

  return (
    <form action={action}>
      <input type="hidden" name="sku" value={v.sku} />
      <input type="hidden" name="delta" value="1" />
      <input type="hidden" name="interval_days" value={canPlan && plan ? plan : ''} />
      {!open ? (
        // with JavaScript the button opens the chooser instead of posting; without it the hidden fields post the first size, one-time
        <Submit
          className="btn btn-sm" busy={t('adding')} done={done} label={done ? t('added') : t('add')}
          onClick={chooser && !done ? e => { e.preventDefault(); setOpen(true); } : undefined}
        />
      ) : null}
      {open ? (
        <div className="qa-panel" role="group" aria-label={t('add')}>
          {variants.length > 1 ? (
            <>
              <span className="lab">{kind === 'peptide' ? t('qa_size') : t('qa_option')}</span>
              <div className="sizes" role="radiogroup">
                {variants.map((x, i) => {
                  const so = x.available <= 0;
                  return (
                    <button
                      key={x.sku} type="button" role="radio" aria-checked={x.sku === v.sku} aria-disabled={so || undefined}
                      className={`size${x.sku === v.sku ? ' on' : ''}${so ? ' out' : ''}`}
                      ref={i === 0 ? first : undefined}
                      onClick={() => { if (!so) setSku(x.sku); }}
                    >
                      <span className="d">{x.dose}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
          {canPlan ? (
            <>
              <span className="lab">{t('qa_plan')}</span>
              <div className="plans" role="radiogroup">
                <button type="button" role="radio" aria-checked={plan === 0} className={plan === 0 ? 'on' : ''} ref={variants.length > 1 ? undefined : first} onClick={() => setPlan(0)}>{t('qa_once')}</button>
                {tiers.map(x => (
                  <button key={x.days} type="button" role="radio" aria-checked={plan === x.days} className={plan === x.days ? 'on' : ''} onClick={() => setPlan(x.days)}>
                    {t('qa_every', { days: x.days })} <b>−{x.pct}%</b>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <div className="qa-foot">
            <span className="qa-price">
              <span className="mono-n">{net === null ? '—' : idr(net)}</span>
              {tier && v.price_idr !== null ? <s>{idr(v.price_idr)}</s> : null}
              <small>{t('qa_tax', { ppn })}</small>
            </span>
            {v.available > 0 && net !== null
              ? <Submit className="btn btn-sm btn-solid" busy={t('adding')} done={false} label={t('qa_add')} qa />
              : <span className="qa-out">{t('qa_sold_out')}</span>}
            <button type="button" className="link-x" onClick={() => setOpen(false)}>{t('qa_cancel')}</button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
