# AXIOM — Certificate of Analysis

Print-ready A4 Certificate of Analysis in the AXIOM brand system. One self-contained
HTML file, one lot per document.

- `index.html` — the certificate. Open it in a browser; **Print → Save as PDF** gives
  a single A4 page.
- `AXIOM-COA-NAD-RT20250722.pdf` — the rendered certificate for the current lot.

## Issuing a COA for a new lot

Edit the `LOT` object near the bottom of `index.html`. Nothing else needs to change —
the header, identity grid, results table, seal caption and footer all render from it.

```js
const LOT = {
  docId:      "AXM-COA-NAD-RT20250722",   // also printed in the footer
  rev:        "R0",
  issued:     "22 Jul 2025",

  product:    "β-Nicotinamide Adenine Dinucleotide",
  synonym:    "NAD+ · free acid",          // "NAD+" renders with a superscript charge
  cas:        "53-84-9",
  batch:      "RT20250722",                // also printed inside the seal
  quantity:   "1 kg",
  formula:    "C21H27N7O14P2",             // digits are auto-subscripted
  mw:         "663.42",
  mfgDate:    "02 Jul 2025",
  expDate:    "01 Jul 2027",
  reportDate: "22 Jul 2025",
  standard:   "In house",
  storage:    "…",

  testedBy:   "the manufacturer against its in-house standard",
  supplierRef:"RT20250722",

  conclusion: "…",
  tests:      [ { item, spec, result }, … ],   // any number of rows
  signatories:[ { role, name, title }, … ]     // leave `name` empty for a blank line
};
```

`testedBy` and `supplierRef` drive the **basis-of-analysis** paragraph. Keep it accurate:
where the manufacturer or a third-party lab ran the assays, the certificate must say so.
AXIOM attests to lot identity, seal integrity and cold-chain condition on receipt — not to
having performed the tests.

## Conventions

- **Doc ID** — `AXM-COA-<compound>-<batch>`, revision `R0`, `R1`, … on reissue.
- **Signatures** — printed titles sit under ruled lines. Sign and stamp by hand on issue;
  no facsimile signatures are generated.
- **Seal** — the AXIOM QA mark is drawn inline as SVG and picks up the batch and issue date
  automatically. It is AXIOM's own mark; do not substitute a supplier's seal.
- Keep the original manufacturer report on file — the certificate says it is available
  on request.

## Notes

- Fully self-contained: Inter and Inter Tight (SIL OFL 1.1, Latin / Latin-Ext / Greek and
  symbol subsets) are embedded as base64 `@font-face` data, so the sheet prints identically
  offline with no external requests. That accounts for most of the file size.
- Print CSS targets `@page A4 portrait` with 14 mm / 15 mm margins. The current lot fills
  about 258 mm of the 269 mm content box, leaving room for a few extra test rows before
  the sheet runs to a second page.
- The narrow-screen layout is scoped to `@media screen` — an unscoped width query also
  fires during PDF generation, where the page box is only ~794 px wide.
- Brand tokens mirror `brand-book/index.html`; the wordmark paths come from
  `business-proposal/assets/logo/axiom-wordmark-white.svg`, recoloured with `currentColor`.

To regenerate the PDF headlessly:

```sh
chromium --headless --print-to-pdf=AXIOM-COA-<compound>-<batch>.pdf \
         --no-pdf-header-footer file://$PWD/index.html
```
