// Shared browser setup for the QA scripts. Playwright resolves from the project first (the repository's
// @playwright/test in CI), then a global install, then AXIOM_PLAYWRIGHT or this Mac's bundled copy.
const candidates=['@playwright/test','playwright',process.env.AXIOM_PLAYWRIGHT,
  '/Users/aeroaswar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'].filter(Boolean);
let chromium;
for(const candidate of candidates){try{({chromium}=require(candidate));break;}catch(e){}}
if(!chromium) throw new Error('Playwright not found: run `pnpm install` at the repository root, or set AXIOM_PLAYWRIGHT to a playwright package.');
// Playwright's own Chromium when installed (CI), otherwise the installed Chrome. AXIOM_BROWSER_CHANNEL forces one.
async function launch(){
  const channel=process.env.AXIOM_BROWSER_CHANNEL;
  if(channel) return chromium.launch({headless:true,channel});
  try{return await chromium.launch({headless:true});}catch(e){return chromium.launch({headless:true,channel:'chrome'});}
}
// Navigate by hash and wait for the storefront to finish rendering it, including lazily loaded pages.
function go(page,hash){
  return page.evaluate(h=>new Promise(done=>{
    if(location.hash==='#'+h) return done();
    const finish=()=>{removeEventListener('axiom:route',finish);clearTimeout(timer);done();};
    const timer=setTimeout(finish,8000);
    addEventListener('axiom:route',finish);
    location.hash=h;
  }),hash);
}
// Every storefront route, from the template list the build ships in content.js.
function routes(page){
  return page.evaluate(()=>{
    const keys=window.__PAGE_KEYS;
    const r=['/','/products','/merch','/coas','/compounds','/contact','/request','/sign-in','/standard','/process','/faq','/price-list','/how-to-read-a-coa','/terms','/privacy','/legal','/request/sent'];
    window.__DATA.products.forEach(x=>{r.push('/products/'+x.slug);if(keys.includes('compound-'+x.slug))r.push('/compounds/'+x.pathway+'/'+x.slug);});
    keys.forEach(k=>{if(k.startsWith('pathway-'))r.push('/compounds/'+k.slice(8));if(k.startsWith('coa-'))r.push('/coas/'+k.slice(4));});
    return [...new Set(r)];
  });
}
module.exports={launch,go,routes};
