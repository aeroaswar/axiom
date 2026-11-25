# CAS verification against PubChem — 25 November 2026

These candidates were checked against **PubChem on 25 November 2026**.

Three things to read before using this file:

1. A PubChem cross-reference is a **registry identifier recorded by PubChem's depositors** (ChemIDplus, DrugBank, EPA DSSTox, FDA GSRS), **not a CAS Registry subscription lookup**. It is good corroborating evidence, not an authoritative CAS record.
2. Any compound marked `mismatch`, `not_found` or `unchecked` **must still be confirmed against the supplier's CoA before use**.
3. **The run did not finish.** The PubChem provider's credit balance was exhausted after the first batch, and direct access to `pubchem.ncbi.nlm.nih.gov` is blocked by this environment's egress proxy. **12 of the 19 candidates were never checked** and are marked `unchecked` — that is *unknown*, not *absent* and not *verified*. Do not promote an `unchecked` row to the Compound guide.

## Status summary

| Status | Count | Compounds |
|---|---|---|
| verified | 11 | Selank, Epithalon, Ipamorelin, Tesamorelin, Sermorelin, DSIP + the 5 already confirmed (tirzepatide, BPC-157, oxytocin, GHK-Cu, SS-31) |
| not_found | 1 | Retatrutide |
| unchecked | 12 | Semax, Melanotan II, PT-141, AOD-9604, NAD+, Glutathione, L-Carnitine, AICAR, Thymosin alpha-1, LL-37, Somatropin, HCG |
| mismatch | 0 | — |

Verified this run: 6. Nothing checked this run proved wrong.

## Notes on the verified rows

- **Ipamorelin, Epithalon** — strongest evidence: a CAS cross-reference including FDA GSRS, plus a UNII.
- **Tesamorelin, Sermorelin** — both resolve to full-length single peptide records, not fragments. Sermorelin's record also lists CAS 114466-38-5 for the **acetate salt**; confirm which form the supplier ships.
- **Epithalon, DSIP** — PubChem titles these "Epitalon" and "Delta Sleep-Inducing Peptide" respectively, and each record carries a **second active CAS** (64082-79-7 and 69431-45-4). Deprecated CAS numbers are recorded in the CSV.
- **Tirzepatide** (carried over) rests on a **synonym match only** — the weakest positive evidence in this set.

## Retatrutide

PubChem returned HTTP 404 for `2381089-83-2`: nothing is indexed under that number. This shows the candidate resolves to nothing; it does **not** prove the number is wrong. The confirmatory lookup by name could not be run. Confirm against the CoA.

## To finish the job

Restore the provider credits (or allow `pubchem.ncbi.nlm.nih.gov` through the proxy), then re-run the 12 `unchecked` rows. Expect somatropin, HCG, LL-37, thymosin alpha-1 and AOD-9604 to resolve poorly or not at all: as large peptides and biologics they may have no single small-molecule record.
