# Margin structure — supplier cost, base price, selling price, margin

**Correction to earlier documents in this folder.** The Rp 600.000 added to every
lot is **the pen** — R-Peptides' *Reusable Injection Pen V2*, listed at Rp 600.000
on their supplies sheet, matched to the rupiah. It is not BAC water, a research kit,
or handling: the supplier ships **vials only**, and AXIOM buys a pen separately and
sells the two together. BAC water and the kit are free inclusions on top.

This matters for how the numbers read. The pen is a bought good on the invoice, so
what is left after it is a **true gross margin**, not a contribution margin.
`MARGIN-ANALYSIS.md` describes it the other way and is superseded by this file.

```
supplier cost  (vial)
+ pen          Rp 600.000
= base price
selling price − base price = margin
```

Per-lot data: `data/axiom-margin-structure.csv`.

## Catalogue totals — one of each of the 81 lots

| Line | Amount | Share of selling price |
|---|---:|---:|
| Supplier cost (vials) | 84.670.000 | 33.2% |
| Pen (81 × Rp 600.000) | 48.600.000 | 19.0% |
| **= Base price** | **133.270.000** | **52.2%** |
| **Margin** | **122.030.000** | **47.8%** |
| **= Selling price** | **255.300.000** | 100.0% |

Markup on base price: 91.6%.

## The pen falls hardest on the cheap lots

| Lot | Supplier | Base price | Selling | Margin | % | Pen as % of price |
|---|---:|---:|---:|---:|---:|---:|
| BPC-157 10 mg | 650.000 | 1.250.000 | 1.500.000 | 250.000 | **16.7%** | 40% |
| TB-500 10 mg | 750.000 | 1.350.000 | 1.700.000 | 350.000 | **20.6%** | 35% |
| Melanotan II 10 mg | 750.000 | 1.350.000 | 1.700.000 | 350.000 | **20.6%** | 35% |
| BPC-157 + TB-500 (Wolverine) 20 mg | 1.250.000 | 1.850.000 | 2.500.000 | 650.000 | **26.0%** | 24% |
| Tesamorelin 10 mg | 1.100.000 | 1.700.000 | 2.300.000 | 600.000 | **26.1%** | 26% |
| Tesamorelin 20 mg | 1.600.000 | 2.200.000 | 3.300.000 | 1.100.000 | **33.3%** | 18% |

**On BPC-157 the pen is 40% of the selling price and the vial only 43%.** A
Rp 650.000 vial and a Rp 600.000 pen sell for Rp 1.500.000. A cheaper pen on that
lot alone moves it from 16.7% to 30.0% margin — more than any price change could
without breaking the competitor position.

## Cartridge refills are being charged for a pen

A refill is the cartridge alone; the customer already owns the pen. Both refill lots
carry the full Rp 600.000 anyway.

| Lot | Supplier | Base today | Base with cartridge only | Selling today | At 48% on the corrected base |
|---|---:|---:|---:|---:|---:|
| Retatrutide Cartridge Refill 10 mg | 950.000 | 1.550.000 | 975.000 | 3.000.000 | 1.900.000 |
| Retatrutide Cartridge Refill 20 mg | 1.400.000 | 2.000.000 | 1.425.000 | 3.800.000 | 2.700.000 |

**This is a costing error, not a pricing choice.** Charging a refill for a pen it
does not contain overstates its base price by Rp 575.000. Correcting it either drops
the price by about a third or, if the price holds, lifts refill margins to 67.5% and
62.5% — which is what a razor-and-blade model should look like.

## By pathway

| Pathway | Lots | Supplier cost | Base price | Selling price | Margin | % |
|---|---:|---:|---:|---:|---:|---:|
| 01 GLP-1s & Weight Loss | 12 | 19.000.000 | 26.200.000 | 50.400.000 | 24.200.000 | 48.0% |
| 02 GH Secretagogues | 11 | 12.600.000 | 19.200.000 | 34.700.000 | 15.500.000 | 44.7% |
| 03 Healing & Repair | 13 | 11.020.000 | 18.820.000 | 36.900.000 | 18.080.000 | 49.0% |
| 04 Brain Health & Nootropics | 8 | 6.950.000 | 11.750.000 | 22.700.000 | 10.950.000 | 48.2% |
| 05 Energy & Endurance | 8 | 6.700.000 | 11.500.000 | 22.100.000 | 10.600.000 | 48.0% |
| 06 Immunity | 2 | 1.800.000 | 3.000.000 | 5.800.000 | 2.800.000 | 48.3% |
| 07 Sexual Health | 6 | 4.500.000 | 8.100.000 | 14.700.000 | 6.600.000 | 44.9% |
| 08 Longevity & Cellular Repair | 9 | 8.800.000 | 14.200.000 | 28.200.000 | 14.000.000 | 49.6% |
| 09 Peptide Bioregulators | 12 | 13.300.000 | 20.500.000 | 39.800.000 | 19.300.000 | 48.5% |
| **All** | **81** | **84.670.000** | **133.270.000** | **255.300.000** | **122.030.000** | **47.8%** |

## What this still does not measure

Net margin. Operating cost — premises, staff, marketing, payment fees, wastage, tax
— appears in neither the price list nor the supplier sheet. **122.030.000 of gross
margin on 255.300.000 of revenue** is the envelope all of it has to come out of.
