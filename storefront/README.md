# AXIOM — Stone collection

Version 4 translates the approved stone reference into the entire storefront: warm ivory pages, limestone photography, charcoal stone sections, bronze accents and the authentic AXIOM wordmark.

## Open

Open `AXIOM-storefront.html` for the self-contained version, or unzip `AXIOM-storefront.zip` and serve its folder:

```sh
python3 serve.py
```

Visit http://127.0.0.1:8765.

## Design and content

- The homepage hero has three independently animated photographic pen layers: restrained scroll depth, eased cursor movement and a soft bronze cursor glow. The stone stays fixed. Mobile uses smaller scroll movement without hover effects; reduced motion and image failures keep the original static hero. Animation stops when offscreen and is cleaned up on route changes.
- Hero labels and dials use the original photograph via SVG clipping. `assets/hero-stone-background.webp` is the clean background plate; edit the layers in `home-v2.html` and motion behavior in `design.js`.
- The footer now has a plain charcoal background, one small wordmark, aligned links and compact spacing. The overlapping rock background and oversized duplicate wordmark are removed.
- All 72 shop products use individual stone photographs: 65 research compounds, three devices and four apparel products. The same photographs appear on their product detail pages and applicable collection pages.
- Compound labels retain the catalogue names and first-variant quantities. VIP was regenerated to correct its spelling.
- The stone band fades smoothly into charcoal; the footer uses one small wordmark and aligned links.
- Original prices, product names, 174 templates and client behavior are preserved.
- An EN / ID switch in the navigation shows the whole storefront in Bahasa Indonesia, including the basket, request form, filters and messages. The choice is remembered. Strings live in `i18n-id.json`; `qa/check-i18n.cjs` reports any English left in Indonesian mode.
- Lean first load: the homepage ships in a 160 KB `content.js`; the other 173 templates load from `pages/` when visited and the Indonesian dictionary only when ID is chosen. `base.css` keeps only rules the storefront uses (510 KB → 100 KB) with its two variable fonts as separate preloaded files. The standalone HTML embeds each image once (about 22 MB, from 50 MB).
- Product cards load a 640px photo where that is sharp enough (phones, laptops) and the full photograph on wide high-density screens; tiles show their stone colour while photos load. An empty basket offers the four featured compounds. Browsers set to Indonesian open the site in Indonesian until the visitor picks a language.
- `verify_stone.py` checks every product and all pen image markup. The build refuses to silently fall back to missing or rejected stone photographs.
- The image queue is complete. PNG masters and optimized WebP assets are in `assets/`; generation records are in `asset-records/`.

## Scope

This is a local storefront demo. Account sign-in, live inventory, payment and actual order submission remain unconnected demo features. The Indonesian translation was machine-drafted with a fixed glossary and needs a fluent reviewer, especially for the legal pages, before public use. Business copy and certificate data come from the supplied Claude artifact and have not been independently verified. Nothing has been publicly deployed.

## Source

The supplied artifact is preserved as `reference.html`. `pages.json`, `data.json` and `img.json` contain its extracted data. Edit `home-v2.html`, `stone-v3.css` and `design.js`, then rebuild:

```sh
python3 build.py
python3 verify_stone.py
python3 package.py
```

`asset-prompts.md` documents the image production briefs. `QA.md` records validation. The ZIP includes deployable files; the working folder also keeps build tools, original PNG image masters and earlier design versions.
