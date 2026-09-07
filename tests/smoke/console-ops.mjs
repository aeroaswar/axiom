// AXIOM Console — the data modules, proven against the running app and the running database.
//   node tests/smoke/console-ops.mjs [screenshot-dir]
// Covers: the catalogue and its three stock figures, a movement the ledger refuses, the margin
// book footing to the document, a price change reaching the public price list, the owner-only
// boundary as an ops session sees it, the six seeded acknowledgement states, the copy lint, and
// no horizontal scroll at 390 or 1440.
import { chromium } from 'playwright';
import postgres from 'postgres';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const SHOTS = process.argv[2] || null;
const DB = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/axiom';

const sql = postgres(DB, { max: 1, onnotice: () => {} });
let failures = 0;
const ok = (name, pass, detail = '') => {
  if (!pass) failures++;
  console.log(`${pass ? '  ok  ' : '  FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const idr = n => 'Rp ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });

async function signIn(role) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => { failures++; console.log('  FAIL page error:', String(e).slice(0, 200)); });
  await page.goto(`${BASE}/sign-in?next=/console`);
  const forms = page.locator('form.cell');
  const n = await forms.count();
  for (let i = 0; i < n; i++) {
    const text = (await forms.nth(i).textContent()) || '';
    if (text.includes(`${role}@`)) { await forms.nth(i).getByRole('button').click(); break; }
  }
  await page.waitForURL(/\/(console|account)/, { timeout: 30000 });
  return { ctx, page };
}
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : Promise.resolve());
const hscroll = page => page.evaluate(() => {
  const s = document.querySelector('.scroll');
  return document.documentElement.scrollWidth > document.documentElement.clientWidth
    || (s ? s.scrollWidth > s.clientWidth + 1 : false);
});

// ---------------------------------------------------------------- owner
const owner = await signIn('owner');
{
  const page = owner.page;

  // 1 · the catalogue lists every variant, grouped by pathway, with three stock figures
  await page.goto(`${BASE}/console/catalogue`, { waitUntil: 'networkidle' });
  const rows = await page.locator('.tbl tbody tr.lnk').count();
  const groups = await page.locator('.tbl tbody tr.grp').count();
  const [{ n: variants }] = await sql`select count(*)::int n from product_variants where is_active`;
  const [{ n: pathways }] = await sql`
    select count(distinct pw.id)::int n from product_variants v
    join products p on p.id = v.product_id join pathways pw on pw.id = p.pathway_id where v.is_active`;
  ok('catalogue lists every variant', rows === variants, `${rows} rows, ${variants} in the database`);
  ok('grouped by pathway', groups === pathways, `${groups} group rows, ${pathways} pathways`);
  await shot(page, 'console-catalogue-1440');

  const sku = (await sql`select sku from product_variants where sku = 'bpc10'`)[0]?.sku
    || (await sql`select sku from product_variants order by sort limit 1`)[0].sku;
  await page.goto(`${BASE}/console/catalogue/${sku}`, { waitUntil: 'networkidle' });
  const figures = await page.locator('.sheet .figs > div .val').allTextContents();
  const [balance] = await sql`select on_hand, reserved from axiom.stock_all s
    join product_variants v on v.id = s.variant_id where v.sku = ${sku}`;
  ok('the sheet shows three stock figures', figures.length === 3, figures.join(' · '));
  ok('on hand is the ledger balance', Number(figures[0]) === Number(balance.on_hand), `${figures[0]} vs ${balance.on_hand}`);
  ok('reserved comes from open quotes and orders', Number(figures[1]) === Number(balance.reserved), `${figures[1]} vs ${balance.reserved}`);
  ok('available is on hand less reserved',
    Number(figures[2]) === Number(balance.on_hand) - Number(balance.reserved), figures[2]);
  await shot(page, 'console-catalogue-sheet-1440');

  // 2 · a movement below zero is refused, in the database's own words
  await page.fill('#delta', '-99999');
  await page.getByRole('button', { name: /^(Record|Catat)$/i }).click();
  await page.waitForTimeout(2000);
  const refusal = (await page.locator('.formfoot .msg.err').first().textContent()) || '';
  ok('a movement below zero is refused', /check constraint|variant_stock/.test(refusal), refusal.slice(0, 110));
  const [{ n: after }] = await sql`select on_hand n from axiom.stock_all s
    join product_variants v on v.id = s.variant_id where v.sku = ${sku}`;
  ok('the refused movement changed nothing', Number(after) === Number(balance.on_hand), `${after} vs ${balance.on_hand}`);
  await shot(page, 'console-movement-refused');

  // 3 · the margin book foots to the document
  await page.goto(`${BASE}/console/pricing`, { waitUntil: 'networkidle' });
  const footing = await page.locator('[data-footing] [data-foot]').allTextContents();
  const [book] = await sql`
    select sum(c.supplier_cost_idr)::text sup, sum(c.supplier_cost_idr + c.pen_cost_idr)::text base,
           sum(v.price_idr)::text sell, sum(v.price_idr - c.supplier_cost_idr - c.pen_cost_idr)::text marg
    from product_variants v join variant_costs c on c.variant_id = v.id
    join products p on p.id = v.product_id where p.kind = 'peptide' and v.is_active`;
  const expected = [idr(book.sup), idr(book.base), idr(book.sell), idr(book.marg)];
  ok('the roll-up foots to the book', JSON.stringify(footing) === JSON.stringify(expected),
    `${footing.join(' · ')} vs ${expected.join(' · ')}`);
  console.log(`       supplier ${expected[0]} · base ${expected[1]} · selling ${expected[2]} · margin ${expected[3]}`);
  const lots = await page.locator('.tblwrap.desktop-only tr.lnk').count();
  ok('every lot is listed', lots === variants, `${lots} lots`);
  ok('pricing has no horizontal scroll at 1440', !(await hscroll(page)));
  await shot(page, 'console-pricing-1440');

  // 4 · a price change is audited and the public price list follows
  const priceSku = 'ghk100';
  const [{ price_idr: original }] = await sql`select price_idr from product_variants where sku = ${priceSku}`;
  const target = String(Number(original) + 111000);
  await page.goto(`${BASE}/console/pricing/${priceSku}`, { waitUntil: 'networkidle' });
  await page.fill('#price', target);
  await page.getByRole('button', { name: /^(Set price|Tetapkan harga)$/i }).click();
  await page.waitForTimeout(2500);
  const [change] = await sql`select from_idr::text from_idr, to_idr::text to_idr, changed_by
    from price_changes pc join product_variants v on v.id = pc.variant_id
    where v.sku = ${priceSku} order by changed_at desc limit 1`;
  ok('the change lands in price_changes',
    change?.from_idr === String(original) && change?.to_idr === target && !!change?.changed_by,
    `${change?.from_idr} → ${change?.to_idr}`);
  await page.goto(`${BASE}/price-list`, { waitUntil: 'networkidle' });
  const listed = await page.locator('body').innerText();
  ok('the public price list carries the new price', listed.includes(idr(target)), idr(target));
  ok('the public price list has dropped the old one', !listed.includes(idr(original)), idr(original));
  // put it back: this runs against the shared development database
  await page.goto(`${BASE}/console/pricing/${priceSku}`, { waitUntil: 'networkidle' });
  await page.fill('#price', String(original));
  await page.getByRole('button', { name: /^(Set price|Tetapkan harga)$/i }).click();
  await page.waitForTimeout(2500);
  const [{ price_idr: restored }] = await sql`select price_idr from product_variants where sku = ${priceSku}`;
  ok('the price is put back', String(restored) === String(original), `${restored}`);

  // 5 · the six seeded accounts carry the acknowledgement state the database computes
  await page.goto(`${BASE}/console/clients`, { waitUntil: 'networkidle' });
  const accounts = await sql`select name, axiom.ack_state_for(id) st from accounts order by name`;
  const LABEL = { current: 'Current', expiring: 'Renew', lapsed: 'Lapsed', none: '18+ only' };
  const shown = await page.locator('.tbl tbody tr.lnk').allTextContents();
  ok('every seeded account is listed', shown.length === accounts.length, `${shown.length} of ${accounts.length}`);
  for (const a of accounts) {
    const row = shown.find(r => r.includes(a.name)) || '';
    ok(`${a.name} reads ${LABEL[a.st]}`, row.includes(LABEL[a.st]), row.replace(/\s+/g, ' ').slice(0, 90));
  }
  await shot(page, 'console-clients-1440');

  // 6 · the content editor refuses an exclamation mark, and writes nothing
  const [{ slug }] = await sql`select slug from products where coalesce(identity_en,'') <> '' order by sort limit 1`;
  await page.goto(`${BASE}/console/content/${slug}`, { waitUntil: 'networkidle' });
  const before = await page.inputValue('#identity_en');
  await page.fill('#identity_en', `${before} Verified in the laboratory!`);
  await page.getByRole('button', { name: /^(Save text|Simpan teks)$/i }).click();
  await page.waitForTimeout(2000);
  const lint = (await page.locator('.refusal.err li').allTextContents()).join(' | ');
  ok('the copy lint refuses an exclamation mark', /exclamation|tanda seru/i.test(lint), lint.slice(0, 110));
  const [{ identity_en: stored }] = await sql`select identity_en from products where slug = ${slug}`;
  ok('nothing was saved', stored === before, stored?.slice(-30));
  await shot(page, 'console-content-lint');

  // 7 · no horizontal scroll, both widths, on every screen this agent owns
  const SCREENS = ['/console/catalogue', '/console/pricing', '/console/clients', '/console/content',
    '/console/settings', '/console/more', '/console/notifications', '/console/search?q=klinik'];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const route of SCREENS) {
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      ok(`${route} has no horizontal scroll at ${width}`, !(await hscroll(page)));
    }
    await page.goto(`${BASE}/console/catalogue`, { waitUntil: 'networkidle' });
    await shot(page, `console-catalogue-${width}`);
    await page.goto(`${BASE}/console/clients`, { waitUntil: 'networkidle' });
    await shot(page, `console-clients-${width}`);
    await page.goto(`${BASE}/console/pricing`, { waitUntil: 'networkidle' });
    await shot(page, `console-pricing-${width}`);
    await page.goto(`${BASE}/console/content`, { waitUntil: 'networkidle' });
    await shot(page, `console-content-${width}`);
    await page.goto(`${BASE}/console/settings`, { waitUntil: 'networkidle' });
    await shot(page, `console-settings-${width}`);
    await page.goto(`${BASE}/console/more`, { waitUntil: 'networkidle' });
    await shot(page, `console-more-${width}`);
    await page.goto(`${BASE}/console/notifications`, { waitUntil: 'networkidle' });
    await shot(page, `console-notifications-${width}`);
    await page.goto(`${BASE}/console/search?q=klinik`, { waitUntil: 'networkidle' });
    await shot(page, `console-search-${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  // one nav per width
  await page.goto(`${BASE}/console/catalogue`, { waitUntil: 'networkidle' });
  ok('rail at 1440, no tab bar', await page.locator('.rail').isVisible() && !(await page.locator('.tabbar').isVisible()));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  ok('tab bar at 390, no rail', await page.locator('.tabbar').isVisible() && !(await page.locator('.rail').isVisible()));
}
await owner.ctx.close();

// ---------------------------------------------------------------- ops
{
  const { ctx, page } = await signIn('ops');
  const response = await page.goto(`${BASE}/console/pricing`, { waitUntil: 'networkidle' });
  const text = await page.locator('body').innerText();
  ok('ops reaches the pricing route without an error page',
    response.status() === 200 && !/Application error|Unhandled|stack/i.test(text), String(response.status()));
  ok('ops is told the figures are owner-only', /owner-only|hanya pemilik/i.test(text), text.replace(/\s+/g, ' ').slice(0, 110));
  ok('ops sees no margin figure', !/Blended|marjin gabungan/i.test(text));
  ok('the rail offers ops no route to the book', (await page.locator('.rail a[href*="pricing"]').count()) === 0);
  const denied = await sql.begin(async tx => {
    await tx.unsafe('set local role authenticated');
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: '00000000-0000-4000-8000-000000000002', role: 'authenticated' })}, true)`;
    try { await tx`select 1 from v_pricing limit 1`; return null; } catch (e) { return e.message; }
  }).catch(e => e.message);
  ok('the database itself refuses an ops query for cost', /owner-only/.test(String(denied)), String(denied).slice(0, 80));
  await shot(page, 'console-pricing-ops');
  await ctx.close();
}

await browser.close();
await sql.end();
console.log(failures ? `\n${failures} failure(s)` : '\n  all checks passed');
process.exit(failures ? 1 : 0);
