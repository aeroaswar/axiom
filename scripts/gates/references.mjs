// Gate 8 — every claim is cited. Each product_references row carries a PMID or DOI that resolves;
// a dead reference fails the build. No research statement may render without at least one row:
// products with research text and zero references are reported (the site omits the section, and
// this gate makes the omission visible so the text is sourced or cut).
//
// PMIDs are resolved in batches. esummary takes a comma-separated id list, and NCBI asks for no
// more than three requests a second without an API key: one request per reference breaks that as
// soon as the catalogue carries a few hundred, and a throttled reply has no `result`, so every
// row reads as "does not resolve". Batching turns 519 requests into six and keeps the assertion
// identical — a PMID PubMed does not return still fails the build.
//
// Two more checks ride on the same data:
//   8b  The compound guide and the catalogue name every compound the same way. The guide's QR
//       cards, the shop and the references all key on the slug; if they drift, nothing joins.
//   8c  A compound the guide calls lab-only must not cite a clinical trial of itself. Five
//       products once did — ipamorelin, DSIP, Epithalon, Melanotan II and LL-37 — each citing
//       its own trials in this table while the guide said "lab and animal work only". The
//       evidence was on file; nothing compared it. PubMed's publication type does.
//
// Behind an HTTP proxy, Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY=1 is set.
import { connect } from '../db/lib.mjs';
import fs from 'node:fs';
import vm from 'node:vm';

const sql = connect();
let failures = 0, checked = 0;
const fail = (m) => { failures++; console.log('  ✗', m); };

const refs = await sql`select r.id, r.pubmed_id, r.doi, r.citation, r.claim_key, p.slug from public.product_references r join public.products p on p.id = r.product_id order by p.slug`;
const catalogue = (await sql`select slug from public.products where kind = 'peptide'`).map(r => r.slug);
const drafts = await sql`select slug from public.products p where coalesce(research_en, research_id, '') <> '' and not exists (select 1 from public.product_references r where r.product_id = p.id) and is_published`;
await sql.end();

console.log(`Gate 8: ${refs.length} reference(s) to resolve`);
const offline = process.env.AXIOM_REFS_OFFLINE === '1';

const BATCH = 100;          // esummary id limit is far higher; 100 keeps each reply small
const GAP_MS = 400;         // under NCBI's 3 requests a second
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function head(url) {
  const res = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'axiom-gate-8' }, signal: AbortSignal.timeout(20000) });
  return res.status;
}

// One esummary call for up to BATCH ids, retried once. Throws rather than returning an empty map:
// a batch that could not be fetched is an unchecked batch, and this gate never passes unchecked.
async function esummary(ids) {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`;
  let last;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'axiom-gate-8' }, signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json?.result) throw new Error('no result object in the reply');
      return json.result;
    } catch (e) {
      last = e;
      if (attempt < 3) await sleep(attempt * 2000);   // a throttle clears with a pause
    }
  }
  throw last;
}

/** pmid -> esummary record, for every distinct PMID in the catalogue. */
async function resolveAll(pmids) {
  const out = new Map();
  for (let i = 0; i < pmids.length; i += BATCH) {
    const chunk = pmids.slice(i, i + BATCH);
    const result = await esummary(chunk);
    for (const id of chunk) out.set(id, result[id]);
    if (i + BATCH < pmids.length) await sleep(GAP_MS);
  }
  return out;
}

let records = new Map();
if (!offline) {
  const pmids = [...new Set(refs.filter(r => r.pubmed_id).map(r => String(r.pubmed_id)))];
  if (pmids.length) {
    console.log(`  · resolving ${pmids.length} distinct PMID(s) in ${Math.ceil(pmids.length / BATCH)} batch(es)`);
    try {
      records = await resolveAll(pmids);
    } catch (e) {
      // Reaching PubMed is part of the check. Say so and fail, rather than report them resolved.
      fail(`PubMed could not be reached, so no PMID was checked (${e.message})`);
      console.log('\n1 finding(s)');
      process.exit(1);
    }
  }
}

for (const r of refs) {
  checked++;
  if (offline) { console.log(`  · ${r.slug}: ${r.pubmed_id ? 'PMID ' + r.pubmed_id : 'DOI ' + r.doi} (offline: not resolved)`); continue; }
  try {
    if (r.pubmed_id) {
      const rec = records.get(String(r.pubmed_id));
      if (!rec || rec.error) fail(`${r.slug}: PMID ${r.pubmed_id} does not resolve`);
      else console.log(`  ✓ ${r.slug}: PMID ${r.pubmed_id} · ${rec.title?.slice(0, 80)}`);
    } else if (r.doi) {
      await sleep(GAP_MS);
      const status = await head(`https://doi.org/${encodeURIComponent(r.doi)}`);
      if (status >= 400) fail(`${r.slug}: DOI ${r.doi} returns ${status}`);
      else console.log(`  ✓ ${r.slug}: DOI ${r.doi}`);
    }
  } catch (e) { fail(`${r.slug}: ${r.pubmed_id ? 'PMID ' + r.pubmed_id : 'DOI ' + r.doi} could not be checked (${e.message})`); }
}

/* ---- 8b: one slug per compound, in the guide and the catalogue alike ---- */
function loadGuide() {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(new URL('../../dosage-guide/compounds.js', import.meta.url), 'utf8'), ctx);
  return ctx.window.COMPOUNDS || ctx.COMPOUNDS;
}
const guide = loadGuide();
const guideSlugs = new Set(guide.map(c => c.slug)), catSlugs = new Set(catalogue);
console.log(`Gate 8b: guide and catalogue share every slug (${guideSlugs.size} guide, ${catSlugs.size} catalogue)`);
const onlyGuide = [...guideSlugs].filter(s => !catSlugs.has(s)), onlyCat = [...catSlugs].filter(s => !guideSlugs.has(s));
if (onlyGuide.length) fail(`in the guide but not the catalogue: ${onlyGuide.join(', ')}`);
if (onlyCat.length) fail(`in the catalogue but not the guide: ${onlyCat.join(', ')}`);
if (!onlyGuide.length && !onlyCat.length) console.log(`  ✓ all ${catSlugs.size} match`);

/* ---- 8c: a lab-only compound cites no clinical trial of itself ---- */
const TRIAL_TYPES = new Set(['Clinical Trial', 'Randomized Controlled Trial', 'Controlled Clinical Trial',
  'Clinical Trial, Phase I', 'Clinical Trial, Phase II', 'Clinical Trial, Phase III', 'Clinical Trial, Phase IV',
  'Pragmatic Clinical Trial', 'Equivalence Trial', 'Adaptive Clinical Trial']);
/* A cited trial that is not a trial OF this product. Keyed by PMID, never by product, so a later trial
   of the product itself is still caught; each entry says why. An entry that no longer matches a cited
   trial on a lab-only product fails the gate, so this list cannot go stale and quietly hide anything. */
const NOT_A_TRIAL_OF_THIS_PRODUCT = {
  'tb-500': { why: 'trials of full-length thymosin beta-4; TB-500 is the acetylated 17-23 fragment, which has not been trialled',
              pmids: ['20536472', '20536470', '17495250', '25826322', '36613994', '34346165'] },
  'humanin': { why: "the trial measured the body's own humanin after exercise; no participant was given humanin",
               pmids: ['41249265'] },
};
const tier = Object.fromEntries(guide.map(c => [c.slug, c.evidence]));
if (offline) console.log('Gate 8c: NOT RUN (AXIOM_REFS_OFFLINE=1) — publication types come from PubMed');
else {
  console.log('Gate 8c: no lab-only compound cites a clinical trial of itself');
  const used = new Set(), bad = {};
  for (const r of refs) {
    if (!r.pubmed_id || tier[r.slug] !== 'preclinical') continue;
    // A blend cites its components' papers under the component's slug; the combination itself is untested.
    const from = (r.claim_key || '').split(' · ')[0];
    if (from !== r.slug && catSlugs.has(from)) continue;
    const types = (records.get(String(r.pubmed_id)) || {}).pubtype || [];
    if (!types.some(t => TRIAL_TYPES.has(t))) continue;
    const ack = NOT_A_TRIAL_OF_THIS_PRODUCT[r.slug];
    if (ack && ack.pmids.includes(String(r.pubmed_id))) { used.add(r.slug + ':' + r.pubmed_id); continue; }
    (bad[r.slug] ||= []).push(String(r.pubmed_id));
  }
  for (const [slug, pmids] of Object.entries(bad))
    fail(`${slug}: the guide says lab-only, but it cites ${pmids.length} clinical trial(s) of itself (PMID ${pmids.join(', ')}). ` +
         'Correct its tier in dosage-guide/src, or, if a trial is not of this product, list the PMID in NOT_A_TRIAL_OF_THIS_PRODUCT with the reason.');
  for (const [slug, a] of Object.entries(NOT_A_TRIAL_OF_THIS_PRODUCT))
    for (const pmid of a.pmids)
      if (!used.has(slug + ':' + pmid))
        fail(`NOT_A_TRIAL_OF_THIS_PRODUCT lists ${slug} PMID ${pmid}, which is no longer a cited trial on a lab-only product — remove it`);
  if (!Object.keys(bad).length)
    console.log(`  ✓ ${Object.values(tier).filter(t => t === 'preclinical').length} lab-only compounds checked; ${used.size} cited trial(s) acknowledged as not of the product itself`);
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
