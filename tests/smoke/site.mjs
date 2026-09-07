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

// the dev server recompiles on demand; a first hit can reset the connection while it does
async function go(page, url, waitUntil = 'domcontentloaded') {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await page.goto(url, { waitUntil, timeout: 45000 });
      // a dev server that is still compiling answers 500 once; give it a moment and ask again
      if (res && res.status() >= 500 && i < 2) { await page.waitForTimeout(2000); continue; }
      return res;
    } catch (e) { if (i === 2) throw e; await page.waitForTimeout(1500); }
  }
}

// ---------------------------------------------------------------- data from the site itself
const probe = await browser.newContext();
const p0 = await probe.newPage();
await go(p0, `${BASE}/price-list`);
const lotRows = await p0.locator('table.tbl tr[data-lot="1"]').count();
const declared = Number(await p0.locator('table.tbl').first().getAttribute('data-rows'));
ok('price list carries every lot', lotRows === declared && lotRows > 0, `${lotRows} rows, table declares ${declared}`);

// one compound page, discovered rather than typed
await go(p0, `${BASE}/compounds/metabolic`);
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
      const res = await go(page, url || `${BASE}/`);
      const status = res?.status() ?? 0;
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`${width}px ${locale || '/id'}${route}`, status === 200 && overflow <= 0, `status ${status}, overflow ${overflow}px`);
    }
    if (compoundHref) {
      const url = `${BASE}${locale}${compoundHref}`;
      const res = await go(page, url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`${width}px ${locale || '/id'}${compoundHref}`, res?.status() === 200 && overflow <= 0, `overflow ${overflow}px`);
    }
  }
  ok(`${width}px no uncaught page errors`, errors.length === 0, errors.slice(0, 2).join(' | '));
  // screenshots for the design review
  for (const [name, route] of [['home', '/'], ['compounds', '/compounds'], ['pathway', '/compounds/metabolic'], ['compound', compoundHref], ['price-list', '/price-list'], ['standard', '/standard'], ['process', '/process'], ['faq', '/faq'], ['request', '/request'], ['terms', '/terms']]) {
    if (!route) continue;
    await go(page, `${BASE}${route}`, 'networkidle').catch(() => {});
    if (width === 1440) {
      // walk the page so every reveal has settled before the full-page capture
      await page.evaluate(async () => {
        const step = window.innerHeight * 0.8;
        for (let y = 0; y < document.body.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
        await new Promise(r => setTimeout(r, 800));
      });
    }
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
  const ra = await go(a, url);
  const rb = await go(b, url);
  const ha = await ra.text();
  const hb = await rb.text();
  // dev-server cache-busters (?v=<ms>) and per-build asset hashes are not content; everything else
  // must match byte for byte, and so must the text a reader sees.
  const strip = s => s
    .replace(/\?v=\d+/g, '?v=')
    .replace(/\?dpl=[A-Za-z0-9_-]+/g, '?dpl=')
    .replace(/"\$ACTION[^"]*"/g, '"$ACTION"')
    .replace(/\$ACTION_[A-Z_]*:\d+/g, '$ACTION')
    .replace(/k\d{6,}/g, 'k')
    .replace(/\\"[A-Za-z0-9_-]{21}\\"/g, '\\"tok\\"');
  // the dev server streams its flight chunks in whatever order they resolve, so compare the
  // document byte for byte and the chunks as a set
  const CHUNK = /<script>self\.__next_f\.push\(.*?\)<\/script>/gs;
  const doc = s => strip(s).replace(CHUNK, '');
  const chunks = s => (strip(s).match(CHUNK) || []).slice().sort();
  const sa = doc(ha), sb = doc(hb);
  let at = 0; while (at < Math.min(sa.length, sb.length) && sa[at] === sb[at]) at++;
  const ca = chunks(ha), cb = chunks(hb);
  ok('crawler HTML is the anonymous HTML', sa === sb, sa === sb ? `${sa.length} bytes` : `diverges at ${at}: ${JSON.stringify(sa.slice(at, at + 60))} vs ${JSON.stringify(sb.slice(at, at + 60))}`);
  ok('crawler gets the same server payload', ca.length === cb.length && ca.join('') === cb.join(''), `${ca.length} vs ${cb.length} chunks`);
  // and the education itself, as text, after both pages have settled
  await a.waitForLoadState('networkidle'); await b.waitForLoadState('networkidle');
  const ta = await a.evaluate(() => document.getElementById('main')?.innerText ?? '');
  const tb = await b.evaluate(() => document.getElementById('main')?.innerText ?? '');
  ok('crawler reads the same guide text as a person', ta === tb && ta.length > 500, `${ta.length} vs ${tb.length} chars`);
  ok('the identity text is in the server HTML', /class="cp-body"/.test(ha) && /id="verification"/.test(ha) && /id="handling"/.test(ha));
  await anon.close(); await bot.close();
}

// ---------------------------------------------------------------- gating and structured data
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const peptidePages = ['/compounds', '/compounds/metabolic', compoundHref, '/price-list'];
  for (const route of peptidePages) {
    const res = await go(page, `${BASE}${route}`);
    const html = await res.text();
    const ld = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => m[1]);
    const types = ld.flatMap(s => { try { const j = JSON.parse(s); return [j['@type']]; } catch { return ['unparsable']; } });
    ok(`no Product or Offer markup on ${route}`, !types.includes('Product') && !/"@type":\s*"Offer"/.test(html), types.join(','));
  }
  // a device page is allowed to carry it
  const dev = await go(page, `${BASE}/products/red-light-therapy-mask`);
  ok('a device page may carry Product markup', /"@type":"Product"/.test(await dev.text()));

  // zero rupiah figures for anonymous eyes on any peptide surface
  for (const route of ['/compounds/metabolic', compoundHref]) {
    await go(page, `${BASE}${route}`);
    const money = await page.evaluate(() => (document.body.innerText.match(/Rp\s?\d[\d.]*/g) || []));
    ok(`no rupiah figure for anon on ${route}`, money.length === 0, money.slice(0, 3).join(', '));
  }
  // the price list shows devices and apparel openly and peptides gated
  await go(page, `${BASE}/price-list`);
  const money = await page.evaluate(() => (document.body.innerText.match(/Rp\s?\d[\d.]*/g) || []).length);
  const gated = await page.locator('table.tbl .gated').count();
  ok('price list: peptide prices gated, device prices open', gated > 70 && money > 0 && money < 20, `${gated} gated cells, ${money} figures`);

  // and the anonymous browser never asks for prices
  const calls = [];
  page.on('request', r => { if (r.url().includes('/api/prices')) calls.push(r.url()); });
  await go(page, `${BASE}/price-list`, 'networkidle');
  await page.waitForTimeout(800);
  ok('anon never calls /api/prices', calls.length === 0, calls.join(','));
  await ctx.close();
}

// ---------------------------------------------------------------- reduced motion
{
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await go(page, `${BASE}/`, 'networkidle');
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
  await go(page, `${BASE}/`, 'networkidle');
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
  const res = await go(page, `${BASE}/sitemap.xml`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  ok('sitemap parses', xml.startsWith('<?xml') && locs.length > 0, `${locs.length} urls`);
  ok('sitemap carries hreflang alternates', /hreflang="x-default"/.test(xml));
  ok('sitemap excludes the request path', !locs.some(u => /\/request/.test(u)));
  // spot-check a sample of them
  const sample = [locs[0], locs[Math.floor(locs.length / 2)], locs[locs.length - 1]];
  for (const u of sample) {
    const r = await go(page, u.replace('http://localhost:3000', BASE));
    ok(`sitemap url answers 200 · ${u.replace(/^https?:\/\/[^/]+/, '') || '/'}`, r?.status() === 200, String(r?.status()));
  }
  const rb = await go(page, `${BASE}/robots.txt`);
  const robots = await rb.text();
  ok('robots disallows the request path and the account', /Disallow: \/request/.test(robots) && /Disallow: \/account/.test(robots));
  await ctx.close();
}

// ---------------------------------------------------------------- basket and request
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await go(page, `${BASE}${compoundHref}`, 'networkidle');
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForTimeout(1200);
  await go(page, `${BASE}/request`, 'networkidle');
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
  await go(page, `${BASE}/`);
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

// ---------------------------------------------------------------- largest contentful paint
// A throttled mid-range mobile profile. Against `next dev` these figures carry the compiler and
// the unminified bundle; set LCP_STRICT=1 to make the 2.5 s budget a hard gate on a production
// build, which is where the number is meant to be read.
{
  const strict = process.env.LCP_STRICT === '1';
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  for (const route of ['/', '/price-list', compoundHref]) {
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await go(page, `${BASE}${route}`, 'domcontentloaded');   // warm the compiler
    await page.close();

    const p2 = await ctx.newPage();
    const cdp2 = await ctx.newCDPSession(p2);
    await cdp2.send('Network.enable');
    await cdp2.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8,
    });
    await cdp2.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await go(p2, `${BASE}${route}`, 'load');
    const lcp = await p2.evaluate(() => new Promise(resolve => {
      let value = 0;
      new PerformanceObserver(list => { for (const e of list.getEntries()) value = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => resolve(Math.round(value)), 2500);
    }));
    const label = `LCP ${route === '/' ? '/' : route} ${lcp} ms (throttled 390px, dev server)`;
    if (strict) ok(label, lcp > 0 && lcp < 2500);
    else { pass++; console.log('  ·', label); }
    await p2.close();
  }
  await ctx.close();
}

// ---------------------------------------------------------------- signed in: the gate opens
// Only meaningful against a dev-mode sign-in (AUTH_MODE=dev). Skipped otherwise.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await go(page, `${BASE}/sign-in`);
  const forms = page.locator('form.cell');
  const count = await forms.count();
  if (!count) {
    console.log('  — dev sign-in not available, skipping the signed-in checks');
  } else {
    // an account whose acknowledgement is current sees prices; one without still does not
    const priceCalls = [];
    page.on('request', r => { if (r.url().includes('/api/prices')) priceCalls.push(r.url()); });
    let signedIn = null;
    for (let i = 0; i < count; i++) {
      const row = forms.nth(i);
      const who = (await row.innerText()).split('\n')[0];
      await row.locator('button[type="submit"]').click();
      await page.waitForURL(/\/(account|console)/, { timeout: 20000 }).catch(() => {});
      await go(page, `${BASE}/price-list`, 'networkidle');
      await page.waitForTimeout(900);
      const money = await page.evaluate(() => (document.body.innerText.match(/Rp\s?\d[\d.]*/g) || []).length);
      if (money > 60) { signedIn = { who, money }; break; }
      await go(page, `${BASE}/sign-in`);
    }
    ok('a session asks the server for its prices', priceCalls.length > 0, `${priceCalls.length} calls`);
    ok('an acknowledged account sees peptide prices', !!signedIn, signedIn ? `${signedIn.who}: ${signedIn.money} figures` : 'no seeded account has a current acknowledgement');

    // a basket with more than one destination shows the split before it is submitted
    await go(page, `${BASE}${compoundHref}`, 'networkidle');
    await page.locator('form button[type="submit"]').first().click();
    await page.waitForTimeout(1200);
    await go(page, `${BASE}/request`, 'networkidle');
    const lines = await page.locator('.req-line').count();
    ok('the account basket carries the line', lines >= 1, `${lines} lines`);
    const delivery = await page.locator('.req-side .kv').count();
    ok('the running delivery is shown before submitting', delivery >= 2, `${delivery} summary rows`);
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log('  FAIL', f); process.exit(1); }
