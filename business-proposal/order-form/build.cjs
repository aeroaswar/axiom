// Builds the AXIOM order form (one A4 page).
//   NODE_PATH="$(npm root -g)" node build.cjs && python3 add-fields.py
// 1. Takes the brand fonts and wordmark from ../axiom-pricelist-print.html
// 2. Renders order-form.html → order-form.flat.pdf with Chromium
// 3. Writes fields.json (PDF-point rects) for add-fields.py to make fillable
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const HERE = __dirname;
const PRICELIST = path.join(HERE, '..', 'axiom-pricelist-print.html');
const ITEM_ROWS = 5;
const PX_TO_PT = 0.75;

const src = fs.readFileSync(PRICELIST, 'utf8');
const fonts = src.match(/@font-face \{[\s\S]*?\}/g).join('\n');
const wmPath = src.match(/viewBox="0 0 582 70"[^>]*><path[^>]* d="([^"]+)"/)[1];

const itemRows = Array.from({ length: ITEM_ROWS }, (_, i) => {
  const n = i + 1;
  return `        <tr><td class="n">${String(n).padStart(2, '0')}</td>` +
    `<td><span class="box" data-field="item_${n}"></span></td>` +
    `<td class="s"><span class="box" data-field="mg_${n}" data-align="1"></span></td>` +
    `<td class="q"><span class="box" data-field="qty_${n}" data-align="1" data-max="3"></span></td></tr>`;
}).join('\n');

const html = fs.readFileSync(path.join(HERE, 'order-form.template.html'), 'utf8')
  .replace('/*{{FONTS}}*/', fonts)
  .replace('{{WM_PATH}}', wmPath)
  .replace('{{ITEM_ROWS}}', itemRows);

const outHtml = path.join(HERE, 'order-form.html');
fs.writeFileSync(outHtml, html);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await page.goto('file://' + outHtml);
  await page.evaluate(() => document.fonts.ready);

  const overflow = await page.$$eval('.page', ps => ps.map((p, i) => p.scrollHeight > p.clientHeight + 1 ? i + 1 : 0).filter(Boolean));
  if (overflow.length) throw new Error('Content overflows page(s): ' + overflow.join(', '));

  const fields = await page.$$eval('[data-field]', els => {
    const pages = [...document.querySelectorAll('.page')];
    return els.map(el => {
      const pg = el.closest('.page');
      const r = el.getBoundingClientRect(), pr = pg.getBoundingClientRect();
      return {
        name: el.dataset.field, multiline: !!el.dataset.multiline, center: !!el.dataset.align,
        maxLen: el.dataset.max ? +el.dataset.max : 0,
        page: pages.indexOf(pg), x: r.left - pr.left, y: r.top - pr.top, w: r.width, h: r.height,
      };
    });
  });

  await page.pdf({ path: path.join(HERE, 'order-form.flat.pdf'), preferCSSPageSize: true, printBackground: true });
  await browser.close();

  const pt = v => +(v * PX_TO_PT).toFixed(2);
  fs.writeFileSync(path.join(HERE, 'fields.json'), JSON.stringify(
    fields.map(f => ({ ...f, x: pt(f.x), y: pt(f.y), w: pt(f.w), h: pt(f.h) })), null, 1));
  console.log(`fields=${fields.length}`);
})().catch(e => { console.error(e); process.exit(1); });
