import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
for (const wait of ['domcontentloaded','networkidle']) {
  await p.goto('http://127.0.0.1:3000/compounds/metabolic/aod-9604', { waitUntil: wait });
  const r = await p.evaluate(() => {
    const w = document.documentElement.clientWidth; const over=[];
    for (const el of document.querySelectorAll('*')) { const b=el.getBoundingClientRect(); if (b.right>w+1) over.push(el.tagName+'.'+String(el.className).slice(0,30)+':'+Math.round(b.right)); }
    const tw = document.querySelector('.tblwrap');
    return { sw: document.documentElement.scrollWidth, over: over.slice(0,6), twOverflow: tw?getComputedStyle(tw).overflowX:null, twW: tw?Math.round(tw.getBoundingClientRect().width):null };
  });
  console.log(wait, JSON.stringify(r));
}
await b.close();
