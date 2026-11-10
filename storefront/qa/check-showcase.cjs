// The storefront is a showcase: every route shows the catalogue and the compound guide in English, with no price,
// basket, certificate, account, subscription or Indonesia wording, and every way to order opens WhatsApp with the
// chosen product and size in the message.
const {launch,go,routes}=require('./browser.cjs');
const assert=require('node:assert/strict');
const URL=process.env.AXIOM_TEST_URL || 'http://127.0.0.1:8765/#/';
const BANNED=/\bRp\b|\bIDR\b|rupiah|Indones|Bahasa|Jabodetabek|\bWIB\b|basket|certificate|\bCoA\b|\bquotes?\b|account|subscri|\bprices?\b|price list|sign in|checkout|apparel|\bmerch\b/i;
const REMOVED=/^#\/(coas|how-to-read-a-coa|price-list|request|sign-in|account|console|process|terms|privacy|legal|merch)(\/|\?|$)/;
const message=href=>decodeURIComponent(new URL_(href).searchParams.get('text')||'');
const URL_=globalThis.URL;
(async()=>{
const browser=await launch();
const errors=[],found={};
const desktop=await browser.newContext({viewport:{width:1440,height:900}});
const page=await desktop.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.goto(URL);await page.waitForTimeout(500);
assert.equal(await page.evaluate(()=>document.documentElement.lang),'en','page language');
assert.equal(await page.locator('[data-lang], .nav-lang').count(),0,'no language switch');
assert.equal(await page.locator('.site-nav a[href="#/request"], .site-nav a[href="#/account"]').count(),0,'no basket or account in the header');
// Every route: no banned wording on screen (header and footer included) and no link to a removed page.
const all=await routes(page);
for(const r of all){
  await go(page,r);await page.waitForTimeout(60);
  const {text,links}=await page.evaluate(()=>({text:document.body.innerText,links:[...document.querySelectorAll('a[href^="#/"]')].map(a=>a.getAttribute('href'))}));
  const hit=text.match(BANNED);if(hit) found[r]=text.slice(Math.max(0,hit.index-60),hit.index+60).replace(/\s+/g,' ');
  const dead=links.find(h=>REMOVED.test(h));if(dead) found[r+' link']=dead;
}
assert.deepEqual(found,{},'banned wording or dead links');
// A removed route opens the homepage rather than a stale page.
await go(page,'/coas');await page.waitForTimeout(100);
assert.equal(await page.evaluate(()=>document.querySelector('#main').dataset.view),'home','removed routes fall back to home');
// Product page: the order link names the product and the chosen size.
await go(page,'/products/retatrutide');
const order=page.locator('.buy [data-order]');
assert.equal(message(await order.getAttribute('href')),'Hello AXIOM, I would like to order Retatrutide 10 mg.');
await page.locator('.buy .size').nth(2).click();
assert.equal(message(await order.getAttribute('href')),'Hello AXIOM, I would like to order Retatrutide 30 mg.');
assert.equal(await page.locator('.buy [type=submit], .buy .qty, .buy .opts').count(),0,'no basket controls');
await go(page,'/products/red-light-therapy-mask');
assert.equal(message(await page.locator('.buy [data-order]').getAttribute('href')),'Hello AXIOM, I would like to order Red Light Therapy Mask (Face - LED array).');
// Cards open their product page; compound guide lots order on WhatsApp by dose.
await go(page,'/products');
assert.equal(await page.locator('.pcard .add a').first().getAttribute('href'),'#/products/retatrutide');
assert.equal(await page.locator('.pcard .add form').count(),0,'cards carry no basket form');
assert.equal(await page.locator('.pcard[data-compound="retatrutide"] .pr').first().textContent(),'5 sizes','cards state their sizes');
await go(page,'/');
assert.equal(await page.locator('.ed-products .pcard .add a').first().getAttribute('href'),'#/products/retatrutide');
await go(page,'/compounds/metabolic/retatrutide');
const lots=await page.locator('.doses-tbl a').evaluateAll(a=>a.map(x=>x.href));
assert.deepEqual(lots.map(message),['10','20','30','40','60'].map(d=>`Hello AXIOM, I would like to order Retatrutide ${d} mg.`));
// Phone: the order bar mirrors the box's link once the box is out of view.
const phone=await browser.newContext({viewport:{width:390,height:800},isMobile:true,hasTouch:true});
const mobile=await phone.newPage();mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(URL);await mobile.waitForTimeout(400);
await go(mobile,'/products/retatrutide');await mobile.waitForTimeout(300);
await mobile.locator('.buy .size').nth(1).click();
await mobile.evaluate(()=>document.querySelector('.prod-body').scrollIntoView());await mobile.waitForTimeout(500);
const bar=await mobile.evaluate(()=>{const b=document.querySelector('.buy-bar');return {on:!b.classList.contains('is-off'),size:b.querySelector('.bb-size').textContent,href:b.querySelector('.bb-add').href,box:document.querySelector('.buy [data-order]').href};});
assert.ok(bar.on,'order bar shows once the box scrolls away');
assert.equal(bar.size,'20 mg');assert.equal(bar.href,bar.box);
await mobile.screenshot({path:require('path').join(__dirname,'latest','showcase-phone-bar.png')});
assert.deepEqual(errors,[]);
console.log(JSON.stringify({result:'PASS',routes:all.length,orderBar:bar.size,errors},null,2));
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
