# AXIOM logo files

The clean, geometric AXIOM marks: straight lines, a true elliptical O, and the
notched X. Every stroke of the wordmark is the same weight, 11.8 units on its
582-unit grid: the A's legs, the X's four arms, the I, the O all the way round,
and the M's stems and diagonals. Use SVG for print and anything large; each PNG
has a transparent background.

| File | Mark | Colour | Use on |
| --- | --- | --- | --- |
| `axiom-wordmark-white.svg` / `.png` | Wordmark | Bone `#F2EDE5` | Dark backgrounds |
| `axiom-wordmark-black.svg` / `.png` | Wordmark | Onyx `#070605` | White or light backgrounds |
| `axiom-x-symbol-bronze.svg` / `.png` | Notched-X symbol | Bronze `#C88A4E` | Icons, stickers, avatars |

- The wordmark is drawn on a 582 × 70 grid; the PNGs are 2328 × 280 px, rendered
  straight from the SVGs at 4×.
- The X symbol is drawn on a 297 × 243 grid; the PNG is 1188 × 972 px.
- The X symbol is the logo mark: the wordmark's four X arms on their own,
  with the square opening at the centre. The guide's home-screen and tab icons
  are drawn from it.
- The white wordmark's path is the one inlined in the web app
  (`src/components/shell/sprite-svg.ts`) and its mockup, the four sheets in
  `business-proposal/`, the guide's card, the invoice and the three sticker
  pages. Change it here and in those places together, then re-export the PNGs.
  The full list is in the root `DESIGN.md`.
- Two drawings are not this path: the heavier `WORDMARK_THERMAL` in
  `stickers/builder.html` (12.5-unit strokes for 203 dpi thermal labels) and
  the storefront's wordmark, which comes from its reference build.
- Clear space equals the cap height of the X on all four sides. Don't stretch
  the marks, set them bold, add gradients or use colours other than these three.

Lockups with the HUMAN PERFORMANCE tagline are raster only:
`company-profile/assets/axiom-logo-white.png` and `brand-book/logo.png`.

The rest of the design language (palette, type, motion) is in the root
`DESIGN.md`, and the voice is in `SOUL.md`.
