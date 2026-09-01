# AXIOM — Certificate of Analysis

Print-ready A4 Certificate of Analysis in the AXIOM brand system. One self-contained
HTML file, one lot per document.

- `builder/index.html` — **the COA builder.** Fill in the lot, sign it on screen, print
  it. Start here.
- `index.html` — the plain certificate, driven by a `LOT` object in the file. Kept as
  the reference sheet and as a template you can hand-edit without the tool.
- `AXIOM-COA-NAD-RT20250722.pdf` — the rendered certificate for the current lot.

## The builder

Open `builder/index.html`. A rail on the left edits the lot; the A4 sheet on the right is
the certificate itself, live. **Print / PDF** gives one A4 page.

- **Read a report** (published artifact only) — paste the manufacturer's COA text, or add a
  photo or screenshot of it, and Claude proposes the fields. It never writes to the
  certificate: the answer lands in a review panel showing *old value → proposed value* with a
  checkbox per field, and only **Apply** moves the ticked ones across. Anything the model
  cannot read with certainty comes back empty and is listed as *not found — fill in by hand*
  rather than guessed, and specifications are copied verbatim so the `≥ ≤ < >` glyphs the
  verdict logic parses survive. A banner stays up until you confirm you have checked the
  values against the report. The section is hidden when the file is opened from disk, where
  the capability does not exist — everything else still works there.
- **The record lifecycle** — a lot is a **draft** until you press Issue. A draft prints with a
  diagonal *Draft — not issued* watermark, so it can never be mistaken for a certificate. On
  Issue the lot is frozen (every field, row and pad goes read-only), stamped with a SHA-256
  fingerprint, and written to the register. To change an issued lot you **Revise** it, which
  opens R+1 as a fresh draft and marks the previous revision *superseded* once the new one is
  issued. **Void** withdraws a certificate with a reason and keeps the entry — a register does
  not lose rows.
- **Nothing blocks issuing.** A failing row, an unsigned release block, a missing date or an
  empty batch all raise warnings you can click straight past — and what you overrode is stored
  on the register entry, so the record shows the lot went out with a failing row.
- **Fingerprint** — the first 12 hex characters of a SHA-256 over the record print in the
  footer (`A3F2 9C41 77B0`), so a PDF someone shows you can be checked against the register.
  Where the browser has no SHA-256 (Firefox on a `file://` page) it is omitted rather than
  replaced with something weaker.
- **Register** — every issued record, searchable by lot, batch or order reference, filterable
  by status. Log a **Shipment** against a record (order ref, quantity, date) and the search
  becomes a recall path: type an order reference, get the lot. In the published builder the
  register lives in the cloud and follows you across devices; opened from disk it falls back
  to this-device storage and says so. **Export register** is the backup and the bridge between
  the two.
- **Signatures** — draw on the pad with a mouse, trackpad or finger, or upload a photo of
  a signature (the paper is dropped and the ink kept). The signature sits on the ruled
  line. Sign for AXIOM's own people only: never draw or upload someone else's signature,
  or a supplier's stamp.
- **Verdicts** work themselves out from the specification where one can be parsed
  (`≥ ≤ < >` or a range) — numbers only, units are not checked — and any row can be
  overridden. One failing row turns the header chip and the conclusion block red.
- **Page fit** is shown live in the preview bar (`259 / 269 mm`), so a lot with too many
  rows is caught before the print dialog.
- **Test panels** seed the specification column for a peptide (HPLC/MS) or small-molecule
  lot. They carry no compound identity — no CAS numbers, no molecular weights. Those come
  off the source report, never from a guess in the tool.
- **Export sheet** writes a standalone, self-contained HTML certificate; **JSON** writes
  the lot record; **Import** reads either back (the exported sheet carries its own JSON).
- **Saved lots** and the working draft live in `localStorage` on that one device. Nothing
  is synced and nothing reaches Claude. Use JSON to move a lot between machines or to
  keep an issued record in this repo.

## Issuing a COA by hand

If you would rather not use the builder, edit the `LOT` object near the bottom of
`index.html`. Nothing else needs to change — the header, identity grid, results table,
seal caption and footer all render from it.

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
