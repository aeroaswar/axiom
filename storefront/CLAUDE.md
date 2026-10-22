# AXIOM storefront — project handoff

Continue the existing local AXIOM storefront in this folder. The user has approved its stone-led visual direction and asked to continue working in Claude Code. Preserve the current website as the baseline; a framework migration is a separate decision.

## Design requirements

- Keep the authentic AXIOM wordmark, charcoal/black, warm ivory, and restrained bronze palette.
- Every shop product uses its matching stone photograph, including its detail page. Preserve all 72 product mappings.
- Preserve exact product names, labels, dial artwork, quantities, prices and existing copy unless the user requests a change.
- Stone imagery must fade smoothly into charcoal. Avoid visible rectangular image edges.
- Keep the footer compact: one small wordmark, aligned navigation and restrained spacing.
- The hero contains MOTS-c, Retatrutide and KLOW. Each original photographic pen moves independently with scrolling and cursor input, over a stationary stone background. Preserve the original label pixels.
- Keep the headline and buttons stationary during interaction. Use eased movement, no scroll locking, smaller mobile movement, reduced-motion support and a complete static fallback.

## Architecture and source of truth

This is a static HTML/CSS/JavaScript storefront with hash routing and Python build scripts. There is no required Node build step.

| File | Purpose |
| --- | --- |
| `home-v2.html` | Editable homepage and SVG pen layers |
| `stone-v3.css` | Final visual overrides, gradients, responsive styles and hero layers |
| `design.js` | Custom behavior, route enhancements and hero animation |
| `editorial-v2.css`, `design.css` | Earlier style layers still used by the site |
| `pages.json` | Source page templates |
| `data.json` | Source product data |
| `img.json` | Original image data, remapped to stone images during build |
| `reference.html` | Original supplied storefront; build extracts its application logic and base styles |
| `build.py` | Generates `index.html`, `content.js`, `app.js` and `base.css` |
| `assets/` | Existing photography and brand assets |
| `stone-quality.json` | Image acceptance information used by the build |
| `verify_stone.py` | Catalogue and detail image coverage checks |
| `package.py` | Generates standalone `AXIOM-storefront.html` and deployable ZIP |
| `qa/check-hero.cjs` | Browser checks for hero behavior |
| `i18n-id.json` | Bahasa Indonesia dictionary: exact rendered strings, whole-headline translations and patterns for live numbers |
| `qa/check-i18n.cjs` | Browser checks for the language switch, every route in Indonesian and restoring English |

## Bahasa Indonesia

The EN / ID switch sits in the navigation. `design.js` translates rendered text in place from `i18n-id.json` (built into `content.js` as `window.__I18N_ID`), so the 174 source templates stay English and switching back restores the original nodes. The choice is stored in `localStorage` as `axiom-design-lang`; English is the default. When copy changes, add the new English string and its translation to `i18n-id.json`, rebuild, and run `node qa/check-i18n.cjs`: it lists any English still showing in Indonesian mode. Headlines whose word order changes across `<br>`/`<span>` belong in its `html` section. Translations were machine-drafted with a fixed glossary; legal pages (terms, privacy, legal) and certificate wording need review by a fluent Indonesian speaker before public use.

Edit source files, then rebuild. Direct edits to generated files are overwritten. For changes to core application behavior, inspect how `build.py` extracts the app from `reference.html` before selecting the appropriate source change.

CSS load order: `base.css`, `design.css`, `editorial-v2.css`, `stone-v3.css`.

The hero uses `assets/stone-hero.webp` clipped into three inline SVG layers and `assets/hero-stone-background.webp` as the clean background. The latter was generated; the pens retain their original artwork.

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
python3 -m http.server 8765 --bind 127.0.0.1
```

If that port is already serving this project, reuse it. Verify a real HTTP response before sharing the preview. Use a fresh query value when delivering changes, for example `http://127.0.0.1:8765/?v=claude-handoff#/`.

For the browser checks:

```sh
node qa/check-hero.cjs
AXIOM_TEST_URL="file://$PWD/AXIOM-storefront.html#/" node qa/check-hero.cjs
node qa/check-i18n.cjs
AXIOM_TEST_URL="file://$PWD/AXIOM-storefront.html#/" node qa/check-i18n.cjs
```

The browser-check script currently references a machine-specific Codex-bundled Playwright package and uses installed Chrome. Inspect that path before running. If unavailable, use a locally available browser-testing setup; the website itself has no dependency on Codex.

Check desktop and mobile rendering, cursor response, distinct scroll transforms, stationary stone, pointer-leave reset, reduced motion, homepage route remount, image-load fallback and horizontal overflow. Inspect the rendered result as well as running checks.

## Known preview issue

The preview previously showed a cached static homepage. Before changing animation code, inspect `.hero-motion`, `is-motion-ready`, `is-motion-active`, image readiness and the computed transforms on `.hero-pen`. Check loaded script version queries and refresh with a new URL query. A server listening on a port does not prove it returns the page.

## Current scope

The site contains 174 page templates and 72 products. Navigation, product browsing and local demo interactions exist. Account sign-in, live inventory, payments and actual order submission remain unconnected demo features. Bahasa Indonesia works across all routes (see above). Certificate data and business claims originate from the supplied reference and have not been independently verified. Public deployment and backend integrations require their own concrete task.

`AXIOM-storefront.html` is a self-contained viewing artifact. `AXIOM-storefront.zip` is a deployable static package, not a complete source handoff. Work in this full folder for access to the editable sources and build scripts.
