// Gate 9 — no dosing, no claims. Lints every message catalogue and the content tables.
import fs from 'node:fs';
import path from 'node:path';
import { lintCatalogue, lintCopy } from './lib/copy-rules.mjs';
import { connect } from '../db/lib.mjs';

let failures = 0;
const report = (where, f, text) => { failures++; console.log(`  ✗ ${where}: ${f}\n      ${String(text).slice(0, 140)}`); };

console.log('Gate 9: message catalogues');
for (const locale of fs.readdirSync('messages')) {
  const dir = path.join('messages', locale);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    const cat = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const r of lintCatalogue(cat)) report(`${locale}/${f} ${r.path}`, r.finding, r.text);
  }
}

console.log('Gate 9: content tables');
const sql = connect();
const rows = await sql`select slug, identity_en, identity_id, research_en, research_id, handling_en, handling_id, compound_class_en, compound_class_id from public.products`;
for (const r of rows) for (const [col, text] of Object.entries(r)) {
  if (col === 'slug' || !text) continue;
  for (const f of lintCopy(text)) report(`products.${r.slug}.${col}`, f, text);
}
const settings = await sql`select key, value from public.site_settings where key in ('ruo_notice','handling_baseline')`;
for (const s of settings) for (const [lang, text] of Object.entries(s.value)) for (const f of lintCopy(text)) report(`site_settings.${s.key}.${lang}`, f, text);
const refs = await sql`select p.slug, r.citation from public.product_references r join public.products p on p.id = r.product_id`;
for (const r of refs) for (const f of lintCopy(r.citation)) report(`references.${r.slug}`, f, r.citation);
await sql.end();

console.log(failures ? `\n${failures} finding(s)` : '\n  ✓ zero avoid-list words, zero exclamation marks, zero dose-and-frequency patterns');
process.exit(failures ? 1 : 0);
