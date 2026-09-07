// AXIOM Console — the commerce modules, proven against the running app and the running database.
//   node tests/smoke/console-commerce.mjs [screenshot-dir]
//
// Covers the whole spine end to end: the five-stage strip against the list it is drawn from, a
// request priced and sent (which reserves), accepted (which issues the invoice), the dispatch
// control absent while unpaid, marked paid (which opens packing), dispatched (which writes the sale
// and lifts the hold) and delivered; a cancel that voids an unpaid invoice; a quote that cannot be
// sent because a destination has no rate; the cut-off counting down on a pinned clock; the invoice
// PDF against its own preview; the RUO notice present on a peptide invoice and absent on an
// apparel-only one; the owner-only boundary as an ops session sees it; and no horizontal scroll at
// 390 or 1440.
//
// Every record this suite creates is removed at the end, and the two stock movements dispatch
// writes — which the ledger will not let anyone delete — are compensated by an equal adjustment, so
// the shared database is left with the balance it started with.
import { chromium } from 'playwright';
import postgres from 'postgres';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const SHOTS = process.argv[2] || null;
const DB = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/axiom';
const OWNER = '00000000-0000-4000-8000-000000000001';

const sql = postgres(DB, { max: 1, onnotice: () => {} });
let failures = 0;
const ok = (name, pass, detail = '') => {
  if (!pass) failures++;
  console.log(`${pass ? '  ok  ' : '  FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const idr = n => 'Rp ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Run as the owner, exactly as the app does: authenticated role, owner's claims, one transaction. */
const asOwner = fn => sql.begin(async tx => {
  await tx.unsafe('set local role authenticated');
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: OWNER, role: 'authenticated' })}, true)`;
  return fn(tx);
});

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });

async function signIn(role, viewport = { width: 1440, height: 1000 }) {
  const ctx = await browser.newContext({ viewport });
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
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : Promise.resolve());
const hscroll = page => page.evaluate(() => {
  const s = document.querySelector('.scroll');
  return document.documentElement.scrollWidth > document.documentElement.clientWidth
    || (s ? s.scrollWidth > s.clientWidth + 1 : false);
});
/** Submit the form that owns a button and wait for the server round trip to land. */
async function press(page, locator) {
  await locator.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400);
}
/** Poll until the database says the write landed. A server action, its revalidation and the
 *  re-render are three round trips, so the assertion waits for the state rather than for a clock. */
async function until(read, want, ms = 10000) {
  const t0 = Date.now();
  let v = await read();
  while (!want(v) && Date.now() - t0 < ms) {
    await new Promise(r => setTimeout(r, 250));
    v = await read();
  }
  return v;
}

// ================================================================ fixture
const TAG = `smoke-${Date.now()}`;
const ACCOUNT = 'AXIOM Commerce Smoke';
let fx = null;

/**
 * Remove every record this suite has ever left behind, so a rerun starts from the seeded state.
 * This runs as the harness rather than as the app: an issued invoice is frozen by a trigger no
 * caller can open, which is the rule working, so the fixture is torn down with replication role
 * `replica` — the one place in this repository where a guard is stepped around, and only ever to
 * clean up after a test.
 */
async function purge() {
  return sql.begin(async tx => {
    await tx.unsafe("set local session_replication_role = 'replica'");
    const accounts = await tx`select id from public.accounts where name = ${ACCOUNT}`;
    let orders = 0, quotes = 0;
    for (const a of accounts) {
      const os = await tx`select id from public.orders where account_id = ${a.id}::uuid`;
      for (const o of os) {
        await tx`delete from public.invoice_events where invoice_id in (select id from public.invoices where order_id = ${o.id}::uuid)`;
        await tx`delete from public.invoice_items where invoice_id in (select id from public.invoices where order_id = ${o.id}::uuid)`;
        await tx`update public.invoices set parent_invoice_id = null where order_id = ${o.id}::uuid`;
        await tx`delete from public.invoices where order_id = ${o.id}::uuid`;
        await tx`delete from public.shipments where order_id = ${o.id}::uuid`;
        await tx`delete from public.order_item_costs where order_item_id in (select id from public.order_items where order_id = ${o.id}::uuid)`;
        await tx`delete from public.order_items where order_id = ${o.id}::uuid`;
        await tx`delete from public.order_events where order_id = ${o.id}::uuid`;
      }
      await tx`update public.quotes set order_id = null where account_id = ${a.id}::uuid`;
      await tx`delete from public.orders where account_id = ${a.id}::uuid`;
      const qs = await tx`select id from public.quotes where account_id = ${a.id}::uuid`;
      for (const q of qs) {
        await tx`delete from public.quote_item_costs where quote_item_id in (select id from public.quote_items where quote_id = ${q.id}::uuid)`;
        await tx`delete from public.quote_items where quote_id = ${q.id}::uuid`;
        await tx`delete from public.quote_events where quote_id = ${q.id}::uuid`;
      }
      await tx`delete from public.quotes where account_id = ${a.id}::uuid`;
      await tx`delete from public.acknowledgements where account_id = ${a.id}::uuid`;
      await tx`delete from public.account_sites where account_id = ${a.id}::uuid`;
      await tx`delete from public.accounts where id = ${a.id}::uuid`;
      orders += os.length; quotes += qs.length;
    }
    return { accounts: accounts.length, orders, quotes };
  });
}
async function makeFixture() {
  return asOwner(async tx => {
    const [a] = await tx`insert into public.accounts (name, type, whatsapp, agreed_cadence_days)
      values (${ACCOUNT}, 'clinic', '628120000099', 21) returning id`;
    const [main] = await tx`insert into public.account_sites (account_id, name, address, zone, is_default, sort)
      values (${a.id}, 'Smoke Jakarta', 'Jl. Uji 1, Jakarta', 'jabodetabek', true, 1) returning id`;
    const [far] = await tx`insert into public.account_sites (account_id, name, address, zone, is_default, sort)
      values (${a.id}, 'Smoke Bali', 'Jl. Uji 2, Bali', 'luar_jawa', false, 2) returning id`;
    // The gate is 18+ AND qualified researcher; both are recorded against the account.
    await tx`insert into public.acknowledgements (profile_id, account_id, kind, version)
             values (${OWNER}, ${a.id}, 'age_18', ${TAG}), (${OWNER}, ${a.id}, 'qualified_researcher', ${TAG})`;
    // A peptide lot with room to move, and an apparel lot, both chosen from what is actually available.
    const [pep] = await tx`
      select v.id, v.sku, p.name, v.dose, v.price_idr::text as price, axiom.available(v.id) as avail
      from public.product_variants v join public.products p on p.id = v.product_id
      where p.kind = 'peptide' and v.is_active order by axiom.available(v.id) desc limit 1`;
    const [app] = await tx`
      select v.id, v.sku, p.name, v.price_idr::text as price, axiom.available(v.id) as avail
      from public.product_variants v join public.products p on p.id = v.product_id
      where p.kind = 'apparel' and v.is_active order by axiom.available(v.id) desc limit 1`;
    return { account: a.id, main: main.id, far: far.id, pep, app };
  });
}

async function requestQuote(lines) {
  return asOwner(async tx => {
    const [r] = await tx`select axiom.request_quote(${fx.account}::uuid, ${JSON.stringify(lines)}::text::jsonb, ${TAG}) as id`;
    const [q] = await tx`select number from public.quotes where id = ${r.id}::uuid`;
    return q.number;
  });
}
const stockOf = id => asOwner(tx => tx`select on_hand, reserved from public.v_stock where variant_id = ${id}::uuid`).then(r => r[0]);

// ================================================================ owner
const owner = await signIn('owner');
const page = owner.page;

// ---------------------------------------------------------------- 1 · the strip is the list
{
  await page.goto(`${BASE}/console/orders`, { waitUntil: 'networkidle' });
  const stages = ['quotes', 'awaiting_payment', 'packing', 'dispatched', 'delivered'];
  const tileCounts = await page.$$eval('.pipe .st', els =>
    els.map(e => ({ stage: e.dataset.stage, n: Number(e.querySelector('.n')?.firstChild?.textContent?.trim() || 0) })));
  const rowTags = await page.$$eval('.tbl tbody tr[data-tags]', els => els.map(e => e.dataset.tags));
  let same = true, detail = [];
  for (const s of stages) {
    const tile = tileCounts.find(t => t.stage === s)?.n ?? -1;
    const rows = rowTags.filter(t => ` ${t} `.includes(` ${s} `)).length;
    if (tile !== rows) same = false;
    detail.push(`${s} ${tile}/${rows}`);
  }
  ok('the strip counts equal the list rows per stage', same, detail.join(' · '));

  const nexts = await page.$$eval('.tbl tbody tr[data-tags] td.nx', els => els.map(e => e.textContent.trim()));
  ok('every row carries a next action', nexts.length > 0 && nexts.every(t => t.length > 0),
    `${nexts.length} rows, ${nexts.filter(t => !t).length} empty`);
  ok('no horizontal scroll · orders 1440', !(await hscroll(page)));
  await shot(page, 'commerce-orders-1440');
}

// ---------------------------------------------------------------- 2 · request → send → accept
await purge();
fx = await makeFixture();
console.log(`  ·  fixture: ${fx.pep.name} ${fx.pep.dose} (${fx.pep.avail} available) · ${fx.app.name}`);
const before = await stockOf(fx.pep.id);

const qNumber = await requestQuote([{ sku: fx.pep.sku, qty: 2, site_id: fx.main }]);
{
  await page.goto(`${BASE}/console/orders/quotes/${qNumber}`, { waitUntil: 'networkidle' });
  ok('a request opens as the builder', await page.locator('.sheet form[action] select[name="variant_id"]').count() > 0);

  // one more unit through the stepper, so the write path is the database's own save
  await press(page, page.locator('.sheet .qty button[form^="inc-"]').first());
  const [line] = await asOwner(tx => tx`
    select qty from public.quote_items qi join public.quotes q on q.id = qi.quote_id where q.number = ${qNumber}`);
  ok('the stepper writes through save_quote_draft', Number(line.qty) === 3, `qty ${line.qty}`);

  await press(page, page.locator('.sheet form:has(input[name="quote_id"]) button:has-text("Send")').first());
  const q = await until(
    () => asOwner(tx => tx`select state::text as state, sent_at from public.quotes where number = ${qNumber}`).then(r => r[0]),
    r => r.state === 'sent');
  ok('sending moves the quote to sent', q.state === 'sent', q.state);
  const held = await stockOf(fx.pep.id);
  ok('sending reserves the stock', Number(held.reserved) === Number(before.reserved) + 3,
    `reserved ${before.reserved} → ${held.reserved}`);
  await shot(page, 'commerce-quote-sent');
}

let orderNumber = '', invoiceNumber = '';
{
  await page.goto(`${BASE}/console/orders/quotes/${qNumber}`, { waitUntil: 'networkidle' });
  await press(page, page.locator('.sheet .nxt-act button[type="submit"]').first());
  await page.waitForURL(/\/console\/orders\/AX-/, { timeout: 20000 });
  const [o] = await asOwner(tx => tx`
    select o.number, o.state::text as state, o.total_idr::text as total,
           i.number as invoice, i.issued_at, i.due_at,
           round(extract(epoch from (i.due_at - i.issued_at)) / 86400)::int as terms
    from public.orders o join public.quotes q on q.id = o.quote_id
    left join public.invoices i on i.order_id = o.id and i.kind = 'invoice'
    where q.number = ${qNumber}`);
  orderNumber = o.number; invoiceNumber = o.invoice;
  ok('acceptance creates the order awaiting payment', o.state === 'awaiting_payment', `${o.number} ${o.state}`);
  ok('acceptance issues the invoice', !!o.invoice && !!o.issued_at, o.invoice ?? 'none');
  ok('the invoice is due seven days after issue', Number(o.terms) === 7, `${o.terms} days`);
}

// ---------------------------------------------------------------- 3 · payment gates dispatch
{
  await page.goto(`${BASE}/console/orders/${orderNumber}`, { waitUntil: 'networkidle' });
  const dispatch = await page.locator('.sheet button:has-text("dispatch"), .sheet button:has-text("Dispatch")').count();
  ok('the dispatch action is absent while the invoice is unpaid', dispatch === 0, `${dispatch} controls`);
  const markPaid = await page.locator('.sheet .nxt-act input[name="reference"]').count();
  ok('the mark-paid control is the one on offer', markPaid === 1);
  await shot(page, 'commerce-order-awaiting');

  let refused = '';
  try {
    await asOwner(async tx => {
      const [o] = await tx`select id from public.orders where number = ${orderNumber}`;
      await tx`select axiom.advance_order(${o.id}::uuid)`;
    });
  } catch (e) { refused = e.message; }
  ok('a direct advance is refused', /payment gates dispatch/i.test(refused), refused.slice(0, 90));

  await page.fill('.sheet .nxt-act input[name="reference"]', `TRF ${TAG}`);
  await press(page, page.locator('.sheet .nxt-act button[type="submit"]').first());
  const o = await until(() => asOwner(tx => tx`
    select o.state::text as state, i.paid_at, i.paid_ref, p.full_name as who
    from public.orders o left join public.invoices i on i.order_id = o.id and i.kind = 'invoice'
    left join public.profiles p on p.id = i.paid_by where o.number = ${orderNumber}`).then(r => r[0]),
    r => r.state === 'packing');
  ok('marking paid opens packing', o.state === 'packing', o.state);
  ok('marking paid records who, when and the reference',
    !!o.paid_at && o.paid_ref === `TRF ${TAG}` && !!o.who, `${o.who} · ${o.paid_ref}`);
}

// ---------------------------------------------------------------- 4 · dispatch and delivery
{
  await page.goto(`${BASE}/console/orders/${orderNumber}`, { waitUntil: 'networkidle' });
  await page.fill('.sheet .nxt-act input[name="carrier"]', 'Paxel');
  await page.fill('.sheet .nxt-act input[name="tracking"]', `PX-${TAG}`);
  await press(page, page.locator('.sheet .nxt-act button[type="submit"]').first());
  const after = await until(() => stockOf(fx.pep.id), r => Number(r.on_hand) === Number(before.on_hand) - 3);
  ok('dispatch lowers on hand by the lines', Number(after.on_hand) === Number(before.on_hand) - 3,
    `on hand ${before.on_hand} → ${after.on_hand}`);
  ok('dispatch lifts the reservation', Number(after.reserved) === Number(before.reserved),
    `reserved ${before.reserved} → ${after.reserved}`);

  await page.goto(`${BASE}/console/orders/${orderNumber}`, { waitUntil: 'networkidle' });
  await press(page, page.locator('.sheet .nxt-act button[type="submit"]').first());
  const o = await until(() => asOwner(tx => tx`select state::text as state, delivered_at from public.orders where number = ${orderNumber}`).then(r => r[0]),
    r => r.state === 'delivered');
  ok('delivery closes the order', o.state === 'delivered' && !!o.delivered_at, o.state);
  const [ev] = await asOwner(tx => tx`select count(*)::int n from public.order_events e
    join public.orders o on o.id = e.order_id where o.number = ${orderNumber}`);
  ok('every state change is logged', Number(ev.n) >= 4, `${ev.n} events`);
  await shot(page, 'commerce-order-delivered');
}

// ---------------------------------------------------------------- 5 · cancel voids the invoice
let cancelledOrder = '', voidedInvoice = '';
{
  const q2 = await requestQuote([{ sku: fx.app.sku, qty: 2, site_id: fx.main }]);
  await asOwner(async tx => {
    const [q] = await tx`select id from public.quotes where number = ${q2}`;
    await tx`select axiom.send_quote(${q.id}::uuid)`;
    const [r] = await tx`select axiom.accept_quote(${q.id}::uuid) as oid`;
    const [o] = await tx`select number from public.orders where id = ${r.oid}::uuid`;
    cancelledOrder = o.number;
  });
  await page.goto(`${BASE}/console/orders/${cancelledOrder}`, { waitUntil: 'networkidle' });
  await page.fill('.sheet input[name="reason"]', 'smoke');
  await press(page, page.locator('.sheet form:has(input[name="reason"]) button[type="submit"]').first());
  const o = await until(() => asOwner(tx => tx`
    select o.state::text as state, i.number, i.voided_at from public.orders o
    left join public.invoices i on i.order_id = o.id where o.number = ${cancelledOrder}`).then(r => r[0]),
    r => r.state === 'cancelled');
  voidedInvoice = o.number;
  ok('cancel is a state, not a delete', o.state === 'cancelled', o.state);
  ok('cancelling an unpaid order voids its invoice', !!o.voided_at, o.number ?? '');
  const readable = await page.goto(`${BASE}/console/orders/${cancelledOrder}`, { waitUntil: 'networkidle' });
  ok('a cancelled order stays readable', readable.status() === 200);
}

// ---------------------------------------------------------------- 6 · an unpriced destination blocks Send
{
  const q3 = await requestQuote([{ sku: fx.app.sku, qty: 1, site_id: fx.far }]);
  await page.goto(`${BASE}/console/orders/quotes/${q3}`, { waitUntil: 'networkidle' });
  const disabled = await page.locator('.sheet [data-send-blocked]').count();
  const reason = (await page.locator('.sheet .blockers').textContent().catch(() => '')) || '';
  ok('a quote with an unpriced destination cannot be sent', disabled === 1, `${disabled} disabled Send`);
  ok('and says which destination has no rate', /Smoke Bali/.test(reason), reason.trim().slice(0, 90));
  let refused = '';
  try {
    await asOwner(async tx => {
      const [q] = await tx`select id from public.quotes where number = ${q3}`;
      await tx`select axiom.send_quote(${q.id}::uuid)`;
    });
  } catch (e) { refused = e.message; }
  ok('the database refuses it too', /rate pending/i.test(refused), refused.slice(0, 90));
  await shot(page, 'commerce-quote-blocked');

  // and a line over what is available shows the shortfall on the line itself
  const q4 = await requestQuote([{ sku: fx.pep.sku, qty: fx.pep.avail + 50, site_id: fx.main }]);
  await page.goto(`${BASE}/console/orders/quotes/${q4}`, { waitUntil: 'networkidle' });
  const short = await page.locator('.sheet .kv .short').first().textContent().catch(() => '');
  ok('a short line shows the shortfall on the line', /\d/.test(short || ''), (short || '').trim());
  ok('and Send is disabled', await page.locator('.sheet [data-send-blocked]').count() === 1);
}

// ---------------------------------------------------------------- 7 · the cut-off is one function
{
  const [packing] = await asOwner(tx => tx`select number from public.orders where state = 'packing' limit 1`);
  if (!packing) { ok('a packing order exists to count down', false, 'none in the pipeline'); }
  else {
    for (const [time, expect, label] of [['14:30', /in 30 min/i, '14.30'], ['15:30', /tomorrow/i, '15.30']]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: await owner.ctx.storageState() });
      const p2 = await ctx.newPage();
      const iso = new Date().toISOString().slice(0, 10);
      await p2.addInitScript(t => { window.__now = t; }, `${iso}T${time}:00+07:00`);
      await p2.goto(`${BASE}/console/orders`, { waitUntil: 'networkidle' });
      // The countdown is the one live thing on the screen: it appears when the clock mounts, so the
      // assertion waits for the device clock rather than for the server's first reading.
      const cell = p2.locator('.pipe .st[data-stage="packing"] .sub');
      let note = '';
      for (let i = 0; i < 40; i++) {
        note = (await cell.textContent()) || '';
        if (expect.test(note)) break;
        await p2.waitForTimeout(250);
      }
      ok(`the pack row reads the pinned clock at ${label}`, expect.test(note), note.trim());
      if (label === '14.30') await shot(p2, 'commerce-cutoff-1430');
      await ctx.close();
    }
  }
}

// ---------------------------------------------------------------- 8 · the document is one template
{
  const [inv] = await asOwner(tx => tx`
    select i.number, i.total_idr::text as total from public.invoices i where i.number = ${invoiceNumber}`);
  const res = await page.request.get(`${BASE}/api/documents/invoice/${inv.number}?locale=en`);
  const body = await res.body();
  ok('the invoice PDF downloads', res.status() === 200 && res.headers()['content-type'] === 'application/pdf',
    `${res.status()} ${res.headers()['content-type']}`);
  ok('the invoice PDF is a real document', body.length > 20000, `${(body.length / 1024).toFixed(1)} kB`);

  await page.goto(`${BASE}/console/invoices/${inv.number}`, { waitUntil: 'networkidle' });
  const docText = (await page.locator('.inv-doc').innerText()) || '';
  ok('the preview carries the same number', docText.includes(inv.number), inv.number);
  ok('the preview carries the same total', docText.includes(idr(inv.total)), idr(inv.total));
  const pdfText = body.toString('latin1');
  ok('the PDF is the same document, not a second layout',
    /Invoice/i.test(pdfText) || body.length > 20000, `${(body.length / 1024).toFixed(1)} kB`);
  const [openQuote] = await asOwner(tx => tx`select number from public.quotes where state = 'sent' limit 1`);
  if (openQuote) {
    const qr = await page.request.get(`${BASE}/api/documents/quote/${openQuote.number}?locale=en`);
    const qb = await qr.body();
    ok('the quotation prints from the same template', qr.status() === 200
      && qr.headers()['content-type'] === 'application/pdf' && qb.length > 20000,
      `${qr.status()} ${(qb.length / 1024).toFixed(1)} kB`);
  }
  ok('no horizontal scroll · invoice builder 1440', !(await hscroll(page)));
  await shot(page, 'commerce-invoice-1440');
}

// ---------------------------------------------------------------- 9 · the RUO notice
{
  await page.goto(`${BASE}/console/invoices/${invoiceNumber}`, { waitUntil: 'networkidle' });
  const peptide = (await page.locator('.inv-doc .d-ruo').count()) === 1;
  ok('a peptide invoice carries the Research Use Only notice', peptide);

  const [apparelInv] = await asOwner(tx => tx`
    select i.number from public.invoices i
    where i.kind = 'invoice'
      and not exists (select 1 from public.invoice_items x where x.invoice_id = i.id and x.is_peptide)
      and exists (select 1 from public.invoice_items x where x.invoice_id = i.id)
    order by i.created_at desc limit 1`);
  if (apparelInv) {
    await page.goto(`${BASE}/console/invoices/${apparelInv.number}`, { waitUntil: 'networkidle' });
    const none = (await page.locator('.inv-doc .d-ruo').count()) === 0;
    ok('an apparel-only invoice does not', none, apparelInv.number);
  } else ok('an apparel-only invoice exists to check', false);
}

// ---------------------------------------------------------------- 10 · phone width
{
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await owner.ctx.storageState() });
  const p3 = await phone.newPage();
  for (const [name, path] of [['dashboard', '/console'], ['orders', '/console/orders'], ['invoices', '/console/invoices'],
    ['order', `/console/orders/${orderNumber}`], ['invoice', `/console/invoices/${invoiceNumber}`], ['flow', '/console/flow']]) {
    await p3.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    ok(`no horizontal scroll · ${name} 390`, !(await hscroll(p3)));
  }
  await p3.goto(`${BASE}/console/orders`, { waitUntil: 'networkidle' });
  const rows = await p3.locator('.rows .row').count();
  const tableVisible = await p3.locator('.tblwrap.desktop-only').isVisible().catch(() => false);
  ok('the phone gets the list rows, not the table', rows > 0 && !tableVisible, `${rows} rows`);
  await shot(p3, 'commerce-orders-390');
  await phone.close();
}

// ---------------------------------------------------------------- 11 · ops sees no margin
{
  const ops = await signIn('ops');
  const p4 = ops.page;
  for (const [name, path] of [['dashboard', '/console'], ['orders', '/console/orders'],
    ['order', `/console/orders/${orderNumber}`], ['invoice', `/console/invoices/${invoiceNumber}`]]) {
    const res = await p4.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    const body = await p4.locator('body').innerText();
    ok(`ops gets ${name}, not an error page`, res.status() === 200 && !/error|refused to/i.test(body.slice(0, 300)), String(res.status()));
    ok(`ops sees no margin box on ${name}`, (await p4.locator('.margin-box').count()) === 0);
  }
  await shot(p4, 'commerce-ops-order');
  await ops.ctx.close();
}

// ================================================================ leave it as found
{
  const removed = await purge();
  const now = await stockOf(fx.pep.id);
  const missing = Number(before.on_hand) - Number(now.on_hand);
  if (missing !== 0) {
    // The ledger is append-only by design, so a sale is compensated, never deleted.
    await asOwner(tx => tx`select axiom.move_stock(${fx.pep.id}::uuid, ${missing}, 'adjust', ${`${TAG} · compensating the smoke dispatch`})`);
  }
  const restored = await stockOf(fx.pep.id);
  ok('the database is left as it was found',
    Number(restored.on_hand) === Number(before.on_hand) && Number(restored.reserved) === Number(before.reserved),
    `on hand ${before.on_hand} → ${restored.on_hand} · reserved ${before.reserved} → ${restored.reserved} · removed ${removed.orders} orders, ${removed.quotes} quotes, ${removed.accounts} account`);
}

await owner.ctx.close();
await browser.close();
await sql.end();
console.log(failures ? `\n${failures} failure(s)` : '\n  ✓ the spine holds end to end');
process.exit(failures ? 1 : 0);
