# AXIOM vial sticker — design specification

**20 × 40 mm wrap label** for pen-format research peptides. Retatrutide 30 mg is the worked
example; the label is data-driven, so the rest of the catalogue drops in without redrawing.

| File | What it renders |
|---|---|
| `index.html` | Design proof — the label at 5× and 1:1, corner-radius options, spec table, production notes. Google Fonts. |
| `axiom-vial-stickers-print.html` | Production A4 gang sheet, 48 slots — currently the Retatrutide range at 10 / 20 / 30 / 40 / 60 mg. Fonts embedded base64, self-contained for a vendor. Print → Save as PDF. |
| `design.md` | This document. |

Geometry is declared in millimetres throughout, so the rendered PDF is dimensionally exact
rather than approximately right.

---

## 1. Die and safe area

| | |
|---|---|
| Die | **40 × 20 mm**, landscape |
| Corner radius | **2 mm** (`--r`; the proof page shows 1 / 1.5 / 2 / 2.5 mm to choose from off a test print) |
| Inset | 1.6 mm on all four sides (`--pad-x`, `--pad-y`) |
| Safe area | **36.8 × 16.8 mm** — nothing may cross this |

---

## 2. Colour

Four tokens, taken verbatim from the canonical `:root` block in
`../business-proposal/axiom-business-master-prompt.md` §9 (identical to the `:root` block in
`../src/app/globals.css:9-11`).

| Role | Token | Hex |
|---|---|---|
| Ground | `--bg` | `#070605` |
| Ink | `--ink` | `#F2EDE5` |
| Secondary ink | `--muted` | `#9C9488` |
| Accent | `--accent` | `#C88A4E` |

**Bronze budget.** Master prompt §7 caps bronze at ≤ 8 % of any surface. Here it is two
0.2 × 36.8 mm rules plus the `HIGH PURITY` line — roughly **1.8 %** of the 800 mm² face. Well
inside the ceiling, and deliberately so: bronze is earned emphasis, not decoration.

`RESEARCH USE ONLY` is set in `--muted`, not the dimmer `--muted-2`. At 4.0 pt on a black
ground the darker grey does not survive printing.

---

## 3. Typography

**Jost** 400 for the compound (display), **Inter** 400–500 for everything else. The print sheet
carries both as base64 `@font-face` blocks lifted from
`../business-proposal/axiom-pricelist-print.html:4-59` — already in the repo, already proven in
a print pipeline, no new dependency and no network fetch at the vendor.

Sizes are given in mm (what the CSS declares) and pt (what a printer will ask for); 1 mm = 2.8346 pt.

| Element | Size | Weight / colour | Tracking |
|---|---|---|---|
| Wordmark | 9 mm wide, vector | `currentColor` → `--ink` | — |
| `HIGH PURITY` | 1.5 mm · 4.3 pt | Inter 500, `--accent` | `.14em` |
| Hairlines | 0.2 mm · 0.57 pt | solid `--accent` | — |
| `RETATRUTIDE` | 3.9 mm · 11.1 pt | Jost 400, `--ink` | `.05em` |
| `QTY` / `DOSE` keys | 1.5 mm · 4.3 pt | Inter 400, `--muted` | `.14em` |
| QTY value | 2.0 mm · 5.7 pt | Inter 500, `--ink` | `.01em` |
| DOSE value | 1.8 mm · 5.1 pt | Inter 500, `--ink` | `.01em` |
| `RESEARCH USE ONLY` | 1.4 mm · 4.0 pt | Inter 400, `--muted` | `.10em` |

Two details that are easy to lose in a rebuild:

- The keys carry **`min-width: 3.4em`**. That is what puts `30 mg` and `10 clicks = 1 mg` on a
  shared left edge instead of ragging off the ends of `QTY` and `DOSE`.
- Every numeral runs `font-variant-numeric: tabular-nums; font-feature-settings:"tnum" 1`, per
  the brand rule that all figures are tabular.

**Units are spaced** — `30 mg`, `1 mg` — per master prompt §9. This normalises the original
brief's `30mg` / `1mg`.

The whole label sits on `print-color-adjust: exact`, or browsers drop the black ground when
printing.

---

## 4. Layout

Five bands stacked inside the 36.8 × 16.8 mm safe area, split by two hairlines:

```
┌────────────────────────────────────────┐
│                                        │
│   AXIOM                  HIGH PURITY   │  A — brand bar
│   ──────────────────────────────────   │      bronze hairline
│   RETATRUTIDE                          │  B — hero
│   QTY    30 mg                         │  C
│   DOSE   10 clicks = 1 mg              │  D — omitted when dose is null
│   ──────────────────────────────────   │      bronze hairline
│   RESEARCH USE ONLY                    │  E — compliance
│                                        │
└────────────────────────────────────────┘
```

The stack is `flex-direction: column; justify-content: center`, so it stays optically centred
whether or not band D is present. Vertical rhythm, as shipped:

| Gap | Value |
|---|---|
| `.lbl__rule--top` margin | `1.1 mm` above / `1.3 mm` below |
| `.lbl__band--c` margin-top | `0.9 mm` |
| `.lbl__band--d` margin-top | `0.45 mm` |
| `.lbl__rule--bot` margin | `1.2 mm` above / `0.9 mm` below |

Band A is `align-items: center` (wordmark against cap-height text); the rest are
`align-items: baseline` so keys and values sit on a shared baseline.

### The hairlines

**Both rules are solid `#C88A4E` at full strength.** No gradient, no grey.

This is worth stating because the first cut got it wrong: the top rule was a gradient fading
bronze → 34 % bronze → 22 % white, and the bottom rule was a flat 12 % white. The two did not
match, and across a 48-up sheet the mismatch was the first thing the eye caught. If you find
yourself reaching for a gradient here, don't.

### The wordmark

Inlined as an SVG path from `../business-proposal/assets/logo/axiom-wordmark-white.svg`
(`viewBox="0 0 582 70"`, 586 bytes — the clean redraw from PR #24) with `fill="currentColor"` so it
inherits `--ink`. Inlining keeps it true vector at 9 mm, keeps each HTML file self-contained, and
avoids the per-directory asset duplication seen across `../company-profile/assets/` and `../business-proposal/assets/`.

---

## 5. Autofit

Each band declares `font-size: calc(1mm * var(--k, 1))` and sizes its children in `em`. One
variable therefore scales **size and tracking together** — which is the point: shrinking
font-size alone leaves the letter-spacing proportionally too wide and the type falls apart.

`autofit()` walks each band, and while it overflows its measure, steps `--k` down by `0.02` to a
floor of **`0.48`**, warning to the console if it still does not fit.

Measured in `builder.html` against the longest names in the 79-compound catalogue (the same in
A4 and thermal mode):

| Compound | `--k` |
|---|---|
| `Retatrutide` | `1` (no shrink) |
| `Ipamorelin + Tesamorelin` | `0.64` |
| `BPC-157 + TB-500 (Wolverine)` | `0.60` |
| `CJC-1295 (No DAC) + Ipamorelin` | `0.54` |
| `VIP (Vasoactive Intestinal Peptide)` | `0.48` — the longest; cap height 1.31 mm |

The floor was originally `0.74`, then `0.55`; each time a longer name crossed the die line.
`VIP (Vasoactive Intestinal Peptide)` needs `0.49`. If names get longer again, lower the floor
rather than widening the label.

---

## 6. Data

Both files share one `LABELS` array:

```js
{ compound: "Retatrutide",        // hero line, uppercased by CSS
  qty:      "30 mg",              // QTY value — units spaced
  dose:     "10 clicks = 1 mg",   // DOSE value, or null
  note:     "HIGH PURITY",        // bronze mark, top right
  copies:   8 }                   // how many to place on the sheet
```

The sheet as shipped carries the **Retatrutide range** — 10 / 20 / 30 / 40 / 60 mg, 8 of each,
40 labels in five two-row blocks. Keeping `copies` a multiple of 4 keeps every strength on whole
rows, so a cut sheet stays sorted. Set one SKU to `copies: 48` for a full single-strength sheet.

All five strengths are real SKUs. The catalogue — `../supabase/seed.sql`, the only file in the
repository permitted to carry a price, a name or a dose — lists Retatrutide as `reta10`, `reta20`,
`reta30`, `reta40` and `reta60`, so the sheet matches it exactly.

### The click conversion

Every strength in the current range carries **`10 clicks = 1 mg`**. That is not a coincidence of
the numbers and it is not derived from the mg figure — it holds because the whole range is
reconstituted to the same concentration, so the mg delivered per click is constant and only the
number of doses per pen changes with strength.

**`dose` is therefore never inferred from `qty`.** If a strength is ever filled to a different
concentration, its conversion changes and must be set here explicitly. Two models are possible
and they disagree sharply — under a same-total-volume pen the 60 mg would read `10 clicks = 2 mg`
and the 10 mg `10 clicks = 0.33 mg` — so the value always comes from whoever fills the pens,
never from arithmetic on this end. A SKU whose conversion has not been supplied carries
`dose: null`, and band D is dropped entirely rather than printed with a guess.

---

## 7. Print sheet

```css
@page { size: A4 portrait; margin: 8mm; }
```

A4 is 210 × 297 mm; less an 8 mm margin, the usable area is 194 × 281 mm.

| | |
|---|---|
| Grid | **4 columns × 12 rows = 48 slots** (40 placed by the current range) |
| Column pitch | 44 mm (40 mm label + 4 mm gutter) → 172 mm of 194 |
| Row pitch | 23 mm (20 mm label + 3 mm gutter) → 273 mm of 281 |
| Sheet ground | `#fff` — it is white stock, the labels are the ink, so the screen preview matches the press |
| Cut guides | `rgba(0, 0, 0, .38)` at 0.1 mm, centred on each die edge and extending into the gutter |

The guides are **dark on purpose**. An earlier cut drew them in bone white, which is invisible
against a white gutter — they existed only on screen. If you restyle them, keep them dark.

Set `--gutter-x` and `--gutter-y` to `0` for a kiss-cut / die-cut vendor file; the guides hide
themselves when the gutters close.

A screen-only header strip states sheet size, label size, pitch, count and the stock note. It is
`display: none` under `@media print`.

---

## 7b. Sending it to a print shop

`builder.html` has a **Die lines for vendor** toggle. With it on, each page carries:

| | |
|---|---|
| Cut contour | The real 40 × 20 mm trim with the 2 mm radius, 0.09 mm (~0.25 pt) in 100% magenta — the usual CutContour convention. Ask the vendor to use it as the cut path and not print it. |
| Bleed | 1 mm of the onyx ground past the trim on all four sides, so a slight cut variance never leaves a white edge. |
| Spec line | Printed at the foot of every page: size, radius, bleed, what the magenta means, density and page number. |

Turning it on also drops the alignment guides — the contour replaces them.

**Producing the PDF.** The builder is HTML; the PDF comes from the browser.
Open `builder.html` (or the published builder in its own tab, not embedded — a
sandboxed iframe blocks printing), then Print with **Destination: Save as PDF ·
Paper: A4 · Scale: 100% · Margins: None · Background graphics: ON**. Background
graphics is the one that matters: without it the onyx ground drops out and the
labels print as white boxes.

**Two things to tell the vendor.** The PDF is RGB — the bronze `#C88A4E` will
shift on a CMYK press, so ask for a match to a printed swatch, or give them
Pantone 7502 C from `../brand-book/index.html:2162-2181`. And the die is a
rounded rectangle, 40 × 20 mm, 2 mm corner radius — worth stating in writing as
well as drawing, since a new die is cut from the spec, not traced off a PDF.

---

## 7c. Thermal roll

`builder.html` has a second output, **Thermal roll · 40 × 20**, for printing in-house on a
thermal-transfer label printer. Same layout, same autofit, same data; three things change.

**One colour.** A thermal head is 1-bit: a dot is black or it is not. Every tone is therefore
solid black on white stock — `--bg #fff`, and `--ink`, `--muted` and `--accent` all `#000`. A
grey would print as a dither pattern. The hierarchy the greys carried moves to weight instead:

| Element | A4 | Thermal |
|---|---|---|
| `QTY` / `DOSE` keys, `RESEARCH USE ONLY` | Inter 400, `--muted` | Inter 500, black |
| Values, `HIGH PURITY` | Inter 500 | Inter 600 |
| Compound | Jost 400 | Jost 400 — at 500 the longest name no longer fits at the autofit floor |
| Wordmark | `--ink` | black |

No bronze and no onyx ground: this is the working label, not the brand-book stock in §8.

**Hairlines are exactly 3 dots.** At 300 dpi a dot is 0.0847 mm. Both rules are drawn as an SVG
rect 0.254 mm tall (3 dots). A CSS border or background cannot do this: Chromium snaps both to a
whole CSS pixel (0.2646 mm = 3.125 dots) and snaps their position too, so one rule landed on 3 dot
rows and the other on 4. SVG geometry is not snapped. The rect is also nudged down 0.005 mm so
neither edge sits exactly on a dot centre, where the driver's rounding would decide. Measured
from the PDF across every catalogue name with and without the DOSE row (158 labels, 316 rules):
every rule covers **3 rows at 300 dpi**, and a uniform 2 rows at 203 dpi. The rules print with
*Background graphics* off.

**One label per page.** `@page` becomes `40mm 20mm`, margin 0, and each label is its own page, so
the driver feeds one label per page and uses the gap sensor to register the next. The PDF page
box measures 39.9 × 20.1 mm: Chromium rounds the page to whole CSS pixels, the same way A4 comes
out at 209.9 mm. The 0.1 mm lands in the gap between labels.

**The printer.**

- **Thermal transfer, not direct thermal.** Direct thermal (no ribbon) fades in light and heat
  and smears under an alcohol swab, which is how a vial gets handled.
- **300 dpi.** At 203 dpi the rules still print evenly (2 dots), but the 4 pt micro-print gets
  ragged and the wordmark's notched X loses its shape.
- **Resin ribbon on synthetic stock** (PP or PET), 40 × 20 mm die-cut on the roll. Wax ribbon on
  paper will not survive handling or refrigeration.
- In the driver, set the stock to 40 × 20 mm with gap sensing. In the print dialog: Paper 40 × 20
  mm, Scale 100%, Margins None.

Print one label first and check `RESEARCH USE ONLY`. If it breaks up, raise the darkness (heat) a
step rather than slowing the print speed.

---

## 8. Production notes

The brand book (`../brand-book/index.html:2521-2589`, *07.2 — Label & Packaging Specifications*)
specifies this label as:

| | |
|---|---|
| Material | Matte black polypropylene, water-resistant |
| Ink | Cold-foil bone white letterpress print |
| Finish | Soft-touch matte lamination |
| Security | Holographic tamper-evident seal |
| Batch format | `AX-YYYY-NNNN` (e.g. `AX-2026-0142`) |

Three things to settle before a run:

1. **Stock.** The sheet renders the ground as a solid ink flood so it can be proofed on white
   paper. That is heavy and unreliable on an office inkjet, and it is not what the brand book
   specifies. For production, print on black stock with white foil, or hand the vendor the PDF
   and let them.
2. **Micro-print.** `RESEARCH USE ONLY` sets at 4.0 pt. Normal for pharma micro-print, but it is
   the one line that must be checked on a real proof. If the press cannot hold it, raise
   `.lbl__ruo` to 1.6 mm and drop the compound to 3.6 mm to make room.
3. **Batch and QR.** Neither is on the label today. The brand book puts the QR on the outer box
   at 18 × 18 mm minimum, which will not fit a 20 × 40 mm face alongside the current content —
   if a batch number is needed on the vial itself, it wants its own band and a size review.

---

## 9. Open decision — label copy

`../business-proposal/axiom-business-master-prompt.md:101-103` states:

> A label *may* state compound, lot, HPLC purity, molecular mass, storage temp; *must* carry the
> RUO micro-disclaimer + tamper-evident seal; ***may not* imply human dose, route, frequency,
> cycle, therapeutic benefit**, or use "cure/treatment/anti-aging/guaranteed."

`DOSE 10 clicks = 1 mg` is a pen-device calibration rather than a human dose, and it is carried
here as specified alongside the RUO line. It will nonetheless read as dosing to a regulator.

It lives in the data layer precisely so this stays a one-line decision: set `dose: null` on a
SKU and the row disappears. **This needs a human call before a production run.**

---

## 10. Verification

Geometry is measured, not eyeballed. Rendered through the pre-installed Chromium
(`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) via Playwright:

| Check | Result |
|---|---|
| PDF page box | 209.9 × 297.0 mm — A4, single page, `@page` honoured |
| Label box | 113.38 × 56.68 pt = exactly 40 × 20 mm |
| Corner radius | 7.559 px = 2 mm |
| Sheet | 194 × 281 mm; pitch 43.995 × 22.994 mm |
| Label count | 40 placed — 8 each of 10 / 20 / 30 / 40 / 60 mg, on rows 1-2 / 3-4 / 5-6 / 7-8 / 9-10 |
| DOSE row | present on all 40 |
| Overflowing bands | 0 at `--k: 1` for the shipped SKU |
| Hairlines | both `rgb(200, 138, 78)`, identical width and height |
| Proof page | no page errors, no horizontal overflow, 1:1 view measures 40 × 20 mm |
| Builder, all 79 names | 0 overflowing bands in A4 and thermal mode at the `0.48` floor |
| Thermal PDF | 39.9 × 20.1 mm per page; 8 labels → 8 pages, 80 → 80, no trailing page |
| Thermal hairlines | 316 rules on 158 labels: every one 3 dot rows at 300 dpi |

To re-measure after a change, load the print sheet from `file://`, then in the page context read
`getBoundingClientRect()` on `.lbl` and divide by `96/25.4` for millimetres, or multiply by
`0.75` for points. Export with `page.pdf({ preferCSSPageSize: true, printBackground: true })` —
without `preferCSSPageSize` the `@page` rule is ignored and the sheet silently rescales.
