# CAS verification against PubChem — 25 November 2026

All 24 candidates have now been checked against **PubChem on 25 November 2026**. The run is complete; nothing is left `unchecked`.

Three things to read before using this file:

1. A PubChem cross-reference is a **registry identifier recorded by PubChem's depositors** (ChemIDplus, DrugBank, EPA DSSTox, FDA GSRS), **not a CAS Registry subscription lookup**. It is good corroborating evidence, not an authoritative CAS record. The exception is **CAS Common Chemistry**, which is CAS's own public register: four rows carry it, and those are confirmations from CAS itself.
2. The one `mismatch` row (**HCG**) must be confirmed against the supplier's CoA, and no structure may be taken from PubChem for it. Read its row before using any HCG figure.
3. Evidence comes in three grades, recorded per row in the CSV. `cross_reference` — the compound record carries a CAS cross-reference section (strongest). `substance cross_reference` — no compound record exists, but a registry depositor indexes a substance record under this very number (strong for the number, silent on structure). `synonym only` — the number appears among the record's synonyms with no cross-reference (weakest positive evidence).

## Status summary

| Status | Count | Compounds |
|---|---|---|
| verified | 23 | all but HCG |
| mismatch | 1 | HCG |
| not_found | 0 | — |
| unchecked | 0 | — |

Verified this run: **12** — Semax, Melanotan II, PT-141, AOD-9604, NAD+, Glutathione, L-Carnitine, AICAR, Thymosin alpha-1, LL-37 at compound level, plus Somatropin and Retatrutide at substance level. **No number checked in either run proved wrong.** One, HCG, proved unverifiable here.

## What the second run changed

- **Retatrutide: `not_found` → `verified`.** The first run's HTTP 404 was accurate and misleading. PubChem has no *compound* record under `2381089-83-2`, but its *substance* index does: ChemIDplus deposits SID 471328801 under source id `2381089832` — indexed by this very number — and that record also carries `Retatrutide [USAN]`, UNII `NOP2Y096GV`, `WHO 12350` and Lilly's `LY3437943`. Four further depositors list the same CAS. Querying only the compound endpoint is what produced the false negative.
- **HCG: `unchecked` → `mismatch`**, the only negative finding in the set. See below.
- **Somatropin** resolves the same way as retatrutide: no compound record, as predicted for a 191-residue biologic, but ChemIDplus indexes SID 135274454 under `0012629015`. Note that `9002-72-6` also circulates on somatropin records for growth hormone generically; `12629-01-5` is the number tied to the recombinant 191-residue form AXIOM lists.
- The prediction that LL-37, thymosin alpha-1 and AOD-9604 "may have no single small-molecule record" was **wrong**. All three have full compound records with structures.

## HCG — the one compound PubChem cannot verify

`9002-61-3` resolves to **CID 4369448**, whose structure is the ACV tripeptide, δ-(L-α-aminoadipoyl)-L-cysteinyl-glycine (C11H19N3O6S, MW 321.35). That is not a glycoprotein hormone.

The same record lists `HCG`, `CHORIONIC GONADOTROPIN HUMAN` and `Chorionic gonadotrophin` among its synonyms, and ECHA and AICIS cross-reference the CAS to it. The reading that fits: regulatory inventory entries for a substance with no single structure were merged onto an unrelated small molecule. So the **number-to-name association is corroborated** — ECHA and AICIS do use `9002-61-3` for chorionic gonadotropin — while the **structure is not**.

Searching by name is worse, not better: `chorionic gonadotropin` returns **CID 1108, "Sterone-ring" (C17H28)**, a second unrelated artifact. Treat PubChem's small-molecule index as unreliable for glycoprotein hormones, and take HCG figures from the CoA alone.

## Notes on the verified rows

- **NAD+, Glutathione, L-Carnitine, AICAR** — confirmed by **CAS Common Chemistry**, CAS's own register: the strongest evidence in the file. These four are small molecules with decades of registry history, which is why they confirm so cleanly.
- **Semax** — PubChem titles the record structurally, `ACTH (4-7), Pro-Gly-Pro-`, not "Semax". The formula C37H51N9O10S matches Met-Glu-His-Phe-Pro-Gly-Pro residue for residue, so this identification rests on the structure rather than on the name.
- **PT-141, Melanotan II, AOD-9604** — CAS cross-references including FDA GSRS or DrugBank; PT-141 titled by its INN "Bremelanotide".
- **Thymosin alpha-1** — titled by its INN "Thymalfasin". The record carries a **second number, 69521-94-4**, held by CAS Common Chemistry while the candidate is held only by depositor registries. Which is the current primary registry number cannot be settled from PubChem, so neither is marked deprecated. Resolve on the CoA.
- **LL-37** — `synonym only`, the weakest positive grade, as for tirzepatide. A separate record, CID 137699475, is the **trifluoroacetate salt** (C207H341F3N60O55, MW 4607); confirm which form ships.
- **Ipamorelin, Epithalon** (first run) — CAS cross-reference including FDA GSRS, plus a UNII.
- **Tesamorelin, Sermorelin** (first run) — both full-length single peptide records, not fragments. Sermorelin's record also lists CAS 114466-38-5 for the **acetate salt**.
- **Epithalon, DSIP** (first run) — each carries a **second active CAS** (64082-79-7 and 69431-45-4).
- **Tirzepatide** (carried over) — `synonym only`.

## Salt and form ambiguities to settle with the supplier

Five compounds have more than one number or more than one form on record, and the difference is a different substance in the vial:

| Compound | Second number or form |
|---|---|
| Sermorelin | 114466-38-5 — acetate salt |
| LL-37 | CID 137699475 — trifluoroacetate salt |
| Thymosin alpha-1 | 69521-94-4 — primacy unresolved |
| Epithalon | 64082-79-7 |
| DSIP | 69431-45-4 |

## Method

Queried `pubchem.ncbi.nlm.nih.gov/rest/pug` and `/rest/pug_view` directly over HTTPS. The first run's blocker — the egress proxy refusing `pubchem.ncbi.nlm.nih.gov`, which forced the lookups through a metered provider that ran out of credits — no longer applies: the host is reachable and the REST API needs no key, so re-running this costs nothing.

For each candidate: resolve the CAS to a CID via the name index, read `Title`/`MolecularFormula`/`MolecularWeight`/`InChIKey`, then read the record's `CAS` section through PUG-View and resolve each `ReferenceNumber` to its depositor to grade the evidence. Where the compound endpoint 404s, query the **substance** index and read the depositor and source id of each SID — that step is what recovered retatrutide and somatropin, and omitting it is what produced the first run's false negative.
