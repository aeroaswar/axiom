# AXIOM vial sticker — design specification

**50 × 30 mm wrap label** for pen-format research peptides. Retatrutide 30 mg is the worked
example; the label is data-driven, so the rest of the catalogue drops in without redrawing.

| File | What it renders |
|---|---|
| `index.html` | Design proof — the label at 5× and 1:1, corner-radius options, spec table, production notes. Google Fonts. |
| `axiom-vial-stickers-print.html` | Production A4 gang sheet, two pages of 3 × 8 — currently the Retatrutide range at 10 / 20 / 30 / 40 / 60 mg, 9 each. Fonts embedded base64, self-contained for a vendor. Print → Save as PDF. |
| `builder.html` | Label builder — pick compounds and strengths, queue them, and print or **Download PDF** on A4, a thermal roll, or one label per page (§7d). |
| `design.md` | This document. |

Geometry is declared in millimetres throughout, so the rendered PDF is dimensionally exact
rather than approximately right.

---

## 1. Die and safe area

| | |
|---|---|
| Die | **50 × 30 mm**, landscape |
| Corner radius | **2.5 mm** (`--r`; the proof page shows 1.5 / 2 / 2.5 / 3 mm to choose from off a test print) |
| Inset | 2 mm on all four sides (`--pad-x`, `--pad-y`) |
| Safe area | **46 × 26 mm** — nothing may cross this |

The label was first drawn at 40 × 20 mm. The 50 × 30 label is the same design at 1.25×: each
band's type unit is 1.25 mm instead of 1 mm, so type, the wordmark and the rules scale together,
and the 46 mm measure is 1.25× the old 36.8 mm, so a long name shrinks to the same `--k` as
before. The extra height goes to the space around the rules (§4).

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
0.25 × 46 mm rules plus the `HIGH PURITY` line — roughly **1.7 %** of the 1,500 mm² face. Well
inside the ceiling, and deliberately so: bronze is earned emphasis, not decoration.

`RESEARCH USE ONLY` is set in `--muted`, not the dimmer `--muted-2`. At 5.0 pt on a black
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
| Wordmark | 11.25 mm wide, vector | `currentColor` → `--ink` | — |
| `HIGH PURITY` | 1.9 mm · 5.3 pt | Inter 500, `--accent` | `.14em` |
| Hairlines | 0.25 mm · 0.71 pt | solid `--accent` | — |
| `RETATRUTIDE` | 4.9 mm · 13.8 pt | Jost 400, `--ink` | `.05em` |
| `QTY` / `DOSE` keys | 1.9 mm · 5.3 pt | Inter 400, `--muted` | `.14em` |
| QTY value | 2.5 mm · 7.1 pt | Inter 500, `--ink` | `.01em` |
| DOSE value | 2.25 mm · 6.4 pt | Inter 500, `--ink` | `.01em` |
| `RESEARCH USE ONLY` | 1.75 mm · 5.0 pt | Inter 400, `--muted` | `.10em` |

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

Five bands stacked inside the 46 × 26 mm safe area, split by two hairlines:

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
| `.lbl__rule--top` margin | `1.9 mm` above / `2.2 mm` below (thermal 1.6 / 1.9) |
| `.lbl__band--c` margin-top | `1.6 mm` |
| `.lbl__band--d` margin-top | `0.8 mm` |
| `.lbl__rule--bot` margin | `2.1 mm` above / `1.6 mm` below (thermal 1.8 / 1.4) |

The tallest label (Retatrutide with DOSE) stacks to 23.94 mm of the 26 mm content box.

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
inherits `--ink`. Inlining keeps it true vector at 11.25 mm, keeps each HTML file self-contained, and
avoids the per-directory asset duplication seen across `../company-profile/assets/` and `../business-proposal/assets/`.

---

## 5. Autofit

Each band declares `font-size: calc(1.25mm * var(--k, 1))` and sizes its children in `em`. One
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
| `VIP (Vasoactive Intestinal Peptide)` | `0.48` — the longest; cap height 1.64 mm |

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
  copies:   9 }                   // how many to place on the sheet
```

The sheet as shipped carries the **Retatrutide range** — 10 / 20 / 30 / 40 / 60 mg, 9 of each,
45 labels in five three-row blocks over two pages. Keeping `copies` a multiple of 3 keeps every
strength on whole rows, so a cut sheet stays sorted. Set one SKU to `copies: 24` for a full
single-strength page; more copies add pages.

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
| Grid | **3 columns × 8 rows = 24 slots a page**; the current range fills 24 + 21 over two pages |
| Column pitch | 54 mm (50 mm label + 4 mm gutter) → 158 mm of 194 |
| Row pitch | 33 mm (30 mm label + 3 mm gutter) → 261 mm of 281, after 1.5 mm at the top for the first row's guides |
| Sheet ground | `#fff` — it is white stock, the labels are the ink, so the screen preview matches the press |
| Cut guides | `rgba(0, 0, 0, .38)` at 0.1 mm, centred on each die edge and extending into the gutter |

The labels paint above the guides (`z-index`), so the guides show only in the gutters; before,
the vertical guide drew through the middle of every label. Each A4 page is its own `.sheet`, with
a page break after every one but the last. The guides are **dark on purpose**. An earlier cut drew them in bone white, which is invisible
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
| Cut contour | The real 50 × 30 mm trim with the 2.5 mm radius, 0.09 mm (~0.25 pt) in 100% magenta — the usual CutContour convention. Ask the vendor to use it as the cut path and not print it. |
| Bleed | 1 mm of the onyx ground past the trim on all four sides, so a slight cut variance never leaves a white edge. |
| Spec line | Printed at the foot of every page: size, radius, bleed, what the magenta means, density and page number. |

Turning it on also drops the alignment guides — the contour replaces them.

**Producing the PDF.** Use **Download PDF** in the builder's queue. It builds the PDF in the
page, with no print dialog, and works embedded in claude.ai as well as on its own tab:

- **Vector, not a picture.** Every page is redrawn from the rendered preview: each glyph at the
  position the browser laid it out (read from its own text range), each rule, logo and die line
  from its box. Text stays real text in embedded fonts, and the logo and die line stay vector paths.
- **Fonts.** The web fonts are variable and a PDF embeds one weight per font, so the builder
  carries static TrueType instances of the weights the labels use (Inter 400/500/600, Jost 400).
  TrueType because fontkit cannot subset WOFF2.
- **Exact sizes.** Pages are exactly 210 × 297 mm, or the label size for thermal (the browser's
  print rounds to whole CSS pixels, 209.9 mm). The die line is drawn at its specified 0.09 mm;
  browser print rounds a border that thin up to 1 px (0.26 mm).
- **Libraries.** pdf-lib and fontkit load from the CDN the first time the button is used. In a
  claude.ai viewer the file is handed over through the page's `downloads` capability, so the
  viewer confirms the save; on its own tab it is an ordinary browser download.

Print still works: open `builder.html` (or the published builder in its own tab — a sandboxed
iframe blocks printing) and print with **Paper: A4 · Scale: 100% · Margins: None · Background
graphics: ON**. Without background graphics the onyx ground drops out and the labels print as
white boxes.

The cut guides sit under the labels, so they show only in the gutters. Before this they drew a
vertical line through the middle of every label on the Standard sheet.

**Two things to tell the vendor.** The PDF is RGB — the bronze `#C88A4E` will
shift on a CMYK press, so ask for a match to a printed swatch, or give them
Pantone 7502 C from `../brand-book/index.html:2162-2181`. And the die is a
rounded rectangle, 50 × 30 mm with a 2.5 mm corner radius — worth stating in writing as
well as drawing, since a new die is cut from the spec, not traced off a PDF.

---

## 7c. Thermal roll

`builder.html` has a second output, **Thermal roll · 50 × 30**, for printing in-house on a
thermal label printer. It is tuned for the printers in use, the **Xprinter XP-420B and
XP-D4601B: direct thermal, 203 dpi**, where a dot is 0.125 mm. Same layout, same autofit, same
data; four things change.

**One colour.** A thermal head is 1-bit: a dot is black or it is not. Every tone is therefore
solid black on white stock — `--bg #fff`, and `--ink`, `--muted` and `--accent` all `#000`. A
grey would print as a dither pattern. The hierarchy the greys carried moves to weight instead:

| Element | A4 | Thermal |
|---|---|---|
| `QTY` / `DOSE` keys | Inter 400, `--muted` | Inter 500, black |
| Values, `HIGH PURITY` | Inter 500 | Inter 600 |
| Compound | Jost 400 | Jost 400 — at 500 the longest name no longer fits at the autofit floor |

No bronze and no onyx ground: this is the working label, not the brand-book stock in §8.

**The wordmark and the micro-print are sized for 203 dpi.**

| Element | A4 | Thermal |
|---|---|---|
| Wordmark | 11.25 × 1.35 mm, master drawing | **17.5 × 2.1 mm**, redrawn with every stroke 12.5 units |
| `RESEARCH USE ONLY` | `1.4em`, Inter 400, `--muted` | **`1.7em`, Inter 600**, black |
| Space around the top rule | 1.9 / 2.2 mm | 1.6 / 1.9 mm |
| Space around the bottom rule | 2.1 / 1.6 mm | 1.8 / 1.4 mm |

These are the 50 × 30 mm sizes. The mark was first tuned on the 40 × 20 label, where the
master wordmark is 9 mm wide and its strokes (11.8 of 582 units) are 0.18 mm: 1.5 dots at 203 dpi,
and they print broken. The thermal mark is wider and also drawn slightly heavier (below); at
17.5 mm its strokes are 0.38 mm, 3 dots. The tighter rule spacing pays for the larger
micro-print, so the tallest label (Retatrutide with DOSE) stacks to 23.45 mm, inside the 26 mm
content box (23.94 mm on A4).

Stroke weights, in units of the 582 × 70 grid:

| Letter | A legs | X arms | I | O | M stems / diagonals |
|---|---|---|---|---|---|
| Original master | 11.0 | 9.8 | 11.6 | 11.2 top/bottom, 12.9 sides | 11.8 / 11.8 |
| Master since #33 / #21 | 11.8 | 11.8 | 11.8 | 11.8 all round | 11.8 / 11.8 |
| Thermal (`WORDMARK_THERMAL`) | 12.5 | 12.5 | 12.5 | 12.4–12.5 all round | 12.5 / 12.5 |

The original master's uneven weights landed on whole dots at 203 dpi, so the O printed visibly
heavier than the X. The master has since been evened out to 11.8 everywhere. The thermal wordmark
is the same letters with every stroke 12.5 units (0.38 mm, 3 dots at 17.5 mm), a touch heavier
than the master for 203 dpi. Only the inner edges differ: the outer silhouettes, the flat apex of
the A, the O's 2-unit overshoot and the X's centre notch (4.62 × 5.18 units) are the master's.
`WORDMARK_THERMAL` is used only on thermal labels; the A4 sheet and the builder's own header use
the master.

The O overshoots the other letters and fills the viewBox edge to edge, so the wordmark carries an
explicit height (width × 70/582) and `overflow: visible`. Left to `height: auto`, one viewer sized
the box short and clipped the O flat at the other letters' cap line.

**Hairlines print at one weight.** Both rules are drawn as an SVG rect 0.254 mm tall: 2 dots at
203 dpi, 3 at 300 dpi. A CSS border or background cannot do this: Chromium snaps both to a
whole CSS pixel (0.2646 mm = 3.125 dots) and snaps their position too, so one rule landed on 3 dot
rows and the other on 4. SVG geometry is not snapped. The rect is also nudged down 0.005 mm so
neither edge sits exactly on a dot centre, where the driver's rounding would decide. Measured
from the PDF across every catalogue name with and without the DOSE row (158 labels, 316 rules):
every rule covers **2 rows at 203 dpi** and 3 at 300 dpi. The rules print with *Background
graphics* off.

**One label per page.** `@page` becomes `50mm 30mm`, margin 0, and each label is its own page, so
the driver feeds one label per page and uses the gap sensor to register the next. Browser print
gives a page of 50.1 × 30.0 mm: Chromium rounds the page to whole CSS pixels, the same way A4
comes out at 209.9 mm, and the 0.1 mm lands in the gap between labels. **Download PDF** pages are
exactly 50 × 30 mm.

**The printer and the labels.**

- **Direct thermal means the label is the ink.** There is no ribbon; the head darkens a
  heat-sensitive coating. Plain thermal paper smears under an alcohol swab, which is how a vial
  gets handled, and darkens or fades with heat and sunlight.
- **So use top-coated synthetic direct-thermal labels** (PP or synthetic, "top coated"). The top
  coat protects the print from swabs and fridge condensation. Keep labelled vials out of heat and
  direct sun.
- **50 × 30 mm, one across the roll, with a gap.** Rolls that are two or three across do not line
  up with one label per page.
- **Print over USB from a computer** with the Xprinter driver installed. It is the dependable
  path for a browser print; the XP-D4601B's Bluetooth is aimed at phone apps.
- In the driver, add a 50 × 30 mm paper size, labels with gaps, and calibrate the gap sensor (the
  XP-D4601B calibrates itself; on the XP-420B hold the feed button). In the print dialog: Paper
  50 × 30 mm, Scale 100%, Margins None. Printing the downloaded PDF from a PDF viewer works the
  same way: Actual size, not Fit.

Print one label first and check `RESEARCH USE ONLY`. If it breaks up, raise the darkness (density)
a step, then slow the print speed.

A 300 dpi thermal-transfer printer with a resin ribbon on PP or PET stock prints the same file
more crisply and more durably. It is the upgrade path, not a requirement.

---

## 7d. PDF only

`builder.html` has a third output, **PDF only · 50 × 30**, for a file rather than a print job:
one 50 × 30 mm page per label and nothing else on the page — no sheet, guides or spec line.
There is no Print button in this mode; **Download PDF** is the output.

| Style | What it is |
|---|---|
| **Colour** | The AXIOM label as on the A4 sheet: onyx ground with its 2.5 mm rounded corners, bone type, bronze rules. For a print shop that sets its own layout, or for sharing. |
| **Black & white (thermal)** | Exactly the thermal-roll label (§7c): black on white, the heavier wordmark and micro-print, the 2-dot hairlines. |

The look is keyed off `data-style` on the page, separately from the layout (`data-out`): the
thermal roll is always black and white, and PDF only can be either. Files are named
`axiom-labels-50x30-colour-N.pdf` and `axiom-labels-50x30-bw-N.pdf`.

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
2. **Micro-print.** `RESEARCH USE ONLY` sets at 5.0 pt. Normal for pharma micro-print, but it is
   the one line that must be checked on a real proof. If the press cannot hold it, raise
   `.lbl__ruo` to 1.6em (2 mm) and drop the compound to 3.6em (4.5 mm) to make room.
3. **Batch and QR.** Neither is on the label today. The brand book puts the QR on the outer box
   at 18 × 18 mm minimum, which will not fit a 50 × 30 mm face alongside the current content —
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
| PDF page box | 209.9 × 297.0 mm — A4, two pages, `@page` honoured, no guides spilling across the break |
| Label box | exactly 50 × 30 mm |
| Corner radius | 9.449 px = 2.5 mm |
| Sheet | 194 × 281 mm a page; pitch 54 × 33 mm |
| Label count | 45 placed — 9 each of 10 / 20 / 30 / 40 / 60 mg, 24 on page 1 and 21 on page 2, in order |
| DOSE row | present on all 45 |
| Overflowing bands | 0 at `--k: 1` for the shipped SKUs; tallest stack 23.94 mm of 26 |
| Hairlines | both `rgb(200, 138, 78)`, identical width and height |
| Guides | under the labels (`z-index: 1`), visible only in the gutters |
| Proof page | no page errors, no horizontal overflow, 1:1 view measures 50 × 30 mm |
| Builder label | 50 × 30 mm, 2.5 mm radius, in A4 and thermal mode |
| Builder, all 79 names | 0 overflowing bands in A4 and thermal mode at the `0.48` floor |
| Builder fit | tallest stack 23.94 mm (A4) and 23.45 mm (thermal) of the 26 mm content box; wordmark 11.25 × 1.35 mm (A4), 17.5 × 2.1 mm (thermal) |
| Thermal print | 50.1 × 30.0 mm per page; 8 labels → 8 pages, 80 → 80, no trailing page |
| Download PDF | A4 pages exactly 210 × 297 mm, thermal pages exactly 50 × 30 mm; 158 thermal labels build in about 1 s |
| PDF only | colour and black & white: one page per label, each exactly 50 × 30 mm; colour keeps the onyx ground and bronze rules, black & white matches the thermal output |
| Thermal hairlines | 316 rules on 158 labels: every one 2 dot rows at 203 dpi, 3 at 300 dpi |
| Thermal wordmark strokes | A, X, I, M 12.5 units; O ring 12.41–12.5 sampled every 5°; X notch 4.62 × 5.18 as in the master |

To re-measure after a change, load the print sheet from `file://`, then in the page context read
`getBoundingClientRect()` on `.lbl` and divide by `96/25.4` for millimetres, or multiply by
`0.75` for points. Export with `page.pdf({ preferCSSPageSize: true, printBackground: true })` —
without `preferCSSPageSize` the `@page` rule is ignored and the sheet silently rescales.
