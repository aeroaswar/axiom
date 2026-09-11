import { pct } from '@/lib/money';
import { fmtLong } from '@/lib/domain/dates';

/**
 * A Certificate of Analysis on the one A4 sheet every AXIOM document uses (the invoice's CSS, the
 * invoice's renderer, the invoice's PDF). It states what the row states — compound, lot, method,
 * purity, date — against the published threshold, and nothing the row does not hold: no laboratory
 * name, no analyst, no figure that was not measured. An illustrative sample carries the stamp.
 */
export type CoaDocData = {
  title: string; specimen: string | null; sampleNote: string | null;
  number: string; lang: string;
  compound: string; dose: string; lotCode: string; issued: string; method: string;
  purity: number | null; threshold: string;
  labels: {
    compound: string; lot: string; dose: string; issued: string; method: string; threshold: string;
    test: string; result: string; spec: string;
    identity: string; identityResult: string; identitySpec: string;
    purity: string; puritySpec: string;
    issuedBy: string; forLabel: string; forValue: string; details: string;
    footer: string;
  };
  issuer: { name: string; lines: string };
  ruo: string | null;
  brand: string;
};

export function CoaDocument({ d }: { d: CoaDocData }) {
  const purityText = d.purity === null ? '—' : pct(d.purity, 2);
  return (
    <div className="inv-doc" lang={d.lang} data-coa>
      {d.specimen ? <div className="d-wm" aria-hidden="true"><span>{d.specimen}</span></div> : null}
      <div className="d-head">
        <div>
          <svg className="wm-sv" viewBox="0 0 582 70" role="img" aria-label={d.brand}><use href="#wm" /></svg>
          <div className="d-meta" style={{ marginTop: 10 }}>{d.brand}</div>
        </div>
        <div className="rt">
          <div className="d-title">{d.title}</div>
          <div className="d-meta">
            <div><b>{d.number}</b></div>
            <div>{d.labels.issued} <b>{d.issued}</b></div>
          </div>
          {d.specimen ? <div className="d-stamp">{d.specimen}</div> : null}
        </div>
      </div>
      <div className="d-body">
        <div className="d-cols">
          <div>
            <span className="lab">{d.labels.compound}</span>
            <div className="nm">{d.compound}</div>
            <div className="sm">{d.labels.dose} · {d.dose}</div>
          </div>
          <div>
            <span className="lab">{d.labels.lot}</span>
            <div className="nm d-fig">{d.lotCode}</div>
            <div className="sm">{d.labels.method} · {d.method}</div>
          </div>
          <div>
            <span className="lab">{d.labels.issuedBy}</span>
            <div className="nm">{d.issuer.name}</div>
            <div className="sm">{d.issuer.lines}</div>
          </div>
        </div>
        <table className="d-tbl">
          <thead><tr><th className="ix">{''}</th><th>{d.labels.test}</th><th className="n">{d.labels.spec}</th><th className="n">{d.labels.result}</th></tr></thead>
          <tbody>
            <tr>
              <td className="ix">01</td>
              <td>{d.labels.identity}<span className="sub">{d.method}</span></td>
              <td className="n">{d.labels.identitySpec}</td>
              <td className="n ok">{d.labels.identityResult}</td>
            </tr>
            <tr>
              <td className="ix">02</td>
              <td>{d.labels.purity}<span className="sub">{d.method}</span></td>
              <td className="n">{d.labels.puritySpec}</td>
              <td className="n am"><span className="d-fig">{purityText}</span></td>
            </tr>
          </tbody>
        </table>
        <div className="d-tot">
          <div><span>{d.labels.threshold}</span><span>{d.threshold}</span></div>
          <div><span>{d.labels.issued}</span><span>{d.issued}</span></div>
        </div>
        {d.sampleNote ? <p className="d-note">{d.sampleNote}</p> : null}
      </div>
      <div className="d-foot">
        {d.ruo ? <div className="d-ruo">{d.ruo}</div> : null}
        <div className="d-brand"><b>{d.brand}</b><span>{d.labels.footer}</span></div>
      </div>
    </div>
  );
}

export const coaIssued = (iso: string | null, locale: string) => (iso ? fmtLong(new Date(iso), locale) : '—');
