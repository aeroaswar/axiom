// The homepage hero is light limestone with the three original pens (MOTS-c, Retatrutide, KLOW) standing still:
// no cursor or scroll motion, no horizontal overflow, and it remounts cleanly after a route change.
const {launch}=require('./browser.cjs');
const assert=require('node:assert/strict');
const URL=process.env.AXIOM_TEST_URL || 'http://127.0.0.1:8765/#/';
(async()=>{
const browser=await launch();
const errors=[];
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
await page.goto(URL);
await page.locator('.hero-pens').waitFor();await page.waitForTimeout(800);
assert.equal(await page.locator('.ed-hero').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(229, 220, 209)','light limestone hero');
assert.ok(await page.locator('.hero-limestone').evaluate(n=>n.complete&&n.naturalWidth>0),'limestone photograph loads');
assert.equal(await page.locator('.hero-pens .hero-pen').count(),3,'three pens');
assert.deepEqual(await page.locator('.hero-pens clipPath').evaluateAll(n=>n.map(c=>c.id)),['hero-mots-outline','hero-reta-outline','hero-klow-outline']);
await page.screenshot({path:'qa/latest/hero-desktop.png'});
// Still: pens hold their place relative to the hero under the cursor and while scrolling.
const place=()=>page.locator('.hero-pen').evaluateAll(nodes=>{const h=document.querySelector('.ed-hero').getBoundingClientRect();return nodes.map(n=>{const r=n.getBoundingClientRect();return [Math.round(r.x-h.x),Math.round(r.y-h.y),Math.round(r.width)];});});
const before=await place();
const art=await page.locator('.hero-art').boundingBox();
await page.mouse.move(art.x+art.width*.8,art.y+art.height*.4);await page.waitForTimeout(700);
assert.deepEqual(await place(),before,'pens ignore the cursor');
await page.evaluate(()=>scrollTo(0,320));await page.waitForTimeout(700);
assert.deepEqual(await place(),before,'pens ignore scrolling');
assert.ok((await page.locator('.hero-pen').evaluateAll(n=>n.map(x=>getComputedStyle(x).transform))).every(t=>t==='none'));
assert.equal(await page.locator('.ed-art').evaluate(n=>getComputedStyle(n).animationName),'none','no entrance animation on the pens');
// Route remount and width.
await page.evaluate(()=>{location.hash='/products'});await page.locator('.hero-pens').waitFor({state:'detached'});
await page.evaluate(()=>{location.hash='/'});await page.locator('.hero-pens').waitFor();
assert.equal(await page.locator('.hero-pens').count(),1);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(URL);await mobile.locator('.hero-pens').waitFor();await mobile.waitForTimeout(600);
await mobile.screenshot({path:'qa/latest/hero-mobile.png'});
assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.deepEqual(errors,[]);
console.log(JSON.stringify({result:'PASS',lightHero:true,pens:3,still:true,routeRemount:true,mobile:true,noOverflow:true,errors},null,2));
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
