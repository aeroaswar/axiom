// Every way of adding to the basket adds exactly the chosen item once.
const {launch,go}=require('./browser.cjs');
const assert=require('node:assert/strict');
const URL=process.env.AXIOM_TEST_URL || 'http://127.0.0.1:8765/#/';
(async()=>{
const browser=await launch();
const errors=[],results={};
async function check(name,expected,steps,mobile){
  const context=await browser.newContext(mobile?{viewport:{width:390,height:800},isMobile:true,hasTouch:true}:{viewport:{width:1440,height:900}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(URL);await page.waitForTimeout(400);
  await steps(page);await page.waitForTimeout(400);
  results[name]=await page.evaluate(()=>JSON.parse(localStorage.getItem('axiom-design-basket')||'[]').map(l=>l.sku+(l.plan?'@'+l.plan:'')+'×'+l.qty).join(', '));
  assert.equal(results[name],expected,name);
  await context.close();
}
const submit=p=>p.locator('.buy-foot [type=submit]').click();
const chooser=async p=>{await p.waitForTimeout(300);await p.locator('.qa-panel [type=submit], .qa-panel button:has-text("Add")').first().click();};
await check('product, default size','reta10×1',async p=>{await go(p,'/products/retatrutide');await submit(p);});
await check('product, another size','reta20×1',async p=>{await go(p,'/products/retatrutide');await p.locator('.size').nth(1).click();await submit(p);});
await check('product, quantity 3','reta10×3',async p=>{await go(p,'/products/retatrutide');for(let i=0;i<2;i++)await p.locator('.buy-foot [data-q="1"]').click();await submit(p);});
await check('product, subscription','reta10@30×1',async p=>{await go(p,'/products/retatrutide');await p.locator('[data-plan="sub"]').click();await submit(p);});
await check('product, twice','reta10×2',async p=>{await go(p,'/products/retatrutide');await submit(p);await p.keyboard.press('Escape');await submit(p);});
await check('device page','mask×1',async p=>{await go(p,'/products/red-light-therapy-mask');await submit(p);});
await check('mobile buy bar','reta10×1',async p=>{await go(p,'/products/retatrutide');await p.waitForTimeout(500);await p.locator('.buy-bar .bb-add').click();},true);
await check('catalogue card','reta10×1',async p=>{await go(p,'/products');await p.locator('.pcard .add button').first().click();await chooser(p);});
await check('homepage card','reta10×1',async p=>{await p.locator('.ed-products .pcard .add button').first().click();await chooser(p);});
assert.deepEqual(errors,[]);
console.log(JSON.stringify({result:'PASS',results,errors},null,2));
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
