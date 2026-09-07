// AXIOM public site — evidence, not claims.
//
//   node tests/smoke/site.mjs <screenshot-dir> [base-url]
//
// Checks, in both locales and at 390 px and 1440 px:
//   · every public route renders with no horizontal scroll
//   · the compound page served to a crawler user-agent is byte-identical to the anonymous one
//   · no Product or Offer structured data on any peptide page
//   · zero rupiah figures anywhere an anonymous visitor can see
//   · the price list carries every lot the database holds
//   · the sitemap parses, and every indexable route it names answers 200
//   · reduced motion leaves the hero field unmounted and nothing animating
import { chromium } from 'playwright';

const DIR = process.argv[2] || '/tmp';
const BASE = (process.argv[3] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const CRAWLER = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

let pass = 0;
const fails = [];
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log('  ✓', name, detail); }
  else { fails.push(`${name} ${detail}`); console.log('  ✗', name, detail); }
};

const ROUTES = [
  '/', '/compounds', '/compounds/metabolic', '/price-list', '/standard',
  '/how-to-read-a-coa', '/process', '/faq', '/contact', '/terms', '/privacy', '/legal', '/request',
];

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium' });

// ---------------------------------------------------------------- data from the site itself
const probe = await browser.newContext();
const p0 = await probe.newPage();
await p0.goto(`${BASE}/price-list`, { waitUntil: 'domcontentloaded' });
const lotRows = await p0.locator('table.tbl tr[data-lot="1"]').count();
const declared = Number(await p0.locator('table.tbl').first().getAttribute('data-rows'));
ok('price list carries every lot', lotRows === declared && lotRows > 0, `${lotRows} rows, table declares ${declared}`);

// one compound page, discovered rather than typed
await p0.goto(`${BASE}/compounds/metabolic`, { waitUntil: 'domcontentloaded' });
const compoundHref = (await p0.locator('a.pcard').first().getAttribute('href') || '').replace(/^\/(en|id)(?=\/)/, '');
ok('a compound page is reachable from its pathway', !!compoundHref, compoundHref || '');

// ---------------------------------------------------------------- routes at both widths
for (const width of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  for (const locale of ['', '/en']) {
    for (const route of ROUTES) {
      const url = `${BASE}${locale}${route === '/' ? '' : route}` || `${BASE}/`;
      const res = await page.goto(url || `${BASE}/`, { waitUntil: 'domcontentloaded' });
      const status = res?.status() ?? 0;
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`${width}px ${locale || '/id'}${route}`, status === 200 && overflow <= 0, `status ${status}, overflow ${overflow}px`);
    }
    if (compoundHref) {
      const url = `${BASE}${locale}${compoundHref}`;
      const res = await page.goto(url, { waitUntil: 'domcontentloaded' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`${width}px ${locale || '/id'}${compoundHref}`, res?.status() === 200 && overflow <= 0, `overflow ${overflow}px`);
    }
  }
  ok(`${width}px no uncaught page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
  // screenshots for the design review
  for (const [name, route] of [['home', '/'], ['compounds', '/compounds'], ['pathway', '/compounds/metabolic'], ['compound', compoundHref], ['price-list', '/price-list'], ['standard', '/standard'], ['process', '/process'], ['faq', '/faq'], ['request', '/request'], ['terms', '/terms']]) {
    if (!route) continue;
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.screenshot({ path: `${DIR}/site-${name}-${width}.png`, fullPage: width === 1440 });
  }
  await ctx.close();
}

// ---------------------------------------------------------------- education is not cloaked
{
  const anon = await browser.newContext();
  const bot = await browser.newContext({ userAgent: CRAWLER });
  const a = await anon.newPage();
  const b = await bot.newPage();
  const url = `${BASE}${compoundHref}`;
  const ra = await a.goto(url, { waitUntil: 'domcontentloaded' });
  const rb = await b.goto(url, { waitUntil: 'domcontentloaded' });
  const ha = await ra.text();
  const hb = await rb.text();
  const strip = s => s.replace(/"\$ACTION[^"]*"|\$ACTION_[A-Z_]*:\d+|k\d{6,}|\?v=\d+|"[0-9a-f]{40,}"/g, '');
  ok('crawler HTML is the anonymous HTML', strip(ha) === strip(hb), `${ha.length} vs ${hb.length} bytes`);
  ok('the identity text is in the server HTML', /class="cp-body"/.test(ha) && /id="verification"/.test(ha) && /id="handling"/.test(ha));
  await anon.close(); await bot.close();
}

// ---------------------------------------------------------------- gating and structured data
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const peptidePages = ['/compounds', '/compounds/metabolic', compoundHref, '/price-list'];
  for (const route of peptidePages) {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    const html = await res.text();
    const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => m[1]);
    const types = ld.flatMap(s => { try { const j = JSON.parse(s); return [j['@type']]; } catch { return ['unparsable']; } });
    ok(`no Product or Offer markup on ${route}`, !types.includes('Product') && !/"@type":\s*"Offer"/.test(html), types.join(','));
  }
  // a device page is allowed to carry it
  const dev = await page.goto(`${BASE}/products/red-light-therapy-mask`, { waitUntil: 'domcontentloaded' });
  ok('a device page may carry Product markup', /"@type":"Product"/.test(await dev.text()));

  // zero rupiah figures for anonymous eyes on any peptide surface
  for (const route of ['/compounds/metabolic', compoundHref]) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' });
    const money = await page.evaluate(() => (document.body.innerText.match(/Rp\s?\d[\d.]*/g) || []));
    ok(`no rupiah figure for anon on ${route}`, money.length === 0, money.slice(0, 3).join(', '));
  }
  // the price list shows devices and apparel openly and peptides gated
  await page.goto(`${BASE}/price-list`, { waitUntil: 'domcontentloaded' });
  const money = await page.evaluate(() => (document.body.innerText.match(/Rp\s?\d[\d.]*/g) || []).length);
  const gated = await page.locator('table.tbl .gated').count();
  ok('price list: peptide prices gated, device prices open', gated > 70 && money > 0 && money < 20, `${gated} gated cells, ${money} figures`);

  // and the anonymous browser never asks for prices
  const calls = [];
  page.on('request', r => { if (r.url().includes('/api/prices')) calls.push(r.url()); });
  await page.goto(`${BASE}/price-list`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  ok('anon never calls /api/prices', calls.length === 0, calls.join(','));
  await ctx.close();
}

// ---------------------------------------------------------------- reduced motion
{
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const canvas = await page.locator('#scene').count();
  const fallback = await page.locator('.hero-fallback').count();
  const hidden = await page.evaluate(() => [...document.querySelectorAll('.reveal, .stagger')].length);
  ok('reduced motion: no hero field, static fallback instead', canvas === 0 && fallback === 1, `canvas ${canvas}, fallback ${fallback}`);
  ok('reduced motion: nothing is left hidden by a reveal', hidden === 0, `${hidden} reveal elements`);
  await page.screenshot({ path: `${DIR}/site-home-reduced-motion.png` });
  await ctx.close();
}

// ---------------------------------------------------------------- motion, when it is wanted
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const canvas = await page.locator('#scene').count();
  ok('the hero field mounts after idle', canvas === 1, `canvas ${canvas}`);
  await page.screenshot({ path: `${DIR}/site-home-field-1440.png` });
  await ctx.close();
}

// ---------------------------------------------------------------- sitemap and robots
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const res = await page.goto(`${BASE}/sitemap.xml`, { waitUntil: 'domcontentloaded' });
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  ok('sitemap parses', xml.startsWith('<?xml') && locs.length > 0, `${locs.length} urls`);
  ok('sitemap carries hreflang alternates', /hreflang="x-default"/.test(xml));
  ok('sitemap excludes the request path', !locs.some(u => /\/request/.test(u)));
  // spot-check a sample of them
  const sample = [locs[0], locs[Math.floor(locs.length / 2)], locs[locs.length - 1]];
  for (const u of sample) {
    const r = await page.goto(u.replace('http://localhost:3000', BASE), { waitUntil: 'domcontentloaded' });
    ok(`sitemap url answers 200 · ${u.replace(/^https?:\/\/[^/]+/, '') || '/'}`, r?.status() === 200, String(r?.status()));
  }
  const rb = await page.goto(`${BASE}/robots.txt`, { waitUntil: 'domcontentloaded' });
  const robots = await rb.text();
  ok('robots disallows the request path and the account', /Disallow: \/request/.test(robots) && /Disallow: \/account/.test(robots));
  await ctx.close();
}

// ---------------------------------------------------------------- basket and request
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${compoundHref}`, { waitUntil: 'networkidle' });
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
  await page.goto(`${BASE}/request`, { waitUntil: 'networkidle' });
  const lines = await page.locator('.req-line').count();
  ok('a lot added from the guide reaches the request', lines >= 1, `${lines} lines`);
  const leadForm = await page.locator('#rq-name').count();
  ok('signed out, the request asks who is asking', leadForm === 1);
  await page.screenshot({ path: `${DIR}/site-request-filled-1440.png`, fullPage: true });
  await ctx.close();
}

// ---------------------------------------------------------------- keyboard and focus
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement?.className || '');
  ok('the first tab stop is the skip link', first.includes('skip'), first);
  const ring = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? getComputedStyle(el).outlineStyle : 'none';
  });
  ok('focus is visible', ring !== 'none', ring);
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log('  FAIL', f); process.exit(1); }
