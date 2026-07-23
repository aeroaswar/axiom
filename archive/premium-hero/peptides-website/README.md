# AXIOM Research Peptides — Catalogue Site

A premium, single-page static website for a research-peptide catalogue, built from
the supplied dark/gold "PRICE LIST" reference. **For research use only.**

## Design
- Dark navy + gold luxury aesthetic, Cormorant Garamond display + Inter body
- Animated molecule canvas hero, scroll-reveal, count-up stats
- Glass category panels mirroring the reference's 6 numbered categories
- Live search + category filter across all 49 compounds
- Phosphor icons, fully responsive (tables collapse to cards on mobile)
- Prominent "Research Use Only" disclaimer and IDR pricing

## Run
No build step. Serve the folder statically:
```sh
cd peptides-website
python3 -m http.server 4321
# open http://localhost:4321
```

## Files
- `index.html` — markup, styles, and interactivity (self-contained)
- `data.js` — the catalogue data (6 categories, 49 compounds, IDR prices)
