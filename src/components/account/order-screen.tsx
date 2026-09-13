import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { idr, num } from '@/lib/money';
import { fmtLong, fmtShort, fmtStamp } from '@/lib/domain/dates';
import { nextAction } from '@/lib/domain/next-action';
import { rv } from '@/components/console/shared/reveal';
import type { CutoffSetting } from '@/lib/domain/cutoff';
import type { DeliveryLeg, Line, OrderRow } from './data';
import { chipToneFor, CHIPS, NextBox, orderView, RuoNote, StateChip, Timeline, WaLink } from './ui';
import { CancelForm, ReorderButton, TransferForm } from './client-forms';

/**
 * One order, in the client's words. The timeline is `orderSteps` laid vertically — the same five
 * moments the Console reads across the top of its sheet — and the next line, the chip and the
 * footer button all come from `nextAction`, so the page cannot disagree with itself.
 *
 * While payment is due the page carries everything needed to make the transfer: the invoice
 * number as the reference, the amount, the date and the bank the invoice was issued against.
 */
export async function OrderScreen({ order, lines, legs, events, cutoff, bank, whatsapp }: {
  order: OrderRow; lines: Line[]; legs: DeliveryLeg[];
  events: { at: Date; actor_label: string; from_state: string | null; to_state: string }[];
  cutoff: CutoffSetting; bank: Record<string, string> | null; whatsapp: string;
}) {
  const t = await getTranslations('account');
  const tc = await getTranslations('common');
  const locale = await getLocale();
  const o = order;
  const na = nextAction(orderView(o), cutoff);

  const chip = o.state === 'awaiting_payment' && o.paid_claim_at ? 'transfer_reported'
    : o.state === 'awaiting_payment' && o.invoice_due_at && new Date(o.invoice_due_at) < new Date() ? 'overdue'
      : o.state;

  // Lines are grouped by where they go, because that is what the delivery charge is charged on.
  const groups: { site: string | null; lines: Line[] }[] = [];
  for (const l of lines) {
    const key = l.site_name ?? null;
    let g = groups.find(x => x.site === key);
    if (!g) groups.push((g = { site: key, lines: [] }));
    g.lines.push(l);
  }
  const legFor = (site: string | null) => legs.find(x => x.site_name === site) ?? null;

  const payable = o.state === 'awaiting_payment' && !!o.invoice_number && !o.invoice_paid_at && !o.invoice_voided_at;
  const bankRow = (o.invoice_bank ?? bank) as Record<string, string> | null;
  const peptide = lines.some(l => l.kind === 'peptide');
  const hidden = num(o.visible_goods) < num(o.subtotal_idr);
  const ppn = num(o.invoice_ppn_idr);

  // A state name never reaches the reader: the audit trail speaks the same words the chips do.
  const said = (state: string | null) => (state && CHIPS.has(state) ? t(`chip.${state}` as 'chip.delivered') : (state ?? ''));

  return (
    <>
      <div className="pagehead rv" style={rv(0)}>
        <span className="kicker">{t('order.kicker')}</span>
        <h1 className="pagettl">{o.number}</h1>
        <div className="hrow">
          <StateChip state={chip} tone={chipToneFor(chip)} />
          <span className="note">{fmtLong(o.placed_at, locale)}</span>
          {o.quote_number ? (
            <Link className="tlink" href={`/account/quotes/${o.quote_number}`}>{t('order.from_quote', { number: o.quote_number })}</Link>
          ) : null}
        </div>
      </div>

      <NextBox na={na} />

      <div className="split">
        <section className="sec rv" style={rv(1)}>
          <div className="sec-h"><span className="kicker">{t('order.timeline')}</span></div>
          <Timeline order={o} cutoff={cutoff} />

          {payable ? (
            <div className="paybox">
              <div className="sec-h"><span className="kicker">{t('order.payment')}</span></div>
              <div className="kv"><span className="k">{t('order.invoice')}</span><span className="v">{o.invoice_number}</span></div>
              <div className="kv"><span className="k">{t('order.amount_due')}</span><span className="v">{idr(o.invoice_total_idr)}</span></div>
              <div className="kv"><span className="k">{t('order.due_date')}</span><span className="v">{fmtLong(o.invoice_due_at, locale)}</span></div>
              {bankRow ? (
                <>
                  <div className="kv"><span className="k">{t('order.bank')}</span><span className="v">{bankRow.bank}</span></div>
                  <div className="kv"><span className="k">{t('order.account_name')}</span><span className="v">{bankRow.account_name}</span></div>
                  <div className="kv"><span className="k">{t('order.account_no')}</span><span className="v tnum">{bankRow.account_no}</span></div>
                </>
              ) : null}
              <div className="kv"><span className="k">{t('order.reference')}</span><span className="v ref">{o.invoice_number}</span></div>
              <p className="note">{t('order.reference_note')}</p>
              {o.paid_claim_at
                ? <p className="note reported" data-reported>{t('order.reported', { when: fmtStamp(o.paid_claim_at, locale) })}</p>
                : <TransferForm number={o.number} />}
            </div>
          ) : null}

          {o.state === 'dispatched' || o.state === 'delivered' ? (
            <div className="block">
              <div className="sec-h"><span className="kicker">{t('order.tracking')}</span></div>
              {o.carrier ? <div className="kv"><span className="k">{t('order.carrier')}</span><span className="v">{o.carrier}</span></div> : null}
              {o.tracking_no ? <div className="kv"><span className="k">{t('order.tracking_no')}</span><span className="v">{o.tracking_no}</span></div> : null}
              {o.dispatched_at ? <div className="kv"><span className="k">{t('order.dispatched_label')}</span><span className="v">{fmtStamp(o.dispatched_at, locale)}</span></div> : null}
              {o.delivered_at
                ? <div className="kv"><span className="k">{t('order.eta')}</span><span className="v">{t('order.delivered_on', { when: fmtShort(o.delivered_at, locale) })}</span></div>
                : o.eta_at ? <div className="kv"><span className="k">{t('order.eta')}</span><span className="v">{fmtLong(o.eta_at, locale)}</span></div> : null}
            </div>
          ) : null}

          <div className="block">
            <div className="sec-h"><span className="kicker">{t('order.history')}</span></div>
            {o.requested_by ? <div className="kv"><span className="k">{t('order.requested_by', { name: o.requested_by })}</span><span className="v">{fmtShort(o.placed_at, locale)}</span></div> : null}
            {o.accepted_by ? <div className="kv"><span className="k">{t('order.accepted_by', { name: o.accepted_by })}</span><span className="v">{fmtShort(o.placed_at, locale)}</span></div> : null}
            {o.paid_claim_at && o.paid_claim_name ? <div className="kv"><span className="k">{t('order.reported_by', { name: o.paid_claim_name })}</span><span className="v">{fmtStamp(o.paid_claim_at, locale)}</span></div> : null}
            {o.invoice_paid_at ? <div className="kv"><span className="k">{t('order.paid_label')}</span><span className="v">{fmtShort(o.invoice_paid_at, locale)}</span></div> : null}
            <div className="hist">
              {events.map((e, i) => (
                <div className="kv" key={i}>
                  <span className="k">{fmtStamp(e.at, locale)} · {e.actor_label}</span>
                  <span className="v">{t('order.event', { from: said(e.from_state), to: said(e.to_state) })}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="sec rv" style={rv(2)}>
          <div className="sec-h"><span className="kicker">{t('order.lines')}</span></div>
          {groups.map(g => {
            const leg = legFor(g.site);
            return (
              <div key={g.site ?? 'default'} className="lgroup">
                <div className="grpline">
                  <span className="nm">{g.site ? t('order.destination', { site: g.site }) : t('order.no_destination')}</span>
                  <span className="sp" />
                  <span>{leg ? tc('units', { count: leg.units }) : ''}</span>
                </div>
                {g.lines.map(l => (
                  <div className="kv" key={l.id}>
                    <span className="k">{l.name}{l.kind === 'peptide' ? ` · ${l.dose}` : ''} × {l.qty}
                      {l.interval_days ? <span className="sub">{t('order.plan_line', { days: l.interval_days, pct: Number(l.discount_pct) })}{l.list_price_idr && l.list_price_idr !== l.unit_price_idr ? ` · ${t('order.list_was', { price: idr(l.list_price_idr) })}` : ''}</span> : null}
                    </span>
                    <span className="v">{idr(l.line_total_idr)}</span>
                  </div>
                ))}
                {groups.length > 1 ? (
                  <div className="kv legrow">
                    <span className="k">{t('order.delivery')}</span>
                    <span className="v">{leg ? (leg.charge_idr === null ? tc('rate_pending') : idr(leg.charge_idr)) : idr(0)}</span>
                  </div>
                ) : null}
              </div>
            );
          })}

          {hidden ? <p className="note" style={{ marginTop: 12 }}>{t('order.peptide_lines_hidden')}</p> : null}

          <div className="totals">
            <div className="kv"><span className="k">{t('order.subtotal')}</span><span className="v">{idr(o.subtotal_idr)}</span></div>
            <div className="kv"><span className="k">{t('order.delivery')}</span><span className="v">{idr(o.delivery_idr)}</span></div>
            {ppn > 0 ? <div className="kv"><span className="k">{t('order.ppn', { rate: num(o.invoice_ppn_rate) })}</span><span className="v">{idr(ppn)}</span></div> : null}
            <div className="big-total">
              <span className="kicker">{t('order.total')}</span>
              <span className="v">{idr(o.invoice_total_idr && !o.invoice_voided_at ? o.invoice_total_idr : o.total_idr)}</span>
            </div>
          </div>


          {o.invoice_voided_at ? <p className="note" style={{ marginTop: 14 }}>{t('order.voided')}</p> : null}
          {o.state === 'cancelled' ? <p className="note" style={{ marginTop: 14 }}>{t('order.cancelled_note')}</p> : null}

          <div className="block">
            <div className="sec-h"><span className="kicker">{t('order.documents')}</span></div>
            {o.invoice_number ? (
              <a className="btn btn-sm" href={`/api/documents/invoice/${o.invoice_number}`} target="_blank" rel="noopener noreferrer">
                <Icon name="download" />{t('order.download_pdf')}
              </a>
            ) : <p className="note">{t('profile.invoices_empty')}</p>}
          </div>

          {peptide ? <RuoNote /> : null}
          {o.state === 'awaiting_payment' || o.state === 'packing' ? <CancelForm number={o.number} /> : null}
        </section>
      </div>

      <div className="pagefoot rv" style={rv(3)}>
        <WaLink number={whatsapp} text={t('order.wa_message', { number: o.number })} label={t('order.message_team')} />
        {o.state === 'delivered' || o.state === 'cancelled' ? <ReorderButton number={o.number} label={t('order.reorder')} solid /> : null}
      </div>
    </>
  );
}
