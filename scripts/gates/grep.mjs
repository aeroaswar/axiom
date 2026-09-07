// Gates 1 and 13 — one catalogue, nothing typed. Greps the application source for a second copy of
// a price, a product name or a dose literal, and for hardcoded KPI or notification strings.
// The only permitted home of those literals is supabase/seed.sql (and the dev fixtures).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const APP_DIRS = ['src', 'messages'];
let failures = 0;
const fail = (msg) => { failures++; console.log('  ✗', msg); };

function files(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...files(p));
    else if (/\.(tsx?|jsx?|mjs|json|css)$/.test(e.name)) out.push(p);
  }
  return out;
}
const sources = APP_DIRS.flatMap(d => fs.existsSync(d) ? files(d) : []);
const read = Object.fromEntries(sources.map(f => [f, fs.readFileSync(f, 'utf8')]));

console.log('Gate 1: no price literal outside the seed');
const PRICE = /Rp\s?\d{1,3}(\.\d{3})+/g;
for (const [f, s] of Object.entries(read)) {
  const lines = s.split('\n');
  lines.forEach((l, i) => { if (PRICE.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)) fail(`${f}:${i + 1} carries a rupiah literal: ${l.trim().slice(0, 100)}`); PRICE.lastIndex = 0; });
}

console.log('Gate 1: no product name literal outside the seed');
const seed = fs.readFileSync('supabase/seed.sql', 'utf8');
const names = [...seed.matchAll(/md5\('product:([^']+)'\)::uuid, \d+, '(?:peptide|device|apparel)', '[^']+', '([^']+)'/g)].map(m => m[2]).filter(n => n.length > 3);
const skus = [...seed.matchAll(/md5\('variant:([^']+)'\)::uuid/g)].map(m => m[1]);
const nameRe = new RegExp(`(^|[^\\w])(${[...new Set(names)].map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?=$|[^\\w])`);
for (const [f, s] of Object.entries(read)) {
  if (/tests?\//.test(f)) continue;
  s.split('\n').forEach((l, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(l)) return;
    const m = l.match(nameRe);
    if (m) fail(`${f}:${i + 1} names a product ("${m[2]}"): ${l.trim().slice(0, 100)}`);
  });
}
const skuRe = new RegExp(`['"\`](${skus.join('|')})['"\`]`);
for (const [f, s] of Object.entries(read)) {
  if (/tests?\//.test(f)) continue;
  s.split('\n').forEach((l, i) => { if (skuRe.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)) fail(`${f}:${i + 1} carries a sku literal: ${l.trim().slice(0, 100)}`); });
}

console.log('Gate 1: no dose literal outside the seed');
const DOSE = /(^|[^\w.])\d{1,5}\s?(mg|IU|mL)\b/;
for (const [f, s] of Object.entries(read)) {
  if (/tests?\//.test(f)) continue;
  s.split('\n').forEach((l, i) => { if (DOSE.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l) && !/interval|ms\b|px|font/.test(l)) fail(`${f}:${i + 1} carries a dose literal: ${l.trim().slice(0, 100)}`); });
}

console.log('Gate 1: the stated revalidation window');
const windowSetting = Number((seed.match(/\('revalidate_seconds', '(\d+)'\)/) || [])[1]);
const constant = Number((fs.readFileSync('src/lib/settings.ts', 'utf8').match(/REVALIDATE_SECONDS = (\d+)/) || [])[1]);
if (windowSetting !== constant) fail(`site_settings.revalidate_seconds (${windowSetting}) ≠ REVALIDATE_SECONDS (${constant})`);
for (const [f, s] of Object.entries(read)) {
  const m = s.match(/export const revalidate = (\d+)/);
  if (m && Number(m[1]) !== windowSetting) fail(`${f} revalidates every ${m[1]} s, the stated window is ${windowSetting} s`);
}

console.log('Gate 13: nothing on a dashboard, badge or notification is typed');
const KPI = /(data-n=["']\d{4,}|>\s?\d{1,3}(\.\d{3}){2,}\s?<|Rp\s?\d)/;
for (const [f, s] of Object.entries(read)) {
  if (!/\.(tsx|jsx)$/.test(f)) continue;
  s.split('\n').forEach((l, i) => { if (KPI.test(l)) fail(`${f}:${i + 1} carries a typed figure: ${l.trim().slice(0, 100)}`); });
}
const NOTIF = /(overdue \d+ d|\d+ open<|"\d+ to price"|'\d+ to price')/;
for (const [f, s] of Object.entries(read)) {
  s.split('\n').forEach((l, i) => { if (NOTIF.test(l)) fail(`${f}:${i + 1} carries a typed notification: ${l.trim().slice(0, 100)}`); });
}

console.log('Gate 12/7: no literal hex colour in components (tokens only)');
for (const [f, s] of Object.entries(read)) {
  if (!/\.(tsx|jsx)$/.test(f) || /sprite-svg|hero-field/.test(f)) continue;
  s.split('\n').forEach((l, i) => { if (/#[0-9a-fA-F]{6}\b/.test(l) && !/^\s*(\/\/|\*)/.test(l) && !/themeColor/.test(l)) fail(`${f}:${i + 1} literal hex colour: ${l.trim().slice(0, 100)}`); });
}

console.log('Gate: the seeded sign-in is closed by the build, not by a runtime variable');
{
  const auth = fs.readFileSync('src/lib/auth.ts', 'utf8');
  const decl = /const DEV = process\.env\.(\w+) === 'dev';/.exec(auth);
  if (!decl) fail('src/lib/auth.ts no longer declares the dev-auth switch in the shape this gate reads');
  // Next inlines NEXT_PUBLIC_* at build time. Keyed on anything else, a deployed artifact could be
  // opened by setting a variable on the running instance — which is the whole point of the switch.
  else if (!decl[1].startsWith('NEXT_PUBLIC_')) fail(`the dev sign-in is keyed on ${decl[1]}, which is read at run time; it must be a NEXT_PUBLIC_ name so the build decides`);
  else console.log(`  ✓ keyed on ${decl[1]}, inlined at build time`);
  if (!/if \(!DEV\) throw new Error\('dev sign-in is disabled'\);/.test(auth)) fail('devSignIn no longer refuses when the dev door is closed');
  else console.log('  ✓ devSignIn refuses when it is off');
  for (const f of ['.env.example', '.github/workflows/ci.yml']) {
    const t = fs.readFileSync(f, 'utf8');
    if (/\bAUTH_MODE\b/.test(t.replace(/NEXT_PUBLIC_AUTH_MODE/g, ''))) fail(`${f} still names a second auth switch; one flag, not two`);
  }
  console.log('  ✓ one auth flag across the env template and CI');
}

// A check that swallows its own failure passes for the wrong reason: say so when it cannot run.
try {
  if (execSync('git ls-files website archive', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim())
    fail('the retired legacy site (website/, archive/) is still in the tree');
} catch { console.log('  · legacy-site check skipped: git is not available here'); }

console.log(failures ? `\n${failures} finding(s)` : '\n  ✓ zero second copies, zero typed figures');
process.exit(failures ? 1 : 0);
