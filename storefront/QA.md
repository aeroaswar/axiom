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
