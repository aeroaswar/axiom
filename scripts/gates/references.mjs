// Gate 8 — every claim is cited. Each product_references row carries a PMID or DOI that resolves;
// a dead reference fails the build. No research statement may render without at least one row:
// products with research text and zero references are reported (the site omits the section, and
// this gate makes the omission visible so the text is sourced or cut).
import { connect } from '../db/lib.mjs';

const sql = connect();
let failures = 0, checked = 0;
const fail = (m) => { failures++; console.log('  ✗', m); };

const refs = await sql`select r.id, r.pubmed_id, r.doi, r.citation, p.slug from public.product_references r join public.products p on p.id = r.product_id order by p.slug`;
const drafts = await sql`select slug from public.products p where coalesce(research_en, research_id, '') <> '' and not exists (select 1 from public.product_references r where r.product_id = p.id) and is_published`;
await sql.end();

console.log(`Gate 8: ${refs.length} reference(s) to resolve`);
const offline = process.env.AXIOM_REFS_OFFLINE === '1';
async function head(url) {
  const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'axiom-gate-8' }, signal: AbortSignal.timeout(20000) });
  return res.status;
}
for (const r of refs) {
  checked++;
  if (offline) { console.log(`  · ${r.slug}: ${r.pubmed_id ? 'PMID ' + r.pubmed_id : 'DOI ' + r.doi} (offline: not resolved)`); continue; }
  try {
    if (r.pubmed_id) {
      const res = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${encodeURIComponent(r.pubmed_id)}&retmode=json`, { signal: AbortSignal.timeout(20000) });
      const json = await res.json();
      const rec = json?.result?.[r.pubmed_id];
      if (!rec || rec.error) fail(`${r.slug}: PMID ${r.pubmed_id} does not resolve`);
      else console.log(`  ✓ ${r.slug}: PMID ${r.pubmed_id} · ${rec.title?.slice(0, 80)}`);
    } else if (r.doi) {
      const status = await head(`https://doi.org/${encodeURIComponent(r.doi)}`);
      if (status >= 400) fail(`${r.slug}: DOI ${r.doi} returns ${status}`);
      else console.log(`  ✓ ${r.slug}: DOI ${r.doi}`);
    }
  } catch (e) { fail(`${r.slug}: ${r.pubmed_id ? 'PMID ' + r.pubmed_id : 'DOI ' + r.doi} could not be checked (${e.message})`); }
}

console.log('Gate 8: research text without a reference (must not render)');
for (const d of drafts) console.log(`  · ${d.slug}: research draft held back (no reference yet)`);
if (drafts.length && process.env.AXIOM_REFS_STRICT === '1') fail(`${drafts.length} published compound(s) carry unsourced research text`);

// AXIOM_REFS_OFFLINE=1 skips the network, so it must not report the references as resolved:
// a gate that claims a check it did not run is worse than no gate.
console.log(
  failures ? `\n${failures} finding(s)`
  : offline ? `\n  · ${checked} reference(s) NOT resolved (AXIOM_REFS_OFFLINE=1); ${drafts.length} draft(s) held back — gate 8 did not run`
  : `\n  ✓ ${checked} reference(s) resolve; ${drafts.length} draft(s) held back`);
process.exit(failures ? 1 : 0);
