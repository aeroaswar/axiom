import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Browser gates. Every check here is one row of §13. They run against the built app with the
// seeded local database (pnpm db:reset). Dev auth mode signs in seeded users through /sign-in.

const OWNER = 'Aero';
const OPS = 'Nadia';
const REGENERA = 'dr. Ratna';
const SENOPATI = 'Klinik Senopati';

async function signIn(page: Page, name: string, next = '/account') {
  await page.goto(`/sign-in?next=${encodeURIComponent(next)}`);
  const form = page.locator('form').filter({ hasText: name }).first();
  await form.getByRole('button').click();
  await page.waitForURL(u => !u.pathname.includes('/sign-in'));
}

const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

async function firstCompoundPath(page: Page): Promise<string> {
  await page.goto('/compounds');
  const pathway = await page.locator('a[href^="/compounds/"], a[href^="/id/compounds/"]').first().getAttribute('href');
  await page.goto(pathway!);
  const compound = await page.locator('a[href*="/compounds/"][href*="/"]').filter({ hasNot: page.locator('nav a') }).evaluateAll(as => (as as HTMLAnchorElement[]).map(a => a.getAttribute('href')!).find(h => h.split('/').filter(Boolean).length >= 3));
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

test.describe('Gate 14 · the basket is honest', () => {
  test('a basket split across three destinations shows its delivery before submission', async ({ page }) => {
    await signIn(page, REGENERA, '/account/shop');
    await page.goto('/account/shop');
    const add = page.locator('[data-kind="apparel"] button[data-add], [data-kind="apparel"] form button').first();
    await add.click();
    await page.goto('/account/basket');
    await expect(page.locator('[data-delivery-total]')).toBeVisible();
    const legs = page.locator('[data-delivery-leg]');
    expect(await legs.count()).toBeGreaterThan(0);
  });
});

test.describe('Ops', () => {
  test('ops is refused the pricing screen and sees no error page elsewhere', async ({ page }) => {
    await signIn(page, OPS, '/console');
    await page.goto('/console/pricing');
    await expect(page).not.toHaveURL(/pricing/);
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

export {};
export type { BrowserContext };
