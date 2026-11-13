# AXIOM — design language

How AXIOM looks, on every surface in this repository. The voice and the beliefs behind it are in
[SOUL.md](SOUL.md). This file covers the visual system: colour, type, space, motion, the logo
mark and the wordmark.

## Which source wins

Three sources describe the identity. When they disagree, the higher one wins.

1. **The code tokens**: the `:root` block in `src/app/globals.css`. It is copied verbatim from §9
   of `business-proposal/axiom-business-master-prompt.md`, and the print sheets, labels and invoice
   use the same values. This is the identity as it ships.
2. **The master prompts**: `business-proposal/axiom-business-master-prompt.md` (§3 compliance,
   §7 brand rules, §9 appendix) and `web-app/axiom-web-app-master-prompt.md` (the glass layer).
3. **The brand book v1.0**: `brand-book/index.html`. Its logo rules, layout rules and print specs
   still apply. Its palette is the earlier one, with onyx `#0A0A0A`, bone `#F5F5F3`, titanium
   `#8D8D8D` and warm metal `#C4A882`. The tokens above replaced it with warmer values, so don't
   copy hex values out of the brand book. Its Pantone references are still the ones to give a
   printer.

The stone storefront in `storefront/` is a deliberate variant on light ground (see
[Storefront](#the-stone-storefront)). Its own rules are in `storefront/CLAUDE.md`.

## Principles

- **Restraint is the identity.** Warm near-black, bone and one metal accent. Remove an element
  when in doubt, and the ones that remain carry more weight.
- **Bronze is earned emphasis.** It covers no more than 8 % of any surface and is never used as
  a flood. The 50 × 30 mm vial label uses about 1.7 %.
- **No pure black or white, no purple, no cool blue.** The blacks are warm and the whites are
  bone.
- **Hairlines are the texture.** Dividers are thin rules, and a rebuild must not thicken or drop
  them.
- **Every figure is tabular.** Prices, specs and tables use `font-variant-numeric: tabular-nums`
  (`"tnum" 1`).
- **Proof before promise.** A layout leads with what is measured: the lot, the purity, the
  Certificate of Analysis.

## Colour

### Core tokens (dark ground)

| Role | Token | Value |
| --- | --- | --- |
| Ground (onyx) | `--bg` | `#070605` |
| Ink (bone) | `--ink` | `#F2EDE5` |
| Secondary ink | `--muted` | `#9C9488` |
| Tertiary ink | `--muted-2` | `#6A635A`, for large text or decoration only on onyx |
| Hairlines | `--line` · `--line-2` · `--line-soft` | bone at 12 % · 22 % · 6 % |
| Accent (bronze) | `--accent` | `#C88A4E` |
| Bronze, light / deep | `--accent-bright` · `--accent-deep` | `#E7B173` · `#7C4C24` |
| Bronze gradient | `--accent-grad` | `#E7B173 → #C88A4E → #9A5F2C`, 120° |
| Status | `--ok` · `--warn` · `--err` · `--info` | `#8FA37E` · `#C8A24E` · `#B0553B` · `#9C9488` |

Bronze ramp, 50 → 900: `#F0E8DF #EDE2D7 #E6D3C4 #DDBFA9 #D3A887 #C88A4E #B37B46 #9C6C3D #815932
#604326`.

Components never carry a literal hex. They read the tokens, which Tailwind exposes as
`bg-bg`, `text-ink`, `text-accent` and so on through the `@theme` block.

### Paper (print and PDF)

Print reverses the palette: paper `#F2EDE5` (`--paper`) with ink `#070605` (`--paper-ink`). Core
bronze fails small-text contrast on a light ground, so accents on paper use `--accent-deep`
`#7C4C24`. Print pages set `print-color-adjust: exact`, because without it browsers drop dark
grounds and the labels come out as white boxes.

PDFs leave the repository in RGB. Ask a press to match bronze to a printed swatch, or give it
**Pantone 7502 C** from the brand book.

### Glass (web app)

The app adds a smoked-bronze glass layer over the dark ground. The surface tokens are `--glass`,
`--glass-2` and `--glass-nav`, with an 18–24 px blur, a 10 % bone edge and a faint top highlight.
Behind heroes there is a bronze `--glow`. Corners are square (`--r: 0`); only sheets
(`16px 16px 0 0`) and pills are rounded.

### Thermal labels

A thermal head prints one colour, so in thermal mode every token is solid black on white.
Hierarchy moves from grey to weight. The details are in `stickers/design.md` §7c.

## Type

| Face | Use | Weights |
| --- | --- | --- |
| **Jost** | Display, headlines, compound names on labels | 300 · 400 · 500 |
| **Inter** | Body, UI, tables, wide-tracked uppercase micro-labels | 300 · 400 · 500 · 600 |

- Headlines are sentence case with tight leading, and display tracking is `-0.01em`. Kickers
  track at `.34em`.
- Emphasis is a colour shift to `--muted`. Never use italics or exclamation marks for emphasis.
- "AXIOM" is always in capitals, and pillars are in title case (`AXIOM · Peptide Science`).
- Units are spaced: `10 mg`, `660 nm`, `2–8 °C`, `≥ 98%`. Currency is `Rp 1.600.000`, with a
  space, periods as the thousands separator and no decimals.
- Print files embed their fonts as base64, so a print vendor needs no network.
- **Floor and contrast.** No text smaller than 11 px on screen, and text meets 4.5:1 against its
  ground. On onyx, bone, `--muted` (6.8:1) and bronze (6.9:1) pass, while `--muted-2` (3.4:1)
  is for large text only. On paper, core bronze reaches only 2.5:1, which is why accents there
  use `--accent-deep` (6.2:1). `storefront/build.py` enforces the 11 px floor for the
  storefront; contrast is checked by hand. Labels go smaller in print, but
  `RESEARCH USE ONLY` is never set below 5 pt.

## Space, layout and motion

- **Space scale:** 8 · 16 · 24 · 34 · 64 · 110. Content is at most 1280 px wide with 34 px
  padding (`--maxw`, `--pad`).
- From the brand book: at least 80 px between content sections, and body columns no wider than
  640 px.
- **Print geometry is in millimetres** throughout, so a rendered PDF is exact rather than nearly
  right.
- **Motion:** one ease, `cubic-bezier(.16,1,.3,1)`. Durations are 220 ms for micro, 700 ms for a
  reveal, 950 ms for a draw and a 65 ms stagger. Moves are 18 px or less, with no bounce. Each
  animation has a static equivalent under `prefers-reduced-motion`.

## The logo mark and the wordmark

### The wordmark

AXIOM set in five geometric letters with straight lines, a true elliptical O and a notched X.

- It is one vector path on a **582 × 70** grid, and **every stroke is 11.8 units** wide: the A's
  legs, the four arms of the X, the I, the O all the way round, and the M's stems and diagonals.
- The A has a flat apex.
- The O keeps its optical overshoot: it spans 0–70 while the other letters span 2–68. Because it
  fills the viewBox edge to edge, give the mark an explicit height (width × 70 / 582) and
  `overflow: visible`, or some viewers clip the O flat.
- The X's arms run through its centre and end in square cuts, which leaves a small square
  opening in the middle.
- Colourways: **bone `#F2EDE5`** on dark (`axiom-wordmark-white.svg`) and **onyx `#070605`** on
  light (`axiom-wordmark-black.svg`). Inline copies use `fill="currentColor"` and inherit `--ink`.

### The logo mark

The **notched-X symbol** (`axiom-x-symbol-bronze.svg`): the four arms of the X on their own, drawn
on a **297 × 243** grid in bronze `#C88A4E`, with the opening at the centre. Use it for icons,
stickers and avatars. The guide's home-screen and tab icons are drawn from the same four arms, in
bone on onyx.

**Lockups.** Two raster lockups carry the HUMAN PERFORMANCE tagline: `brand-book/logo.png` and
`company-profile/assets/axiom-logo-white.png`. No vector lockup exists yet.

### Using them

- **Clear space** equals the cap height of the X on all four sides. Nothing, including text,
  images or the edge of the page, may enter it.
- **Don't** stretch the marks, set the wordmark in a bold weight, add gradients, glows or rings,
  or recolour them outside bone, onyx and bronze.
- **Small and on thermal.** At 203 dpi the master's 11.8-unit strokes print broken below about
  17 mm wide. Thermal labels use `WORDMARK_THERMAL` in `stickers/builder.html`, the same letters at
  12.5 units per stroke. Use it nowhere else.

### Where the master path lives

The master file is `business-proposal/assets/logo/axiom-wordmark-white.svg`. The same path is
inlined, byte for byte, in:

- `src/components/shell/sprite-svg.ts` (the web app's `#wm` symbol) and `web-app/mockup/index.html`
- `business-proposal/axiom-pricelist-print.html`, which `order-form/build.cjs` reads it from,
  plus `axiom-peptide-pricelist.html`, `axiom-business-proposal.html` and
  `axiom-gtm-strategy.html`
- `invoice/axiom-invoice-a4.html`
- `stickers/index.html`, `stickers/axiom-vial-stickers-print.html` and `stickers/builder.html`
- `dosage-guide/print/card-print.html`, with a copy of the SVG in `dosage-guide/assets/`

Change it in all of them together, then re-export the committed PDFs and the raster files:
`brand-book/logo.png`, the two PNGs in `company-profile/assets/`, the PNGs beside the SVGs and
`dosage-guide/print/axiom-card-preview.png`.

**One exception.** The storefront (`storefront/index.html`) keeps the wordmark drawing from the
reference storefront it was built from (`storefront/reference.html`), and that drawing is not the
master path. Moving it onto the master path is an open decision. Until that's made, a change to
the master does not reach the storefront.

## The stone storefront

`storefront/` takes the identity onto light ground with stone photography, and it is the one
surface with its own palette:

| Role | Value |
| --- | --- |
| Page (warm ivory) | `#F0EEE8` |
| Ink | `#151511` |
| Secondary ink on ivory | `#666259` (`--muted-2`, chosen to pass 4.5:1) |
| Bronze on ivory | `#80603A` (the stone bronze is `#AD8658`) |
| Charcoal sections | `#0C0D0A` with ink `#F0EEE7` and bronze `#C3A078` |

- Stone images fade into charcoal, with no visible rectangular edge.
- Every product has its own stone photograph, on its card and on its page.
- The hero pens move with scroll and the cursor over a still stone background, with eased
  motion, smaller moves on phones, a reduced-motion fallback and a complete static fallback.
- The footer is compact: one small wordmark and aligned links.

The storefront's full rules are in `storefront/CLAUDE.md`.

## Surfaces at a glance

| Surface | Ground | Notes |
| --- | --- | --- |
| Web app (`src/`) | Onyx, glass | Core tokens. Indonesian is the default locale. |
| Stone storefront (`storefront/`) | Ivory and charcoal | Variant palette. EN / ID switch. |
| Compound guide (`dosage-guide/`) | Onyx | Mobile first. Card 85 × 55 mm with a bone QR. |
| Price list, order form, proposal (`business-proposal/`) | Onyx on screen, paper in print | A4. Research-use footer on every peptide page. |
| Vial labels (`stickers/`) | Onyx, or black on white for thermal | 50 × 30 mm. See `stickers/design.md`. |
| Invoice (`invoice/`) | Paper | A4, with the storefront's dark stone ridge in the last sheet's corner. |
