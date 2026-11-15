# Validation — 17 September 2026

- All 72 product assets are present as high-resolution square WebP photographs. The generated catalogue and all product detail templates point to the corresponding stone assets.
- All pen image markup across 174 templates has stone styling; the 130 catalogue image mappings resolve to the 65 matching compound photographs.
- Every newly generated image was visually reviewed. Text recognition supplemented checks of compound names and quantities. The VIP spelling correction passed both checks. The existing CJC combination photograph uses its previously approved abbreviated name.
- Browser pagination expanded from 24 to 48 to 72 cards. All 72 cards have stone images; no broken image was reported and desktop overflow was absent at 1280 px. A screenshot immediately after pagination caught some photos still loading.
- The charcoal footer and gradient band were visually checked on the narrow preview. Earlier desktop and 390 px checks remain applicable to the unchanged footer CSS.
- Device photographs are illustrative design mockups, replacing the source icon placeholders. Product specifications and source business claims have not been independently verified.
- Local storefront only: live payments, account authentication and real orders remain outside this design update.

## Hero motion — 19 September 2026

- Desktop browser checks: three independent cursor transforms, different scroll speeds, stationary stone, smooth pointer-leave reset, and homepage route remount all pass.
- Reduced-motion preference restores the complete static image and removes moving layers. Mobile at 390 px uses restrained scroll motion, has no cursor glow, and has no horizontal overflow. Desktop checked at 1440 px.
- Inspected desktop, cursor and mobile screenshots in `qa/`. Pen wording and dial artwork reuse the existing source photo; no pen regeneration.
- No browser JavaScript errors during the checked flows. Re-run with `node qa/check-hero.cjs` (uses this machine's bundled Playwright and Chrome); `AXIOM_TEST_URL` can target the standalone HTML.

## Bahasa Indonesia — 23 October 2026

- EN / ID switch added to the navigation; 904 dictionary strings, 2 whole-headline translations and 17 number patterns in `i18n-id.json`.
- `qa/check-i18n.cjs` passes on the served site and the standalone HTML: all 170 routes in Indonesian with no English left, translated document titles, home filter and plan copy, basket drawer and toast, request-form validation, exact English restored when switching back, choice persists across reloads, mobile 390 px without overflow, no JavaScript errors.
- Hero checks still pass with the translated headline; pens keep their original label pixels. Screenshots: `qa/i18n-home-id.png`, `qa/i18n-product-id.png`, `qa/i18n-home-mobile-id.png`.
- Translations are machine-drafted against a fixed glossary; legal and certificate wording still needs a fluent reviewer.

## Lighter build and portable checks — 23 October 2026

- First load fetches CSS, two fonts and three scripts only: `content.js` 2.2 MB → 159 KB, `base.css` 510 KB → 100 KB (+49 KB and 27 KB fonts), standalone HTML 49.9 MB → 21.8 MB. The ZIP adds `pages/`, `i18n-id.js` and the font files. `original.css`, an identical copy of `base.css` used by nothing, is removed.
- Visual parity: all 170 routes at 1440 px and 390 px plus basket and mobile-menu states, screenshotted before and after and compared pixel by pixel. The only change on every page is the language label; the remaining differences were the random grain canvas and lazy related-product photos still loading, and a scroll check confirms every product, related and catalogue photo loads (no broken images).
- Lazy pages: a failed page chunk shows a translated message, keeps the current page and recovers on the next navigation. A saved Indonesian choice fetches the dictionary from `<head>` at high priority and holds the first paint until it applies.
- Inactive language label raised from 50 % to 65 % ivory: about 7:1 on the charcoal nav and above 4.5:1 where the 95 %-opaque nav sits over ivory sections.
- `qa/check-hero.cjs` and `qa/check-i18n.cjs` pass on the served site and the standalone HTML through the new `qa/browser.cjs` (no machine-specific path required).

## Readability and mobile buying — 23 October 2026

- Type floor 11px: 91 smaller sizes raised in the hand-written stylesheets, and `build.py` applies the same floor to `base.css` and stops on any regression. A browser audit of eight pages at 1440 px and the homepage at 390 and 360 px finds no text under 11px and no text below 4.5:1, apart from the skip link, which is only visible when focused. Fixed along the way: the ivory secondary grey (3.8–4.3:1 → 4.6–5.2:1), a 1.85:1 caption on the homepage, the homepage filter count, the footer legal line, the 01–03 markers and the "RUO" label in the ribbon, which was dark on dark.
- Language buttons are now 44px tall and breadcrumb links have a 24px hit area. The demo notice moved from a floating badge into the top ribbon.
- Shop header: at 1440×900 the first row of products now ends at 880px (before: cards started at 628px and ended below the fold). On a phone the categories are one scrolling row and the first product starts about 190px higher.
- Mobile buy bar (390 px): shows size and price at the top of a product page, steps aside when half of the size choices or Add to basket row is on screen, follows size changes (20 mg → Rp 3.600.000), adds through the page's own button, reads "Tambah ke keranjang" in Indonesian, and is gone on other pages. Hidden at desktop widths.
- `qa/check-hero.cjs` and `qa/check-i18n.cjs` pass on the served site and the standalone HTML.
- Found here and fixed separately: one click on Add to basket stored quantity 2 (see below).

## Add to basket — 23 October 2026

- One click on a product page's Add to basket added the chosen item and, through the catalogue card handler, the page's default size as well: two lines, or a 10 mg vial nobody chose when 20 mg was picked. The card handler skipped forms classed `buy`, but the product form is `buy-form` inside `.buy`. `build.py` now patches that guard.
- `qa/check-basket.cjs` covers nine paths: the product page (default size, another size, quantity 3, subscription, two adds), a device page, the mobile buy bar, and the catalogue and homepage card choosers. Each adds exactly the chosen item. It passes on the served site and the standalone HTML, fails on the previous build, and runs in CI.

## Polish — 24 October 2026

- Photo placeholders: product, coa and detail photos rest on their stone tile while loading instead of black (screenshots taken with photo responses held back).
- Card photos: `card_photos.py` made 72 photos at 640px (3.5 MB in total) from the PNG masters. Cards offer them through `srcset`, and product pages keep the full-size photograph. Photos for the shop page went from 11.9 MB to 3.6 MB. Checked in a browser: phones (3x) and laptops (1x, 2x at 1440px) load the 640px file; wide 2x screens (1920px) load the full size. The standalone HTML drops the `srcset`, so it stays at 21.8 MB.
- Empty basket: the four featured compounds appear as link cards under the empty-state message ("From the collection" / "Dari koleksi").
- Indonesian default: a browser set to Indonesian opens the site in Indonesian without saving a choice; a choice made with EN / ID is saved and wins. `qa/check-i18n.cjs` covers both.
- Fixed: the Saved icon appeared in the header in Indonesian, because the CSS hid it by its English label. It now matches the link address.
- Tools: `serve.py` (threaded preview server, also in the ZIP and used by CI). QA screenshots go to `qa/latest/` (ignored). CLAUDE.md corrected on where the dictionary loads and on the CI checks.
- `qa/check-hero.cjs`, `qa/check-i18n.cjs` and `qa/check-basket.cjs` pass on the served site and the standalone HTML.

## KLOW-C and full stock — November 14

- KLOW-C (KLOW + Cartalax), 100 mg at Rp 6.400.000 (SKU `klowc100`), joins Tissue Repair after KLOW: catalogue card, product page, compound page, pathway list (now 12 compounds · 14 lots), price list (87 lots) and counts (66 compounds · 80 lots, 73 products, 176 templates).
- Its photograph is the approved KLOW photograph relabelled locally (`tools/relabel_klow_c.py`): only the name and quantity were erased and redrawn; visual review confirms KLOW-C (KLOW + Cartalax), 100 mg and dial 0.
- No product is sold out: TB-500, Thymosin Alpha-1 and Epithalon now carry stock (12, 8 and 10), and their cards, buy boxes and compound rows use the in-stock markup. No template carries "Sold out", "None available" or a notify form.
- `verify_stone.py` passes for 73 products; `qa/check-basket.cjs`, `qa/check-i18n.cjs` (172 routes, no English left) and `qa/check-hero.cjs` pass on the served site.

## Supplier sheet update — November 14

- Ipamorelin 10 mg Rp 2.700.000, HMG 75 IU Rp 2.500.000 and Humanin 10 mg Rp 3.500.000 (back on the 48% formula after their supplier costs moved); cards, product pages and price list follow, with plan savings Rp 405.000, Rp 375.000 and Rp 525.000.
- Cerebrolysin is a 60 mg lot (SKU `cere60`), as on the supplier sheet. NAD+ 500 mg is withdrawn: NAD+ is a single 1000 mg lot at Rp 3.700.000, so its buy box has no size picker, its card no "from", and the guide counts read 66 compounds · 79 lots, Longevity 7 compounds · 8 lots, price list 86 lots.
- The NAD+ and Cerebrolysin photographs now read 1000 mg and 60 mg: only the QTY figure was redrawn (`tools/relabel_qty.py`), name and pen untouched. Their PNG masters in Git LFS still carry the old figures; the WebP files are the delivery copies.
- `verify_stone.py`, `qa/check-i18n.cjs` (no English left), `qa/check-basket.cjs` and `qa/check-hero.cjs` pass.

## Seven new lots — November 14

- Semaglutide joins Metabolic after Retatrutide: 10 mg Rp 2.100.000, 30 mg Rp 3.500.000, 40 mg Rp 4.000.000 (SKUs `sema10`, `sema30`, `sema40`), class GLP-1 receptor agonist, no published certificate yet. Catalogue card, product page, compound page, pathway lists and related sections.
- Tri-Heal (BPC+TB+KPV), 30 mg at Rp 3.800.000 (SKU `triheal30`), joins Tissue Repair after TB-500.
- Retatrutide 5 mg Rp 2.100.000 (SKU `reta5`) is now Retatrutide's first and default lot, so its card reads "from Rp 2.100.000" and `qa/check-basket.cjs` expects `reta5` (the second size is `reta10`). Tirzepatide adds 60 mg Rp 5.200.000 and 80 mg Rp 6.300.000.
- Counts: 68 compounds · 86 lots, Metabolic 5 compounds · 16 lots, Tissue Repair 13 compounds · 15 lots, 75 products, price list 93 lots, 180 templates. The homepage line had still read 65 compounds; it now reads 68.
- Photographs: Semaglutide is the approved Tirzepatide photograph and Tri-Heal the approved KLOW photograph, each with name and QTY redrawn by `tools/relabel_label.py`; Retatrutide's QTY now reads 5 mg (`tools/relabel_qty.py`). Visual review confirms the names, quantities and dial 0. No PNG masters are committed for them.
- `verify_stone.py` passes for 75 products; `qa/check-i18n.cjs` (176 routes, no English left), `qa/check-basket.cjs` and `qa/check-hero.cjs` pass on the served site.

## SSM (SS-31 + MOTS-C) — November 15

- SSM (SS-31 + MOTS-C), 40 mg (20 mg of each) at Rp 3.500.000 (SKU `ssm40`), joins Cellular Energy after MOTS-c: catalogue card, product page, compound page, pathway list (now 8 compounds · 9 lots), related compound lists, price list (94 lots) and counts (69 compounds · 87 lots, 76 products, 182 templates).
- Its photograph is the approved KLOW photograph with name and QTY redrawn by `tools/relabel_label.py`; visual review confirms SSM (SS-31 + MOTS-C), 40 mg and dial 0. No PNG master is committed.
- `verify_stone.py` passes for 76 products; `qa/check-i18n.cjs` (178 routes, no English left), `qa/check-basket.cjs` and `qa/check-hero.cjs` pass on the served site.
