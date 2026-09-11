/* Preview-only typeface switcher. Injected by build.py --fonts test; never linked from a shipped page. */
(function () {
  var SETS = [
    { id: 'jost',       name: 'Jost',              note: 'current — geometric',   d: '"Jost"',              s: '"Inter"',           dw: 500, tr: '-.012em', min: 300 },
    { id: 'geist',      name: 'Geist',             note: 'neutral, modern',       d: '"Geist"',             s: '"Geist"',           dw: 600, tr: '-.028em', min: 300 },
    { id: 'archivo',    name: 'Archivo',           note: 'grotesque, editorial',  d: '"Archivo"',           s: '"Archivo"',         dw: 600, tr: '-.024em', min: 300 },
    { id: 'plex',       name: 'IBM Plex Sans',     note: 'technical, clinical',   d: '"IBM Plex Sans"',     s: '"IBM Plex Sans"',   dw: 500, tr: '-.018em', min: 300 },
    { id: 'schibsted',  name: 'Schibsted Grotesk', note: 'warm neo-grotesque',    d: '"Schibsted Grotesk"', s: '"Inter"',           dw: 500, tr: '-.022em', min: 400 },
    { id: 'instrument', name: 'Instrument Sans',   note: 'tight, contemporary',   d: '"Instrument Sans"',   s: '"Instrument Sans"', dw: 600, tr: '-.032em', min: 400 },
    { id: 'newsreader', name: 'Newsreader',        note: 'serif display + Inter', d: '"Newsreader"',        s: '"Inter"',           dw: 400, tr: '-.008em', min: 300 }
  ];
  var DW = [300, 400, 500, 600, 700];
  var BW = [300, 400, 500];
  var FB = ',system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif';
  var KEY = 'axiom.fonttest';
  var st = { id: 'jost', dw: null, bw: 400 };
  try { var raw = localStorage.getItem(KEY); if (raw) st = JSON.parse(raw); } catch (e) {}

  function set() { return SETS.filter(function (x) { return x.id === st.id; })[0] || SETS[0]; }

  function apply() {
    var f = set();
    if (st.dw == null) st.dw = f.dw;
    st.dw = Math.max(f.min, st.dw);
    // heavier weight wants tighter tracking: .004em per 100 above the family's natural weight
    var tr = (parseFloat(f.tr) - (st.dw - f.dw) * 0.00004).toFixed(4) + 'em';
    var r = document.documentElement.style;
    r.setProperty('--display', f.d + FB);
    r.setProperty('--sans', f.s + FB);
    r.setProperty('--dw', String(st.dw));
    r.setProperty('--bw', String(st.bw));
    r.setProperty('--dtrack', tr);
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    document.getElementById('ftName').textContent = f.name + ' · ' + f.note;
    each('button[data-f]', function (b) { b.setAttribute('aria-pressed', b.dataset.f === f.id ? 'true' : 'false'); });
    each('button[data-w]', function (b) {
      b.disabled = +b.dataset.w < f.min;
      b.setAttribute('aria-pressed', +b.dataset.w === st.dw ? 'true' : 'false');
    });
    each('button[data-b]', function (b) { b.setAttribute('aria-pressed', +b.dataset.b === st.bw ? 'true' : 'false'); });
  }
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll('#ftPanel ' + sel), fn); }

  var css = document.createElement('style');
  css.textContent = '#ftPanel{position:fixed;left:18px;bottom:18px;z-index:300;background:var(--bg);color:var(--ink);'
    + 'border:1px solid var(--line-2);padding:12px 13px 11px;font-family:var(--sans);box-shadow:0 18px 50px rgba(0,0,0,.22);max-width:min(92vw,330px)}'
    + '#ftPanel .h{font-size:9.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--accent);font-weight:600;display:flex;justify-content:space-between;gap:12px;align-items:center}'
    + '#ftPanel .h button{font-size:15px;line-height:1;color:var(--muted)}'
    + '#ftPanel .g{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}'
    + '#ftPanel .g button{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;padding:6px 9px;border:1px solid var(--line);color:var(--muted);transition:.15s;font-variant-numeric:tabular-nums}'
    + '#ftPanel .g button:hover:not(:disabled){border-color:var(--accent);color:var(--ink)}'
    + '#ftPanel .g button[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '#ftPanel .g button:disabled{opacity:.3;cursor:default}'
    + '#ftPanel .r{display:flex;align-items:center;gap:8px;margin-top:8px}'
    + '#ftPanel .r>span{font-size:9.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);font-weight:600;min-width:52px}'
    + '#ftPanel .r .g{margin-top:0}'
    + '#ftPanel .n{font-size:11px;color:var(--muted);margin-top:10px;letter-spacing:.02em}'
    + '#ftOpen{position:fixed;left:18px;bottom:18px;z-index:300;background:var(--ink);color:var(--bg);font-family:var(--sans);'
    + 'font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:600;padding:10px 14px}'
    + '@media(max-width:700px){#ftPanel,#ftOpen{left:10px;bottom:10px}}';
  document.head.appendChild(css);

  var open = document.createElement('button');
  open.id = 'ftOpen'; open.type = 'button'; open.textContent = 'Type'; open.hidden = true;

  var panel = document.createElement('div');
  panel.id = 'ftPanel';
  panel.innerHTML = '<div class="h"><span>Typeface preview</span><button type="button" id="ftClose" aria-label="Hide">&times;</button></div>'
    + '<div class="g">' + SETS.map(function (x) { return '<button type="button" data-f="' + x.id + '">' + x.name + '</button>'; }).join('') + '</div>'
    + '<div class="r"><span>Headings</span><div class="g">' + DW.map(function (w) { return '<button type="button" data-w="' + w + '">' + w + '</button>'; }).join('') + '</div></div>'
    + '<div class="r"><span>Body</span><div class="g">' + BW.map(function (w) { return '<button type="button" data-b="' + w + '">' + w + '</button>'; }).join('') + '</div></div>'
    + '<div class="n" id="ftName"></div>';

  document.body.appendChild(panel);
  document.body.appendChild(open);

  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.id === 'ftClose') { panel.hidden = true; open.hidden = false; return; }
    if (b.dataset.f) { st.id = b.dataset.f; st.dw = null; }
    else if (b.dataset.w) st.dw = +b.dataset.w;
    else if (b.dataset.b) st.bw = +b.dataset.b;
    apply();
  });
  open.addEventListener('click', function () { panel.hidden = false; open.hidden = true; });

  apply();
})();
