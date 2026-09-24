import { idr } from '@/lib/money';

/**
 * THE document template. Invoice, quote document and price-list PDF are this one component with
 * different content: the A4 dark document the AXIOM invoice builder produces. It is rendered
 * standalone (its own CSS in DOCUMENT_CSS, no app shell) for the on-screen preview and for the PDF,
 * which is produced by printing this same markup headless — never a second hand-laid layout.
 * A4 width is fixed; height grows in whole pages. Never clip.
 */
export type DocLine = { ix?: string; title: string; sub?: string; qty?: number; unit?: number | bigint | null; total?: number | bigint | null; is_peptide?: boolean; group?: boolean };
export type DocKV = { k: string; v: string };
/** One compound on a protocol card: a heading and its own key/value rows, not a priced line. */
export type DocBlock = { title: string; sub?: string; rows: DocKV[]; note?: string; muted?: boolean };
export type DocumentData = {
  kind: 'invoice' | 'credit_note' | 'quote' | 'price_list' | 'protocol_card';
  title: string;                      // 'Invoice' · 'Quotation' · 'Price list'
  number: string;
  meta: DocKV[];                      // issued, due, reference…
  amountDue?: { label: string; value: string } | null;
  columns: { a: string; b: string; c: string; sub: string };    // Billed to · Issued by · Details
  parties: { billedTo: { name: string; lines: string }; issuedBy: { name: string; lines: string }; details: DocKV[] };
  headings: { ix: string; item: string; qty: string; unit: string; amount: string };
  lines: DocLine[];
  /** The protocol card's body. A card carries no money, so it has blocks instead of priced lines. */
  blocks?: DocBlock[];
  /** The card's QR, as the module matrix rather than markup: the template draws it, so the one
   *  document renderer still emits every element it prints and nothing is injected as raw HTML. */
  qr?: { modules: boolean[][]; caption: string } | null;
  totals: DocKV[];
  grand?: DocKV | null;
  payment?: { label: string; lines: string[] } | null;
  notes?: { label: string; text: string } | null;
  delivery?: { label: string; text: string } | null;
  ruo: string | null;                 // the notice, verbatim, when any line is peptide-adjacent
  footer: { brand: string; line: string };
  lang: string;
};

export function AxiomDocument({ d }: { d: DocumentData }) {
  return (
    <div className="inv-doc" lang={d.lang}>
      <div className="d-head">
        <div>
          <svg className="wm-sv" viewBox="0 0 582 70" role="img" aria-label="AXIOM"><use href="#wm" /></svg>
          <div className="d-meta" style={{ marginTop: 10 }}>{d.footer.brand}</div>
        </div>
        <div className="rt">
          <div className="d-title">{d.title}</div>
          <div className="d-meta">
            <div><b>{d.number}</b></div>
            {d.meta.map(m => <div key={m.k}>{m.k} <b>{m.v}</b></div>)}
          </div>
          {d.amountDue ? <div className="d-due"><span className="lab">{d.amountDue.label}</span><span className="v">{d.amountDue.value}</span></div> : null}
        </div>
      </div>
      <div className="d-body">
        <div className="d-cols">
          <div><span className="lab">{d.columns.a}</span><div className="nm">{d.parties.billedTo.name}</div><div className="sm">{d.parties.billedTo.lines}</div></div>
          <div><span className="lab">{d.columns.b}</span><div className="nm">{d.parties.issuedBy.name}</div><div className="sm">{d.parties.issuedBy.lines}</div></div>
          <div><span className="lab">{d.columns.c}</span>{d.parties.details.map(x => <div className="d-kv" key={x.k}><span>{x.k}</span><span>{x.v}</span></div>)}</div>
        </div>
        {d.kind === 'protocol_card' ? (
          <div className="d-blocks">
            {(d.blocks ?? []).map((b, i) => (
              <div className={`d-block${b.muted ? ' muted' : ''}`} key={i}>
                <div className="d-block-h"><b>{b.title}</b>{b.sub ? <span>{b.sub}</span> : null}</div>
                {b.note ? <p className="d-block-n">{b.note}</p> : null}
                {b.rows.map(r => <div className="d-kv" key={r.k}><span>{r.k}</span><span>{r.v}</span></div>)}
              </div>
            ))}
            {d.qr ? (
              <div className="d-qr">
                <svg viewBox={`0 0 ${d.qr.modules.length + 8} ${d.qr.modules.length + 8}`} shapeRendering="crispEdges" role="img" aria-label={d.qr.caption}>
                  <rect className="d-qr-bg" width="100%" height="100%" />
                  {d.qr.modules.flatMap((row, y) => row.map((on, x) => on
                    ? <rect key={`${x}-${y}`} x={x + 4} y={y + 4} width={1} height={1} /> : null))}
                </svg>
                <span>{d.qr.caption}</span>
              </div>
            ) : null}
          </div>
        ) : null}
        <table className="d-tbl" hidden={d.kind === 'protocol_card'}>
          <thead><tr><th className="ix">{d.headings.ix}</th><th>{d.headings.item}</th><th className="n">{d.headings.qty}</th><th className="n">{d.headings.unit}</th><th className="n">{d.headings.amount}</th></tr></thead>
          <tbody>
            {d.lines.map((l, i) => l.group ? (
              <tr key={i}><td colSpan={5} style={{ paddingTop: 16, fontSize: 8.5, letterSpacing: '.3em', textTransform: 'uppercase', color: 'var(--muted)' }}>{l.title}</td></tr>
            ) : (
              <tr key={i}>
                <td className="ix">{l.ix ?? String(i + 1).padStart(2, '0')}</td>
                <td>{l.title}{l.sub ? <span className="sub">{l.sub}</span> : null}</td>
                <td className="n">{l.qty ?? ''}</td>
                <td className="n">{l.unit == null ? '' : idr(l.unit)}</td>
                <td className="n am">{l.total == null ? '' : idr(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {d.totals.length || d.grand ? (
          <div className="d-tot">
            {d.totals.map(t => <div key={t.k}><span>{t.k}</span><span>{t.v}</span></div>)}
            {d.grand ? <div className="g"><span>{d.grand.k}</span><span>{d.grand.v}</span></div> : null}
          </div>
        ) : null}
        {d.delivery ? <div className="d-kv" style={{ marginTop: 12 }}><span>{d.delivery.label}</span><span>{d.delivery.text}</span></div> : null}
        {d.payment || d.notes ? (
          <div className="d-pay">
            <div>{d.payment ? <><span className="lab">{d.payment.label}</span>{d.payment.lines.map((l, i) => <p key={i}>{l}</p>)}</> : null}</div>
            <div>{d.notes ? <><span className="lab">{d.notes.label}</span><p style={{ whiteSpace: 'pre-line' }}>{d.notes.text}</p></> : null}</div>
          </div>
        ) : null}
      </div>
      <div className="d-foot">
        {d.ruo ? <div className="d-ruo">{d.ruo}</div> : null}
        <div className="d-brand"><b>{d.footer.brand}</b><span>{d.footer.line}</span></div>
      </div>
    </div>
  );
}
