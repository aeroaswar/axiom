# AXIOM — Protocol Card & Compound Guide

A card that carries nothing but the wordmark and a QR, and the guide it opens.

| File | What it is |
| --- | --- |
| `card.html` | Print-ready card — 85 × 55 mm, AXIOM wordmark left, QR right, nothing else. Pick a compound, set the URL, print. |
| `index.html` | What the QR opens. Mobile-first guide to every lot in the price list — 79 lots across 65 compounds: what it is, how often, when in the day, the documented doses, a pen calculator, a dose schedule with calendar export, storage and cautions. |
| `compounds.js` | The data behind both. One entry per compound, carrying every size that compound is sold in. |
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

Every lot in the AXIOM price list, across nine categories, written in plain
language — the audience is the person holding the pen, not a pharmacologist.
Each compound leads with a sentence saying what it actually does; the technical
class sits underneath in small type.

**Two counts, both correct.** The price list has **79 lots**; the guide has **65
pages**. A compound sold in more than one size is one page with a size chip per
lot, and ten compounds are sold in several sizes — 14 lots more than there are
pages. Retatrutide alone is five of the 79 (10, 20, 30, 40 and 60 mg). The index
states both counts, derived from `compounds.js` rather than hardcoded, so the
line stays true when the catalogue changes.

Per compound, in order:

1. **At a glance** — how often, when, how it goes in, how long it lasts in the body.
2. **How sure are we** — which evidence tier the doses below come from.
3. **How often** — with a seven-day strip you can shift (see below).
4. **When to take it** — time of day, food, and why that timing rather than another.
5. **Doses** — the documented rows, each with its provenance.
6. **Watch out for** — placed before the calculator, so the cautions are read
   before the first dose rather than after the benefits and the storage notes.
7. **Your pen** — the calculator and the sizes AXIOM sells.
8. **Your dose dates** — every dose in the pen on real dates, with calendar export.
9. **What it is used for**, **Looking after it**, and scope.

The index lists everything by category. Each row leads with the compound's own
plain-language first sentence — *"A weekly shot that copies two gut hormones"* —
rather than its pharmacology class, which most readers cannot parse. The class
is still searchable: the search covers name, class, category and description.

### More than one schedule

Where a compound has more than one sensible way to spread the same weekly
amount, `regimens` on that compound puts a switcher above the seven-day strip.
Picking one sets the pattern, the size of each dose and the frequency together,
and everything downstream — strip, calculator, dose dates, calendar export —
follows.

Retatrutide is the first to use it: once a week at the full amount, or twice a
week at half each. The weekly total is identical either way, so a pen lasts the
same number of days; only the peak after each injection differs. The option's
note says plainly that the trials tested the weekly schedule, not the split.

The field is generic — add a `regimens` array to any compound in `src/` and the
switcher appears. Compounds without one behave exactly as before.

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
dose, and the time of day — pre-filled from the compound's own timing guidance
("Before sleep" gives 21:30, "Morning" 08:00) and editable. Outputs: **doses in
the pen**, quantity, each dose, each week, how long the pen lasts, and the date
of the last dose.

Tap a size chip to load that pen size, which makes it easy to see which size
actually fits a protocol. It flags a dose bigger than the pen holds, and a
remainder too small for another full dose.

**Where the starting dose comes from.** The calculator needs a figure to work
with, and on most pages the Doses section above says no human dose has been
set. So one line under the fields always says what the pre-filled figure is:

- where the page documents a dose, it names it — *"Starts at 2.5 mg — the
  starting dose above"*, or *"within the trial range above"* for a range;
- where it documents none, it says so — *"0.25 mg is only a placeholder so the
  sums work. This page gives no dose to start from — put in your own."*

Change the dose and the line becomes *"Worked out at the dose you entered."* Ten
compounds start from a documented dose; the other 55 are marked placeholders.
Without this, a page would print *Human dose: Not set* and then, directly below,
*40 doses in this pen at 0.25 mg* — a recommendation it had just declined to make.

Prices are deliberately not shown and are not in the shipped data. The source
tables under `src/` keep them as the record of the price list, so `src/` is a
build input — it does not need to be deployed with the pages.

### Dose dates and calendar export

Every dose in the pen is projected onto real dates, through to the last one. Two
ways to get them into a calendar:

- **Download .ics** — one 30-minute event per dose at the chosen time, named
  with the compound and dose, each carrying the timing note. Imports into Apple
  Calendar, Google Calendar and Outlook.
- **Google Calendar** — a plain link that opens one repeating event, the weekly
  pattern expressed as an `RRULE` with a `COUNT` matching the doses in the pen.
  It needs no file at all, which makes it the route that works on a phone or
  inside a sandbox.

RFC 5545 is strict in ways that quietly break Apple Calendar, so the writer
handles all three:

- lines fold at **75 octets**, counted in UTF-8 bytes so a multi-byte character
  is never split across a fold;
- **CRLF** throughout, including a trailing one;
- **no `METHOD:`** — with one, Apple Calendar treats the file as a meeting
  invitation rather than a calendar to import, and refuses it.

Times are written as **floating local** (`DTSTART:20260901T213000` — no `Z`, no
`TZID`), so every calendar reads them in the viewer's own zone. That is what you
want for a personal reminder: 21:30 stays 21:30 after a flight, and the file
needs no `VTIMEZONE` block.

Where a sandbox blocks downloads the button shows the file's text instead. That
copy goes through the clipboard API rather than the textarea, because a textarea
normalises CRLF to LF and would hand over a file the format does not allow.

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
  pen: { qty: 10, dose: 0.5, unit: "mg",       // unit: mg | IU | mL
         basis: null },                       // derived by gen.py: the protocol row
                                              // `dose` comes from, or null if none
  // optional — omit unless there is genuinely more than one way to schedule it
  regimens: [
    { id: "weekly", label: "Once a week", sub: "2 mg in one go",
      dose: 2, perWeek: 1, days: [1,0,0,0,0,0,0], note: "…" },
    { id: "split",  label: "Twice a week", sub: "1 mg each time",
      dose: 1, perWeek: 2, days: [1,0,0,1,0,0,0], note: "…" }
  ],
  sizes: [{ qty: 10, unit: "mg" }],           // prices live in src/, not here
  storage: "…", cautions: ["…"]
}
```

A protocol row reading *Not set*, *Not established* or *None* renders in the muted
"no figure" style. A compound with an all-zero `days` array is episodic and gets
no schedule.

`gen.py` derives each pen's `basis` — the protocol row its `dose` comes from —
by matching `dose` against the figures the protocol rows state in the same unit
(ranges included; increments and per-kg doses are skipped). **If a row states a
dose and `dose` matches none of them, the build fails**, because the calculator
would contradict the page it sits on. Regimen doses are checked the same way.

## Verification

The QR encoder is not a dependency, so it is checked rather than trusted:

- Codeword construction, data placement, format-info BCH and Reed–Solomon syndromes verified against an independent implementation.
- Mask selection matches independent penalty scoring across all eight masks.
- 84 payloads across ECC L/M/Q/H decode with `zxing-cpp`, the engine behind most scanner apps.
- Cards rendered to print PDFs, rasterised at 300 dpi, and decoded back to the exact expected URL, with the wordmark confirmed present in each.
- All 65 compound pages checked for correct dose counts, schedule length, size chips and layout, with no horizontal overflow at phone width.
- Every page's starting-dose line checked against its data: the 10 documented doses name the row they come from, the 55 placeholders say so, editing the dose switches the line, and Retatrutide's two schedules each carry their own.
- Every lot in the price list PDF matched against `compounds.js` by name *and* size: 79/79, so no lot is missing a page and no size chip is offered that isn't a real lot. Four names differ in presentation only and are mapped deliberately — the price list's `CJC-1295 (No DAC) + Ipamorelin`, `VIP (Vasoactive Intestinal Peptide)`, `SLU-PP-332 (Injectable)` and `PT-141` appear here as `CJC-1295 + Ipamorelin`, `VIP`, `SLU-PP-332` and `PT-141 (Bremelanotide)`.
- The generated `.ics` validated for all 62 scheduled compounds — 1199 events — against line length, CRLF, absent `METHOD` and round-trip parsing with the `icalendar` library.
- Printed geometry measured off the PDF: 85.0 × 55.0 mm trim, 91.0 × 60.9 mm with bleed, 10-up sheet at 170 × 275 mm.

## Scope

Reference material for compounds supplied for research use. Not medical advice,
not a prescription, and not a recommendation to administer anything to a person.
