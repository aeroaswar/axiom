const {launch,go,routes:listRoutes}=require('./browser.cjs');
const assert=require('node:assert/strict');
const URL=process.env.AXIOM_TEST_URL || 'http://127.0.0.1:8765/?v=i18n#/';
// English text still showing in Indonesian mode: either a dictionary key that was missed, or prose with common English words.
const LEFTOVER=()=>{
  const d=window.__I18N_ID.text, out=new Set(), norm=s=>s.replace(/\s+/g,' ').trim();
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('script,style,svg,[translate="no"]')?2:1});
  let n;while((n=w.nextNode())){const t=norm(n.nodeValue);if(!t)continue;
    if(d[t]!==undefined&&d[t]!==t||/\b(the|and|with|your|for|from|every|this|is|are|of)\b/.test(t)&&/[a-z]{3,} [a-z]{3,}/.test(t))out.add(t);}
  return [...out];
};
(async()=>{
const browser=await launch();
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(URL);
await page.locator('.is-motion-ready').waitFor();
const englishNav=await page.locator('.nav-links').innerText();
assert.equal(await page.evaluate(()=>document.documentElement.lang),'en');
// Switch to Indonesian.
await page.locator('[data-lang="id"]').click();
await page.waitForFunction(()=>window.__I18N_ID&&/belanja/i.test(document.querySelector('.nav-links').textContent));
assert.equal(await page.evaluate(()=>document.documentElement.lang),'id');
assert.equal(await page.locator('[data-lang="id"]').getAttribute('aria-pressed'),'true');
assert.match(await page.locator('.nav-links').innerText(),/Belanja/i);
assert.match(await page.locator('#hero-title').innerText(),/Dibangun untuk/);
assert.match(await page.title(),/^Dibangun untuk riset yang lebih baik\. — AXIOM$/);
await page.screenshot({path:'qa/latest/i18n-home-id.png'});
// Hero motion still runs under the translated headline.
const art=await page.locator('.hero-motion').boundingBox();
const before=await page.locator('.hero-pen').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).transform));
await page.mouse.move(art.x+art.width*.8,art.y+art.height*.4);await page.waitForTimeout(900);
assert.notDeepEqual(await page.locator('.hero-pen').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).transform)),before);
// Interactive copy produced by the app.
await page.locator('[data-home-filter]').nth(1).click();
assert.match(await page.locator('.ed-filter-count').innerText(),/^Menampilkan \d+ dari \d+$/);
await page.locator('[data-supply-days]').nth(1).click();
assert.match(await page.locator('.ed-supply-note').innerText(),/^Setiap 60 hari · hemat 12%/);
await go(page,'/products/retatrutide');
assert.match(await page.title(),/— AXIOM$/);
await page.locator('[data-plan="sub"]').first().click();
await page.locator('.add button, button:has-text("Tambah ke keranjang")').first().click();await page.waitForTimeout(300);
const toast=await page.evaluate(()=>document.querySelector('.toast,[role=status]')?.textContent||'');
assert.doesNotMatch(toast,/Added to the basket/);
await page.screenshot({path:'qa/latest/i18n-product-id.png'});
await go(page,'/request');
await page.locator('form button[type="submit"]').first().click();await page.waitForTimeout(300);
const formText=await page.locator('#main').innerText();
assert.doesNotMatch(formText,/Your name is needed on the quote\./);
// Every route: report leftovers.
const routes=await listRoutes(page);
const leftovers=new Map();
for(const r of routes){await go(page,r);
  for(const t of await page.evaluate(LEFTOVER)) if(!leftovers.has(t)) leftovers.set(t,r);}
// Back to English restores the original markup exactly.
await go(page,'/');await page.locator('.is-motion-ready').waitFor();
await page.locator('[data-lang="en"]').click();
assert.equal(await page.evaluate(()=>document.documentElement.lang),'en');
assert.equal(await page.locator('.nav-links').innerText(),englishNav);
assert.match(await page.locator('#hero-title').innerText(),/Built for/);
assert.equal(await page.title(),'Built for better research. — AXIOM');
await page.reload();await page.locator('.is-motion-ready').waitFor();
assert.equal((await page.locator('#main').innerHTML()).length>0,true);
assert.equal(await page.locator('#hero-title').innerText().then(t=>t.replace(/\s+/g,' ')),'Built for better research.');
// The choice persists across reloads.
await page.locator('[data-lang="id"]').click();await page.reload();await page.locator('.is-motion-ready').waitFor();
await page.waitForFunction(()=>!document.documentElement.classList.contains('lang-pending')&&/Dibangun/.test(document.querySelector('#hero-title').textContent));
assert.equal(await page.evaluate(()=>document.documentElement.lang),'id');
assert.match(await page.locator('#hero-title').innerText(),/Dibangun untuk/);
// A browser set to Indonesian starts in Indonesian without saving a choice; a saved English choice still wins.
const idContext=await browser.newContext({viewport:{width:1280,height:900},locale:'id-ID'});
const idPage=await idContext.newPage();idPage.on('pageerror',e=>errors.push(e.message));
await idPage.goto(URL);await idPage.locator('.is-motion-ready').waitFor();
await idPage.waitForFunction(()=>/Dibangun/.test(document.querySelector('#hero-title').textContent));
assert.equal(await idPage.evaluate(()=>document.documentElement.lang),'id');
assert.equal(await idPage.evaluate(()=>localStorage.getItem('axiom-design-lang')),null);
await idPage.locator('[data-lang="en"]').click();await idPage.reload();await idPage.locator('.is-motion-ready').waitFor();
assert.match(await idPage.locator('#hero-title').innerText(),/Built for/);
await idContext.close();
// Mobile: switch reachable, no horizontal overflow.
const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(URL);await mobile.locator('.is-motion-ready').waitFor();
await mobile.locator('[data-lang="id"]').tap();
await mobile.waitForFunction(()=>window.__I18N_ID&&/Dibangun/.test(document.querySelector('#hero-title').textContent));
assert.equal(await mobile.locator('[data-lang="id"]').isVisible(),true);
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
await mobile.screenshot({path:'qa/latest/i18n-home-mobile-id.png'});
assert.deepEqual(errors,[]);
console.log(JSON.stringify({result:'PASS',routes:routes.length,toggle:true,heroMotion:true,dynamicCopy:true,restoresEnglish:true,persists:true,browserDefault:true,mobile:true,errors,
  leftovers:leftovers.size,leftoverSample:[...leftovers]},null,2));
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
