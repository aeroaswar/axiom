// Gate 17 — bilingual. Every key resolves in Indonesian and English; no empty strings; and no
// hardcoded user-facing string in a component (JSX text nodes must come from the catalogues).
import fs from 'node:fs';
import path from 'node:path';

let failures = 0;
const fail = (m) => { failures++; console.log('  ✗', m); };

function flat(obj, p = '') { const out = {}; for (const [k, v] of Object.entries(obj)) { const q = p ? `${p}.${k}` : k; if (v && typeof v === 'object') Object.assign(out, flat(v, q)); else out[q] = v; } return out; }
function load(locale) { const dir = path.join('messages', locale); const merged = {}; for (const f of fs.readdirSync(dir)) Object.assign(merged, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))); return flat(merged); }

console.log('Gate 17: catalogue parity');
const en = load('en'), id = load('id');
for (const k of Object.keys(en)) { if (!(k in id)) fail(`missing in id: ${k}`); else if (id[k] === '') fail(`empty in id: ${k}`); }
for (const k of Object.keys(id)) { if (!(k in en)) fail(`missing in en: ${k}`); else if (en[k] === '') fail(`empty in en: ${k}`); }
console.log(`  ${Object.keys(en).length} keys in en, ${Object.keys(id).length} in id`);

console.log('Gate 17: no hardcoded user-facing strings in components');
function files(dir) { const out = []; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) out.push(...files(p)); else if (/\.tsx$/.test(e.name)) out.push(p); } return out; }
// JSX text nodes: >Some words here< with at least two letters and a space, excluding brand tokens.
const TEXT = />\s*([A-Za-z][A-Za-z'’,.-]+(?:\s+[A-Za-z'’,.-]+){1,})\s*</g;
const ALLOW = /^(AXIOM.*|RUO|Rp|Human Performance & Longevity|Documented, not promised\.|WIB|HPLC \/ MS|CoA|PPN|NPWP|PDF|OK|ID|EN)$/;
for (const f of files('src')) {
  if (/not-found|sprite/.test(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  let m; while ((m = TEXT.exec(s))) { const t = m[1].trim(); if (!ALLOW.test(t) && !/^\{/.test(t)) fail(`${f}: hardcoded text "${t.slice(0, 60)}"`); }
}

console.log(failures ? `\n${failures} finding(s)` : '\n  ✓ every string resolves in both locales');
process.exit(failures ? 1 : 0);
