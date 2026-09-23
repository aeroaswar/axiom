// Builds the AXIOM order form from the price list.
//   NODE_PATH="$(npm root -g)" node build.cjs && python3 add-fields.py
// 1. Reads ../axiom-pricelist-print.html (fonts, wordmark, every priced line)
// 2. Renders order-form.html → order-form.flat.pdf with Chromium
// 3. Writes fields.json (PDF-point rects) for add-fields.py to make fillable
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const HERE = __dirname;
const PRICELIST = path.join(HERE, '..', 'axiom-pricelist-print.html');
const ITEM_ROWS = 5;
const PAGE_W = 420, PAGE_H = 900;          // CSS px, must match @page in the template
const PX_TO_PT = 0.75;
const ROW_BUDGET = 690;                     // px of price rows per reference page

const src = fs.readFileSync(PRICELIST, 'utf8');
const fonts = src.match(/@font-face \{[\s\S]*?\}/g).join('\n');
const wmPath = src.match(/viewBox="0 0 582 70"[^>]*><path[^>]* d="([^"]+)"/)[1];
// The notched X is the four wordmark subpaths that start between x=130 and x=215
const xPath = wmPath.split(/(?=M)/).filter(p => {
  const x = parseFloat(p.slice(1));
  return x >= 130 && x <= 215;
}).join(' ').trim();

const cats = [...src.matchAll(/<section class="cat">([\s\S]*?)<\/section>/g)].map(m => ({
  ix: m[1].match(/class="ix">([^<]+)/)[1],
  name: m[1].match(/<h3>([^<]+)/)[1],
  rows: [...m[1].matchAll(/<td class="c">([^<]+)<\/td><td class="q">([^<]+)<\/td><td class="p">([^<]+)<\/td>/g)]
    .map(r => ({ c: r[1], q: r[2], p: r[3] })),
}));
const rowCount = cats.reduce((n, c) => n + c.rows.length, 0);

// Greedy split of whole categories across reference pages
const pages = [[]];
let used = 0;
for (const c of cats) {
  const h = 34 + c.rows.length * 19.5;
  if (used + h > ROW_BUDGET && pages[pages.length - 1].length) { pages.push([]); used = 0; }
  pages[pages.length - 1].push(c);
  used += h;
}
const lastPage = pages.length + 1;

const esc = s => s; // price list text is already HTML-escaped
const catHtml = c => `
    <section class="cat">
      <div class="ch"><span class="ix">${c.ix}</span><h3>${esc(c.name)}</h3></div>
      <table class="pl"><tbody>
${c.rows.map(r => `        <tr><td class="c">${esc(r.c)}</td><td class="q">${r.q}</td><td class="p">${r.p}</td></tr>`).join('\n')}
      </tbody></table>
    </section>`;

const pricePages = pages.map((cs, i) => `
<!-- ============ PAGE ${i + 2} · PRICE REFERENCE ============ -->
<div class="page">
  <header class="mast slim">
    <div class="mast-top">
      <svg class="wm" viewBox="0 0 582 70" aria-label="AXIOM"><path fill="#F2EDE5" fill-rule="evenodd" d="${wmPath}"/></svg>
      <svg class="mark" viewBox="131 0 83 70" aria-hidden="true"><path fill="#C88A4E" fill-rule="evenodd" d="${xPath}"/></svg>
    </div>
    <div class="title-row">
      <h1>Price List</h1>
      <div class="meta">Reference for your order<br>IDR · v1.0</div>
    </div>
  </header>
${cs.map(catHtml).join('\n')}
  <div class="spacer"></div>
  <div class="ruo">Research Use Only. Not for human or veterinary use. Prices in IDR and subject to confirmation.</div>
  <div class="foot"><span class="id">AX-OF-v1.0</span><span>Page ${i + 2} / ${lastPage}</span></div>
</div>`).join('\n');

const itemRows = Array.from({ length: ITEM_ROWS }, (_, i) =>
  `        <tr><td class="n">${String(i + 1).padStart(2, '0')}</td><td><span class="box" data-field="item_${i + 1}"></span></td><td class="q"><span class="box" data-field="qty_${i + 1}" data-align="1" data-max="3"></span></td></tr>`
).join('\n');

const html = fs.readFileSync(path.join(HERE, 'order-form.template.html'), 'utf8')
  .replace('/*{{FONTS}}*/', fonts)
  .replace('{{WM_PATH}}', wmPath)
  .replace('{{X_PATH}}', xPath)
  .replace('{{ITEM_ROWS}}', itemRows)
  .replace('{{PRICE_PAGES}}', pricePages)
  .replaceAll('{{LAST_PAGE}}', String(lastPage));

const outHtml = path.join(HERE, 'order-form.html');
fs.writeFileSync(outHtml, html);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: PAGE_W, height: PAGE_H } });
  await page.goto('file://' + outHtml);
  await page.evaluate(() => document.fonts.ready);

  const overflow = await page.$$eval('.page', ps => ps.map((p, i) => p.scrollHeight > p.clientHeight + 1 ? i + 1 : 0).filter(Boolean));
  if (overflow.length) throw new Error('Content overflows page(s): ' + overflow.join(', '));

  const fields = await page.$$eval('[data-field]', (els, H) => els.map(el => {
    const r = el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    return {
      name: el.dataset.field, multiline: !!el.dataset.multiline, center: !!el.dataset.align,
      maxLen: el.dataset.max ? +el.dataset.max : 0,
      page: Math.floor(top / H), x: r.left, y: top % H, w: r.width, h: r.height,
    };
  }), PAGE_H);

  await page.pdf({ path: path.join(HERE, 'order-form.flat.pdf'), preferCSSPageSize: true, printBackground: true });
  await browser.close();

  const pt = v => +(v * PX_TO_PT).toFixed(2);
  fs.writeFileSync(path.join(HERE, 'fields.json'), JSON.stringify(
    fields.map(f => ({ ...f, x: pt(f.x), y: pt(f.y), w: pt(f.w), h: pt(f.h) })), null, 1));
  console.log(`pages=${lastPage} priced lines=${rowCount} fields=${fields.length}`);
})().catch(e => { console.error(e); process.exit(1); });
