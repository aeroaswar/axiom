# CAS verification against PubChem — 25–26 November 2026

Identity checks for the AXIOM catalogue, run against **PubChem**. The first pass covered 24 candidate
CAS numbers the catalogue already held. The second went after the compounds that had no candidate at
all, looking them up by name and, where the name failed, by peptide sequence. **46 compounds are now
on record.**

Four things to read before using this file:

1. A PubChem cross-reference is a **registry identifier recorded by PubChem's depositors** (ChemIDplus,
   DrugBank, EPA DSSTox, FDA GSRS), **not a CAS Registry subscription lookup**. The exception is
   **CAS Common Chemistry**, which is CAS's own public register: seven rows carry it, and those are
   confirmations from CAS itself.
2. **Two rows are `mismatch` — HCG and Cardiogen.** Both are commercial name collisions in PubChem's
   index. Read their rows before using any figure for those compounds, and take nothing but the CoA.
3. **`AHK-Cu` carries the free tripeptide's number, not the copper complex's.** The weight on that row
   must not reach an AHK-Cu label.
4. Evidence comes in four grades, recorded per row. `cross_reference` — the compound record carries a
   CAS cross-reference section (strongest). `substance cross_reference` — no compound record, but a
   registry depositor indexes a substance under this very number. `synonym only` — the number appears
   among synonyms with no cross-reference. `structure only` — a titled record with a confirmed
   structure but no CAS anywhere.

## Status summary

| Status | Count | Meaning |
|---|---|---|
| verified | 38 | A registry depositor ties this number to this compound |
| structure only | 6 | Structure confirmed, no CAS number found anywhere |
| mismatch | 2 | The name resolves to a different compound — HCG, Cardiogen |
| not_found / unchecked | 0 | — |

Verified across both runs: **38**. **No number checked in either run proved wrong.** Two names proved
unusable, and six compounds have a confirmed structure but no registry number.

### Structures confirmed by computation, not by trusting the title

Six peptides were checked by computing the formula from the sequence the catalogue states and comparing
it with PubChem's. All six match exactly, so those identifications do not rest on a name:

| Compound | Sequence | Formula |
|---|---|---|
| Bronchogen | Ala-Glu-Asp-Leu | C18H30N4O9 |
| Cortagen | Ala-Glu-Asp-Pro | C17H26N4O9 |
| Livagen | Lys-Glu-Asp-Ala | C18H31N5O9 |
| Prostamax | Lys-Glu-Asp-Pro | C20H33N5O9 |
| Pinealon | Glu-Asp-Arg | C15H26N6O8 |
| TB-500 | Ac-Leu-Lys-Lys-Thr-Glu-Thr-Gln | C38H68N10O14 |

The same method settled **Cartalax**. Its record is the tripeptide **Ala-Glu-Asp** (C12H19N3O8); the
Ala-Glu-Asp-Pro the product text claimed computes to C17H26N4O9, which is **Cortagen**. The two had been
conflated. The product text has been corrected.

## Cardiogen — the second name collision

Searching PubChem for `cardiogen` returns **CID 10917, (−)-carnitine**, CAS 541-15-1 — a commercial name
collision, not the Khavinson tetrapeptide. Searching the sequence Ala-Glu-Asp-Arg returns no record at
all. So no CAS is recorded for this product and **the sequence itself is unconfirmed**. This is the same
failure mode as HCG: PubChem's name index is unreliable wherever a trade name is shared with an
unrelated substance.

Four other bioregulators — Chonluten, Crystagen, Ovagen, Pancragen, Testagen, Vesugen — were searched by
sequence. Records exist for some of those sequences, but **none carries the trade name among its
synonyms**, so nothing was recorded for them. A sequence record that does not name the product is not
evidence about the product.

## What the second run changed

- **Retatrutide: `not_found` → `verified`.** The first run's HTTP 404 was accurate and misleading. PubChem has no *compound* record under `2381089-83-2`, but its *substance* index does: ChemIDplus deposits SID 471328801 under source id `2381089832` — indexed by this very number — and that record also carries `Retatrutide [USAN]`, UNII `NOP2Y096GV`, `WHO 12350` and Lilly's `LY3437943`. Four further depositors list the same CAS. Querying only the compound endpoint is what produced the false negative.
- **HCG: `unchecked` → `mismatch`**, the only negative finding in the set. See below.
- **Somatropin** resolves the same way as retatrutide: no compound record, as predicted for a 191-residue biologic, but ChemIDplus indexes SID 135274454 under `0012629015`. Note that `9002-72-6` also circulates on somatropin records for growth hormone generically; `12629-01-5` is the number tied to the recombinant 191-residue form AXIOM lists.
- The prediction that LL-37, thymosin alpha-1 and AOD-9604 "may have no single small-molecule record" was **wrong**. All three have full compound records with structures.

## HCG — a name PubChem cannot verify

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

Eight compounds have more than one number or more than one form on record, and the difference is a different substance in the vial:

| Compound | Second number or form |
|---|---|
| Sermorelin | 114466-38-5 — acetate salt |
| LL-37 | CID 137699475 — trifluoroacetate salt |
| Thymosin alpha-1 | 69521-94-4 — primacy unresolved |
| Epithalon | 64082-79-7 |
| DSIP | 69431-45-4 |
| AHK-Cu | 126828-32-8 is the **free tripeptide**; the copper complex is a different substance |
| 5-Amino-1MQ | the record is the **cation**; the shipped salt carries its own number and weight |
| CJC-1295 | 446262-90-4 is the **DAC** form; the no-DAC SKU is a different substance |

## Method

Queried `pubchem.ncbi.nlm.nih.gov/rest/pug` and `/rest/pug_view` directly over HTTPS. The first run's blocker — the egress proxy refusing `pubchem.ncbi.nlm.nih.gov`, which forced the lookups through a metered provider that ran out of credits — no longer applies: the host is reachable and the REST API needs no key, so re-running this costs nothing.

Second run, for compounds with no candidate number: resolve the **name** to a CID; where that failed, resolve the **peptide sequence**, and accept the hit only when the record carries the product's trade name among its synonyms — that rule is what rejected Chonluten, Crystagen and Vesugen, whose sequence records exist but name no product. Where a structure came back, the formula was **recomputed from the sequence** and compared, so six identifications rest on chemistry rather than on a title.

First run, for each candidate already held: resolve the CAS to a CID via the name index, read `Title`/`MolecularFormula`/`MolecularWeight`/`InChIKey`, then read the record's `CAS` section through PUG-View and resolve each `ReferenceNumber` to its depositor to grade the evidence. Where the compound endpoint 404s, query the **substance** index and read the depositor and source id of each SID — that step is what recovered retatrutide and somatropin, and omitting it is what produced the first run's false negative.
