import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { Icon } from '@/components/shell/sprite';
import { quoteExpires, quoteState, nextActionQ, type QuoteView } from '@/lib/domain/next-action';
import { isRefused, type Leg, type Margin, type EventRow } from '@/lib/queries/orders';
import { sendBlockers, type QuoteDetail, type QuoteLine, type SiteOption, type VariantOption } from '@/lib/queries/quotes';
import { ActionForm } from '../shared/action-form';
import { acceptQuote, addLineForm, editLineForm, markLost, requote, saveNotes, sendQuote } from './actions';
import { SubmitOnChange } from './line-controls';
import { labels } from './labels';
import { waLink, withRuo } from './wa';

export type QuoteProps = {
  quote: QuoteDetail; lines: QuoteLine[]; legs: Leg[]; events: EventRow[]; sites: SiteOption[];
  options: VariantOption[]; margin: Margin | { refused: string };
  owner: boolean; quoteDays: number; payDays: number; ruo: string; siteUrl: string; floor: number;
};

const view = (q: QuoteDetail, days: number): QuoteView => ({
  state: q.state, created_at: q.created_at, sent_at: q.sent_at, accepted_at: q.accepted_at,
  lost_at: q.lost_at, order_number: q.order_number, quote_days: days,
});

/** The itemised IDR message the business actually closes on. Every line, every leg, then the notice. */
export async function quoteMessage(p: QuoteProps) {
  const t = await getTranslations('commerce.wa');
  const L = await labels();
  const total = (BigInt(p.quote.subtotal_idr) + BigInt(p.quote.delivery_idr)).toString();
  const parts = [
    t('quote_head', { number: p.quote.number }),
    p.quote.account,
    '',
    ...p.lines.map(l => t('line', {
      name: `${l.name}${l.kind === 'peptide' ? ` ${l.dose}` : ''}`, qty: l.qty, amount: idr(l.line_total_idr),
    })),
    '',
    ...p.legs.map(l => t('delivery', {
      site: l.site_name, units: t('units', { n: l.units }),
      amount: l.charge_idr === null ? t('rate_pending') : idr(l.charge_idr),
    })),
    t('total', { amount: idr(total) }),
    t('valid', { date: L.short(quoteExpires(view(p.quote, p.quoteDays)) ?? p.quote.created_at) }),
    '',
    t('document', { url: `${p.siteUrl}/api/documents/quote/${p.quote.number}` }),
  ];
  return withRuo(parts.join('\n'), p.quote.has_peptide, p.ruo);
}

// ---------------------------------------------------------------- shared pieces
async function Legs({ legs }: { legs: Leg[] }) {
  const t = await getTranslations('commerce.order');
  if (legs.length < 2) return null;
  return (
    <div className="delivery-legs">
      {legs.map(l => (
        <div className="kv" key={l.site_id}>
          <span className="k">{l.site_name} · {t('units', { n: l.units })}{l.capped ? ` · ${t('capped')}` : ''}</span>
          <span className={`v${l.charge_idr === null ? ' tone-warn' : ''}`}>
            {l.charge_idr === null ? t('rate_pending') : idr(l.charge_idr)}
          </span>
        </div>
      ))}
    </div>
  );
}

async function MarginBox({ margin, owner, floor }: { margin: Margin | { refused: string }; owner: boolean; floor: number }) {
  const t = await getTranslations('commerce.order');
  const tq = await getTranslations('commerce.quote');
  if (!owner) return null;
  const gmTone = !isRefused(margin) && Number(margin.gm_pct) < floor ? 'warn' : 'ok';
  return (
    <div className="margin-box owner-only">
      <span className="kicker">{tq('margin')}</span>
      {isRefused(margin) ? <p className="note">{t('margin_unavailable')}</p> : (
        <>
          <div className="kv"><span className="k">{t('revenue')}</span><span className="v">{idr(margin.revenue)}</span></div>
          <div className="kv"><span className="k">{t('supplier')}</span><span className="v">{idr(margin.supplier)}</span></div>
          {BigInt(margin.pen) > 0n ? <div className="kv"><span className="k">{t('pens')}</span><span className="v">{idr(margin.pen)}</span></div> : null}
          <div className="kv"><span className="k">{t('base')}</span><span className="v">{idr(margin.base)}</span></div>
          <div className="kv" style={{ border: 'none' }}>
            <span className="k">{t('margin_v')}</span>
            <span className="v" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {idr(margin.margin)}<span className={`chip ${gmTone} mchip`}><span className="dot" />{t('gm', { pct: Number(margin.gm_pct).toFixed(1) })}</span>
            </span>
          </div>
          <p className="note" style={{ marginTop: 6 }}>{t('margin_note')}</p>
        </>
      )}
    </div>
  );
}

async function History({ events }: { events: EventRow[] }) {
  const t = await getTranslations('commerce.order');
  const ts = await getTranslations('states');
  const L = await labels();
  const name = (s: string | null) => (!s || s === 'new' ? t('ev_new') : s === 'quote' ? t('ev_quote') : ts(`quote.${s}`));
  return (
    <>
      <div className="sec-h" style={{ marginTop: 22 }}><span className="kicker">{t('history')}</span></div>
      <div className="hist">
        {events.map((e, i) => (
          <div className="kv" key={i}>
            <span className="k">{L.stamp(e.at)} · {e.actor}</span>
            <span className="v">{t('moved', { from: name(e.from_state), to: name(e.to_state) })}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- the builder
/**
 * A requested or draft quote is edited in place. Every change is a call to `axiom.save_quote_draft`,
 * so availability, delivery and the total on screen are the database's answer, not a working copy
 * that could disagree with what Send would price. Send is disabled for exactly the three reasons
 * `axiom.send_quote` refuses: a line over what is available, a destination with no rate, and a
 * peptide line on an account without a current acknowledgement.
 */
export async function QuoteBuilderBody(p: QuoteProps) {
  const t = await getTranslations('commerce.quote');
  const tb = await getTranslations('commerce.builder');
  const L = await labels();
  const na = nextActionQ(view(p.quote, p.quoteDays));
  const b = sendBlockers(p.quote, p.lines, p.legs);
  const total = (BigInt(p.quote.subtotal_idr) + BigInt(p.quote.delivery_idr)).toString();
  const message = await quoteMessage(p);
  const capped = p.legs.filter(l => l.capped);

  const siteOptions = p.sites.map(s => ({
    value: s.id, label: s.priced ? s.name : `${s.name} · ${L.t('order.rate_pending').toLowerCase()}`,
  }));

  return (
    <>
      <div className={`nxt${na.tone ? ` ${na.tone}` : ''}`}>
        <span className="k">{L.t('order.next')}</span>
        <span className="v">{L.next(na)}</span>
      </div>

      <div className="nxt-act">
        {b.blocked ? (
          <>
            <button type="button" className="btn btn-sm btn-accent" disabled data-send-blocked>{L.t('act.send')}</button>
            <div className="blockers">
              {b.short.length ? <p className="note tone-warn">{t('short_note', { n: b.short.length })}</p> : null}
              {b.pending.length ? <p className="note tone-warn">{t('pending_note', { sites: b.pending.map(l => l.site_name).join(', '), n: b.pending.length })}</p> : null}
              {b.unacked ? <p className="note tone-warn">{tb(p.quote.ack === 'lapsed' ? 'ack_lapsed' : 'ack_none')}</p> : null}
              {b.empty ? <p className="note">{t('no_lines')}</p> : null}
            </div>
          </>
        ) : (
          <ActionForm action={sendQuote} submit={L.t('act.send')} tone="accent">
            <input type="hidden" name="quote_id" value={p.quote.id} />
          </ActionForm>
        )}
      </div>

      <div className="kv"><span className="k">{t('account')}</span><span className="v">
        <Link href={`/console/clients/${p.quote.account_id}`} scroll={false}>{p.quote.account}</Link>
      </span></div>

      {p.lines.map(l => (
        <div key={l.id}>
          {/* One form per control, referenced by id: a stepper cannot nest inside a destination
              select, and neither belongs inside the line's own text. */}
          {(['dec', 'inc', 'remove', 'site'] as const).map(op => (
            <form key={op} id={`${op}-${l.id}`} action={editLineForm} hidden>
              <input type="hidden" name="quote_id" value={p.quote.id} />
              <input type="hidden" name="line_id" value={l.id} />
              <input type="hidden" name="op" value={op} />
            </form>
          ))}
          <div className="kv">
            <span className="k">
              {l.name}{l.kind === 'peptide' ? ` · ${l.dose}` : ''}
              {l.qty > l.available ? <span className="short">{t('short', { avail: l.available, want: l.qty })}</span> : null}
              {p.sites.length > 1 ? (
                <SubmitOnChange id={`site-sel-${l.id}`} form={`site-${l.id}`} name="site_id"
                  value={l.site_id ?? p.sites[0].id} options={siteOptions}
                  ariaLabel={t('destination')} className="site-sel" />
              ) : null}
            </span>
            <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="qty">
                <button type="submit" form={`dec-${l.id}`} aria-label={t('less')}><Icon name="minus" /></button>
                <span className={l.qty > l.available ? 'tone-warn' : ''}>{l.qty}</span>
                <button type="submit" form={`inc-${l.id}`} aria-label={t('more')}><Icon name="plus" /></button>
              </span>
              <span style={{ minWidth: 96 }}>{idr(l.line_total_idr)}</span>
              <button type="submit" form={`remove-${l.id}`} className="linebtn" aria-label={t('remove')}><Icon name="trash" /></button>
            </span>
          </div>
        </div>
      ))}

      <form action={addLineForm} className="field" style={{ margin: '16px 0 4px' }}>
        <input type="hidden" name="quote_id" value={p.quote.id} />
        <SubmitOnChange id="add-line" name="variant_id" value="" ariaLabel={t('add')}
          options={[{ value: '', label: t('add_placeholder') }, ...p.options.map(o => ({
            value: o.variant_id,
            label: `${o.label} · ${idr(o.price_idr)}${o.available <= 0 ? ` · ${t('out')}` : o.available <= 3 ? ` · ${t('left', { n: o.available })}` : ''}`,
            disabled: o.available <= 0,
          }))]}>
          <label htmlFor="add-line">{t('add')}</label>
        </SubmitOnChange>
      </form>

      <div className="kv">
        <span className="k">{t('delivery')}</span>
        <span className={`v${p.quote.delivery_priced ? '' : ' tone-warn'}`}>
          {p.quote.delivery_priced ? idr(p.quote.delivery_idr) : L.t('order.rate_pending')}
        </span>
      </div>
      <Legs legs={p.legs} />

      <div className="big-total"><span className="kicker">{t('total')}</span><span className="v">{idr(total)}</span></div>

      {p.legs.length > 1 && p.quote.delivery_priced ? <p className="note">{t('split_note', { n: p.legs.length })}</p> : null}
      {capped.length ? <p className="note">{t('cap_note', { cap: idr(capped[0].cap_idr) })}</p> : null}

      <MarginBox margin={p.margin} owner={p.owner} floor={p.floor} />

      <div className="sec-h" style={{ marginTop: 20 }}><span className="kicker">{t('wa_preview')}</span></div>
      <div className="wa" data-wa>{message}</div>

      <div className="sec-h" style={{ marginTop: 20 }}><span className="kicker">{t('notes')}</span></div>
      <ActionForm action={saveNotes} submit={L.t('act.save_draft')}>
        <input type="hidden" name="quote_id" value={p.quote.id} />
        <div className="field">
          <label htmlFor="notes">{t('notes')}</label>
          <textarea id="notes" name="notes" rows={2} defaultValue={p.quote.notes ?? ''} />
          <span className="hint">{t('notes_hint')}</span>
        </div>
      </ActionForm>

      <div style={{ marginTop: 16 }}>
        <ActionForm action={markLost} submit={L.t('act.mark_lost')}>
          <input type="hidden" name="quote_id" value={p.quote.id} />
        </ActionForm>
      </div>

      <History events={p.events} />
      {p.quote.has_peptide ? <div className="ruo" style={{ marginTop: 18 }}>{p.ruo}</div> : null}
    </>
  );
}

// ---------------------------------------------------------------- the record
/** A quote that has left the builder: read it, then accept, resend, mark lost or open its order. */
export async function QuoteRecordBody(p: QuoteProps) {
  const t = await getTranslations('commerce.quote');
  const ts = await getTranslations('states');
  const L = await labels();
  const v = view(p.quote, p.quoteDays);
  const s = quoteState(v);
  const na = nextActionQ(v);
  const ex = quoteExpires(v);
  const total = (BigInt(p.quote.subtotal_idr) + BigInt(p.quote.delivery_idr)).toString();
  const chip = { requested: 'warn', draft: 'quiet', sent: 'info', expired: 'err', accepted: 'quiet ok', lost: 'quiet' }[s] ?? 'quiet';
  const quiet = s === 'accepted' || s === 'lost';

  return (
    <>
      <div className={`nxt${na.tone ? ` ${na.tone}` : quiet ? ' quiet' : ''}`}>
        <span className="k">{quiet ? L.t('order.closed') : L.t('order.next')}</span>
        <span className="v">{L.next(na)}</span>
      </div>

      <div className="nxt-act">
        {s === 'sent' ? (
          <ActionForm action={acceptQuote} submit={L.t('act.accept')} tone="accent">
            <input type="hidden" name="quote_id" value={p.quote.id} />
          </ActionForm>
        ) : s === 'expired' ? (
          <ActionForm action={sendQuote} submit={L.t('act.resend')} tone="accent">
            <input type="hidden" name="quote_id" value={p.quote.id} />
          </ActionForm>
        ) : s === 'accepted' && p.quote.order_number ? (
          <Link className="btn btn-sm btn-accent" href={`/console/orders/${p.quote.order_number}`} scroll={false}>
            <Icon name="receipt" />{L.t('act.open_order', { order: p.quote.order_number })}
          </Link>
        ) : (
          <ActionForm action={requote} submit={L.t('act.requote')} tone="accent">
            <input type="hidden" name="quote_number" value={p.quote.number} />
          </ActionForm>
        )}
      </div>

      <div className="hrow" style={{ margin: '14px 0' }}>
        <span className={`chip ${chip}`}><span className="dot" />{ts(`quote.${s}`)}</span>
        <span className="note">
          {p.quote.sent_at ? t('sent_at', { date: L.stamp(p.quote.sent_at) }) : t('created_at', { date: L.stamp(p.quote.created_at) })}
        </span>
      </div>

      <div className="kv"><span className="k">{t('account')}</span><span className="v">
        <Link href={`/console/clients/${p.quote.account_id}`} scroll={false}>{p.quote.account}</Link>
      </span></div>

      {p.lines.map(l => (
        <div className="kv" key={l.id}>
          <span className="k">
            {l.name}{l.kind === 'peptide' ? ` · ${l.dose}` : ''} × {l.qty}
            {p.sites.length > 1 && l.site_name ? <span className="short tone-dim">{l.site_name}</span> : null}
          </span>
          <span className="v">{idr(l.line_total_idr)}</span>
        </div>
      ))}

      <div className="kv">
        <span className="k">{t('delivery')}</span>
        <span className={`v${p.quote.delivery_priced ? '' : ' tone-warn'}`}>
          {p.quote.delivery_priced ? idr(p.quote.delivery_idr) : L.t('order.rate_pending')}
        </span>
      </div>
      <Legs legs={p.legs} />

      {ex ? (
        <div className="kv"><span className="k">{t('valid_to')}</span>
          <span className={`v${s === 'expired' ? ' tone-err' : ''}`}>{L.short(ex)}</span></div>
      ) : null}

      <div className="big-total"><span className="kicker">{t('total')}</span><span className="v">{idr(total)}</span></div>

      <MarginBox margin={p.margin} owner={p.owner} floor={p.floor} />

      {s === 'sent' ? <p className="note" style={{ marginTop: 14 }}>{t('sent_ok', { days: p.quoteDays })}</p> : null}
      {s === 'sent' ? <p className="note">{t('accept_note', { days: p.payDays })}</p> : null}
      {s === 'expired' ? <p className="note" style={{ marginTop: 14 }}>{t('resend_note', { days: p.quoteDays })}</p> : null}

      {s === 'sent' || s === 'expired' ? (
        <div style={{ marginTop: 16 }}>
          <ActionForm action={markLost} submit={L.t('act.mark_lost')}>
            <input type="hidden" name="quote_id" value={p.quote.id} />
          </ActionForm>
        </div>
      ) : null}

      <History events={p.events} />
      {p.quote.has_peptide ? <div className="ruo" style={{ marginTop: 18 }}>{p.ruo}</div> : null}
    </>
  );
}

/** The footer: the ways out. The message the business closes on, and the document a procurement office files. */
export async function QuoteSheetFooter(p: QuoteProps) {
  const t = await getTranslations('commerce.quote');
  const ta = await getTranslations('commerce.act');
  const message = p.quote.state === 'requested' || p.quote.state === 'draft'
    ? await quoteMessage(p)
    : withRuo(t('wa_follow', { account: p.quote.account, quote: p.quote.number }), p.quote.has_peptide, p.ruo);
  return (
    <>
      <a className="btn btn-sm" href={waLink(message, p.quote.account_whatsapp)} target="_blank" rel="noopener noreferrer">
        <Icon name="wa" />{ta('message')}
      </a>
      <a className="btn btn-sm" href={`/api/documents/quote/${p.quote.number}`} target="_blank" rel="noopener noreferrer">
        <Icon name="download" />{ta('quote_doc')}
      </a>
    </>
  );
}
