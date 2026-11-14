// The homepage hero is light limestone with the three product photographs (Retatrutide, MOTS-c, KLOW) standing still:
// no cursor or scroll motion, no horizontal overflow, and it remounts cleanly after a route change.
const {launch}=require('./browser.cjs');
const assert=require('node:assert/strict');
const URL=process.env.AXIOM_TEST_URL || 'http://127.0.0.1:8765/#/';
(async()=>{
const browser=await launch();
const errors=[];
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
await page.goto(URL);
await page.locator('.hero-grid').waitFor();await page.waitForTimeout(800);
assert.equal(await page.locator('.ed-hero').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(229, 220, 209)','light limestone hero');
const tiles=await page.locator('.hero-tile').evaluateAll(n=>n.map(a=>({href:a.getAttribute('href'),loaded:a.querySelector('img').complete&&a.querySelector('img').naturalWidth>0,h:Math.round(a.getBoundingClientRect().height)})));
assert.deepEqual(tiles.map(t=>t.href),['#/products/retatrutide','#/products/mots-c','#/products/klow-bpc-plus-tb-plus-ghk-plus-kpv'],'three product photographs');
assert.ok(tiles.every(t=>t.loaded),'photographs load');
assert.ok(Math.abs(tiles[0].h-(tiles[1].h+tiles[2].h+12))<=2,'large photo matches the stacked pair');
await page.screenshot({path:'qa/latest/hero-desktop.png'});
// Still: pens hold their place relative to the hero under the cursor and while scrolling.
const place=()=>page.locator('.hero-tile').evaluateAll(nodes=>{const h=document.querySelector('.ed-hero').getBoundingClientRect();return nodes.map(n=>{const r=n.getBoundingClientRect();return [Math.round(r.x-h.x),Math.round(r.y-h.y),Math.round(r.width)];});});
const before=await place();
const art=await page.locator('.hero-art').boundingBox();
await page.mouse.move(art.x+art.width*.8,art.y+art.height*.4);await page.waitForTimeout(700);
assert.deepEqual(await place(),before,'photos ignore the cursor');
await page.evaluate(()=>scrollTo(0,320));await page.waitForTimeout(700);
assert.deepEqual(await place(),before,'photos ignore scrolling');
assert.ok((await page.locator('.hero-tile').evaluateAll(n=>n.map(x=>getComputedStyle(x).transform))).every(t=>t==='none'));
assert.equal(await page.locator('.ed-art').evaluate(n=>getComputedStyle(n).animationName),'none','no entrance animation on the pens');
// Route remount and width.
await page.evaluate(()=>{location.hash='/products'});await page.locator('.hero-grid').waitFor({state:'detached'});
await page.evaluate(()=>{location.hash='/'});await page.locator('.hero-grid').waitFor();
assert.equal(await page.locator('.hero-grid').count(),1);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(URL);await mobile.locator('.hero-grid').waitFor();await mobile.waitForTimeout(600);
await mobile.screenshot({path:'qa/latest/hero-mobile.png'});
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.deepEqual(errors,[]);
console.log(JSON.stringify({result:'PASS',lightHero:true,photos:3,still:true,routeRemount:true,mobile:true,noOverflow:true,errors},null,2));
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
