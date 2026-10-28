# AXIOM Price List — Extraction & Analysis

Source: `business-proposal/AXIOM-Price-List.pdf` (1 page, A4, generated from
`axiom-pricelist-print.html` via headless Chrome, 2026-07-19).
Machine-readable extraction: `business-proposal/data/axiom-price-list.{csv,json}`.

## 1. What the document contains

A single-page, two-column research catalogue: **52 lots across 8 pathways**, all
priced in IDR, marked `RESEARCH CATALOGUE · IDR · V1.0` and flagged Research Use
Only / in-vitro / not for human or veterinary use.

| # | Pathway | Lots | Min | Median | Max |
|---|---|---:|---:|---:|---:|
| 01 | GLP-1s & Weight Loss | 10 | 2,400,000 | 3,800,000 | 8,300,000 |
| 02 | GH Secretagogues | 8 | 2,800,000 | 3,600,000 | 5,000,000 |
| 03 | Healing & Repair | 9 | 2,100,000 | 2,900,000 | 4,400,000 |
| 04 | Brain Health & Nootropics | 6 | 2,300,000 | 3,100,000 | 3,600,000 |
| 05 | Energy & Endurance | 6 | 2,400,000 | 3,000,000 | 4,300,000 |
| 06 | Immunity | 1 | 3,600,000 | 3,600,000 | 3,600,000 |
| 07 | Sexual Health | 5 | 2,600,000 | 3,000,000 | 3,200,000 |
| 08 | Longevity & Cellular Repair | 7 | 2,100,000 | 3,000,000 | 4,500,000 |

38 unique compounds; 10 of them carry more than one lot size. Catalogue-wide:
min Rp 2,100,000 · median Rp 3,100,000 · mean Rp 3,353,846 · max Rp 8,300,000.
Every price lands on one of only 22 distinct values, all multiples of Rp 100,000.

## 2. The pricing model is fully deterministic

The internal sheet (`axiom-peptide-pricelist.html`) states the rule:

```
cost basis = supplier lot + Rp 600.000      (BAC water + research kit + handling)
price      = cost basis ÷ 0.47              (53% GM target)
rounding   = nearest Rp 100.000
```

**All 52 listed prices reproduce exactly from that formula.** Rounding is the only
source of variance: realised gross margin runs 52.1%–53.8% (mean 53.1%, median
53.3%) rather than a flat 53%. A one-of-each basket is Rp 174,400,000 revenue on
Rp 81,720,000 cost — Rp 92,680,000 gross profit at 53.1% GM.

Lowest-margin lots (rounding down): Tirzepatide 10 mg, MOTS-c 10 mg (52.1%);
GHK-Cu 100 mg, Selank 10 mg, Semax 10 mg (52.2%).
Highest (rounding up): KPV / PT-141 / DSIP 10 mg, NAD+ 500 mg, GHK-Cu 50 mg (53.8%).

## 3. Fixed cost, not material, drives the low end

The Rp 600,000 adder is divided by 0.47 too, so **Rp 1,276,596 of every single
listed price is fixed kit/handling markup** regardless of compound. That fixed
block is 15%–61% of price (median 42%):

- GHK-Cu 50 mg — Rp 2,100,000 listed, Rp 370,000 supplier lot → 61% fixed
- DSIP 5 mg — Rp 2,100,000 listed, Rp 400,000 supplier lot → 61% fixed
- Retatrutide 60 mg — Rp 8,300,000 listed, Rp 3,300,000 supplier lot → 15% fixed

This is why the floor is a hard Rp 2,100,000 and why price-per-mg spans four
orders of magnitude (Rp 600/mg for L-Carnitine 5000 mg to Rp 1,550,000/mg for
Peg MGF 2 mg): cheap-material lots are priced almost entirely on overhead.
Commercially it means small lots of cheap compounds are the weakest value story
on the sheet, and that any change to kit/shipping cost moves all 52 prices at once.

## 4. Volume ladders

Where a compound has multiple lots, per-mg falls steeply — 28%–74% off the
smallest lot:

| Compound | Ladder | Per-mg discount at top |
|---|---|---|
| Retatrutide | 5 / 10 / 15 / 20 / 30 / 60 mg | −74.4% |
| MOTS-c | 10 / 40 mg | −55.2% |
| Tirzepatide | 10 / 30 / 40 mg | −53.1% |
| GHK-Cu | 50 / 100 mg | −45.2% |
| NAD+ | 500 / 1000 mg | −42.3% |
| DSIP | 5 / 10 mg | −38.1% |
| Tesamorelin | 10 / 20 mg | −34.7% |
| CJC-1295 + Ipamorelin | 10 / 20 mg | −28.3% |

**One anomaly worth a decision.** The Retatrutide ladder is not monotonic at the
margin. Marginal price is Rp 80,000/mg from 5→20 mg, then jumps to
Rp 120,000/mg for 20→30 mg, then falls back to Rp 106,667/mg for 30→60 mg. It
is inherited, not a listing error — supplier marginal cost does the same thing
(Rp 40,000/mg → Rp 55,000/mg → Rp 50,000/mg) — but a buyer comparing steps will
see the 30 mg lot as the worst rung on the ladder.

## 5. Blends are priced as loss-leaders against their components

| Blend | Listed | Sum of parts | Delta |
|---|---:|---:|---:|
| KLOW 80 mg (BPC+TB+GHK+KPV) | 4,400,000 | 10,300,000 | −57.3% |
| BPC-157 + TB-500 "Wolverine" 20 mg | 3,900,000 | 5,600,000 | −30.4% |
| Selank + Semax 20 mg | 3,200,000 | 4,600,000 | −30.4% |
| Ipamorelin + Tesamorelin 18 mg | 5,000,000 | 6,400,000 | −21.9% |

The discount is structural, not promotional: a blend is one vial, so it pays the
Rp 1.28M fixed block once instead of two-to-four times, and its GM still lands on
53%. CJC-1295 (No DAC) + Ipamorelin 10 mg at Rp 3,000,000 vs Ipamorelin 10 mg
alone at Rp 2,800,000 prices the CJC component at Rp 200,000 — effectively free.
Worth knowing that the blends cannibalise component sales by design.

## 6. Structural observations

- **Category 06 Immunity holds a single SKU** (Thymosin Alpha-1 10 mg). It takes a
  full column heading for one row and reads as an unfinished section.
- **Only 22 distinct price points across 52 lots**, and Rp 3,000,000 alone is used
  six times. The Rp 100,000 rounding grid is coarse relative to the Rp 2.1M–8.3M
  range, which is what pushes GM off target by up to 90 bps.
- **No shipping, MOQ, payment, or validity terms appear on the PDF.** The kit,
  cold-chain, and WhatsApp-quote terms exist in the internal sheet but were not
  carried into the customer-facing page; nor is there a "prices valid until" date,
  despite the `V1.0` version stamp.
- **Naming drift.** The blend is `KLOW (BPC+TB+GHK+KPV)` on the PDF and
  `KLOW (BPC-157+TB-500+GHK-Cu+KPV)` internally. Prices agree; only the label differs.

## 7. Version note on the uploaded file

The uploaded copy is **not** byte-identical to the repo's `AXIOM-Price-List.pdf`.
Same 52 lots, same 52 prices — the only content difference is the masthead
eyebrow, which reads `HUMAN PERFORMANCE & LONGEVITY · JAKARTA` on the uploaded
copy and drops `· JAKARTA` in the repo copy. Timestamps put the uploaded file at
18:07:09 UTC and the repo file at 18:32:55 UTC on 2026-07-19, and the repo's
`axiom-pricelist-print.html` has no `JAKARTA` string — so the repo copy is the
later revision and remains canonical. No action needed beyond knowing the
uploaded file is one revision behind.
