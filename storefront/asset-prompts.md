# AXIOM stone imagery — production briefs

Method: OpenAI built-in image generation and reference-based image editing, September 2026. These are consolidated production briefs rather than exact tool transcripts. Final PNG masters are preserved in assets; optimized WebP versions are used on the website.

## Reference

`approved-stone-reference.png` is the user-approved composition: matte black AXIOM pens, cut limestone and rough dark rock, soft bronze rim light, ivory negative space and a restrained premium aesthetic. Existing brand assets were used to preserve AXIOM identity.

## Shared briefs

- Compound images: square, photorealistic studio product photograph of one existing black AXIOM pen diagonally supported on natural cut limestone, taupe backdrop, soft directional light, subtle bronze label rules, authentic wordmark. Preserve the product silhouette, label name and quantity; all dials show 0. The first four featured presentations are 10 mg; subsequent compound images use the first variant quantity from data.json.
- Hero: three black AXIOM pens above a dark rough stone ledge, controlled bronze backlight, black negative space suitable for a website. Labels MOTS-c 10 mg, Retatrutide 10 mg, KLOW 80 mg; dials 0.
- Stone environments: standalone photographic surfaces without typography or products. Pale limestone blocks with open negative space on the left; dark rough stone ledge in low directional light.
- Merchandise collection: black performance tee, training hoodie, logo cap, steel water bottle and gym duffel on pale limestone plinths, warm natural studio light, original AXIOM marks, restrained bronze construction details.
- Individual merchandise: create one square photographic composition per item based on the collection; preserve the exact named physical product and brand, with consistent limestone and light.

## Assets

- stone-retatrutide
- stone-tirzepatide
- stone-mots-c
- stone-cjc-1295-no-dac-plus-ipamorelin
- stone-hero
- stone-light
- stone-dark
- stone-merch
- stone-performance-tee
- stone-training-hoodie
- stone-logo-cap
- stone-steel-water-bottle
- stone-gym-duffel

Each stem has a PNG master and WebP delivery version in assets/. Image generation is illustrative photography; the catalogue's original data remains the source for available variants and prices.

## Completed catalogue expansion — September 17

All 65 research compounds, three devices and four apparel products have stone photographs. Compound images match the approved stone-retatrutide reference and use the catalogue name and first variant quantity. VIP was regenerated with the correct spelling of Vasoactive Intestinal Peptide. All newly generated images were visually reviewed, with text recognition supplementing label checks.

The device briefs depict a matte black LED face mask, a partially rolled quilted light therapy mat and paired leg compression boots with a controller, each on natural limestone with the same taupe studio background and AXIOM branding. These are illustrative product mockups.

Method: built-in image_gen for every new photograph; no API/CLI fallback or local image compositing. Exact expansion prompts and generation source paths are in asset-records/*.json. Final files are assets/stone-{product-slug}.png and assets/stone-{product-slug}.webp. The completed queue is recorded in pending-stone-images.json.
