# Catalogue expansion — 52 → 87 lots, sourced from the R-Peptides sheet

Adds every research compound on the supplier price list that AXIOM did not
already carry, priced with AXIOM's own formula.

Output: `AXIOM-Price-List-Full.pdf` (2 pages, 87 lots),
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
price      = cost basis ÷ 0.47
rounding   = nearest Rp 100.000
```

All 52 existing lots reproduce their current listed price unchanged. Across all
87 lots gross margin runs 52.1%–53.8%, mean 53.1% — identical to the current
catalogue.

## What was added — 35 lots

| Cat | Compound | Lot | Supplier | Price |
|---|---|---:|---:|---:|
| 01 | Retatrutide Pen | 10 mg | 1,300,000 | 4,000,000 |
| 01 | Retatrutide Pen | 20 mg | 1,800,000 | 5,100,000 |
| 01 | Retatrutide Pen | 30 mg | 2,200,000 | 6,000,000 |
| 01 | Retatrutide Pen | 40 mg | 2,800,000 | 7,200,000 |
| 01 | Retatrutide Pen | 60 mg | 3,700,000 | 9,100,000 |
| 01 | Retatrutide Cartridge Refill | 10 mg | 950,000 | 3,300,000 |
| 01 | Retatrutide Cartridge Refill | 20 mg | 1,400,000 | 4,300,000 |
| 01 | AOD-9604 | 5 mg | 800,000 | 3,000,000 |
| 02 | CJC-1295 (With DAC) | 5 mg | 900,000 | 3,200,000 |
| 02 | IGF-1 LR3 | 1 mg | 1,350,000 | 4,100,000 |
| 02 | Sermorelin | 10 mg | 1,000,000 | 3,400,000 |
| 03 | AHK-Cu | 100 mg | 700,000 | 2,800,000 |
| 03 | ARA-290 | 10 mg | 850,000 | 3,100,000 |
| 03 | ARA-290 | 50 mg | 1,550,000 | 4,600,000 |
| 03 | SNAP-8 | 10 mg | 700,000 | 2,800,000 |
| 04 | Dihexa | 10 mg | 1,200,000 | 3,800,000 |
| 04 | VIP (Vasoactive Intestinal Peptide) | 10 mg | 1,100,000 | 3,600,000 |
| 05 | LC216 Lipo-B (Injectable) | 10 mL | 800,000 | 3,000,000 |
| 05 | LC526 Fat Blaster (Injectable) | 10 mL | 800,000 | 3,000,000 |
| 06 | Thymalin | 10 mg | 700,000 | 2,800,000 |
| 07 | Melanotan II | 10 mg | 750,000 | 2,900,000 |
| 08 | FOXO4-DRI | 10 mg | 1,800,000 | 5,100,000 |
| 08 | Glutathione | 1500 mg | 600,000 | 2,600,000 |
| 09 | Bronchogen · Cardiogen · Chonluten · Cortagen · Crystagen · Livagen · Ovagen · Pancragen · Prostamax · Testagen · Vesugen | 20 mg | 1,100,000 | 3,600,000 |
| 09 | Cartalax | 20 mg | 1,200,000 | 3,800,000 |

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
| Cartridge for Injection Pen 3 mL | 25,000 | 1,300,000 | **52×** |
| BAC Water 10 mL | 130,000 | 1,600,000 | **12×** |
| Tadalafil Tablets 5 mg × 10 | 150,000 | 1,600,000 | **11×** |
| Acetic Acid 10 mL | 180,000 | 1,700,000 | 9× |
| Disposable Pen 3 mL | 400,000 | 2,100,000 | 5× |

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

| Lot | Cost then | Cost now | Listed | GM now | vs 53% target |
|---|---:|---:|---:|---:|---:|
| Humanin 10 mg | 1,500,000 | 1,200,000 | 4,500,000 | **60.0%** | +7 pts |
| Ipamorelin 10 mg | 700,000 | 800,000 | 2,800,000 | **50.0%** | −3 pts |
| HMG 75 IU | 650,000 | 700,000 | 2,700,000 | **51.9%** | −1 pt |

Repriced on the formula they would be Humanin Rp 3,800,000, Ipamorelin
Rp 3,000,000, HMG Rp 2,800,000. Say the word and they can be brought into line.

## One lot-size correction

AXIOM listed **Cerebrolysin at 60 mg**. R-Peptides sells it at **80 mg** for
Rp 800,000 — the exact cost behind AXIOM's existing Rp 3,000,000. The price was
already right for the 80 mg lot; the stated lot size was not. The full list now
reads 80 mg at the same Rp 3,000,000.

## Not carried over

The `AXIOM-Price-List-minus10.pdf` variant still covers the original 52 lots
only. It has not been regenerated against the 87-lot catalogue.
