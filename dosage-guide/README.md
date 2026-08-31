# AXIOM — Protocol Card & Compound Guide

A card that carries nothing but the wordmark and a QR, and the guide it opens.

| File | What it is |
| --- | --- |
| `card.html` | Print-ready card — 85 × 55 mm, AXIOM wordmark left, QR right, nothing else. Pick a compound, set the URL, print. |
| `index.html` | What the QR opens. Mobile-first guide to every compound in the price list: what it is, how often, when in the day, the documented doses, a pen calculator, a dose schedule with calendar export, storage and cautions. |
| `compounds.js` | The data behind both. One entry per compound. |
| `qr.js` | Self-contained QR encoder. No CDN, no network — the card generates its own code. |
| `src/` | The compound tables and the script that generates `compounds.js`. Edit these, then run `python3 src/gen.py`. |
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

All 65 compounds from the AXIOM price list, across nine categories, written in
plain language — the audience is the person holding the pen, not a pharmacologist.
Each compound leads with a sentence saying what it actually does; the technical
class sits underneath in small type.

Per compound, in order:

1. **At a glance** — how often, when, how it goes in, how long it lasts in the body.
2. **How sure are we** — which evidence tier the doses below come from.
3. **How often** — with a seven-day strip you can shift (see below).
4. **When to take it** — time of day, food, and why that timing rather than another.
5. **Doses** — the documented rows, each with its provenance.
6. **Your pen** — the calculator and the sizes AXIOM sells.
7. **Your dose dates** — every dose in the pen on real dates, with calendar export.
8. **What it is used for**, **Looking after it**, **Watch out for**, and scope.

The index lists everything by category with a search across name, class, category
and description.

### Shifting the week

The seven-day strip is made of buttons. Tap any day and the whole pattern rotates
to start there, keeping the spacing intact — a twice-weekly compound stays three
and four days apart whether it starts on Monday or Saturday. Picking a start date
in the calculator shifts the pattern the same way, so the strip and the date never
disagree.

### Pen calculator

Pens ship ready to use — the mixing water is already in the stated quantity — so
there is nothing to dilute and no draw volume to compute. It works in whatever
unit the compound is sold in: mg, IU or mL.

Inputs: quantity in the pen, size of each dose, doses per week, date of the first
dose. Outputs: **doses in the pen**, quantity, each dose, each week, how long the
pen lasts, and the date of the last dose.

Tap a size chip to load that pen size and its price, which makes it easy to see
which size actually fits a protocol. It flags a dose bigger than the pen holds,
and a remainder too small for another full dose.

### Dose dates and calendar export

Every dose in the pen is projected onto real dates, through to the last one. **Add
to calendar** builds a standard `.ics` file — one all-day event per dose, named
with the compound and dose, each carrying the timing note in its description. It
imports into Apple Calendar, Google Calendar and Outlook.

Where a page is embedded in a sandbox that blocks downloads, the button falls back
to showing the file's text to copy and save by hand.

## Evidence tiers

The spine of the guide. Every dosing figure carries the tier it came from, and
where no human protocol exists the guide says so rather than filling the gap
with a number.

| Tier | Meaning |
| --- | --- |
| **Approved medicine** | An approved medicine. The doses shown are the official ones, and the approval is named. |
| **Studied in people** | Not approved, but tested in real human trials. The doses shown are what those trials used. |
| **Approved in some countries** | Approved or sold in certain countries only. |
| **Lab research only** | Lab and animal work only. No human dose has been set, and none is invented. |

Across the 65 compounds: 9 are approved medicines, 10 have real human trial data,
21 are approved or sold in some countries only, and 25 rest on lab and animal work
alone. That last group is where the guide says *no human dose has been set* rather
than printing a number.

## Adding a compound

`compounds.js` is generated. The source tables live alongside the build script;
each entry looks like this, and both pages pick up a new one with no other change:

```js
{
  slug: "kpv", name: "KPV", category: "Healing & Repair",
  what: "A plain sentence saying what it actually does.",
  cls: "The technical class, shown small underneath",
  halfLife: "Short", route: "Under the skin",
  cadence: "daily",              // daily | weekly | cycle | as-needed
  days: [1,1,1,1,1,0,0],         // Mon–Sun; the strip and schedule rotate this
  cadenceNote: "…",
  timing: { when: "Morning", food: "Either", note: "…" },
  perWeek: 7,                    // seeds the calculator
  evidence: "preclinical",       // label | trial | regional | preclinical
  evidenceNote: "…",
  protocol: [{ k: "Human dose", v: "Not set", n: "…" }],
  benefits: ["…"],
  pen: { qty: 10, dose: 0.5, unit: "mg" },      // unit: mg | IU | mL
  sizes: [{ qty: 10, unit: "mg", price: 2300000 }],
  storage: "…", cautions: ["…"]
}
```

A protocol row reading *Not set*, *Not established* or *None* renders in the muted
"no figure" style. A compound with an all-zero `days` array is episodic and gets
no schedule.

## Verification

The QR encoder is not a dependency, so it is checked rather than trusted:

- Codeword construction, data placement, format-info BCH and Reed–Solomon syndromes verified against an independent implementation.
- Mask selection matches independent penalty scoring across all eight masks.
- 84 payloads across ECC L/M/Q/H decode with `zxing-cpp`, the engine behind most scanner apps.
- Cards rendered to print PDFs, rasterised at 300 dpi, and decoded back to the exact expected URL, with the wordmark confirmed present in each.
- All 65 compound pages checked for correct dose counts, schedule length, size chips and layout.
- The generated `.ics` validated against the spec and parsed by the `icalendar` library.
- Printed geometry measured off the PDF: 85.0 × 55.0 mm trim, 91.0 × 60.9 mm with bleed, 10-up sheet at 170 × 275 mm.

## Scope

Reference material for compounds supplied for research use. Not medical advice,
not a prescription, and not a recommendation to administer anything to a person.
