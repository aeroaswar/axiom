# AXIOM — Protocol Card & Compound Guide

A scannable card that ships with a compound, and the guide it resolves to.

| File | What it is |
| --- | --- |
| `card.html` | Print-ready protocol card — 85 × 55 mm, front and back, with the QR generated on the page. Pick a compound, set the URL and lot, print. |
| `index.html` | The scan destination. Mobile-first compound guide: cadence, protocol, reconstitution calculator, studied benefits, storage, cautions. |
| `compounds.js` | The data behind both. One entry per compound. |
| `qr.js` | Self-contained QR encoder. No CDN, no network — the card generates its own code. |

Open either file directly in a browser; there is no build step.

## The card

**Front** — compound, class, cadence and route badges, and the QR under a
`SCAN FOR PROTOCOL` cue. A footer strip carries half-life, evidence tier and lot.

**Back** — route, half-life and both storage temperatures; a seven-day cadence
strip; the headline protocol line; and the guide URL in plain text, so the card
still works when a camera will not cooperate.

### Printing

- **Trim** 85 × 55 mm. **Bleed** 3 mm (toggle on for the printer). **Safe margin** 4.2 mm.
- **Bleed + crop marks** adds the 3 mm bleed and corner marks — send this version to a commercial printer.
- **A4 imposition sheet** lays out 8 cards, fronts on page 1 and backs on page 2, for duplex printing.
- The panel reports the QR version, module size in mm, and warns below the 0.5 mm print floor. Shorten the base URL or drop the ECC level if it trips.

Defaults produce a v3 QR at ECC Q with 0.64 mm modules — comfortably inside print tolerance.

### QR payload

`{base URL}/{compound slug}`, e.g. `https://axiom.id/g/tirzepatide`. Point the
base URL at wherever the guide is hosted; the slug comes from `compounds.js`.

## Evidence tiers

The spine of both the card and the guide. Every dosing figure carries the tier
it came from, and where no human protocol exists the guide says so rather than
filling the gap with a number.

| Tier | Meaning |
| --- | --- |
| **Approved label** | An approved product label exists. The regimen shown is the labelled one, and the label is named. |
| **Clinical trial** | Not approved. Dosing is from registered human trials — trial protocol, not a licensed regimen. |
| **Regional approval** | Approved or registered in specific jurisdictions only. |
| **Preclinical only** | Animal or in-vitro data only. No established human dose; none is invented. |

Of the twelve compounds currently in the file, three carry an approved label
(tirzepatide, tesamorelin, PT-141), one is trial-dosed (retatrutide), three are
regionally approved, and five are preclinical-only.

## Adding a compound

Append an entry to `window.COMPOUNDS` in `compounds.js`. Both pages pick it up
with no other change — the card's compound menu and the guide's index are built
from the array.

```js
{
  slug: "kpv", name: "KPV", category: "Tissue Repair",
  cls: "α-MSH C-terminal tripeptide",
  halfLife: "Short", route: "Subcutaneous",
  cadence: "daily",              // daily | weekly | cycle | as-needed
  days: [1,1,1,1,1,0,0],         // Mon–Sun, drives the seven-day strip
  cadenceNote: "…",
  evidence: "preclinical",       // label | trial | regional | preclinical
  evidenceNote: "…",             // shown verbatim in the guide's banner
  protocol: [{ k: "Human dose", v: "Not established", n: "…" }],
  benefits: ["…"],
  recon: { vialMg: 10, bacMl: 2, doseMg: 0.5, unit: "mg" },
  storage: "…",
  cautions: ["…"]
}
```

A protocol row whose value reads *Not established* or *None* renders in the
muted "no figure" style, and the card back switches to its no-human-dose line.

## Reconstitution calculator

Vial strength ÷ diluent gives the concentration; the target dose divided by that
concentration gives the volume; units are that volume on a U-100 syringe, where
100 units = 1 mL. It converts a volume — it does not decide what the dose should
be. It flags a draw over 100 units (one full syringe) or under 2 units (hard to
measure), and says which way to change the diluent.

## Verification

The QR encoder is not a dependency, so it is checked rather than trusted:

- Codeword construction, data placement, format-info BCH and Reed–Solomon syndromes verified against an independent implementation.
- Mask selection matches independent penalty scoring across all eight masks.
- 84 payloads across ECC L/M/Q/H decode with `zxing-cpp`, the engine behind most scanner apps.
- All twelve cards were rendered to print PDFs, rasterised at 300 and 600 dpi, and decoded back to the exact expected URL.

## Scope

Reference material for compounds supplied for research use. Not medical advice,
not a prescription, and not a recommendation to administer anything to a person.
