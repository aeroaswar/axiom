/* Preview-only typeface switcher. Injected by build.py --fonts test; never linked from a shipped page. */
(function () {
  var SETS = [
    { id: 'jost',      name: 'Jost',             note: 'current — geometric',      d: '"Jost"',              s: '"Inter"',              dw: 500, tr: '-.012em' },
    { id: 'geist',     name: 'Geist',            note: 'neutral, modern',          d: '"Geist"',             s: '"Geist"',              dw: 600, tr: '-.028em' },
    { id: 'archivo',   name: 'Archivo',          note: 'grotesque, editorial',     d: '"Archivo"',           s: '"Archivo"',            dw: 600, tr: '-.024em' },
    { id: 'plex',      name: 'IBM Plex Sans',    note: 'technical, clinical',      d: '"IBM Plex Sans"',     s: '"IBM Plex Sans"',      dw: 500, tr: '-.018em' },
    { id: 'schibsted', name: 'Schibsted Grotesk',note: 'warm neo-grotesque',       d: '"Schibsted Grotesk"', s: '"Inter"',              dw: 500, tr: '-.022em' },
    { id: 'instrument',name: 'Instrument Sans',  note: 'tight, contemporary',      d: '"Instrument Sans"',   s: '"Instrument Sans"',    dw: 600, tr: '-.032em' },
    { id: 'newsreader',name: 'Newsreader',       note: 'serif display + Inter',    d: '"Newsreader"',        s: '"Inter"',              dw: 400, tr: '-.008em' }
  ];
  var FB = ',system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif';
  var KEY = 'axiom.fonttest';

  function apply(set) {
    var r = document.documentElement.style;
    r.setProperty('--display', set.d + FB);
    r.setProperty('--sans', set.s + FB);
    r.setProperty('--dw', String(set.dw));
    r.setProperty('--dtrack', set.tr);
    try { localStorage.setItem(KEY, set.id); } catch (e) {}
    var lbl = document.getElementById('ftName');
    if (lbl) lbl.textContent = set.name + ' · ' + set.note;
    Array.prototype.forEach.call(document.querySelectorAll('#ftPanel button[data-f]'), function (b) {
      b.setAttribute('aria-pressed', b.dataset.f === set.id ? 'true' : 'false');
    });
  }

  var saved; try { saved = localStorage.getItem(KEY); } catch (e) {}
  var start = SETS.filter(function (x) { return x.id === saved; })[0] || SETS[0];

  var css = document.createElement('style');
  css.textContent = '#ftPanel{position:fixed;left:18px;bottom:18px;z-index:300;background:var(--bg);color:var(--ink);'
    + 'border:1px solid var(--line-2);padding:12px 13px 11px;font-family:var(--sans);box-shadow:0 18px 50px rgba(0,0,0,.22);max-width:min(92vw,320px)}'
    + '#ftPanel .h{font-size:9.5px;letter-spacing:.24em;text-transform:uppercase;color:var(--accent);font-weight:600;display:flex;justify-content:space-between;gap:12px;align-items:center}'
    + '#ftPanel .h button{font-size:15px;line-height:1;color:var(--muted)}'
    + '#ftPanel .g{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}'
    + '#ftPanel .g button{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;padding:6px 9px;border:1px solid var(--line);color:var(--muted);transition:.15s}'
    + '#ftPanel .g button:hover{border-color:var(--accent);color:var(--ink)}'
    + '#ftPanel .g button[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}'
    + '#ftPanel .n{font-size:11px;color:var(--muted);margin-top:9px;letter-spacing:.02em}'
    + '#ftOpen{position:fixed;left:18px;bottom:18px;z-index:300;background:var(--ink);color:var(--bg);font-family:var(--sans);'
    + 'font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:600;padding:10px 14px}'
    + '@media(max-width:700px){#ftPanel,#ftOpen{left:10px;bottom:10px}}';
  document.head.appendChild(css);

  var open = document.createElement('button');
  open.id = 'ftOpen'; open.textContent = 'Type'; open.hidden = true;

  var panel = document.createElement('div');
  panel.id = 'ftPanel';
  panel.innerHTML = '<div class="h"><span>Typeface preview</span><button type="button" id="ftClose" aria-label="Hide">&times;</button></div>'
    + '<div class="g">' + SETS.map(function (x) {
        return '<button type="button" data-f="' + x.id + '">' + x.name + '</button>';
      }).join('') + '</div><div class="n" id="ftName"></div>';

  document.body.appendChild(panel);
  document.body.appendChild(open);

  panel.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.id === 'ftClose') { panel.hidden = true; open.hidden = false; return; }
    var set = SETS.filter(function (x) { return x.id === b.dataset.f; })[0];
    if (set) apply(set);
  });
  open.addEventListener('click', function () { panel.hidden = false; open.hidden = true; });

  apply(start);
})();
