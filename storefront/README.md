# AXIOM — Stone collection

Version 4 translates the approved stone reference into the entire storefront: warm ivory pages, limestone photography, charcoal stone sections, bronze accents and the authentic AXIOM wordmark.

## Open

Open `AXIOM-storefront.html` for the self-contained version, or unzip `AXIOM-storefront.zip` and serve its folder:

```sh
python3 serve.py
```

Visit http://127.0.0.1:8765.

## Design and content

- The homepage hero is light limestone. The three original pens (MOTS-c, Retatrutide, KLOW) are clipped from their photograph with SVG paths, so labels and dials keep their pixels, and rest still over the limestone photograph with soft shadows. Edit them in `home-v2.html`.
- All 68 shop products use individual stone photographs: 65 research compounds and three devices. The same photographs appear on their product detail pages and applicable collection pages.
- Compound labels retain the catalogue names and first-variant quantities. VIP was regenerated to correct its spelling.
- The stone band fades smoothly into charcoal. The footer is plain charcoal with one small wordmark, aligned links and compact spacing.
- No text is smaller than 11px (`build.py` raises smaller sizes in `base.css` and stops the build if a source stylesheet declares one), and text meets 4.5:1 contrast; on ivory the secondary grey is `#666259`.
- The storefront is a showcase in English: the catalogue, product pages and the compound guide. There are no prices, basket, plans, accounts, certificates, price list or legal pages. Every product page, phone order bar and compound guide lot orders on WhatsApp with the product and size written into the message. `showcase.py` makes these changes at build time.
- The demo notice sits in the top ribbon, never over content. On phones, product pages show an order bar with the chosen size until the order box is on screen.
- The wordmark is the drawing from the supplied reference storefront, not the repository's master path in `../business-proposal/assets/logo/`; see `../DESIGN.md`.
- Product names, labels and 148 templates are preserved.
- Lean first load: the homepage ships in a 170 KB `content.js`; the other templates load from `pages/` when visited. `base.css` keeps only rules the storefront uses (510 KB → 100 KB) with its two variable fonts as separate preloaded files. The standalone HTML embeds each image once (about 19 MB, from 50 MB).
- Product cards load a 640px photo where that is sharp enough (phones, laptops) and the full photograph on wide high-density screens; tiles show their stone colour while photos load.
- `verify_stone.py` checks every product and all pen image markup. The build refuses to silently fall back to missing or rejected stone photographs.
- The image queue is complete. PNG masters and optimized WebP assets are in `assets/`; generation records are in `asset-records/`.

## Scope

This is a local storefront demo. Orders go to WhatsApp; nothing on the site takes payment or stores an order. Business copy comes from the supplied Claude artifact and has not been independently verified. Nothing has been publicly deployed.

## Source

The supplied artifact is preserved as `reference.html`. `pages.json`, `data.json` and `img.json` contain its extracted data. Edit `home-v2.html`, `stone-v3.css` and `design.js`, then rebuild:

```sh
python3 build.py
python3 verify_stone.py
python3 package.py
```

After adding or changing a product photograph, run `python3 card_photos.py` to make its 640px card photo, and commit the output.

`asset-prompts.md` documents the image production briefs. `QA.md` records validation. The ZIP includes deployable files; the working folder also keeps build tools, original PNG image masters and earlier design versions. `CLAUDE.md` holds the working rules for this folder: design requirements and the source-of-truth table.

## Checks

```sh
node qa/check-hero.cjs     # light hero, three still pens, route remount, no overflow
node qa/check-showcase.cjs # every route free of shop wording; WhatsApp links name the chosen size
```

Point the first two at the standalone file with `AXIOM_TEST_URL="file://$PWD/AXIOM-storefront.html#/"`. CI rebuilds the storefront, fails if the committed generated files differ, and runs all three.

## Claude Artifact

The storefront is also a private Claude Artifact: https://claude.ai/artifact/XGKwxNkWwM2qR41G74qdiv. It is a snapshot. After a change, rebuild, run `python3 artifact.py` and publish `artifact/site/` in the two batches listed in `artifact/publish.json` (details in `CLAUDE.md`).

## Brand

The palette, type, wordmark and voice shared with the rest of AXIOM are in `../DESIGN.md` and `../SOUL.md`. This storefront is the variant on light ground; DESIGN.md lists its colours.
