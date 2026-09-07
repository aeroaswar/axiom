import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:3000/compounds/metabolic/aod-9604', { waitUntil: 'networkidle' });
console.log(await p.evaluate(() => {
  const t = document.querySelector('.doses-tbl');
  let n = t, chain = [];
  while (n && n !== document.documentElement) { const cs = getComputedStyle(n); chain.push(`${n.tagName}.${String(n.className).slice(0,26)} ovx=${cs.overflowX} pos=${cs.position} w=${Math.round(n.getBoundingClientRect().width)} sw=${n.scrollWidth} cw=${n.clientWidth}`); n = n.parentElement; }
  const bodyOver = [...document.body.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>391).map(e=>e.tagName+'.'+String(e.className).slice(0,24));
  return chain.join('\n') + '\nOVER: ' + bodyOver.length + ' ' + bodyOver.slice(0,8).join(',');
}));
await b.close();
