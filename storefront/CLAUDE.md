# AXIOM storefront — project handoff

Continue the existing local AXIOM storefront in this folder. The user has approved its stone-led visual direction and asked to continue working in Claude Code. Preserve the current website as the baseline; a framework migration is a separate decision.

## Design requirements

- Keep the authentic AXIOM wordmark, charcoal/black, warm ivory, and restrained bronze palette.
- Every shop product uses its matching stone photograph, including its detail page. Preserve all 68 product mappings.
- Preserve exact product names, labels, dial artwork, quantities, prices and existing copy unless the user requests a change.
- Stone imagery must fade smoothly into charcoal. Avoid visible rectangular image edges.
- The homepage manifesto band ("A higher standard for research") is limestone: `assets/stone-light.webp` on the right, fading through a solid limestone wash into the band colour, with dark text on plain stone.
- The product listing is the Catalogue, never the Shop: navigation, footer, breadcrumbs and headings. `qa/check-showcase.cjs` fails on visible "shop".
- Keep the footer compact: one small wordmark, aligned navigation and restrained spacing.
- The hero is light limestone (`#e5dcd1`) with dark text. It shows the product photographs of Retatrutide (large) with MOTS-c and KLOW stacked beside it, each pen really resting on stone, linking to its product page. Nothing moves except a slight zoom on hover (off under reduced motion). Cut-out pens composited onto limestone were tried and rejected as floating.
- No text under 11px: `build.py` raises any smaller size in the generated `base.css` and stops the build if `design.css`, `editorial-v2.css` or `stone-v3.css` declares one. Text meets 4.5:1 contrast on its background. On ivory, the secondary grey is `--muted-2: #666259`.
- The demo notice sits in the top ribbon (`.demo-tag`, placed by `build.py`), never floating over content. On phones, product pages show an order bar with the chosen size and Order on WhatsApp (`design.js`) until the order box is on screen.
- The storefront is a showcase in English only: the catalogue, product pages and the compound guide, with orders taken on WhatsApp. It has no prices, basket, plans or subscriptions, accounts, certificates (COA), price list, legal pages, Bahasa Indonesia or mention of Indonesia. `showcase.py` enforces this at build time and `qa/check-showcase.cjs` checks every route.

## Architecture and source of truth

This is a static HTML/CSS/JavaScript storefront with hash routing and Python build scripts. There is no required Node build step.

| File | Purpose |
| --- | --- |
| `home-v2.html` | Editable homepage, including the hero photo grid |
| `stone-v3.css` | Final visual overrides, gradients, responsive styles and hero layers |
| `design.js` | Custom behavior, route enhancements and the phone order bar |
| `editorial-v2.css`, `design.css` | Earlier style layers still used by the site |
| `pages.json` | Source page templates |
| `data.json` | Source product data |
| `img.json` | Original image data, remapped to stone images during build |
| `reference.html` | Original supplied storefront; build extracts its application logic and base styles |
| `build.py` | Generates `index.html`, `content.js`, `app.js`, `base.css`, `pages/` and the font files |
| `showcase.py` | Build step that removes the shop from the reference: prices, basket, plans, certificates, accounts, the price list and legal pages; adds WhatsApp ordering; fails the build on any link to a removed route |
| `pages/*.js` | Generated: one template per file, loaded on first visit (the homepage ships in `content.js`) |
| `assets/` | Existing photography and brand assets |
| `stone-quality.json` | Image acceptance information used by the build |
| `verify_stone.py` | Catalogue and detail image coverage checks |
| `package.py` | Generates standalone `AXIOM-storefront.html` and deployable ZIP |
| `artifact.py` | Stages the built site in `artifact/` for republishing the Claude Artifact |
| `card_photos.py` | Makes the 640px card photos (`assets/stone-<slug>-640.webp`) from the PNG masters; run after adding or changing a product photograph and commit the output |
| `serve.py` | Local preview server |
| `qa/check-hero.cjs` | Browser checks: light limestone hero, three product photographs that load, align and stay still, route remount, no overflow |
| `qa/browser.cjs` | Shared Playwright setup and route helpers for the QA scripts |
| `qa/check-showcase.cjs` | Browser checks: every route free of price, basket, certificate, account, subscription and Indonesia wording and of links to removed routes; WhatsApp order links name the chosen product and size (product page, phone order bar, compound guide) |

Edit source files, then rebuild. Direct edits to generated files are overwritten. For changes to core application behavior, inspect how `build.py` extracts the app from `reference.html` before selecting the appropriate source change.

CSS load order: `base.css`, `design.css`, `editorial-v2.css`, `stone-v3.css`.

`base.css` is derived from the reference styles: `build.py` writes its embedded Inter and Jost variable fonts to `assets/font-*.woff2` (one weight-range rule each, preloaded from `index.html`) and drops selectors whose classes or ids appear nowhere in the templates, `body` markup, `app.js` or `design.js`. A class used only from a new place must appear in one of those, or its base rule is purged. `app.js` gains a small loader that fetches `pages/<key>.js` before rendering a template it does not have yet.

`package.py` builds the standalone HTML with every page inline and each image or font embedded once (about 22 MB): CSS images become custom properties and template paths resolve through `window.__ASSET`. In `design.js`, reference assets through `asset('assets/...')` so the standalone copy can resolve them.

The hero picture is a grid of three product photographs in `home-v2.html` (`.hero-grid`): `stone-retatrutide.webp` large, `stone-mots-c` and `stone-klow-bpc-plus-tb-plus-ghk-plus-kpv` as 640px tiles. `assets/stone-hero.webp` and `assets/hero-stone-background.webp` are no longer used by the site.

## Build and verify

Run from this directory:

```sh
python3 build.py
python3 verify_stone.py
node --check design.js
python3 package.py
```

Serve the directory in an active terminal:

```sh
python3 serve.py
```

It is a threaded server with a deeper connection queue. The plain `python3 -m http.server` drops connections when the browser loads page files, photos and fonts in parallel, which shows up as pages that fail to load.

If that port is already serving this project, reuse it. Verify a real HTTP response before sharing the preview. Use a fresh query value when delivering changes, for example `http://127.0.0.1:8765/?v=claude-handoff#/`.

For the browser checks:

```sh
node qa/check-hero.cjs
AXIOM_TEST_URL="file://$PWD/AXIOM-storefront.html#/" node qa/check-hero.cjs
node qa/check-showcase.cjs
AXIOM_TEST_URL="file://$PWD/AXIOM-storefront.html#/" node qa/check-showcase.cjs
```

The browser checks find Playwright through `qa/browser.cjs`: the project's `@playwright/test` (in the `aeroaswar/axiom` repository, after `pnpm install` at its root), a global `playwright`, `AXIOM_PLAYWRIGHT`, or this Mac's Codex-bundled copy. They use Playwright's Chromium when installed and fall back to installed Chrome; `AXIOM_BROWSER_CHANNEL` forces one. Screenshots from the checks go to `qa/latest/`, which git ignores. In the repository, CI rebuilds the storefront, fails if the committed generated files differ, and runs both checks on the served site and the standalone file.

The original PNG masters in `assets/` are stored with Git LFS in the repository; the site itself uses only the WebP/JPG files. Catalogue, homepage and related-product cards offer the 640px photo next to the full-size one through `srcset` (added by `build.py`), so small tiles load a small file; product pages keep the full-size photograph. The standalone HTML drops the `srcset` and embeds each photo once.

Check desktop and mobile rendering, the still hero, homepage route remount, image loading and horizontal overflow. Inspect the rendered result as well as running checks.

## Claude Artifact

The storefront is also published as a private Claude Artifact: https://claude.ai/artifact/XGKwxNkWwM2qR41G74qdiv. It is a snapshot; republish it after changes. Run the build steps above, then `python3 artifact.py`. It writes `artifact/site/` (ignored by git): the page without its document skeleton, as the Artifact host adds its own, and every file at an unversioned path. It also writes `artifact/publish.json`, which lists the files in two batches, since one publish takes at most 255. Publish `artifact/site/index.html` to that URL twice, with `root` set to `artifact/site`: first with the `pages` batch as `files`, then with the `assets` batch. Files left out of a publish are kept, so a change that touches only code can skip the asset batch.

## Known preview issue

The preview has shown cached files before. Check loaded script version queries and refresh with a new URL query. A server listening on a port does not prove it returns the page.

## Current scope

The site contains 148 page templates and 68 products (65 compounds and three devices). In November 2026 it became a showcase: merch, the basket, prices, plans, certificates, accounts, the price list, the Process and legal pages and the Bahasa Indonesia version were removed, and every order goes to WhatsApp (+62 812 857 3396) with the product and size in the message. `data.json` still holds prices and stock for other tools; `showcase.py` strips them from what the browser receives. Certificate data and business claims originate from the supplied reference and have not been independently verified. Public deployment and backend integrations require their own concrete task.

`AXIOM-storefront.html` is a self-contained viewing artifact. `AXIOM-storefront.zip` is a deployable static package, not a complete source handoff. Work in this full folder for access to the editable sources and build scripts.
