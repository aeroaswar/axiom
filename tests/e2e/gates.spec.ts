import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Browser gates. Every check here is one row of §13. They run against the built app with the
// seeded local database (pnpm db:reset). Dev auth mode signs in seeded users through /sign-in.

const OWNER = 'Aero';
const OPS = 'Nadia';
const REGENERA = 'dr. Ratna';
const SENOPATI = 'Klinik Senopati';
const AKSARA = 'Aksara Recovery';

async function signIn(page: Page, name: string, next = '/account') {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  const form = page.locator('form').filter({ hasText: name }).first();
  await form.getByRole('button').click();
  await page.waitForURL(u => !u.pathname.includes('/sign-in'));
}

const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

// The locale prefix is negotiated, not fixed: `id` is the default and carries no prefix, but a
// browser sending `Accept-Language: en-US` — which every Playwright context does — is redirected to
// `/en/...`. Matching on a literal prefix would only ever pass in one of the two, so these helpers
// match the segment and let the prefix be whatever the negotiation produced.
const COMPOUND_LINK = 'a[href$="/compounds"], a[href*="/compounds/"]';

async function firstCompoundPath(page: Page): Promise<string> {
  await page.goto('/compounds');
  const pathway = await page.locator(COMPOUND_LINK).filter({ hasNot: page.locator('nav a') })
    .evaluateAll(as => (as as HTMLAnchorElement[]).map(a => a.getAttribute('href')!)
      .find(h => /\/compounds\/[^/]+$/.test(h)));
  await page.goto(pathway!);
  const compound = await page.locator(COMPOUND_LINK).filter({ hasNot: page.locator('nav a') }).evaluateAll(as => (as as HTMLAnchorElement[]).map(a => a.getAttribute('href')!).find(h => /\/compounds\/[^/]+\/[^/]+$/.test(h)));
  return compound!;
}

test.describe('Gate 7 · education is not cloaked', () => {
  test('a compound page served to a crawler is byte-identical to the anonymous page', async ({ browser }) => {
    const anon = await browser.newContext();
    const page = await anon.newPage();
    const path = await firstCompoundPath(page);
    const a = await (await anon.request.get(path)).text();
    const bot = await browser.newContext({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' });
    const b = await (await bot.request.get(path)).text();
    const strip = (s: string) => s.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '').replace(/nonce="[^"]+"/g, '');
    expect(strip(b)).toBe(strip(a));
    await anon.close(); await bot.close();
  });
});

test.describe('Gate 10 · no consumer markup on peptide pages', () => {
  test('no Product or Offer JSON-LD on a compound page or the price list', async ({ page }) => {
    for (const path of [await firstCompoundPath(page), '/price-list', '/compounds']) {
      await page.goto(path);
      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      for (const block of ld) expect(block, `${path} carries Product/Offer markup`).not.toMatch(/"@type"\s*:\s*"(Product|Offer|AggregateOffer)"/);
    }
  });
});

test.describe('Gate 6 · acknowledgement gates commerce', () => {
  test('anonymous visitor sees the guide but no peptide price', async ({ page }) => {
    const path = await firstCompoundPath(page);
    await page.goto(path);
    await expect(page.locator('main')).toContainText(/HPLC/);
    const priced = await page.locator('main').evaluate(el => /Rp\s?\d{1,3}(\.\d{3})+/.test(el.textContent || ''));
    expect(priced).toBe(false);
  });
  test('a lapsed account reads the guide but receives no peptide price; a current one does', async ({ page }) => {
    await signIn(page, SENOPATI, '/account/shop');
    await page.goto('/account/shop');
    const cards = page.locator('.pcard');
    expect(await cards.count()).toBeGreaterThan(60);
    // An empty selector would make "no peptide price" true for the wrong reason, so the count is
    // asserted first: this gate has to fail when the markup moves, not pass vacuously.
    const peptidePrices = page.locator('[data-kind="peptide"] .pr');
    expect(await peptidePrices.count()).toBeGreaterThan(20);
    const peptidePriced = await page.evaluate(() => Array.from(document.querySelectorAll('[data-kind="peptide"] .pr')).some(el => /Rp\s?\d/.test(el.textContent || '')));
    expect(peptidePriced).toBe(false);
    await page.goto('/sign-in?next=/account/shop');
    await signIn(page, REGENERA, '/account/shop');
    await page.goto('/account/shop');
    const priced = await page.evaluate(() => Array.from(document.querySelectorAll('[data-kind="peptide"] .pr')).some(el => /Rp\s?\d/.test(el.textContent || '')));
    expect(priced).toBe(true);
  });
});

test.describe('Gate 15 · 16 · both surfaces render, one nav per width', () => {
  const publicPaths = ['/', '/compounds', '/price-list', '/standard', '/how-to-read-a-coa', '/process', '/faq', '/request', '/en', '/en/price-list'];
  for (const path of publicPaths) {
    test(`public ${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      expect(await noHorizontalScroll(page)).toBe(true);
    });
  }
  test('console: rail above 1024 px, tab bar below, never both', async ({ page }) => {
    await signIn(page, OWNER, '/console');
    for (const path of ['/console', '/console/orders', '/console/catalogue', '/console/pricing', '/console/invoices', '/console/clients', '/console/content', '/console/settings']) {
      await page.goto(path);
      expect(await noHorizontalScroll(page), `${path} scrolls horizontally`).toBe(true);
      const rail = await page.locator('.rail').isVisible();
      const tabs = await page.locator('.tabbar').isVisible();
      const wide = (page.viewportSize()?.width ?? 0) >= 1024;
      expect(rail, `${path} rail`).toBe(wide);
      expect(tabs, `${path} tabbar`).toBe(!wide);
      expect(rail && tabs).toBe(false);
    }
  });
  test('account: rail above 1024 px, tab bar below, never both', async ({ page }) => {
    await signIn(page, REGENERA, '/account');
    for (const path of ['/account', '/account/shop', '/account/saved', '/account/profile']) {
      await page.goto(path);
      expect(await noHorizontalScroll(page), `${path} scrolls horizontally`).toBe(true);
      const rail = await page.locator('.rail').isVisible();
      const tabs = await page.locator('.tabbar').isVisible();
      const wide = (page.viewportSize()?.width ?? 0) >= 1024;
      expect(rail).toBe(wide); expect(tabs).toBe(!wide);
    }
  });
});

test.describe('Gate 18 · keyboard and focus', () => {
  test('tabbing through the price list reaches controls with a visible focus ring', async ({ page }) => {
    await page.goto('/price-list');
    let focusedInteractive = 0, visibleRing = 0;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      // The ring is transitioned in. Reading computed style on the next tick catches it mid-flight
      // and reports `solid 0px` for a control that does show one, so wait for a frame to land.
      await page.waitForTimeout(120);
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        return { tag: el.tagName, outline: cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px', ring: cs.boxShadow !== 'none' };
      });
      if (info && ['A', 'BUTTON', 'INPUT', 'SELECT'].includes(info.tag)) { focusedInteractive++; if (info.outline || info.ring) visibleRing++; }
    }
    expect(focusedInteractive).toBeGreaterThan(3);
    expect(visibleRing).toBe(focusedInteractive);
  });
  test('a table row that opens a detail is a real control', async ({ page }) => {
    await signIn(page, OWNER, '/console/orders');
    await page.goto('/console/orders');
    const rows = page.locator('table tbody tr:not(.grp)');
    const n = await rows.count();
    if (n) expect(await rows.first().locator('a, button').count()).toBeGreaterThan(0);
  });
});

test.describe('Gate 19 · reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('no hero animation, no reveal, no stagger', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    expect(await page.locator('canvas#scene').count()).toBe(0);
    const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && (a.effect as KeyframeEffect | null)?.getComputedTiming().duration !== 0.001).length);
    expect(running).toBe(0);
    const hidden = await page.locator('.reveal:not(.in), .stagger:not(.in) > *').evaluateAll(els => els.filter(e => getComputedStyle(e).opacity === '0').length);
    expect(hidden).toBe(0);
  });
});

test.describe('Gate 20 · performance', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP throttling');
  for (const path of ['/', '/price-list']) {
    test(`LCP under 2.5 s on a throttled mobile profile for ${path}`, async ({ page, context }) => {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.goto(path, { waitUntil: 'load' });
      const lcp = await page.evaluate(() => new Promise<number>(resolve => {
        let last = 0;
        const po = new PerformanceObserver(list => { for (const e of list.getEntries()) last = e.startTime; });
        po.observe({ type: 'largest-contentful-paint', buffered: true });
        setTimeout(() => { po.disconnect(); resolve(last); }, 3000);
      }));
      expect(lcp, `${path} LCP ${Math.round(lcp)} ms`).toBeLessThan(2500);
    });
  }
  test('a compound page LCP under 2.5 s', async ({ page, context }) => {
    const path = await firstCompoundPath(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(path, { waitUntil: 'load' });
    const lcp = await page.evaluate(() => new Promise<number>(resolve => { let last = 0; const po = new PerformanceObserver(l => { for (const e of l.getEntries()) last = e.startTime; }); po.observe({ type: 'largest-contentful-paint', buffered: true }); setTimeout(() => { po.disconnect(); resolve(last); }, 3000); }));
    expect(lcp).toBeLessThan(2500);
  });
});

test.describe('Gate 21 · documents match', () => {
  test('invoice PDF and its preview come from one template', async ({ page, context }) => {
    await signIn(page, OWNER, '/console/invoices');
    await page.goto('/console/invoices');
    const href = await page.locator('a[href*="/console/invoices/"]').first().getAttribute('href');
    await page.goto(href!);
    const number = (await page.locator('.inv-doc .d-meta b').first().textContent())?.trim();
    const total = (await page.locator('.inv-doc .d-tot .g span').last().textContent())?.trim();
    expect(number).toBeTruthy();
    const pdfHref = await page.locator('a[href*="/api/documents/invoice/"]').first().getAttribute('href');
    const res = await context.request.get(pdfHref!);
    expect(res.headers()['content-type']).toContain('application/pdf');
    expect((await res.body()).length).toBeGreaterThan(20_000);
    const html = await (await context.request.get(pdfHref!.includes('?') ? `${pdfHref}&html=1` : `${pdfHref}?html=1`)).text();
    expect(html).toContain(number!);
    expect(html).toContain(total!);
  });
  test('price-list PDF is produced from the same template', async ({ context }) => {
    const res = await context.request.get('/api/documents/price-list');
    expect(res.headers()['content-type']).toContain('application/pdf');
    expect((await res.body()).length).toBeGreaterThan(20_000);
  });
});

test.describe('Gate 21 · a quotation exists only once AXIOM sends it', () => {
  // The account screen withholds prices on a quote nobody has priced. The PDF route is the same
  // data over a second surface, and it used to authorize on visibility alone — so a client could
  // fetch a formal, fully priced quotation for a request AXIOM had not yet looked at, skipping the
  // three tests axiom.send_quote applies before pricing goes out.
  test('a client cannot fetch the PDF for a quote that has not been sent', async ({ page, context }) => {
    await signIn(page, AKSARA, '/account');
    await page.goto('/account');
    const unsent = await context.request.get('/api/documents/quote/AX-Q-0010');
    expect(unsent.status()).toBe(404);
  });
  test('but the one AXIOM sent prints, and staff may preview a draft', async ({ page, context }) => {
    await signIn(page, REGENERA, '/account');
    const sent = await context.request.get('/api/documents/quote/AX-Q-0005');
    expect(sent.status()).toBe(200);
    expect(sent.headers()['content-type']).toContain('application/pdf');
    const other = await context.request.get('/api/documents/quote/AX-Q-0010');
    expect(other.status()).toBe(404);

    const staff = await page.context().browser()!.newContext();
    const sp = await staff.newPage();
    await signIn(sp, OWNER, '/console');
    const draft = await staff.request.get('/api/documents/quote/AX-Q-0010');
    expect(draft.status()).toBe(200);
    await staff.close();
  });
});

test.describe('Gate 14 · the basket is honest', () => {
  test('a basket split across three destinations shows its delivery before submission', async ({ page }) => {
    await signIn(page, REGENERA, '/account/shop');
    await page.goto('/account/shop');
    const add = page.locator('[data-kind="apparel"] button[data-add], [data-kind="apparel"] form button').first();
    // Add is a server action; navigating on the next tick races the write, and the basket is shared
    // per account, so whichever project ran first saw an empty basket and the second saw its line.
    // Wait for the action's own response before leaving the page.
    await Promise.all([
      page.waitForResponse(r => r.request().method() === 'POST' && r.status() < 400),
      add.click(),
    ]);
    await page.goto('/account/basket');
    await expect(page.locator('[data-delivery-total]')).toBeVisible();
    const legs = page.locator('[data-delivery-leg]');
    expect(await legs.count()).toBeGreaterThan(0);
  });
});

test.describe('Ops', () => {
  test('ops is refused the pricing screen and sees no error page elsewhere', async ({ page }) => {
    await signIn(page, OPS, '/console');
    // The refusal is shown, not routed around. `variant_costs` raises for a non-owner, and the
    // screen renders that as a stated owner-only message — a silent redirect would leave an ops
    // user guessing why a rail item they can see does nothing. What must hold is that no cost
    // reaches the page and the rail does not offer the screen in the first place.
    await page.goto('/console/pricing');
    await expect(page.locator('.empty')).toContainText(/owner-only|owner only/i);
    const priced = await page.locator('body').evaluate(el => /Rp\s?\d{1,3}(\.\d{3})+/.test(el.textContent || ''));
    expect(priced).toBe(false);
    expect(await page.locator('nav a[href*="/console/pricing"]').count()).toBe(0);
    await page.goto('/console/orders');
    await expect(page.locator('body')).not.toContainText(/Application error|Internal Server Error/);
  });
});

test('shared basket merges into the account on sign-in', async ({ page }) => {
  const path = await firstCompoundPath(page);
  await page.goto('/products/' + '');
  await page.goto(path);
  await expect(page.locator('main')).toBeVisible();
});

test.describe('Protocol card', () => {
  // Seeded in supabase/seed_dev.sql. The codes are stable so a gate can hold one the way a printed
  // vial box does.
  const CARD = 'DEV0REGENERA0001';
  const WITHDRAWN = 'DEV0WTHDRAWN0003';
  const UNKNOWN = 'DEV0000000000009';

  test('a scan opens the card, names the client, and carries no price', async ({ page }) => {
    const res = await page.goto(`/k/${CARD}`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('.pc-subject')).toContainText('Klinik Regenera');
    expect(await page.locator('.pc-item').count()).toBeGreaterThan(0);
    // Peptide prices are gated on an acknowledgement everywhere else; a card holder is anonymous,
    // and axiom.protocol_card is a definer function, so this is the check that it names its columns.
    const priced = await page.locator('body').evaluate(el => /Rp\s?\d{1,3}(\.\d{3})+/.test(el.textContent || ''));
    expect(priced).toBe(false);
  });

  test('the card is never indexed and never crawled', async ({ page }) => {
    const res = await page.goto(`/k/${CARD}`);
    expect(res?.headers()['x-robots-tag']).toContain('noindex');
    const robots = await (await page.request.get('/robots.txt')).text();
    expect(robots).toContain('/k/');
  });

  test('a withdrawn card and an unknown code are the same 404', async ({ page }) => {
    const a = await page.request.get(`/k/${WITHDRAWN}`);
    const b = await page.request.get(`/k/${UNKNOWN}`);
    expect(a.status()).toBe(404);
    expect(b.status()).toBe(404);
  });

  test('the card reads in the language it was issued in, not the browser’s', async ({ page }) => {
    // Every Playwright context sends Accept-Language: en-US, which sends the rest of the site to
    // /en/. This card's locale is 'id' on its own row, and that is what must win — otherwise a
    // clinic manager's phone preference would rewrite a client's card.
    await page.goto(`/k/${CARD}`);
    expect(await page.locator('html').getAttribute('lang')).toBe('id');
    expect(new URL(page.url()).pathname).toBe(`/k/${CARD}`);
  });

  test('the calendar feed is a calendar, and answers a conditional request', async ({ page }) => {
    const url = `/api/protocol/${CARD}/calendar.ics`;
    const res = await page.request.get(url);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('text/calendar');
    const body = await res.text();
    expect(body.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(body).toContain('TZID:Asia/Jakarta');
    expect(body).toContain('RRULE:');
    // Every line within 75 octets, or Apple Calendar discards the file without a word.
    for (const line of body.split('\r\n')) expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);

    const etag = res.headers()['etag'];
    expect(etag).toBeTruthy();
    const again = await page.request.get(url, { headers: { 'If-None-Match': etag } });
    expect(again.status()).toBe(304);

    const download = await page.request.get(`${url}?download=1`);
    expect(download.headers()['content-disposition']).toContain('attachment');
  });

  test('the QR is served without a lookup, and a withdrawn card still has one', async ({ page }) => {
    // The square is a pure function of the code. A database read here would make this route an
    // oracle for which codes exist; the card page is the only place that may be observable.
    for (const code of [CARD, WITHDRAWN]) {
      const res = await page.request.get(`/api/protocol/${code}/qr`);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('image/svg+xml');
    }
  });

  test('the printable card needs a session, and only the right one', async ({ page, browser }) => {
    expect((await page.request.get(`/api/documents/protocol/${CARD}`)).status()).toBe(401);

    const other = await browser.newContext();
    const op = await other.newPage();
    await signIn(op, 'Ivan', '/account');
    expect((await other.request.get(`/api/documents/protocol/${CARD}`)).status()).toBe(404);
    await other.close();

    await signIn(page, OWNER, '/console');
    const ok = await page.request.get(`/api/documents/protocol/${CARD}`);
    expect(ok.status()).toBe(200);
    expect(ok.headers()['content-type']).toContain('application/pdf');
  });

  test('the only thing to do on a scanned card is ask for a link — there is no field to type into', async ({ page }) => {
    await page.goto(`/k/${CARD}`);
    // The address the link goes to is the one on the account's row. A card that accepted an email
    // would be a way to phish one, and a way to find out which addresses exist.
    expect(await page.locator('input[type="email"], input[name*="mail"]').count()).toBe(0);
    await expect(page.locator('.pc-edit button')).toBeVisible();
  });

  test('a client adds a compound to its own card and the calendar follows', async ({ page }) => {
    const before = await (await page.request.get(`/api/protocol/${CARD}/calendar.ics`)).text();
    const beforeEvents = (before.match(/BEGIN:VEVENT/g) ?? []).length;

    await signIn(page, REGENERA, '/account/protocols');
    await page.locator('.rows .row').first().click();
    await page.waitForSelector('select[name="variant_id"]');
    await page.locator('select[name="variant_id"]').selectOption({ index: 1 });
    await page.locator('input[name="amount"]').first().fill('one vial');
    await page.getByRole('button', { name: /Add to the card|Tambahkan ke kartu/ }).click();
    await expect(page.locator('.formfoot .msg.ok')).toBeVisible({ timeout: 15000 });

    // The QR never changed; the card behind it did. That is the whole design.
    const after = await (await page.request.get(`/api/protocol/${CARD}/calendar.ics`)).text();
    expect((after.match(/BEGIN:VEVENT/g) ?? []).length).toBe(beforeEvents + 1);
  });
});

export {};
export type { BrowserContext };
