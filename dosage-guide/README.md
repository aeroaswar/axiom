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

**The package card** goes in every package: two-sided, 85 × 55 mm. Its QR opens the
guide itself, `https://axiom-guide-weld.vercel.app`, where the customer picks their
compound.

- **Front:** the AXIOM wordmark on the left. On the right, the QR drawn in bone
  as round dots with rounded eyes, straight on the onyx ground with no light tile,
  and *Scan for your guide* beneath it.
- **Back:** a bronze keyline frame. Inside it, *Keep refrigerated* in bronze, and
  *Protect from light · Do not freeze* beneath.

The source is `print/card-print.html` (`qrstyle.js` draws the styled QR from
`qr.js`'s module grid). Ready-to-print files are in `print/`:

- `axiom-card-print-shop.pdf`: for a print shop. Two pages, front then back, each
  one card with 3 mm bleed and crop marks on a 101 × 71 mm page.
- `axiom-card-a4-double-sided.pdf`: for printing yourself. Ten fronts, then ten
  backs, on a centred 2 × 5 grid with cut marks. Print double-sided; the backs land
  behind the fronts whichever edge the printer flips on.
- `axiom-card-preview.png`: front and back side by side.

The QR is v5 at ECC H, 27 mm with a 3-module quiet zone: 0.63 mm modules. It is
light-on-dark, which the iPhone camera, Google Lens and current Android cameras
read. Some older scanner apps read only dark-on-light, so scan a printed proof
with the phones your customers use before ordering a batch. To regenerate the PDFs,
open `card-print.html?mode=shop` or `?mode=sheet` and print to PDF (background
graphics on, margins none).

`card.html` still makes the earlier one-sided cards, including one per compound. Pick a compound under **Card opens** there to make a card that opens that
compound's page; its QR payload is `{base URL}/{compound slug}`, e.g.
`https://axiom-guide-weld.vercel.app/tirzepatide`. The base URL defaults to the live
guide; change it on the page if the guide moves to another address.

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
7. **Your pen** — four taps: compound, pen, dose, schedule.
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

### Pen calculator — four taps

Pens ship ready to use — the mixing water is already in the stated quantity — so
there is nothing to dilute and no draw volume to compute. It works in whatever
unit the compound is sold in: mg, IU or mL.

The customer works top to bottom, mostly by tapping:

1. **Compound** — a list of all 65, grouped as on the index. Changing it opens
   that compound's page.
2. **Which pen do you have?** — one button per size AXIOM sells. *Or how much is
   left* takes a part-used pen.
3. **How much is each dose?** — one button per dose (below). *Or another amount*
   takes anything else.
4. **How often, and from when** — doses per week, the time of day (pre-filled from
   the compound's own timing guidance: "Before sleep" gives 21:30, "Morning"
   08:00) and the first dose date.

**Nothing is pre-picked** except a pen that only comes in one size, since that is
the only one the customer can have. The dose is always the customer's own tap.
Until both pen and dose are chosen the results read *"Pick your pen and your dose
to see how many doses you have and the dates they fall on."* Then: **doses in the
pen**, quantity, each dose, each week, how long the pen lasts, and the date of
the last dose. It flags a dose bigger than the pen holds, and a remainder too
small for another full dose.

**Where the dose buttons come from.** On most pages the Doses section says no
human dose has been set, so a row of buttons could easily read as a recommended
range. `gen.py` builds each page's buttons from its own Doses rows, and the line
under them says which kind the tapped one is:

- **Where the page documents doses, the buttons are exactly those** — every
  stated figure, the two ends of a stated range, and the steps of a stated
  increment. Nothing is filled in between: a round number inside a trial's range
  is not a dose the trial gave. Retatrutide gets its trial steps 1, 2, 4, 6, 9 and
  12 mg; tirzepatide its label titration, 2.5 → 15 mg in 2.5 mg steps; HGH its
  label start of 0.45–0.9 IU. Tapping one names its source: *"5 mg matches
  “After 4 weeks” in the doses above."*
- **The starting dose is marked *Start*** where the page names one — retatrutide
  2 mg, cagrilintide 0.25 mg, tirzepatide 2.5 mg, HGH 0.6 IU — and before a tap
  the line says *"Just starting? The one marked Start is where the documented
  schedule begins."*
- **Where it documents none, they are four or five round amounts** (1, 2, 2.5 and
  5 in each decade) around the compound's scale, skewed low, and the page says what
  they are before and after a tap: *"No human dose has been set for this, so these
  are quick picks, not recommendations."*
- A typed amount reads *"Worked out at the dose you entered."*

Nine compounds get documented buttons; the other 56 get quick picks. The build
fails if a compound's anchor dose contradicts a dose its own page states.

**Where the documented doses come from** (checked September 2026 against the
trials and labels themselves):

| Compound | Source | First weeks | Then |
| --- | --- | --- | --- |
| Retatrutide | Phase 3 TRIUMPH (Lilly); phase 2, *NEJM* 2023 | 2 mg weekly, weeks 1–4 | 4 → 6 → 9 → 12 mg, a step every 4 weeks. Phase 2 also ran a flat 1 mg group, and starting at 2 mg rather than 4 mg cut stomach side effects |
| Cagrilintide | Phase 3 REDEFINE 1 | 0.25 mg weekly, weeks 1–4 | 0.5 → 1 → 1.7 → 2.4 mg, a step every 4 weeks |
| Tirzepatide | Zepbound label | 2.5 mg weekly, weeks 1–4 | 5 mg, then +2.5 mg no sooner than every 4 weeks, to 15 mg |
| HGH (somatropin) | Genotropin label, adult deficiency | ~0.2 mg (0.6 IU) a day; range 0.15–0.3 mg (0.45–0.9 IU) | +0.1–0.2 mg a day every 1–2 months, by IGF-1. 1 mg = 3 IU |
| Tesamorelin | Egrifta label | 2 mg a day from day 1 | No build-up. Egrifta SV (1.4 mg) and WR (1.28 mg) are reformulations and don't carry over |
| SS-31 (elamipretide) | Forzinity label — FDA accelerated approval, 19 Sep 2025, Barth syndrome ≥30 kg | 40 mg a day from day 1 | No build-up |
| ARA-290 | Sarcoidosis nerve-pain trial | 1, 4 or 8 mg a day from day 1 | 28 days |
| PT-141 | Vyleesi label | 1.75 mg when needed | At most 1 a day, 8 a month |
| Thymosin α1 | Zadaxin, hepatitis B | 1.6 mg twice a week from day 1 | About 6 months |

AOD-9604's weight-loss trials gave it **by mouth** (1 mg tablets), so that figure
is shown but never becomes a pen button: a dose swallowed is not a dose injected.
`gen.py` skips any row about another route (by mouth, tablet, drip, infusion).

Prices are deliberately not shown and are not in the shipped data. The source
tables under `src/` keep them as the record of the price list, so `src/` is a
build input — it does not need to be deployed with the pages.

### Dose dates and calendar export

Every dose in the pen is projected onto real dates, through to the last one (the
page shows the first 120). Two buttons put the run into a calendar, and **both
add the identical thing: one repeating event at the chosen time, covering every
dose in the pen**. Deleting that one event removes the whole run.

- **Apple Calendar** — a calendar file. Safari on iPhone, iPad and Mac offers to
  add it straight to Calendar; Outlook and most other calendar apps open the
  same file. It carries a reminder at dose time (`VALARM`), because an imported
  file otherwise never alerts.
- **Google Calendar** — a plain link that opens the event ready to save. It needs
  no file, so it works from anywhere a link opens, and Google adds the account's
  default reminder itself.

The two share one recurrence rule — `RRULE:FREQ=WEEKLY;BYDAY=…;COUNT=<doses in the
pen>` — so they can never disagree. The event's `UID` is stable for the same
compound, start and time, so adding the same run twice updates it rather than
duplicating it.

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

**Where the Apple file cannot be handed over**, the button says so and offers a
way forward rather than failing silently:

- **Inside a preview frame** — such as the claude.ai artifact viewer, which blocks
  downloads — it offers *Open this page directly*, which opens the same page on
  its own where the download works, and points to Google Calendar. On a computer,
  the file's text can also be copied (through the clipboard API, because a
  textarea would turn the required CRLF into LF). The viewer's sanctioned
  download route does not accept calendar files, so no in-frame fix exists.
- **Inside another app's built-in browser on iPhone** (Instagram, Facebook, LINE,
  the Google app), which cannot pass files to Calendar, it explains how to open
  the page in Safari.

The card's QR opens the guide as an ordinary web page, where neither limit applies.

## Hosting

The guide is a static site — `index.html`, `compounds.js` and `assets/` — so any
static host works. It has to be hosted for customers anyway (the card's QR points
at it), and it is the only way **Apple Calendar** works: the claude.ai preview
blocks every download.

- **Paths.** The card encodes `{base URL}/{slug}`, e.g. `…/tirzepatide`. The page
  reads a known slug from the last path segment (as well as `?c=` and `#`), and
  `vercel.json` rewrites a single-segment path to `index.html`; real files are
  served first. Other hosts need the same one rewrite.
- **What ships.** `.vercelignore` ships only the guide. `src/` holds the price
  tables and must never be published; the card, the encoder and this README stay
  in the repo.
- **Indexing.** Every page is `noindex`, by header and by meta tag.

**Live at <https://axiom-guide-weld.vercel.app>** — Vercel project `axiom-guide`,
Root Directory `dosage-guide`, Application Preset *Other*, no build command, no
environment variables. Production deploys from the repo's default branch, so a
merge there updates the site. The card's **Base URL** defaults to this address;
if the guide moves (a custom domain under Settings → Domains), change it there
before printing, and test-scan a card through to a compound.

To set it up again elsewhere: Add New → Project → import `aeroaswar/axiom` →
Root Directory `dosage-guide` → Create. Then Settings → Deployment Protection →
turn off Vercel Authentication, or customers who scan a card get a login page.

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

Across the 65 compounds: 10 are approved medicines, 9 have real human trial data,
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
  pen: { qty: 10, unit: "mg" },                // unit: mg | IU | mL
  doseOptions: [{ v: 0.5, basis: null }, …],    // derived by gen.py (see below)
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

`gen.py` derives `doseOptions` from the protocol rows: every dose they state in
the compound's unit, the two ends of a stated range, and the steps of a stated
increment (`+2.5 mg at a time`); per-kg doses and rows about another route (by
mouth, tablet, drip, infusion) are skipped. Each option carries the row it came
from as `basis`, with `start: true` on a row named "Starting dose". With no stated dose, it lays four or five round
amounts around the source table's `dose` (from a fifth of it to twice it) with
`basis: null`, which the page labels quick picks. **If a row states a dose and the
table's `dose` or a regimen's dose matches none of them, the build fails**, so a
compound's figures can never contradict its own page.

## Verification

The QR encoder is not a dependency, so it is checked rather than trusted:

- Codeword construction, data placement, format-info BCH and Reed–Solomon syndromes verified against an independent implementation.
- Mask selection matches independent penalty scoring across all eight masks.
- 84 payloads across ECC L/M/Q/H decode with `zxing-cpp`, the engine behind most scanner apps.
- Cards rendered to print PDFs, rasterised at 300 dpi, and decoded back to the exact expected URL, with the wordmark confirmed present in each.
- All 65 compound pages checked for correct dose counts, schedule length, size chips and layout, with no horizontal overflow at phone width.
- **The nine documented compounds pinned to their sources**: each page's buttons and its Start button checked against the table above, and AOD-9604 checked to offer quick picks rather than its tablet dose.
- **Every dose button tapped against every pen button** — 364 combinations across all 65 pages — for the dose count, the highlighted buttons and the line naming the dose's source (documented or quick pick). Also checked: nothing pre-picked except single-size pens, a typed dose clears the buttons, Retatrutide's schedule switch taps its own dose, the compound list opens the chosen page, and a part-used pen of 0.3 mg at 0.1 mg gives 3 doses, not the 2 that floating-point division would.
- Every lot in the price list PDF matched against `compounds.js` by name *and* size: 79/79, so no lot is missing a page and no size chip is offered that isn't a real lot. Four names differ in presentation only and are mapped deliberately — the price list's `CJC-1295 (No DAC) + Ipamorelin`, `VIP (Vasoactive Intestinal Peptide)`, `SLU-PP-332 (Injectable)` and `PT-141` appear here as `CJC-1295 + Ipamorelin`, `VIP`, `SLU-PP-332` and `PT-141 (Bremelanotide)`.
- **Calendar export checked on all 62 scheduled compounds** plus Retatrutide twice weekly and a 500-dose run: each Apple file parses with the `icalendar` library as one event with a reminder; its rule, expanded with `dateutil`, gives exactly the doses in the pen on the dates the page shows; and the Google link's rule produces the identical dates. Line length, CRLF and absent `METHOD` checked on every file.
- The Apple button checked in a sandboxed frame that blocks downloads (nothing gets through, the panel appears, and *Open this page directly* opens an unframed copy), and under iPhone Safari, iPhone Instagram and Android browser identities for the right guidance. Not testable from here: a real iPhone's Calendar hand-off, and the live claude.ai viewer's own frame rules.
- Printed geometry measured off the PDF: 85.0 × 55.0 mm trim, 91.0 × 60.9 mm with bleed, 10-up sheet at 170 × 275 mm.

## Scope

Reference material for compounds supplied for research use. Not medical advice,
not a prescription, and not a recommendation to administer anything to a person.
