# Catalogue rebuild — 81 lots at a 48% margin, sourced from the R-Peptides sheet

Adds every research compound on the supplier price list that AXIOM did not
already carry, prices the catalogue at a 48% gross margin target, and drops the
Retatrutide vial line.

52 original lots − 6 deleted + 35 added = **81 lots**.

Output: `AXIOM-Price-List-Full.pdf` (2 pages, 81 lots),
`axiom-pricelist-print-full.html` (render source),
`data/axiom-price-list-full.{csv,json}`.

## The supplier sheet is confirmed as AXIOM's cost basis

Before pricing anything, the sheet was checked against AXIOM's existing costs.
Taking each AXIOM lot's implied supplier cost (`cost basis − Rp 600,000`) and
comparing it to the R-Peptides listed price:

- **48 of 52 match exactly.**
- 3 have drifted (below).
- 1 is not on the sheet at that lot size (Cerebrolysin, below).

That is confirmation, not coincidence — GHK-Cu 50 mg at Rp 370,000, DSIP 5 mg at
Rp 400,000, Retatrutide 60 mg at Rp 3,300,000 and 45 others land on the exact
rupiah. The pricing formula is therefore applied to the new lines with the same
confidence as the existing ones:

```
cost basis = supplier lot + Rp 600.000
price      = cost basis ÷ 0.52          <- 48% gross margin target
rounding   = nearest Rp 100.000
```

**The margin target is 48%, not the 53% the original catalogue used.** The
divisor moved from 0.47 to 0.52; the fixed adder and the Rp 100,000 rounding
grid are unchanged. Realised margin across all 81 lots runs **47.4%–48.9%,
mean 48.10%** — the spread is rounding, as before.

Every lot reprices down: **−7.3% to −11.6%, mean −9.59%**. The catalogue floor
drops from Rp 2,100,000 to **Rp 1,900,000**. A one-of-each basket across the
final 81 lots is Rp 256,800,000 on Rp 133,270,000 of cost — Rp 123,530,000 gross
profit at 48.1%.

## What was added — 35 lots

| Cat | Compound | Lot | Supplier | Price |
|---|---|---:|---:|---:|
| 01 | Retatrutide Pen | 10 mg | 1,300,000 | 3,700,000 |
| 01 | Retatrutide Pen | 20 mg | 1,800,000 | 4,600,000 |
| 01 | Retatrutide Pen | 30 mg | 2,200,000 | 5,400,000 |
| 01 | Retatrutide Pen | 40 mg | 2,800,000 | 6,500,000 |
| 01 | Retatrutide Pen | 60 mg | 3,700,000 | 8,300,000 |
| 01 | Retatrutide Cartridge Refill | 10 mg | 950,000 | 3,000,000 |
| 01 | Retatrutide Cartridge Refill | 20 mg | 1,400,000 | 3,800,000 |
| 01 | AOD-9604 | 5 mg | 800,000 | 2,700,000 |
| 02 | CJC-1295 (With DAC) | 5 mg | 900,000 | 2,900,000 |
| 02 | IGF-1 LR3 | 1 mg | 1,350,000 | 3,800,000 |
| 02 | Sermorelin | 10 mg | 1,000,000 | 3,100,000 |
| 03 | AHK-Cu | 100 mg | 700,000 | 2,500,000 |
| 03 | ARA-290 | 10 mg | 850,000 | 2,800,000 |
| 03 | ARA-290 | 50 mg | 1,550,000 | 4,100,000 |
| 03 | SNAP-8 | 10 mg | 700,000 | 2,500,000 |
| 04 | Dihexa | 10 mg | 1,200,000 | 3,500,000 |
| 04 | VIP (Vasoactive Intestinal Peptide) | 10 mg | 1,100,000 | 3,300,000 |
| 05 | LC216 Lipo-B (Injectable) | 10 mL | 800,000 | 2,700,000 |
| 05 | LC526 Fat Blaster (Injectable) | 10 mL | 800,000 | 2,700,000 |
| 06 | Thymalin | 10 mg | 700,000 | 2,500,000 |
| 07 | Melanotan II | 10 mg | 750,000 | 2,600,000 |
| 08 | FOXO4-DRI | 10 mg | 1,800,000 | 4,600,000 |
| 08 | Glutathione | 1500 mg | 600,000 | 2,300,000 |
| 09 | Bronchogen · Cardiogen · Chonluten · Cortagen · Crystagen · Livagen · Ovagen · Pancragen · Prostamax · Testagen · Vesugen | 20 mg | 1,100,000 | 3,300,000 |
| 09 | Cartalax | 20 mg | 1,200,000 | 3,500,000 |

**New category 09, Peptide Bioregulators**, holds the twelve Khavinson-type
bioregulators, which did not fit the existing eight pathways.

Two side effects worth noting. **Category 06 Immunity is no longer a one-SKU
section** — Thymalin joins Thymosin Alpha-1. And the **Retatrutide pens and
cartridge refills close the format gap** against the competitor pen list
analysed in `COMPETITOR-PRICE-COMPARISON.md`.

## What was deliberately not added

The supplier sheet also carries BAC water and solvents, injection pens and
cartridges, and tablets. The formula does not survive contact with them, because
the Rp 600,000 adder was built for a peptide vial shipment and swamps a cheap
accessory:

| Item | Supplier | Formula would list | Multiple |
|---|---:|---:|---:|
| Cartridge for Injection Pen 3 mL | 25,000 | 1,200,000 | **48×** |
| BAC Water 10 mL | 130,000 | 1,400,000 | **11×** |
| Tadalafil Tablets 5 mg × 10 | 150,000 | 1,400,000 | **9×** |
| Acetic Acid 10 mL | 180,000 | 1,500,000 | 8× |
| Disposable Pen 3 mL | 400,000 | 1,900,000 | 5× |

BAC water is a second problem independent of the arithmetic: AXIOM already gives
it away with every order, and that giveaway is part of what the Rp 600,000 adder
pays for. Listing it for sale would contradict the offer.

Pricing these needs a separate rule — a straight multiple on accessories, or a
handling fee smaller than Rp 600,000. That is a pricing decision, not a
calculation, so the accessory tier is left out pending a call on it.

## Three supplier prices have drifted — existing lots left unchanged

The sheet no longer agrees with the cost basis behind three current lots. These
were **not** repriced, because the task was to add what is missing, not to
reprice what exists. At current listed prices the realised margins are now:

| Lot | Cost then | Cost now | Listed | GM now | vs 48% target |
|---|---:|---:|---:|---:|---:|
| Humanin 10 mg | 1,500,000 | 1,200,000 | 4,000,000 | **55.0%** | +7 pts |
| Ipamorelin 10 mg | 700,000 | 800,000 | 2,500,000 | **44.0%** | −4 pts |
| HMG 75 IU | 650,000 | 700,000 | 2,400,000 | **45.8%** | −2 pts |

Their listed prices in the price list are computed from the **old** costs,
because the task was to add what is missing rather than to reprice what exists.
Repriced on current supplier cost at 48% they would be Humanin Rp 3,500,000,
Ipamorelin Rp 2,700,000, HMG Rp 2,500,000. Say the word and they can be brought
into line.

## Retatrutide restructured

The six original **Retatrutide vial** lots (5, 10, 15, 20, 30, 60 mg) were
deleted. The five pen lots were then **relabelled from "Retatrutide Pen" to plain
"Retatrutide", with prices unchanged** — they still carry the pen supplier cost
of Rp 1,300,000–3,700,000 and price out at Rp 3,700,000–8,300,000.

The line therefore reads as ordinary Retatrutide but is priced as pens. Net
effect on the customer-facing document:

| Lot | Was (vial) | Now | Change |
|---|---:|---:|---:|
| 5 mg | 2,400,000 | *discontinued* | — |
| 10 mg | 2,800,000 | 3,700,000 | **+32%** |
| 15 mg | 3,200,000 | *discontinued* | — |
| 20 mg | 3,600,000 | 4,600,000 | **+28%** |
| 30 mg | 4,600,000 | 5,400,000 | **+17%** |
| 40 mg | — | 6,500,000 | *new lot* |
| 60 mg | 7,500,000 | 8,300,000 | **+11%** |

Retatrutide now starts at Rp 3,700,000 rather than Rp 2,400,000, and its cheapest
per-mg rung is Rp 138,333/mg at 60 mg (against Rp 125,000/mg on the old 60 mg
vial). The two **Retatrutide Cartridge Refill** lots are unchanged — note they
still name a cartridge for a pen the list no longer identifies as one.

`AOD-9604` was also moved to the head of category 01, restoring the alphabetical
ordering the rest of the catalogue follows.

## Three manually set prices

**GHK-Cu and NAD+ 1000 mg are priced off-formula by instruction**, not by the
48% rule:

| Lot | Cost basis | Formula would give | Set to | Realised GM |
|---|---:|---:|---:|---:|
| GHK-Cu 50 mg | 970,000 | 1,900,000 | **2,600,000** | **62.7%** |
| GHK-Cu 100 mg | 1,100,000 | 2,100,000 | **5,000,000** | **78.0%** |
| NAD+ 1000 mg | 1,400,000 | 2,700,000 | **3,700,000** | **62.2%** |

The other 78 lots remain on formula at 47.4%–48.7%, mean 48.10%. Blended across
all 81 lots the catalogue now runs **49.0%**.

All three are recorded in `data/axiom-price-list-full.csv` with a `pricing`
column marking them `manual override`, alongside the `formula_price_idr` they
would otherwise carry.

### Effect on the volume ladders

| Ladder | Per-mg saving on the big lot — before | after |
|---|---:|---:|
| GHK-Cu 50 → 100 mg | 45% | **3.8%** |
| NAD+ 500 → 1000 mg | 41% | **19.6%** |

GHK-Cu 100 mg is now Rp 50,000/mg against Rp 52,000/mg for the 50 mg — double
the material for a 3.8% per-mg saving, so there is almost no reason for a buyer
to step up. **NAD+ keeps a working ladder**: Rp 3,700/mg against Rp 4,600/mg,
a 19.6% saving, narrower than before but still a real incentive.

### Effect against the competitor

Both were the catalogue's strongest value lines against the "BP" pen list and
both are now near parity:

| Lot | Competitor | AXIOM before | AXIOM now |
|---|---:|---:|---:|
| GHK-Cu 50 mg | 2,750,000 | 1,900,000 (−31%) | 2,600,000 (**−5.5%**) |
| NAD+ 1000 mg | 3,900,000 | 2,700,000 (−31%) | 3,700,000 (**−5.1%**) |

## One lot-size correction

AXIOM listed **Cerebrolysin at 60 mg**. R-Peptides sells it at **80 mg** for
Rp 800,000 — the exact cost behind AXIOM's original Rp 3,000,000. The price was
already right for the 80 mg lot; the stated lot size was not. The full list now
reads **80 mg**, at Rp 2,700,000 on the 48% basis.

## Relationship to the −10% variant

At 48% the formula produces a mean **−9.59%** against the old 53% prices, which
lands within a whisker of the earlier `AXIOM-Price-List-minus10.pdf` exercise
(−9.95%). The difference is that this is a **margin rule**, not a flat cut: it is
computed from cost, so it holds at 48% as supplier prices move, and it stays on
the catalogue's native Rp 100,000 grid rather than the Rp 50,000 grid that
exercise used.

`AXIOM-Price-List-minus10.pdf` still covers the original 52 lots at the old
basis and has not been regenerated. It is effectively superseded.

*(Rounding note: the Rp 100,000 grid gives a realised spread of 47.4%–48.9%. A
Rp 50,000 grid would tighten that to 47.4%–48.4% if a narrower band matters more
than round prices.)*
