// AXIOM Account — the clinic's own surface, proven against the running app and the running
// database.
//   node tests/smoke/account.mjs [screenshot-dir]
//
// Covers: the home's three groups and what belongs in each · accepting a sent quote into an order
// with its bank details and the invoice number as the reference · "I have transferred" writing the
// claim · the acknowledgement gate seen from a lapsed account, on the catalogue and on an order
// that carries a peptide line · an account recording the acknowledgement and prices opening · a
// basket split across three destinations, two priced and one rate pending · one card per compound
// rather than one per lot · a client refused the Console · no horizontal scroll at 390 or 1440.
//
// The suite creates its own fixtures through the domain functions and removes them again, so the
// shared database is left as it was found.
import { chromium } from 'playwright';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const SHOTS = process.argv[2] || null;
const DB = process.env.DATABASE_URL
  || (readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim()
  || 'postgres://postgres:postgres@127.0.0.1:5432/axiom';

const sql = postgres(DB, { max: 2, onnotice: () => {} });
let failures = 0;
const ok = (name, pass, detail = '') => {
  if (!pass) failures++;
  console.log(`${pass ? '  ok  ' : '  FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const OWNER = '00000000-0000-4000-8000-000000000001';
const REGENERA = '10000000-0000-4000-8000-000000000001';
const SENOPATI = '10000000-0000-4000-8000-000000000004';
const LONGA = '10000000-0000-4000-8000-000000000006';
const KEBAYORAN = '20000000-0000-4000-8000-000000000001';
const KEMANG = '20000000-0000-4000-8000-000000000002';
const BANDUNG = '20000000-0000-4000-8000-000000000003';
const SENOPATI_SITE = '20000000-0000-4000-8000-000000000006';
const SENOPATI_UID = '00000000-0000-4000-8000-000000000015';

/** Run a block as a signed-in Postgres role, exactly as the app does. */
const as = (uid, fn) => sql.begin(async tx => {
  await tx.unsafe('set local role authenticated');
  await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: uid, role: 'authenticated' })}, true)`;
  return fn(tx);
});

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });

async function go(page, url, waitUntil = 'domcontentloaded') {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await page.goto(url, { waitUntil, timeout: 60000 });
      if (res && res.status() >= 500 && i < 2) { await page.waitForTimeout(2000); continue; }
      await page.waitForTimeout(400);
      return res;
    } catch (e) { if (i === 2) throw e; await page.waitForTimeout(1500); }
  }
}

async function signIn(who, width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => { failures++; console.log('  FAIL page error:', String(e).slice(0, 200)); });
  await go(page, `${BASE}/sign-in?next=/account`);
  const forms = page.locator('form.cell');
  const n = await forms.count();
  for (let i = 0; i < n; i++) {
    if (((await forms.nth(i).textContent()) || '').includes(`${who}@`)) { await forms.nth(i).getByRole('button').click(); break; }
  }
  await page.waitForURL(/\/(account|console)/, { timeout: 40000 });
  return { ctx, page };
}

const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }) : Promise.resolve());
const hscroll = page => page.evaluate(() => {
  const s = document.querySelector('.scroll');
  return document.documentElement.scrollWidth > document.documentElement.clientWidth
    || (s ? s.scrollWidth > s.clientWidth + 1 : false);
});
const idr = n => 'Rp ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Everything the suite created, removed in reverse at the end. */
const madeQuotes = [];
const madeAcks = [];

async function makeSentQuote(account, lines) {
  const [{ id }] = await as(OWNER, async tx => {
    const [{ new_quote: q }] = await tx`select axiom.new_quote(${account}::uuid, ${tx.json(lines)})`;
    await tx`select axiom.send_quote(${q}::uuid)`;
    return tx`select ${q}::uuid as id`;
  });
  madeQuotes.push(id);
  const [{ number }] = await sql`select number from quotes where id = ${id}::uuid`;
  return { id, number };
}

// ================================================================ 1 · the home
const reg = await signIn('regenera.director');
{
  const { page } = reg;
  await go(page, `${BASE}/account`);

  const sent = await sql`select number from quotes where account_id = ${REGENERA}::uuid and axiom.quote_state(quotes.*) = 'sent'`;
  const overdue = await sql`
    select o.number, i.number as inv, i.due_at from orders o join invoices i on i.order_id = o.id
    where o.account_id = ${REGENERA}::uuid and o.state = 'awaiting_payment' and i.paid_at is null and i.due_at < now()`;

  const needs = page.locator('section.sec').first();
  const needsText = await needs.innerText();
  const inNeeds = ref => needsText.includes(ref);
  ok('Needs you carries every sent quote', sent.length > 0 && sent.every(q => inNeeds(q.number)),
    `${sent.length} sent: ${sent.map(q => q.number).join(', ')}`);
  ok('Needs you carries every overdue invoice', overdue.length > 0 && overdue.every(o => inNeeds(o.number)),
    `${overdue.length} overdue: ${overdue.map(o => `${o.number}/${o.inv}`).join(', ')}`);
  ok('no state name reaches the reader', !/awaiting_payment|quote_state|requested\b/.test(needsText));

  const progress = await page.locator('section.sec').nth(1).innerText();
  const packing = await sql`select number from orders where account_id = ${REGENERA}::uuid and state in ('packing','dispatched')`;
  ok('In progress carries the orders being packed or on their way',
    packing.every(o => progress.includes(o.number)), packing.map(o => o.number).join(', ') || 'none');

  const earlier = await page.locator('section.sec').nth(2).innerText();
  const done = await sql`select number from orders where account_id = ${REGENERA}::uuid and state in ('delivered','cancelled')`;
  ok('Earlier carries the delivered and cancelled orders, each with a reorder',
    done.every(o => earlier.includes(o.number)) && (await page.locator('section.sec').nth(2).locator('form button').count()) >= done.length,
    `${done.length} earlier`);

  await shot(page, 'account-home');
}

// ================================================================ 2 · the catalogue: one card per compound
{
  const { page } = reg;
  await go(page, `${BASE}/account/shop`);
  await page.waitForSelector('.pcard');
  const cards = await page.locator('.pcard').count();
  const peptideCards = await page.locator('.pcard[data-tags*="peptide"]').count();
  const [{ compounds, lots }] = await sql`
    select count(distinct product_id)::int compounds, count(*)::int lots from v_catalogue where is_published and kind = 'peptide'`;
  const [{ all }] = await sql`select count(distinct product_id)::int all from v_catalogue where is_published`;
  ok('one card per peptide compound, not one per lot', peptideCards === compounds && lots > compounds,
    `${peptideCards} cards, ${compounds} compounds, ${lots} lots`);
  ok('every published compound has a card', cards === all, `${cards} cards, ${all} compounds`);
  const doses = await page.locator('.pcard .dose').count();
  ok('lots appear as dose rows on their compound', doses > 0, `${doses} dose rows`);
  await shot(page, 'account-shop');
}

// ================================================================ 3 · the basket, split three ways
{
  const { page } = reg;
  await as(reg.uid ?? OWNER, async () => {});
  // start from an empty basket
  await sql`delete from cart_items where cart_id in (select id from carts where account_id = ${REGENERA}::uuid)`;

  const picks = await sql`
    select sku from v_catalogue where is_published and kind = 'peptide' and available > 0 order by sku limit 3`;
  for (const p of picks) {
    await go(page, `${BASE}/account/shop`);
    const card = page.locator(`.pcard:has(form input[value="${p.sku}"])`).first();
    if (await card.count()) await card.locator('.cardfoot button').first().click();
    else {
      // the lot is not the dose in view on its card; add it from the compound's own sheet
      const [{ slug }] = await sql`select slug from v_catalogue where sku = ${p.sku}`;
      await go(page, `${BASE}/account/shop/${slug}`);
      await page.locator(`.doserow:has(input[value="${p.sku}"]) button[type="submit"]`).first().click();
    }
    await page.waitForTimeout(900);
  }
  const inBasket = await sql`select count(*)::int n from cart_items ci join carts c on c.id = ci.cart_id where c.account_id = ${REGENERA}::uuid`;
  ok('three lots reach the shared basket', inBasket[0].n === 3, `${inBasket[0].n} lines`);

  // one line to each of the three sites: two in Jabodetabek, one in Bandung (zone jawa)
  const ids = await sql`select ci.id, v.sku from cart_items ci join carts c on c.id = ci.cart_id
                        join product_variants v on v.id = ci.variant_id where c.account_id = ${REGENERA}::uuid order by v.sku`;
  const sites = [KEBAYORAN, KEMANG, BANDUNG];
  for (let i = 0; i < ids.length; i++) {
    await go(page, `${BASE}/account/basket`);
    await page.waitForTimeout(1200);            // the select submits on change once it is hydrated
    // name the line by its lot rather than by its position: moving a line re-writes the row
    await page.locator(`.bline:has(input[name="sku"][value="${ids[i].sku}"]) select`).first().selectOption(sites[i]);
    for (let w = 0; w < 12; w++) {
      const [row] = await sql`select site_id::text from cart_items ci join carts c on c.id = ci.cart_id
                              join product_variants v on v.id = ci.variant_id
                              where c.account_id = ${REGENERA}::uuid and v.sku = ${ids[i].sku}`;
      if (row?.site_id === sites[i]) break;
      await page.waitForTimeout(700);
    }
  }
  await go(page, `${BASE}/account/basket`);
  const legs = page.locator('[data-delivery-legs] [data-delivery-leg]');
  const legCount = await legs.count();
  const priced = await page.locator('[data-leg="priced"]').count();
  const pending = await page.locator('[data-leg="pending"]').count();
  const legText = await page.locator('[data-delivery-legs]').innerText();
  ok('the basket names one destination per consignment', legCount === 3, `${legCount} destinations`);
  ok('two destinations are priced and one is rate pending', priced === 2 && pending === 1,
    `${priced} priced, ${pending} pending — ${legText.replace(/\s+/g, ' ')}`);
  ok('the delivery tariff is stated from the zone table, not typed',
    (await page.locator('aside .note').first().innerText()).includes(idr(100000)), 'per three units');
  await shot(page, 'account-basket');

  const noScroll390 = await (async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await reg.ctx.storageState() });
    const p = await ctx.newPage();
    await go(p, `${BASE}/account/basket`);
    const bad = await hscroll(p);
    await shot(p, 'account-basket-390');
    await ctx.close();
    return !bad;
  })();
  ok('the basket does not scroll sideways at 390', noScroll390);

  await sql`delete from cart_items where cart_id in (select id from carts where account_id = ${REGENERA}::uuid)`;
}

// ================================================================ 4 · accept → order → transfer
let acceptedOrder = null;
{
  const { page } = reg;
  const q = await makeSentQuote(REGENERA, [
    { sku: 'reta10', qty: 1, site_id: KEBAYORAN },
    { sku: 'tee', qty: 2, site_id: KEBAYORAN },
  ]);
  await go(page, `${BASE}/account/quotes/${q.number}`);
  ok('the sent quote is shown as waiting for the account', /waiting for your acceptance|menunggu/i.test(await page.locator('.nxt').innerText()),
    (await page.locator('.nxt').innerText()).replace(/\s+/g, ' '));

  await page.getByRole('button', { name: /accept and place the order|terima/i }).click();
  await page.waitForURL(/\/account\/orders\//, { timeout: 40000 });
  acceptedOrder = decodeURIComponent(page.url().split('/account/orders/')[1]);

  const [row] = await sql`
    select o.number, o.total_idr, i.number as inv, i.total_idr as inv_total, i.due_at, i.bank_details
    from orders o join invoices i on i.order_id = o.id where o.number = ${acceptedOrder}`;
  ok('accepting a sent quote creates the order', !!row, acceptedOrder);
  ok('acceptance issues its invoice', !!row?.inv, row?.inv ?? '');

  const paybox = page.locator('.paybox');
  const payText = await paybox.innerText();
  ok('the order shows the invoice number', payText.includes(row.inv), row.inv);
  ok('the invoice number is the transfer reference',
    (await paybox.locator('.v.ref').innerText()).trim() === row.inv, (await paybox.locator('.v.ref').innerText()).trim());
  ok('the order shows the bank details', payText.includes(row.bank_details.bank) && payText.includes(String(row.bank_details.account_no)),
    `${row.bank_details.bank} · ${row.bank_details.account_no}`);
  ok('the amount due is the invoice total', payText.includes(idr(row.inv_total)), idr(row.inv_total));
  ok('the timeline runs the five moments', (await page.locator('.tl .tl-i').count()) === 5,
    `${await page.locator('.tl .tl-i').count()} steps`);
  await shot(page, 'account-order-awaiting');

  // "I have transferred" — a claim to match, never a payment
  await page.getByRole('button', { name: /i have transferred|saya sudah transfer/i }).click();
  await page.waitForTimeout(2500);
  const [claim] = await sql`select paid_claim_at, paid_claim_by, state from orders where number = ${acceptedOrder}`;
  ok('the transfer claim is recorded against the order', !!claim.paid_claim_at, String(claim.paid_claim_at ?? 'null'));
  ok('reporting a transfer is not a payment', claim.state === 'awaiting_payment', claim.state);
  await go(page, `${BASE}/account/orders/${acceptedOrder}`);
  ok('the page says the transfer is being matched', /transfer reported|transfer dilaporkan/i.test(await page.locator('[data-reported]').innerText()),
    (await page.locator('[data-reported]').innerText()).replace(/\s+/g, ' '));
  await shot(page, 'account-order-reported');
}

// ================================================================ 5 · a client is not the Console
{
  const { page } = reg;
  await go(page, `${BASE}/console`);
  ok('a client is redirected away from the Console', /\/account(\/|$)/.test(page.url()), page.url());
}

// ================================================================ 6 · widths
{
  const { page } = reg;
  for (const [name, route] of [['home', '/account'], ['shop', '/account/shop'], ['order', `/account/orders/${acceptedOrder}`], ['profile', '/account/profile']]) {
    await go(page, `${BASE}${route}`);
    ok(`${name} does not scroll sideways at 1440`, !(await hscroll(page)));
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, storageState: await reg.ctx.storageState() });
  const p = await ctx.newPage();
  for (const [name, route] of [['home', '/account'], ['shop', '/account/shop'], ['order', `/account/orders/${acceptedOrder}`], ['profile', '/account/profile'], ['reorder', '/account/reorder']]) {
    await go(p, `${BASE}${route}`);
    ok(`${name} does not scroll sideways at 390`, !(await hscroll(p)));
    await shot(p, `account-${name}-390`);
  }
  const tabs = await p.locator('.tabbar .tab').count();
  const railVisible = await p.locator('.rail').isVisible();
  ok('the phone shows five tabs and no rail', tabs === 5 && !railVisible, `${tabs} tabs`);
  await ctx.close();
}
await reg.ctx.close();

// ================================================================ 7 · the lapsed account
{
  // The gate closes before the Console can even price the line: sending a quote carrying a peptide
  // to an account whose acknowledgement has lapsed is refused by the database.
  let refusal = null;
  try { await makeSentQuote(SENOPATI, [{ sku: 'bpc10', qty: 1, site_id: SENOPATI_SITE }]); }
  catch (e) { refusal = e.message; }
  ok('the Console cannot even send a peptide line to a lapsed account',
    /qualified-researcher acknowledgement/i.test(String(refusal)), String(refusal).slice(0, 90));

  // An apparel order it may read, with a peptide line written straight onto it so that the account
  // surface is tested against row-level security rather than against a hidden button.
  const q = await makeSentQuote(SENOPATI, [{ sku: 'tee', qty: 2, site_id: SENOPATI_SITE }]);
  const [{ accept_quote: oid }] = await as(OWNER, tx => tx`select axiom.accept_quote(${q.id}::uuid)`);
  const [{ number: orderNo }] = await sql`select number from orders where id = ${oid}::uuid`;
  const [{ id: pepVariant, price_idr: pepPrice }] = await sql`select id, price_idr from product_variants where sku = 'bpc10'`;
  await sql`insert into order_items (order_id, variant_id, site_id, site_name, qty, unit_price_idr)
            values (${oid}::uuid, ${pepVariant}::uuid, ${SENOPATI_SITE}::uuid, 'Senopati', 1, ${pepPrice})`;
  await sql`update orders set subtotal_idr = subtotal_idr + ${pepPrice}, total_idr = total_idr + ${pepPrice} where id = ${oid}::uuid`;

  const sen = await signIn('senopati');
  await go(sen.page, `${BASE}/account/shop`);
  await sen.page.waitForSelector('.pcard');
  const pepPriced = await sen.page.locator('.pcard[data-tags*="peptide"][data-priced="1"]').count();
  const pepCards = await sen.page.locator('.pcard[data-tags*="peptide"]').count();
  const apparelPriced = await sen.page.locator('.pcard[data-tags*="apparel"][data-priced="1"]').count();
  const apparelCards = await sen.page.locator('.pcard[data-tags*="apparel"]').count();
  ok('a lapsed account sees no peptide price', pepPriced === 0 && pepCards > 0, `${pepPriced} priced of ${pepCards} peptide cards`);
  ok('apparel stays priced for every account', apparelPriced === apparelCards && apparelCards > 0,
    `${apparelPriced} of ${apparelCards} apparel cards priced`);
  ok('the banner explains what opens the prices',
    /qualified-researcher|peneliti/i.test(await sen.page.locator('.gatebar').innerText()));
  ok('the banner links to the acknowledgement',
    (await sen.page.locator('.gatebar a[href*="acknowledgement"]').count()) > 0);
  ok('a gated card offers nothing to add', (await sen.page.locator('.pcard[data-priced="0"] .cardfoot').count()) === 0);
  await shot(sen.page, 'account-shop-lapsed');

  await go(sen.page, `${BASE}/account/orders/${orderNo}`);
  const lines = await sen.page.locator('.lgroup').innerText();
  ok("the peptide line is not on the lapsed account's order", !/BPC-157/i.test(lines), lines.replace(/\s+/g, ' ').slice(0, 110));
  ok('the apparel line is', /Performance Tee/i.test(lines));
  ok('the page says a line is withheld', /not shown|tidak ditampilkan/i.test(await sen.page.locator('section.sec').nth(1).innerText()));

  const seen = await as(SENOPATI_UID, tx => tx`select count(*)::int n from order_items where order_id = ${oid}::uuid`);
  ok('the database itself withholds the peptide row', seen[0].n === 1, `${seen[0].n} of 2 lines readable`);
  const api = await as(SENOPATI_UID, tx =>
    tx`select count(*)::int n from v_catalogue where kind = 'peptide' and price_idr is not null`);
  ok('the database itself returns no peptide price to that account', api[0].n === 0, `${api[0].n} priced peptide rows`);
  await shot(sen.page, 'account-order-lapsed');
  await sen.ctx.close();
}

// ================================================================ 8 · recording the acknowledgement
{
  const lon = await signIn('longa');
  await go(lon.page, `${BASE}/account/shop`);
  await lon.page.waitForSelector('.pcard');
  const before = await lon.page.locator('.pcard[data-tags*="peptide"][data-priced="1"]').count();
  ok('an account with only the 18+ record sees no peptide price', before === 0, `${before} priced`);

  await go(lon.page, `${BASE}/account/profile`);
  await lon.page.locator('input[name="age_18"]').check();
  await lon.page.locator('input[name="qualified_researcher"]').check();
  await lon.page.getByRole('button', { name: /record the acknowledgement|catat/i }).click();
  await lon.page.waitForTimeout(2500);

  const rows = await sql`select id, kind from acknowledgements where account_id = ${LONGA}::uuid and acknowledged_at > now() - interval '5 minutes'`;
  for (const r of rows) madeAcks.push(r.id);
  ok('the acknowledgement is a timestamped row, not a flag', rows.length >= 2, rows.map(r => r.kind).join(', '));

  const [{ state }] = await sql`select axiom.ack_state_for(${LONGA}::uuid) as state`;
  ok('the account reads current', state === 'current', state);

  await go(lon.page, `${BASE}/account/shop`);
  await lon.page.waitForSelector('.pcard');
  const after = await lon.page.locator('.pcard[data-tags*="peptide"][data-priced="1"]').count();
  ok('prices open the moment the acknowledgement is recorded', after > 0, `${after} peptide cards priced`);
  ok('the gate banner is gone', (await lon.page.locator('.gatebar').count()) === 0);
  await shot(lon.page, 'account-shop-acknowledged');
  await lon.ctx.close();
}

// ================================================================ clean up what the suite made
{
  for (const id of madeAcks) await sql`delete from acknowledgements where id = ${id}::uuid`;
  for (const qid of madeQuotes) {
    const orders = await sql`select id from orders where quote_id = ${qid}::uuid`;
    for (const o of orders) {
      const invs = await sql`select id from invoices where order_id = ${o.id}::uuid`;
      for (const i of invs) {
        await sql`delete from invoice_events where invoice_id = ${i.id}::uuid`;
        // an issued invoice's lines are frozen unless the write names itself, exactly as
        // axiom.accept_quote does when it writes them in the first place
        await sql.begin(async tx => {
          await tx`select axiom.enter_fn('invoice', ${i.id}::uuid)`;
          await tx`delete from invoice_items where invoice_id = ${i.id}::uuid`;
          await tx`select axiom.leave_fn()`;
        });
      }
      await sql`delete from invoices where order_id = ${o.id}::uuid`;
      await sql`delete from order_item_costs where order_item_id in (select id from order_items where order_id = ${o.id}::uuid)`;
      await sql`delete from order_items where order_id = ${o.id}::uuid`;
      await sql`delete from order_events where order_id = ${o.id}::uuid`;
      await sql`delete from shipments where order_id = ${o.id}::uuid`;
      await sql`update quotes set order_id = null where order_id = ${o.id}::uuid`;
      await sql`delete from orders where id = ${o.id}::uuid`;
    }
    await sql`delete from quote_item_costs where quote_item_id in (select id from quote_items where quote_id = ${qid}::uuid)`;
    await sql`delete from quote_items where quote_id = ${qid}::uuid`;
    await sql`delete from quote_events where quote_id = ${qid}::uuid`;
    await sql`delete from quotes where id = ${qid}::uuid`;
  }
  const [{ n: leftQuotes }] = await sql`select count(*)::int n from quotes where id = any(${madeQuotes}::uuid[])`;
  const [{ state }] = await sql`select axiom.ack_state_for(${LONGA}::uuid) as state`;
  ok('the suite leaves the database as it found it', leftQuotes === 0 && state === 'none',
    `${leftQuotes} quotes left, Studio Longa reads ${state}`);
}

await browser.close();
await sql.end();
console.log(failures ? `\n${failures} failure(s)` : '\n  all checks passed');
process.exit(failures ? 1 : 0);
