import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { AxiomDocument, type DocumentData } from '@/components/document/document';
import { SPRITE } from '@/components/shell/sprite-svg';

// One template, two outputs. The PDF is this same markup printed headless (Chromium printToPDF,
// A4, fonts embedded, background graphics on). The preview and the PDF cannot drift.

let cssCache: string | null = null;
function documentCss(): string {
  if (cssCache) return cssCache;
  const app = fs.readFileSync(path.join(process.cwd(), 'src/styles/app.css'), 'utf8');
  const globals = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8');
  const tokens = globals.slice(globals.indexOf(':root{'), globals.indexOf('@theme'));
  const start = app.indexOf('/* the invoice document');
  const end = app.indexOf('/* ==================================================================\n   Alive');
  cssCache = `${tokens}\n.wm-sv{fill:var(--ink)}\n${app.slice(start, end)}`;
  return cssCache;
}

/** The document's own fields reach the surrounding markup as text, never as HTML. `number` is
 *  trigger-generated but staff may insert an explicit one, so escape it rather than trust it. */
const esc = (s: string) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// `react-dom/server` is refused as a static import in every App Router server layer, route
// handlers included, so it is pulled in at call time. That is what makes this the one renderer
// the preview, the print view and the PDF can all share.
const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Jost:wght@300;400;500&display=swap';

export async function documentHtml(d: DocumentData, fontsHref = FONTS): Promise<string> {
  return elementHtml(createElement(AxiomDocument, { d }), d.number, d.lang, fontsHref);
}

/** Any document element (the invoice family, a certificate) as a standalone printable page. */
export async function elementHtml(element: React.ReactElement, title: string, langIn: string, fontsHref = FONTS): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const body = renderToStaticMarkup(element);
  const lang = /^[a-z]{2}(-[A-Za-z0-9]{2,8})*$/.test(langIn) ? langIn : 'id';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${fontsHref}" rel="stylesheet">
<style>${documentCss()}
html,body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--sans);-webkit-print-color-adjust:exact;print-color-adjust:exact}
.inv-doc{box-shadow:none;border:none;max-width:none;width:794px;margin:0 auto}
@page{size:A4;margin:0}
</style></head><body>${SPRITE}${body}</body></html>`;
}

export async function documentPdf(d: DocumentData): Promise<Buffer> {
  return htmlPdf(await documentHtml(d));
}

export async function htmlPdf(html: string): Promise<Buffer> {
  const { chromium } = await import('playwright');
  const executablePath = process.env.PW_CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  const browser = await chromium.launch({ executablePath });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready);
    const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
