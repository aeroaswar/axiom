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

## Merch removed — 10 November 2026

- Removed the four apparel products (Performance Tee, Training Hoodie, Logo Cap, Gym Duffel), the Merch page, its nav and footer links, the shop's Merch filter and search suggestions, the homepage "Beyond the laboratory" section, the price list's Apparel group, and an unused Logo Cap template. 174 → 167 templates, 72 → 68 products. The three devices stay.
- Copy that listed apparel now reads without it (shop lead, price list, contact, footer, FAQ, terms, legal, device pages, homepage). Indonesian entries follow the same edits; six apparel-only entries were removed.
- The 22 merch photos (16 MB, including PNG masters in LFS) are deleted; no built file referenced them. The standalone HTML is 20.3 MB. `#/merch` now opens the homepage.
- Homepage closing band ("Start with the standard."): the stone now fades into charcoal like the inner-page band, instead of stopping at a hard edge halfway across.
- `qa/check-hero.cjs`, `qa/check-i18n.cjs` (0 English leftovers) and `qa/check-basket.cjs` pass on the served site, and the hero and i18n checks on the standalone HTML.

## Showcase — 11 November 2026

- The storefront now shows what AXIOM carries and the compound guide, in English only, and takes orders on WhatsApp. Removed: prices (cards, product pages, structured data and the data the browser receives), the basket and mini basket, Subscribe & save (product plans and the homepage section), accounts and sign-in, certificates (library, 7 certificate pages, How to read a CoA, product certificate panels and links), the price list, the Process, Terms, Privacy and Legal pages, the Bahasa Indonesia switch and dictionary, every mention of Indonesia, rupiah, Jabodetabek and WIB, and the homepage box photograph. 167 → 148 templates.
- Ordering: a product page shows its sizes and Order on WhatsApp; the message reads "Hello AXIOM, I would like to order Retatrutide 30 mg." for the chosen size (devices name their option in brackets). The phone order bar mirrors the chosen size and link. Compound guide lots each have an Order link; cards show their sizes and open the product page.
- Wording kept the testing claim without certificates: "HPLC/MS verified per lot", "Coded by lot" on The standard, and the FAQ keeps four questions. The Contact page sends orders and questions to WhatsApp.
- `showcase.py` makes these edits at build time and stops the build on any missing target or any link to a removed route. `qa/check-showcase.cjs` replaces the Indonesian and basket checks: 148 routes free of price, basket, certificate, account, subscription and Indonesia wording, and order links checked on the product page, a device page, the phone order bar and the compound guide.
- `qa/check-hero.cjs` and `qa/check-showcase.cjs` pass on the served site and the standalone HTML (19.4 MB). Reviewed in a browser at 1440 px and 390 px: homepage, shop, product and device pages, compound guide, The standard, Contact, FAQ and footer.
- Homepage manifesto band is limestone (`stone-light.webp`) instead of dark stone. The photograph fills the right of the band and fades through a solid limestone wash, so no image edge shows; text sits on plain stone colour (body text about 7:1). Checked at 1440, 1024 and 390 px.
- "Shop" is now "Catalogue" in the navigation, footer, breadcrumbs, the listing heading and the "Also in …" links; the homepage button reads "View the catalogue". The showcase check fails on any visible "shop".
- Light hero: the homepage hero is limestone (`#e5dcd1`) with dark text. The three pens are the original photographic cut-outs from `stone-hero.webp` (labels untouched) with soft drop shadows, set still over `stone-light.webp`, which fades into the limestone colour on the left. The pen motion code in `design.js` and its CSS are removed. `qa/check-hero.cjs` now checks the light background, three pens, that they ignore cursor and scroll, route remount and overflow; it passes on the served site and the standalone HTML (19.7 MB). Reviewed at 1440, 1024 and 390 px.
- Hero pens grounded: the limestone (mirrored) and the three pens are one SVG picture, so the pens lean on the tall block with their dial ends on the slab at every width, with contact and cast shadows. Its edges fade into the limestone colour. Reviewed at 1440, 1024 and 390 px; hero and showcase checks pass on the served site and the standalone HTML.
- Adamax, Selank, Semax and Selank + Semax use the supplied nasal spray photographs (1254 px, limestone set) for their cards and product pages, with new 640px card photos and PNG masters in LFS. Their presentation reads "Nasal spray" (data, product and compound guide pages, order box "Bottle size"). Their handling paragraph still describes a freeze-dried vial and needs the correct spray handling text.
- Hero: the composited pens still read as floating, so the hero now uses the three real product photographs (Retatrutide large, MOTS-c and KLOW stacked), each linking to its product page; the large photo matches the stacked pair's height. Spray handling text for Adamax, Selank, Semax and Selank + Semax now reads "Supplied as a ready solution in a sealed spray bottle. Store refrigerated (2–8 °C), upright and protected from light; keep the cap on between uses and do not freeze." (approved by the owner). Hero and showcase checks pass on the served site and the standalone HTML (19.2 MB).

## KLOW-C and full stock — November 14

- KLOW-C (KLOW + Cartalax), 100 mg at Rp 6.400.000 (SKU `klowc100`), joins Tissue Repair after KLOW: catalogue card, product page, compound page, pathway list (now 12 compounds · 14 lots), price list (87 lots) and counts (66 compounds · 80 lots, 73 products, 176 templates).
- Its photograph is the approved KLOW photograph relabelled locally (`tools/relabel_klow_c.py`): only the name and quantity were erased and redrawn; visual review confirms KLOW-C (KLOW + Cartalax), 100 mg and dial 0.
- No product is sold out: TB-500, Thymosin Alpha-1 and Epithalon now carry stock (12, 8 and 10), and their cards, buy boxes and compound rows use the in-stock markup. No template carries "Sold out", "None available" or a notify form.
- `verify_stone.py` passes for 73 products; `qa/check-basket.cjs`, `qa/check-i18n.cjs` (172 routes, no English left) and `qa/check-hero.cjs` pass on the served site.

## KLOW-C in the showcase — November 14

- Merged the base branch's KLOW-C (KLOW + Cartalax), 100 mg, into the showcase: it appears without a price in the catalogue, on its product page with Order on WhatsApp ("Hello AXIOM, I would like to order KLOW-C (KLOW + Cartalax) 100 mg.") and in the compound guide. The base's price list, Indonesian entries and basket markup stay out, as `showcase.py` removes them at build time. 148 → 150 templates, 68 → 69 products (66 compounds); the homepage link reads "View all 66 compounds".

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

## Adamax 1032 Da — November 15

- Adamax 1032 Da, 10 mg at Rp 3.400.000 (SKU `adamax1032-10`), joins Neuro after Adamax. It was already in the price list, margin structure, website catalogue, order form, invoice builder, label builder and compound guide; the storefront was the one surface without it. Catalogue card, product page, compound page, pathway list (now 9 compounds · 9 lots), related lists, price list (95 lots) and counts (70 compounds · 88 lots, 77 products, 184 templates).
- Its photograph is the approved Adamax pen photograph with the name redrawn by `tools/relabel_label.py`; visual review confirms Adamax 1032 Da, 10 mg and dial 0. No PNG master is committed.
- `verify_stone.py` passes for 77 products; `qa/check-i18n.cjs` (180 routes, no English left), `qa/check-basket.cjs` and `qa/check-hero.cjs` pass on the served site.

## The 88-lot catalogue and the guide's facts in the showcase — November 15

- Merged the base branch's catalogue (#59): Semaglutide (10, 30, 40 mg), Tri-Heal (BPC+TB+KPV) 30 mg, SSM (SS-31 + MOTS-C) 40 mg, Adamax 1032 Da 10 mg, Retatrutide 5 mg and Tirzepatide 60 and 80 mg, the supplier-sheet prices, Cerebrolysin 60 mg and NAD+ as one 1000 mg lot. They appear without prices and order on WhatsApp. Its merch, basket, price list and Bahasa Indonesia stay out; Adamax, Selank, Semax and Selank + Semax stay nasal sprays.
- Every compound and product page carries the dosage guide's facts (`guide.py`, read from `dosage-guide/compounds.js` at build time): plain-language summary, the guide's class line (also on cards, pathway lists and related lists), route, the fridge storage line in place of "Store sealed at −20 °C", and an Evidence section with status, half-life, evidence note and cautions. No doses, cadence, timing or protocols. Six guide summaries that name an injection interval (Semaglutide, Cagrilintide, Retatrutide, Tirzepatide, CJC-1295 with DAC, Tesamorelin) read without it. Evidence-note sentences that point at the guide's dose table ("The doses below are the label's", six compounds) and the Semaglutide and Tirzepatide caution about going up too fast are left out; the build stops if either kind remains.
- 158 templates, 73 products (70 compounds · 88 lots and three devices). Build, `verify_stone.py`, `qa/check-hero.cjs` and `qa/check-showcase.cjs` pass on the served site and the standalone file.
