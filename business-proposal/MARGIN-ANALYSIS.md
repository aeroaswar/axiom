# Margin analysis — cost basis vs list price, all 81 lots

Computed from `data/axiom-price-list-full.csv`.
Cost basis = supplier lot + Rp 600.000. Price = cost basis ÷ 0.52, rounded to
Rp 100.000, with nine manual overrides.

## Definitions used

| Term | Formula | What it answers |
|---|---|---|
| Gross profit | price − cost basis | how many rupiah the lot earns |
| Gross margin | gross profit ÷ **price** | what share of the sale is profit |
| Markup | gross profit ÷ **cost** | how far the price sits above cost |

Gross margin and markup are the same money seen from two sides: 48% margin is
92% markup. Both are reported because they answer different questions — margin
for "what share of revenue do I keep", markup for "what multiple do I sell at".

## Catalogue totals — one of each of the 81 lots

| Component | Amount | Share of price |
|---|---:|---:|
| Supplier material | 84,670,000 | 33.1% |
| Fixed adder (81 × Rp 600.000) | 48,600,000 | 19.0% |
| **= cost basis** | **133,270,000** | **52.1%** |
| **Gross profit** | **122,430,000** | **47.9%** |
| **= list price** | **255,700,000** | **100.0%** |

**Blended gross margin 47.9%. Blended markup 91.9%** — price is 1.92× cost.

Note what the middle row means: the Rp 600.000 adder is charged into cost and
then marked up like everything else, so **fixed kit-and-handling occupies 19% of
catalogue revenue before a single milligram of material is paid for**. It is the
second-largest line in the stack after profit.

## Distribution across the 81 lots

| | Min | Median | Mean | Max |
|---|---:|---:|---:|---:|
| Gross margin | 16.7% | 48.1% | 47.0% | 78.0% |
| Markup on cost | 20.0% | 92.9% | 93.2% | 354.5% |
| Gross profit | 250,000 | 1,400,000 | 1,511,481 | 4,000,000 |

| Band | Lots | Revenue | Profit |
|---|---:|---:|---:|
| under 25% | 3 | 4,900,000 | 950,000 |
| 25–35% | 3 | 8,100,000 | 2,350,000 |
| 47–49% (on formula) | 72 | 231,400,000 | 111,300,000 |
| 49–65% | 2 | 6,300,000 | 3,930,000 |
| over 65% | 1 | 5,000,000 | 3,900,000 |

The 72 formula lots carry **91% of gross profit**. The nine overrides move
Rp 11,130,000 of profit between them and net out slightly negative: the override
group's own margin is 45.8% against the formula group's 48.1%.

## By pathway

| Pathway | Lots | Cost basis | List price | Gross profit | GM | Markup |
|---|---:|---:|---:|---:|---:|---:|
| 01 GLP-1s & Weight Loss | 12 | 26,200,000 | 50,400,000 | 24,200,000 | 48.0% | 92.4% |
| 02 GH Secretagogues | 11 | 19,200,000 | 35,100,000 | 15,900,000 | 45.3% | 82.8% |
| 03 Healing & Repair | 13 | 18,820,000 | 36,900,000 | 18,080,000 | 49.0% | 96.1% |
| 04 Brain Health & Nootropics | 8 | 11,750,000 | 22,700,000 | 10,950,000 | 48.2% | 93.2% |
| 05 Energy & Endurance | 8 | 11,500,000 | 22,100,000 | 10,600,000 | 48.0% | 92.2% |
| 06 Immunity | 2 | 3,000,000 | 5,800,000 | 2,800,000 | 48.3% | 93.3% |
| 07 Sexual Health | 6 | 8,100,000 | 14,700,000 | 6,600,000 | 44.9% | 81.5% |
| 08 Longevity & Cellular Repair | 9 | 14,200,000 | 28,200,000 | 14,000,000 | 49.6% | 98.6% |
| 09 Peptide Bioregulators | 12 | 20,500,000 | 39,800,000 | 19,300,000 | 48.5% | 94.1% |
| **All** | **81** | **133,270,000** | **255,700,000** | **122,430,000** | **47.9%** | **91.9%** |

Sexual Health (44.9%) and GH Secretagogues (45.3%) sit lowest because the
manually cut lots concentrate there — Melanotan II in 07, Tesamorelin in 02.
Longevity (49.6%) and Healing & Repair (49.0%) sit highest despite Healing
carrying three of the six cut lots, because GHK-Cu's two uplifted lots are there too.

## Extremes

**Largest gross profit per unit**

| Lot | Cost | Price | Profit | GM | Markup |
|---|---:|---:|---:|---:|---:|
| Retatrutide 60 mg | 4,300,000 | 8,300,000 | 4,000,000 | 48.2% | 93.0% |
| GHK-Cu 100 mg | 1,100,000 | 5,000,000 | 3,900,000 | 78.0% | 354.5% |
| Retatrutide 40 mg | 3,400,000 | 6,500,000 | 3,100,000 | 47.7% | 91.2% |

**Smallest gross profit per unit**

| Lot | Cost | Price | Profit | GM | Markup |
|---|---:|---:|---:|---:|---:|
| BPC-157 10 mg | 1,250,000 | 1,500,000 | **250,000** | 16.7% | 20.0% |
| TB-500 10 mg | 1,350,000 | 1,700,000 | 350,000 | 20.6% | 25.9% |
| Melanotan II 10 mg | 1,350,000 | 1,700,000 | 350,000 | 20.6% | 25.9% |

GHK-Cu 100 mg is the outlier of the catalogue: **354% markup**, nearly four times
the next-highest, because its supplier lot is Rp 500.000 against a Rp 5.000.000 price.

## Two things this does not measure

**These are closer to contribution margins than textbook gross margins.** The
Rp 600.000 adder already carries BAC water, the research kit and cold-chain
handling, so those fulfilment costs sit *inside* every cost basis above. A
conventional gross margin excluding them would read materially higher — on the
catalogue total, 66.9% rather than 47.9%.

**Profit margin proper cannot be computed from this data.** Net margin requires
operating cost — premises, staff, marketing, payment-gateway fees, wastage,
tax — and none of that exists in the price list or the supplier sheet. Everything
here stops at gross. What the numbers do say is the size of the envelope:
**Rp 122,430,000 of gross profit on Rp 255,700,000 of revenue** is what has to
cover all operating cost before anything is net. Supply a monthly operating
figure and expected volume and net margin follows directly.
