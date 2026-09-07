import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { Icon } from '@/components/shell/sprite';
import { AxiomDocument, type DocumentData } from '@/components/document/document';
import { daysFrom } from '@/lib/domain/dates';
import { invoiceState, type InvoiceEvent, type InvoiceFull, type InvoiceRow } from '@/lib/queries/invoices';
import { isRefused, type Margin } from '@/lib/queries/orders';
import { ActionForm } from '../shared/action-form';
import { labels } from '../orders/labels';
import { issueCreditNote, markInvoicePaid, saveInvoiceNotes } from './actions';
import { PageCount, PrintButton, SendButton } from './doc-actions';

export type BuilderProps = {
  invoice: InvoiceRow; full: InvoiceFull; events: InvoiceEvent[];
  credits: InvoiceRow[]; doc: DocumentData; margin: Margin | { refused: string };
  owner: boolean; pdfHref: string; pdfUrl: string; ruo: string; peptide: boolean; floor: number;
};

/**
 * The invoice builder. The document is on the right, rendered from the same `AxiomDocument` the PDF
 * route prints, so what is approved on screen is what the client receives.
 *
 * The left column is therefore not a second copy of it. An invoice is issued at acceptance and
 * frozen — its lines, its money and its identity are the document's to state — so what belongs
 * beside it is only what may still be done: matched to a transfer, sent, printed, annotated, or
 * credited. A change after issue is a credit note, and the form for one stands where the edit the
 * database would refuse might otherwise have been.
 */
export async function InvoiceBuilder(p: BuilderProps) {
  const t = await getTranslations('commerce.invoices');
  const ts = await getTranslations('states.invoice');
  const L = await labels();
  const s = invoiceState(p.invoice);
  const payable = s === 'issued' || s === 'overdue';
  const closed = s === 'paid' || s === 'void';
  const gmTone = !isRefused(p.margin) && Number(p.margin.gm_pct) < p.floor ? 'warn' : 'ok';

  const chip = s === 'overdue'
    ? <span className="chip err"><span className="dot" />{t('chip_overdue', { days: daysFrom(p.invoice.due_at) })}</span>
    : <span className={`chip ${s === 'paid' ? 'quiet ok' : 'quiet'}`}><span className="dot" />{ts(s)}</span>;

  // What this invoice is waiting for, in the same words the invoices list uses for the same row.
  const next = s === 'void' ? { text: t('n_void', { date: L.short(p.invoice.voided_at) }), tone: 'quiet' }
    : s === 'paid' ? { text: t('n_paid', { date: L.short(p.invoice.paid_at) }), tone: 'quiet' }
      : p.invoice.paid_claim_at
        ? { text: p.invoice.paid_claim_ref ? t('n_match', { ref: p.invoice.paid_claim_ref }) : t('n_match_plain'), tone: 'warn' }
        : s === 'overdue' ? { text: t('n_overdue', { days: daysFrom(p.invoice.due_at) }), tone: 'err' }
          : { text: t('n_due', { date: L.short(p.invoice.due_at) }), tone: '' };

  // What Send hands to WhatsApp: the invoice in one message, with the notice when a line needs it.
  const tw = await getTranslations('commerce.wa');
  const bank = p.full.bank_details ?? {};
  const message = [
    tw('invoice_head', { number: p.invoice.number }),
    tw('invoice_amount', { amount: idr(p.invoice.total_idr), date: L.short(p.invoice.due_at) }),
    tw('invoice_bank', {
      bank: String(bank.bank ?? ''), account_no: String(bank.account_no ?? ''),
      account_name: String(bank.account_name ?? ''), number: p.invoice.number,
    }),
    tw('invoice_pdf', { url: p.pdfUrl }),
  ].join('\n') + (p.peptide ? `\n\n${p.ruo}` : '');

  const field = (label: string, value: string) => (
    <div className="kv" key={label}><span className="k">{label}</span><span className="v">{value}</span></div>
  );

  return (
    <section className="screen on">
      <div style={{ marginBottom: 18 }}>
        <Link className="tlink" href="/console/invoices"><Icon name="caret" />{t('back')}</Link>
      </div>

      <div className="inv-grid">
        <div>
          <div className="ib-title">{t('builder')}</div>
          <div className="ib-sub">{t('builder_sub')}</div>

          <div className={`nxt${next.tone ? ` ${next.tone}` : ''}`} style={{ marginTop: 24 }}>
            <span className="k">{closed ? L.t('order.closed') : L.t('order.next')}</span>
            <span className="v">{next.text}</span>
          </div>

          {payable ? (
            <div className="nxt-act">
              <ActionForm action={markInvoicePaid} submit={t('mark_paid')} tone="accent">
                <input type="hidden" name="order_id" value={p.invoice.order_id} />
                <div className="field">
                  <label htmlFor="reference">{t('paid_ref')}</label>
                  <input id="reference" name="reference" required autoComplete="off"
                    defaultValue={p.invoice.paid_claim_ref ?? ''} />
                </div>
              </ActionForm>
            </div>
          ) : null}

          {/* Four facts identify the invoice. Everything else it says, it says on the document. */}
          <div className="ib-sec">{t('sec_invoice')}</div>
          {field(t('f_number'), p.invoice.number)}
          {field(t('f_reference'), p.invoice.order_number)}
          {field(t('f_issued'), L.short(p.invoice.issued_at))}
          {field(t('f_due'), t('due_terms', { date: L.short(p.invoice.due_at), days: p.full.terms_days }))}
          <p className="hint" style={{ marginTop: 12 }}>{t('frozen')}</p>

          <div className="ib-sec">{t('sec_document')}</div>
          <div className="ib-total">
            <span>{t('total_due')} <b>{idr(p.invoice.total_idr)}</b></span>
            <PageCount />
          </div>
          <div className="hrow">
            <a className="btn btn-sm" href={p.pdfHref} download data-download-pdf><Icon name="download" />{t('download')}</a>
            <SendButton invoiceId={p.invoice.id} message={message} whatsapp={p.full.billed_whatsapp} />
            <PrintButton />
          </div>

          <div className="ib-sec">{t('sec_notes')}</div>
          <ActionForm action={saveInvoiceNotes} submit={t('save_notes')}>
            <input type="hidden" name="invoice_id" value={p.invoice.id} />
            <div className="field">
              <label htmlFor="notes">{t('sec_notes')}</label>
              <textarea id="notes" name="notes" rows={5} defaultValue={p.full.notes ?? ''}
                placeholder={p.doc.notes?.text ?? ''} />
              <span className="hint">{t('notes_hint', { token: '{TERMS}' })}</span>
            </div>
          </ActionForm>

          {p.invoice.kind === 'invoice' && p.invoice.issued_at && !p.invoice.voided_at ? (
            <>
              <div className="ib-sec">{t('credit_title')}</div>
              <ActionForm action={issueCreditNote} submit={t('credit_issue')}>
                <input type="hidden" name="invoice_id" value={p.invoice.id} />
                <div className="fgrid">
                  <div className="field">
                    <label htmlFor="amount">{t('credit_amount')}</label>
                    <input id="amount" name="amount" inputMode="numeric" autoComplete="off" />
                  </div>
                  <div className="field">
                    <label htmlFor="description">{t('credit_desc')}</label>
                    <input id="description" name="description" required autoComplete="off" />
                  </div>
                </div>
                <p className="hint">{t('credit_hint')}</p>
              </ActionForm>
            </>
          ) : null}

          {p.credits.length ? (
            <>
              <div className="ib-sec">{t('credit_list')}</div>
              <div className="rows">
                {p.credits.map(c => (
                  <Link className="row" key={c.id} href={`/console/invoices/${c.number}`}>
                    <span className="ic"><Icon name="file" /></span>
                    <span className="bd"><span className="t1">{c.number}</span><span className="t2">{L.short(c.issued_at)}</span></span>
                    <span className="rt"><span className="amt">{idr(c.total_idr)}</span></span>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div>
          <div className="sec-h">
            <span className="kicker">{t('preview')}</span>
            <span className="sp" />
            {chip}
            <Link className="tlink" href={`/console/orders/${p.invoice.order_number}`}>{t('order_link')}</Link>
          </div>
          <div className="doc-wrap" data-doc><AxiomDocument d={p.doc} /></div>

          {p.owner ? (
            <div className="margin-box owner-only">
              <span className="kicker">{t('margin')}</span>
              {isRefused(p.margin) ? <p className="note">{L.t('order.margin_unavailable')}</p> : (
                <>
                  <div className="kv"><span className="k">{L.t('order.revenue')}</span><span className="v">{idr(p.margin.revenue)}</span></div>
                  <div className="kv"><span className="k">{t('cost_basis')}</span><span className="v">{idr(p.margin.base)}</span></div>
                  <div className="kv" style={{ border: 'none' }}>
                    <span className="k">{L.t('order.margin_v')}</span>
                    <span className="v" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      {idr(p.margin.margin)}
                      <span className={`chip ${gmTone} mchip`}><span className="dot" />{L.t('order.gm', { pct: Number(p.margin.gm_pct).toFixed(1) })}</span>
                    </span>
                  </div>
                  <p className="note" style={{ marginTop: 6 }}>{t('margin_side')}</p>
                </>
              )}
            </div>
          ) : null}

          <div className="sec-h" style={{ marginTop: 22 }}><span className="kicker">{t('history')}</span></div>
          <div className="hist">
            {p.events.map((e, i) => (
              <div className="kv" key={i}>
                <span className="k">{L.stamp(e.at)} · {e.actor}</span>
                <span className="v">{t(`ev_${e.kind}`)}{e.ref ? ` · ${e.ref}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
