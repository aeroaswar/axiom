/* AXIOM document reader, shared by the label builders.
   Reads an AXIOM invoice PDF (by layout, one order per destination) or an AXIOM
   order form (fillable fields, or flattened page text) into orders:
   { kind, invNo, src, name, phone, addr, notes, ruo, lines: [{ compound, amount, unit, qty, raw, inv }] }.
   Lines are matched against the catalogue in business-proposal/order-form/compounds.json.

   Copied unchanged from stickers/package-label.html (the reader there and here must agree;
   change both, or switch package-label.html to this file). PDFs are read in the browser
   with pdf.js from cdnjs; nothing is uploaded. A classic script, so it works from file://. */
(function () {
'use strict';
const blankOrder = () => ({ kind:'manual', invNo:'', src:'', name:'', phone:'', addr:'', notes:'', lines:[], ref:'', marks:{}, ruo:null, flattened:false });

const COMPOUNDS = [{"name":"AOD-9604","sizes":["5"],"units":["mg"]},{"name":"Cagrilintide","sizes":["10"],"units":["mg"]},{"name":"Retatrutide","sizes":["10","20","30","40","60"],"units":["mg"]},{"name":"Tirzepatide","sizes":["10","30","40"],"units":["mg"]},{"name":"CJC-1295 (No DAC) + Ipamorelin","sizes":["10","20"],"units":["mg"]},{"name":"CJC-1295 (With DAC)","sizes":["5"],"units":["mg"]},{"name":"HGH 191AA (Somatropin)","sizes":["36","40"],"units":["IU"]},{"name":"IGF-1 LR3","sizes":["1"],"units":["mg"]},{"name":"Ipamorelin","sizes":["10"],"units":["mg"]},{"name":"Ipamorelin + Tesamorelin","sizes":["18"],"units":["mg"]},{"name":"Sermorelin","sizes":["10"],"units":["mg"]},{"name":"Tesamorelin","sizes":["10","20"],"units":["mg"]},{"name":"AHK-Cu","sizes":["100"],"units":["mg"]},{"name":"ARA-290","sizes":["10","50"],"units":["mg"]},{"name":"BPC-157","sizes":["10"],"units":["mg"]},{"name":"BPC-157 + TB-500 (Wolverine)","sizes":["20"],"units":["mg"]},{"name":"GHK-Cu","sizes":["50","100"],"units":["mg"]},{"name":"KPV","sizes":["10"],"units":["mg"]},{"name":"KLOW (BPC+TB+GHK+KPV)","sizes":["80"],"units":["mg"]},{"name":"LL-37","sizes":["5"],"units":["mg"]},{"name":"Peg MGF","sizes":["2"],"units":["mg"]},{"name":"SNAP-8","sizes":["10"],"units":["mg"]},{"name":"TB-500","sizes":["10"],"units":["mg"]},{"name":"Adamax","sizes":["10"],"units":["mg"]},{"name":"Cerebrolysin","sizes":["80"],"units":["mg"]},{"name":"Dihexa","sizes":["10"],"units":["mg"]},{"name":"Pinealon","sizes":["20"],"units":["mg"]},{"name":"Selank","sizes":["10"],"units":["mg"]},{"name":"Semax","sizes":["10"],"units":["mg"]},{"name":"Selank + Semax","sizes":["20"],"units":["mg"]},{"name":"VIP (Vasoactive Intestinal Peptide)","sizes":["10"],"units":["mg"]},{"name":"5-Amino-1MQ","sizes":["50"],"units":["mg"]},{"name":"AICAR","sizes":["50"],"units":["mg"]},{"name":"L-Carnitine (Injectable)","sizes":["5000"],"units":["mg"]},{"name":"LC216 Lipo-B (Injectable)","sizes":["10"],"units":["mL"]},{"name":"LC526 Fat Blaster (Injectable)","sizes":["10"],"units":["mL"]},{"name":"MOTS-c","sizes":["10","40"],"units":["mg"]},{"name":"SLU-PP-332 (Injectable)","sizes":["5"],"units":["mg"]},{"name":"Thymalin","sizes":["10"],"units":["mg"]},{"name":"Thymosin Alpha-1","sizes":["10"],"units":["mg"]},{"name":"HCG","sizes":["10000"],"units":["IU"]},{"name":"HMG","sizes":["75"],"units":["IU"]},{"name":"Kisspeptin","sizes":["10"],"units":["mg"]},{"name":"Melanotan II","sizes":["10"],"units":["mg"]},{"name":"Oxytocin Acetate","sizes":["10"],"units":["mg"]},{"name":"PT-141","sizes":["10"],"units":["mg"]},{"name":"DSIP","sizes":["5","10"],"units":["mg"]},{"name":"Epithalon","sizes":["50"],"units":["mg"]},{"name":"FOXO4-DRI","sizes":["10"],"units":["mg"]},{"name":"Glutathione","sizes":["1500"],"units":["mg"]},{"name":"Humanin","sizes":["10"],"units":["mg"]},{"name":"NAD+","sizes":["500","1000"],"units":["mg"]},{"name":"SS-31","sizes":["50"],"units":["mg"]},{"name":"Bronchogen","sizes":["20"],"units":["mg"]},{"name":"Cardiogen","sizes":["20"],"units":["mg"]},{"name":"Cartalax","sizes":["20"],"units":["mg"]},{"name":"Chonluten","sizes":["20"],"units":["mg"]},{"name":"Cortagen","sizes":["20"],"units":["mg"]},{"name":"Crystagen","sizes":["20"],"units":["mg"]},{"name":"Livagen","sizes":["20"],"units":["mg"]},{"name":"Ovagen","sizes":["20"],"units":["mg"]},{"name":"Pancragen","sizes":["20"],"units":["mg"]},{"name":"Prostamax","sizes":["20"],"units":["mg"]},{"name":"Testagen","sizes":["20"],"units":["mg"]},{"name":"Vesugen","sizes":["20"],"units":["mg"]}];

/* Field rectangles on the AXIOM order form, PDF points (bottom-left origin),
   for forms that arrive flattened (printed to PDF), where the answers are
   page text rather than form fields. */
const FORM_RECTS = {
  name:[43.2,678.8,342.8,706.8], phone:[364.0,678.8,554.3,706.8],
  address:[43.2,621.8,342.8,657.3], notes:[364.0,621.8,554.3,657.3],
  item:[62.8,305.3], amount:[323.5,369.8], qty:[514.0,554.3],
  rows:[[538.5,565.0],[506.3,532.8],[474.0,500.5],[441.8,468.3],[409.5,436.0]],
};

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

/* ---------- catalogue matching ---------- */
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9+]/g, '');
const ALIASES = {
  reta:'Retatrutide', tirz:'Tirzepatide', tirze:'Tirzepatide', cagri:'Cagrilintide',
  hgh:'HGH 191AA (Somatropin)', gh:'HGH 191AA (Somatropin)', somatropin:'HGH 191AA (Somatropin)',
  igf1:'IGF-1 LR3', igf:'IGF-1 LR3', tesa:'Tesamorelin', ipa:'Ipamorelin', ipam:'Ipamorelin',
  cjc:'CJC-1295 (No DAC) + Ipamorelin', cjcipa:'CJC-1295 (No DAC) + Ipamorelin', cjcdac:'CJC-1295 (With DAC)',
  bpc:'BPC-157', tb:'TB-500', tb4:'TB-500', bpctb:'BPC-157 + TB-500 (Wolverine)', wolverine:'BPC-157 + TB-500 (Wolverine)',
  ghk:'GHK-Cu', ghkcu:'GHK-Cu', ahk:'AHK-Cu', klow:'KLOW (BPC+TB+GHK+KPV)', mgf:'Peg MGF', pegmgf:'Peg MGF',
  snap8:'SNAP-8', vip:'VIP (Vasoactive Intestinal Peptide)', motsc:'MOTS-c', mots:'MOTS-c',
  nad:'NAD+', ss31:'SS-31', elamipretide:'SS-31', epitalon:'Epithalon', epithalon:'Epithalon',
  foxo4:'FOXO4-DRI', ta1:'Thymosin Alpha-1', thymosin:'Thymosin Alpha-1', mt2:'Melanotan II', melanotan:'Melanotan II',
  melanotan2:'Melanotan II', pt141:'PT-141', bremelanotide:'PT-141', oxytocin:'Oxytocin Acetate',
  kiss:'Kisspeptin', '5amino':'5-Amino-1MQ', amino1mq:'5-Amino-1MQ', slupp:'SLU-PP-332 (Injectable)', slu:'SLU-PP-332 (Injectable)',
  lipob:'LC216 Lipo-B (Injectable)', lc216:'LC216 Lipo-B (Injectable)', lc526:'LC526 Fat Blaster (Injectable)', fatblaster:'LC526 Fat Blaster (Injectable)',
  carnitine:'L-Carnitine (Injectable)', lcarnitine:'L-Carnitine (Injectable)', ll37:'LL-37', ara290:'ARA-290',
  selanksemax:'Selank + Semax', ipatesa:'Ipamorelin + Tesamorelin', aod:'AOD-9604',
};
const byName = Object.fromEntries(COMPOUNDS.map(c => [c.name, c]));

/* Score each compound against what the client typed; the stated amount breaks
   ties (a 20 mg CJC is the No-DAC blend, a 5 mg one the DAC). Returns null
   below the threshold rather than guessing. */
function matchCompound(raw, amount){
  const q = norm(raw.replace(/\b\d+([.,]\d+)?\s*(mg|iu|ml|mcg)\b/gi, ''));
  if (q.length < 2) return null;
  let best = null, bestS = 0;
  for (const c of COMPOUNDS){
    const n = norm(c.name), base = norm(c.name.replace(/\(.*?\)/g, ''));
    const alias = (c.name.match(/\(([^)]+)\)/) || [])[1];
    let s = 0;
    if (q === n || q === base) s = 100;
    else if (ALIASES[q] === c.name) s = 96;
    else if (alias && q === norm(alias)) s = 95;
    else if (q.length >= 3 && base.startsWith(q)) s = 86 - Math.min(20, base.length - q.length) * .5;
    else if (q.length >= 4 && n.includes(q)) s = 72;
    else if (base.length >= 3 && q.includes(base)) s = 70 + Math.min(15, base.length);
    else {
      const ta = new Set(raw.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1));
      const tb = new Set(c.name.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1));
      const inter = [...ta].filter(t => tb.has(t)).length;
      if (inter) s = 60 * inter / new Set([...ta, ...tb]).size + 20;
    }
    if (s && amount && c.sizes.includes(String(amount))) s += 4;
    if (s > bestS){ bestS = s; best = c; }
  }
  return bestS >= 45 ? best : null;
}

/* "20", "20mg", "20 mg", "36 IU" → { amount, unit } */
function splitAmount(s){
  const m = String(s || '').trim().replace(',', '.').match(/^([\d.]+)\s*(mg|iu|ml|mcg)?$/i);
  if (!m) return { amount: String(s || '').trim(), unit: '' };
  const u = m[2] ? ({ mg:'mg', iu:'IU', ml:'mL', mcg:'mcg' })[m[2].toLowerCase()] : '';
  return { amount: String(+m[1]), unit: u };
}

function resolveLine(raw, amountStr, formUnit, qty){
  const { amount, unit } = splitAmount(amountStr);
  const hit = matchCompound(raw, amount);
  return {
    raw, compound: hit ? hit.name : raw.trim(), amount,
    unit: formUnit || unit || (hit ? hit.units[0] : 'mg'),
    unitFrom: formUnit ? 'form' : unit ? 'typed' : hit ? 'catalogue' : 'default',
    qty: String(parseInt(qty, 10) > 0 ? parseInt(qty, 10) : 1),
  };
}

/* Flags are recomputed from the current fields, so fixing a line clears its flag. */
function lineFlag(l){
  const c = byName[l.compound];
  if (!l.compound) return { w:true, t:'Empty line — it is left off the label.' };
  if (!c) return l.inv ? { w:false, t:'Not a catalogue compound — prints as on the invoice.' }
    : { w:true, t:`Not in the catalogue — prints as typed${l.raw && l.raw !== l.compound ? ` (form: “${l.raw}”)` : ''}.` };
  if (l.amount && !c.sizes.includes(l.amount)) return { w:true, t:`${l.amount} ${l.unit} is not a listed lot — ${c.name} comes in ${c.sizes.join(' · ')} ${c.units.join('/')}.` };
  if (!l.amount) return { w:true, t:`No size — listed lots: ${c.sizes.join(' · ')} ${c.units.join('/')}.` };
  const bits = [];
  if (l.raw && norm(l.raw) !== norm(c.name)) bits.push(`matched from “${l.raw}”`);
  if (l.unitFrom === 'catalogue') bits.push('unit from catalogue');
  return { w:false, t: bits.length ? bits.join(' · ') : 'Catalogue match.' };
}
/* ---------- reading the order form ---------- */
let pdfjsReady = null;
function loadPdfjs(){
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return pdfjsReady ||= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = PDFJS + 'pdf.min.js';
    s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(pdfjsLib); };
    s.onerror = () => { pdfjsReady = null; rej(new Error('Could not load the PDF reader — it needs an internet connection the first time.')); };
    document.head.appendChild(s);
  });
}

/* One PDF in, one or more labels out. An AXIOM invoice gives a label per
   destination; an order form (fillable or flattened) gives one. */
async function readPdf(file){
  const lib = await loadPdfjs();
  const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const page1 = await doc.getPage(1);
  const f = {};
  for (const a of await page1.getAnnotations()){
    if (a.subtype !== 'Widget' || !a.fieldName) continue;
    if (a.fieldType === 'Tx') f[a.fieldName] = String(a.fieldValue ?? '');
    else if (a.radioButton){ if (a.fieldValue && a.fieldValue === a.buttonValue) f[a.fieldName] = a.buttonValue; }
    else if (a.checkBox){ f[a.fieldName] = !!a.fieldValue && a.fieldValue !== 'Off'; }
  }
  if ('name' in f || 'item_1' in f) return [orderFromForm(f, file, false)];

  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) pages.push(await pageLines(await doc.getPage(i)));
  const inv = parseInvoice(pages, file);
  if (inv) return inv;
  return [orderFromForm(await readFlattened(page1), file, true)];
}

function orderFromForm(f, file, flattened){
  if (!Object.values(f).some(v => typeof v === 'string' && v.trim()))
    throw new Error('Not an AXIOM invoice or order form — nothing to read.');
  const nums = [...new Set(Object.keys(f).map(k => (k.match(/^(?:item|amount|qty)_(\d+)$/) || [])[1]).filter(Boolean))]
    .map(Number).sort((a, b) => a - b);
  const lines = [];
  for (const n of nums){
    const raw = (f['item_' + n] || '').trim(), amt = (f['amount_' + n] || '').trim();
    if (!raw && !amt) continue;
    lines.push(resolveLine(raw, amt, f['unit_' + n] || '', f['qty_' + n]));
  }
  return {
    ...blankOrder(), kind: 'form', src: file.name, flattened,
    name: (f.name || '').trim(), phone: (f.phone || '').trim(),
    addr: (f.address || '').replace(/\s*\n\s*/g, ', ').trim(), notes: (f.notes || '').trim(),
    lines, ruo: flattened ? null : 'ruo_confirm' in f ? !!f.ruo_confirm : null,
  };
}

/* ---------- reading the invoice ----------
   The invoice is a printed page, not a form, so it is read by layout: text
   runs are grouped into lines by baseline, and runs within a line into cells
   (a gap wider than a word space starts a new cell). Everything is found from
   its heading, compared with spaces removed so letter-spaced headings
   ("B I L L E D  T O") still match, in English or Indonesian. */
async function pageLines(page){
  const tc = await page.getTextContent();
  const runs = tc.items.filter(t => t.str.trim()).map(t => ({
    s: t.str, x: t.transform[4], y: t.transform[5], w: t.width, h: Math.abs(t.transform[3]) || t.height || 8 }))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const lines = [];
  for (const r of runs){
    let L = lines.find(l => Math.abs(l.y - r.y) < Math.max(1.2, r.h * .25));
    if (!L) lines.push(L = { y: r.y, runs: [] });
    L.runs.push(r);
  }
  lines.sort((a, b) => b.y - a.y);
  for (const L of lines){
    L.runs.sort((a, b) => a.x - b.x);
    L.cells = [];
    for (const r of L.runs){
      const c = L.cells[L.cells.length - 1], gap = c ? r.x - c.x1 : Infinity;
      if (c && gap < Math.max(6, r.h * .9)){
        c.t += (gap > r.h * .12 ? ' ' : '') + r.s; c.x1 = r.x + r.w; c.h = Math.max(c.h, r.h);
      } else L.cells.push({ t: r.s, x0: r.x, x1: r.x + r.w, y: L.y, h: r.h });
    }
    for (const c of L.cells){ c.t = c.t.replace(/\s+/g, ' ').trim(); c.k = c.t.replace(/\s+/g, '').toUpperCase(); }
  }
  return lines;
}

const HEAD = {
  billed: ['BILLEDTO', 'DITAGIHKANKEPADA'], issued: ['ISSUEDBY', 'DITERBITKANOLEH'],
  ship: ['SHIPTO', 'DIKIRIMKE', 'KIRIMKE'], desc: ['DESCRIPTION', 'KETERANGAN'],
  qty: ['QTY', 'JML', 'QUANTITY', 'JUMLAH'], unit: ['UNITPRICE', 'HARGASATUAN'],
  handling: ['HANDLING', 'PENANGANAN'], dests: ['DESTINATIONS', 'TUJUAN'],
};
const STOP = k => /^(SUBTOTAL|TOTALDUE|TOTAL|PAYMENT|PEMBAYARAN|RESEARCHUSEONLY|PAGE\d)/.test(k) || k.includes('HUMANPERFORMANCE');
const isPhone = t => /^\+?[\d\s().-]{8,}$/.test(t) && t.replace(/\D/g, '').length >= 8;
const cellOf = (lines, names) => { for (const L of lines) for (const c of L.cells) if (names.includes(c.k)) return c; return null; };
const kvValue = (lines, names) => {
  for (const L of lines){ const i = L.cells.findIndex(c => names.includes(c.k)); if (i >= 0) return (L.cells[i + 1] || {}).t || ''; }
  return '';
};
const byPos = (a, b) => b.y - a.y || a.x0 - b.x0;

function parseInvoice(pages, file){
  const p1 = pages[0];
  const billed = cellOf(p1, HEAD.billed), descH = cellOf(p1, HEAD.desc);
  if (!billed || !descH) return null;
  const issued = cellOf(p1, HEAD.issued), shipH = cellOf(p1, HEAD.ship);
  const allK = pages.flat().flatMap(L => L.cells.map(c => c.k));
  const no = (allK.map(k => (k.match(/^(?:NO|NOMOR)[.:]?(AX[-A-Z0-9]+)$/) || [])[1]).find(Boolean))
    || (allK.join(' ').match(/AX-[A-Z0-9]+(?:-[A-Z0-9]+)+/) || [])[0] || '';
  const cold = /cold|dingin/i.test(kvValue(p1, HEAD.handling));

  /* Billed to: the name, then company / address / email / phone lines. A line
     that runs most of the column's width is a wrap and joins with a space; a
     short one was its own line and joins with a comma. */
  const colR = issued ? issued.x0 - 4 : billed.x0 + 180, colW = colR - billed.x0;
  const floor = shipH ? shipH.y : descH.y;
  const col = p1.filter(L => L.y < billed.y - 1 && L.y > floor + 1)
    .map(L => L.cells.filter(c => c.x0 >= billed.x0 - 3 && c.x0 < colR))
    .filter(cs => cs.length)
    .map(cs => ({ t: cs.map(c => c.t).join(' '), w: cs[cs.length - 1].x1 - cs[0].x0, h: Math.max(...cs.map(c => c.h)) }));
  if (!col.length) throw new Error('Found the invoice but no Billed-to details on it.');
  const name = col[0].t;
  let phone = '', addr = '';
  col.slice(1).forEach((l, i, arr) => {
    if (/@/.test(l.t)) return;
    if (isPhone(l.t)){ phone ||= l.t; return; }
    const prevWrapped = i > 0 && arr[i - 1].w > colW * .72 && !/@/.test(arr[i - 1].t) && !isPhone(arr[i - 1].t);
    addr += addr ? (prevWrapped || /[,;]$/.test(addr) ? ' ' : ', ') + l.t : l.t;
  });

  /* Line items, across every page the table runs onto. */
  const rows = [];
  for (const lines of pages){
    const dh = cellOf(lines, HEAD.desc); if (!dh) continue;
    const hdr = lines.find(L => L.cells.includes(dh));
    const qh = hdr.cells.find(c => HEAD.qty.includes(c.k));
    const uh = hdr.cells.find(c => HEAD.unit.includes(c.k) || /^(UNIT|HARGA)/.test(c.k));
    const qLo = qh ? qh.x0 - 30 : dh.x0 + 200, qHi = uh ? uh.x0 - 4 : qLo + 70;
    let cur = null;
    for (const L of lines){
      if (L.y >= hdr.y - 1) continue;
      if (L.cells.some(c => STOP(c.k))) break;
      const d = L.cells.find(c => c.x0 >= dh.x0 - 3 && c.x0 < qLo);
      const q = L.cells.find(c => c.x0 >= qLo && c.x0 < qHi && /^\d+$/.test(c.t));
      if (d && q){ cur = { name: d.t, spec: '', q: q.t }; rows.push(cur); }
      else if (d && cur && !cur.spec){
        const m = d.t.match(/^([\d.,]+\s*[a-zA-Zµ]+)\s+lot$/i);
        if (m) cur.spec = m[1]; else cur.name += ' ' + d.t;
      }
    }
  }
  if (!rows.length) throw new Error('Found the invoice but could not read its line items.');
  const toLine = r => ({ ...resolveLine(r.name, r.spec, '', r.q), inv: true });

  /* Ship to: printed only when the order goes to more than one address. One
     row per destination, anchored on its shipping amount; each becomes a label. */
  const base = { ...blankOrder(), kind: 'invoice', src: file.name, invNo: no };
  if (cold) base.marks = { ...base.marks, cool: true };
  if (shipH){
    const region = p1.filter(L => L.y < shipH.y - 1 && L.y > descH.y + 1);
    const cells = region.flatMap(L => L.cells);
    const prices = cells.filter(c => /^Rp\s?[\d.,]+$/.test(c.t)).sort(byPos);
    const items = cells.filter(c => /×/.test(c.t));
    if (prices.length && items.length){
      const ixX = Math.min(...cells.map(c => c.x0));
      const addrX = Math.min(...cells.filter(c => c.x0 > ixX + 5).map(c => c.x0));
      const itX = Math.min(...items.map(c => c.x0)), prX = Math.min(...prices.map(c => c.x0));
      const used = new Set();
      return prices.map((pc, i) => {
        const lo = prices[i + 1] ? prices[i + 1].y : descH.y;
        const rc = cells.filter(c => c.y <= pc.y + 1 && c.y > lo + 1).sort(byPos);
        const aText = rc.filter(c => c.x0 >= addrX - 2 && c.x0 < itX - 2).map(c => c.t).join(' ');
        const iText = rc.filter(c => c.x0 >= itX - 2 && c.x0 < prX - 2).map(c => c.t).join(' ');
        let parts = aText.split(/\s*·\s*/).map(x => x.trim()).filter(Boolean);
        const asBilled = parts.some(x => /^as billed to$|^sesuai tagihan$/i.test(x));
        parts = parts.filter(x => !/^as billed to$|^sesuai tagihan$/i.test(x));
        const rest = parts.filter(x => !isPhone(x));
        const label = rest.length > 1 || (asBilled && rest.length) ? rest.shift() : '';
        const dPhone = parts.find(isPhone) || (!label ? phone : '');
        const lines = iText.split(/\s*·\s*/).map(x => x.match(/^(.*?)\s*×\s*(\d+)$/)).filter(Boolean).map(m => {
          const want = norm(m[1]);
          let k = rows.findIndex((r, j) => !used.has(j) && norm(r.name) === want && r.q === m[2]);
          if (k < 0) k = rows.findIndex((r, j) => !used.has(j) && norm(r.name) === want);
          if (k >= 0) used.add(k);
          return toLine({ name: m[1], spec: k >= 0 ? rows[k].spec : '', q: m[2] });
        });
        return { ...base, marks: { ...base.marks }, name: label || name, phone: dPhone,
          addr: asBilled || !rest.length ? addr : rest.join(', '), lines,
          ref: no + ` · ${i + 1}/${prices.length}` };
      });
    }
  }
  return [{ ...base, name, phone, addr, lines: rows.map(toLine), ref: no }];
}

/* An order form dropped alongside its invoice adds what the invoice lacks
   (usually the phone number, plus the notes and the research-use tick) and
   then steps aside, so each parcel still gets one label. Matched on first name. */
function mergeForms(orders){
  const first = o => norm(String(o.name || '').split(/\s+/)[0]);
  const msgs = [];
  for (const F of orders.filter(o => o.kind === 'form')){
    const key = first(F); if (key.length < 3) continue;
    const I = orders.find(o => o.kind === 'invoice' && first(o) === key);
    if (!I) continue;
    if (!I.phone && F.phone) I.phone = F.phone;
    if (!I.notes && F.notes) I.notes = F.notes;
    if (I.ruo == null) I.ruo = F.ruo;
    orders.splice(orders.indexOf(F), 1);
    msgs.push(`${F.name}'s order form merged into ${I.invNo || 'the invoice'}`);
  }
  return msgs;
}

/* A flattened form has no fields; its answers are page text sitting in the boxes. */
async function readFlattened(page){
  const tc = await page.getTextContent();
  const inBox = (x, y, x0, y0, x1, y1) => x >= x0 - 2 && x <= x1 && y >= y0 - 2 && y <= y1;
  const pick = (x0, y0, x1, y1) => tc.items
    .filter(t => t.str.trim() && inBox(t.transform[4], t.transform[5], x0, y0, x1, y1))
    .sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])
    .map(t => t.str).join(' ').replace(/\s+/g, ' ').trim();
  const R = FORM_RECTS, f = {};
  for (const k of ['name', 'phone', 'address', 'notes']) f[k] = pick(...R[k]);
  R.rows.forEach(([y0, y1], i) => {
    f['item_' + (i + 1)] = pick(R.item[0], y0, R.item[1], y1);
    f['amount_' + (i + 1)] = pick(R.amount[0], y0, R.amount[1], y1);
    f['qty_' + (i + 1)] = pick(R.qty[0], y0, R.qty[1], y1);
  });
  return f;
}

window.AxiomDocs = { COMPOUNDS, readPdf, mergeForms, matchCompound, resolveLine, lineFlag, norm };
})();
