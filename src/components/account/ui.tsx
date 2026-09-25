import { getLocale, getTranslations } from 'next-intl/server';
import { Icon } from '@/components/shell/sprite';
import { fmtLong, fmtShort, fmtStamp } from '@/lib/domain/dates';
import { orderSteps, type NextAction, type OrderView } from '@/lib/domain/next-action';
import type { CutoffSetting } from '@/lib/domain/cutoff';
import type { OrderRow, QuoteRow } from './data';

/**
 * The account's vocabulary, in one place. Every label here is a message key with parameters, so a
 * state name never reaches the reader: a quote that is `sent` reads "waiting for your acceptance",
 * an order that is `awaiting_payment` reads "payment due 11 Sep".
 */

/** `nextAction` returns a key, its parameters and a date; the surface supplies the date's format. */
export function naValues(na: NextAction, locale: string): Record<string, string | number> {
  return { ...na.params, date: na.at ? fmtShort(na.at, locale) : '' };
}

/** The order as `nextAction` and `orderSteps` want it, from the row the account read. */
export function orderView(o: OrderRow): OrderView & { invoice_number?: string | null; accepted_at?: Date | null } {
  return {
    state: o.state,
    placed_at: o.placed_at,
    accepted_at: o.placed_at,
    paid_claim_at: o.paid_claim_at,
    delivered_at: o.delivered_at,
    cancelled_at: o.cancelled_at,
    dispatched_at: o.dispatched_at,
    invoice_due_at: o.invoice_due_at,
    invoice_paid_at: o.invoice_paid_at,
    invoice_voided_at: o.invoice_voided_at,
    held_idr: o.held_idr,
    invoice_number: o.invoice_number,
    cold: o.cold,
    eta_days: o.eta_days,
    reorder_due_at: o.reorder_due_at ?? null,
    cadence_days: o.cadence_days ?? null,
  };
}

export function quoteView(q: QuoteRow) {
  return {
    state: (q.state === 'expired' ? 'sent' : q.state) as 'requested' | 'draft' | 'sent' | 'accepted' | 'lost',
    created_at: q.created_at,
    sent_at: q.sent_at,
    accepted_at: q.accepted_at,
    order_number: q.order_number,
  };
}

/**
 * Only an exception earns a chip. Delivered, paid and current are the norm and stay quiet text
 * with a dot; awaiting payment, packing, on its way, expired and cancelled keep the border.
 */
export async function StateChip({ state, tone }: { state: string; tone?: 'warn' | 'err' | 'ok' | 'quiet' }) {
  const t = await getTranslations('account.chip');
  const quiet = tone === 'quiet';
  return (
    <span className={`chip${quiet ? ' quiet' : tone ? ` ${tone}` : ''}`}>
      <span className="dot" />{t(state)}
    </span>
  );
}

/** Every state the account has a word for; anything outside it is never printed to the reader. */
export const CHIPS = new Set([
  'requested', 'draft', 'sent', 'expired', 'accepted', 'lost', 'awaiting_payment', 'packing',
  'dispatched', 'delivered', 'cancelled', 'overdue', 'paid', 'issued', 'void', 'transfer_reported',
]);

const QUIET = new Set(['delivered', 'accepted', 'lost', 'requested', 'draft', 'paid']);
const ERR = new Set(['cancelled', 'expired', 'overdue', 'void']);

export function chipToneFor(state: string): 'warn' | 'err' | 'quiet' | undefined {
  if (QUIET.has(state)) return 'quiet';
  if (ERR.has(state)) return 'err';
  return 'warn';
}

/** The one line that says what happens next, in the reader's words, with its date. */
export async function NextBox({ na, tone }: { na: NextAction; tone?: '' | 'warn' | 'err' }) {
  const t = await getTranslations('account');
  const locale = await getLocale();
  return (
    <div className={`nxt${na.quiet ? ' quiet' : tone ? ` ${tone}` : na.tone ? ` ${na.tone}` : ''}`}>
      <span className="k">{t('order.next')}</span>
      <span className="v">{t(`next.${na.key}`, naValues(na, locale))}</span>
    </div>
  );
}

/** The five moments, vertically: the Console's stepper is the same function laid on its side. */
export async function Timeline({ order, cutoff }: { order: OrderRow; cutoff: CutoffSetting }) {
  const t = await getTranslations('account.steps');
  const locale = await getLocale();
  const steps = orderSteps(orderView(order), cutoff);

  const detail = (s: (typeof steps)[number]): string => {
    if (s.key === 'invoiced') {
      const label = (s as { label?: string }).label ?? '';
      return label === 'voided' ? t('voided') : label;
    }
    if (s.at) return fmtStamp(s.at, locale);
    const due = (s as { due?: Date | null }).due;
    if (s.key === 'paid' && due) return t('due', { date: fmtShort(due, locale) });
    const eta = (s as { eta?: { late: boolean; cutLabel: string; deliver: Date } | null }).eta;
    if (eta && s.key === 'dispatched') return eta.late ? t('pack_tomorrow') : t('pack_today', { cut: eta.cutLabel });
    if (eta && s.key === 'delivered') return t('est', { date: fmtShort(eta.deliver, locale) });
    if ((s as { off?: boolean }).off) return t('cancelled');
    return t('none');
  };

  return (
    <div className="tl">
      {steps.map(s => (
        <div key={s.key} className={`tl-i ${s.done ? 'done' : 'pend'}${s.now ? ' now' : ''}`}>
          <span className="t1">{t(s.key)}</span>
          <span className="t2">{detail(s)}</span>
        </div>
      ))}
    </div>
  );
}

/** The Research Use Only notice, wherever a peptide line is on the record. */
export async function RuoNote() {
  const tc = await getTranslations('common');
  return <div className="ruo" style={{ marginTop: 20 }}><b>RUO</b> {tc('ruo_full')}</div>;
}

/** WhatsApp is a first-class channel: a prefilled question, never a price the reader cannot see. */
export function WaLink({ number, text, label, solid }: { number: string; text: string; label: string; solid?: boolean }) {
  const to = number.replace(/[^\d]/g, '');
  return (
    <a className={`btn btn-sm${solid ? ' btn-accent' : ''}`} href={`https://wa.me/${to}?text=${encodeURIComponent(text)}`}
      target="_blank" rel="noopener noreferrer">
      <Icon name="wa" />{label}
    </a>
  );
}

/** A date the reader can read aloud. */
export async function LongDate({ at }: { at: Date | string | null | undefined }) {
  const locale = await getLocale();
  return <>{fmtLong(at, locale)}</>;
}
