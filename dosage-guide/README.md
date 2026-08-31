# AXIOM — Protocol Card & Compound Guide

A card that carries nothing but the wordmark and a QR, and the guide it opens.

| File | What it is |
| --- | --- |
| `card.html` | Print-ready card — 85 × 55 mm, AXIOM wordmark left, QR right, nothing else. Pick a compound, set the URL, print. |
| `index.html` | What the QR opens. Mobile-first compound guide: cadence, when to apply, protocol, a dose-and-supply calculator, a dose schedule, studied benefits, storage, cautions. |
| `compounds.js` | The data behind both. One entry per compound. |
| `qr.js` | Self-contained QR encoder. No CDN, no network — the card generates its own code. |
| `assets/axiom-wordmark-white.svg` | The AXIOM wordmark, copied from `business-proposal/assets/logo/`. |

Open either file directly in a browser; there is no build step.

## The card

One face: the wordmark on the left, the QR on the right. Everything the card
used to say in small print now lives behind the code, where there is room for it.

- **Trim** 85 × 55 mm. **Bleed** 3 mm. **Safe margin** 5 mm. QR 24 mm.
- **Bleed + crop marks** adds the bleed and corner marks — send this to a commercial printer.
- **A4 sheet** lays out 10 cards (2 × 5) on one page.
- The panel reports the QR version and module size in mm and warns below the 0.5 mm print floor. Defaults give a v3 code at ECC Q with 0.73 mm modules.

The QR payload is `{base URL}/{compound slug}`, e.g. `https://axiom.id/g/tirzepatide`.
Point the base URL at wherever the guide is hosted.

## The guide

Per compound, in order:

1. **At a glance** — cadence, when to take it, route, half-life.
2. **Evidence banner** — which tier the figures below come from.
3. **Cadence** — daily / weekly / cyclical / as-needed, with a seven-day strip.
4. **When to apply** — time of day, food, and why that timing rather than another.
5. **Protocol** — the documented rows, each with its provenance.
6. **Dose & supply** — the calculator, below.
7. **Next doses** — the cadence pattern projected onto real dates from today.
8. **Studied for**, **Storage & handling**, **Cautions**, **Scope**.

The index lists everything by category with a search across name, class,
category and cadence.

### Dose & supply calculator

Pens ship pre-mixed — the bacteriostatic water is already inside the stated
quantity — so there is nothing to dilute and no draw volume to compute. The
calculator works entirely in milligrams.

Inputs: quantity in the pen, dose, doses per week, and the date of first use.

Outputs: **doses per pen**, milligrams in the pen, per dose, per week, how many
days the pen lasts, and the date an opened pen should be discarded.

It flags three things:

- a dose larger than the pen holds;
- a pen that outlasts its 28-day in-use window at the chosen frequency, naming the doses and milligrams that actually land inside the window, what gets discarded, and the pen size that would fit;
- a remainder too small for another full dose.

## Evidence tiers

The spine of the guide. Every dosing figure carries the tier it came from, and
where no human protocol exists the guide says so rather than filling the gap
with a number.

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
  days: [1,1,1,1,1,0,0],         // Mon–Sun; drives the strip and the schedule
  cadenceNote: "…",
  timing: { when: "Morning", food: "Either", note: "…" },
  perWeek: 7,                    // seeds the calculator's doses-per-week
  evidence: "preclinical",       // label | trial | regional | preclinical
  evidenceNote: "…",             // shown verbatim in the guide's banner
  protocol: [{ k: "Human dose", v: "Not established", n: "…" }],
  benefits: ["…"],
  pen: { qtyMg: 10, doseMg: 0.5 },
  storage: "…",
  cautions: ["…"]
}
```

A protocol row whose value reads *Not established* or *None* renders in the
muted "no figure" style. A compound with an all-zero `days` array is treated as
episodic and gets no projected schedule.

## Verification

The QR encoder is not a dependency, so it is checked rather than trusted:

- Codeword construction, data placement, format-info BCH and Reed–Solomon syndromes verified against an independent implementation.
- Mask selection matches independent penalty scoring across all eight masks.
- 84 payloads across ECC L/M/Q/H decode with `zxing-cpp`, the engine behind most scanner apps.
- All twelve cards rendered to print PDFs, rasterised at 300 dpi, and decoded back to the exact expected URL, with the wordmark confirmed present in each.
- Printed geometry measured off the PDF: 85.0 × 55.0 mm trim, 91.0 × 60.9 mm with bleed, 10-up sheet at 170 × 275 mm.

## Scope

Reference material for compounds supplied for research use. Not medical advice,
not a prescription, and not a recommendation to administer anything to a person.
