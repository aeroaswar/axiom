# Uncovered references — PubMed search results

**Gathered 25 November 2026** via NCBI E-utilities. Candidates are in `uncovered-references.csv`;
none is attached to a product.

**Every `chemistry` and `context` row must be reviewed by a human before it is attached to a
product.** `chemistry` supports the underlying peptide or mechanism, not the branded preparation;
`context` is background only. Only `direct` rows address the product's own statement.


## Correction — 26 November 2026

Two "no records" findings in this file were wrong, both from searching a **quoted** term. PubMed's
quoted-phrase match can return nothing where the unquoted term matches, so each was re-run
unquoted and checked against the records themselves:

- **`cartalax` has 6 PubMed records, not 0.** All are Khavinson-group short-peptide papers that
  name Cartalax among several peptides — mesenchymal stem cell ageing, neuronal differentiation,
  skin fibroblasts, kidney and thymus tissue culture. **None studies cartilage.** The catalogue's
  research text for Cartalax says "studied in cartilage and connective-tissue research"; the
  connective-tissue half has support, the cartilage half does not.
- **`5-amino-1MQ` has 0 records under that name but 3 under `5-amino-1-methylquinolinium`**, its
  chemical name — all NNMT-inhibitor work, one in a diet-induced-obesity model. So the compound
  is not absent from the literature; the trade name is.

Both corrections are in the CSV. Neither compound gained a `direct` row, so neither is attached
to a product: the bar is a paper that supports the stated claim for the named compound.

## Verification

All 59 PMIDs resolve through `esummary` (gate 8's own check). All 53 DOIs came from the record's
`doi:` field and were re-checked against `articleids`; 6 records carry no DOI and rely on the PMID,
which gate 8 accepts. `doi.org` is proxy-blocked here, so only agreement with PubMed was tested, not
dereferencing. Citations are verbatim, including PubMed's title typo in 42657199.

## Per-compound counts

| slug | rows | direct | chemistry | context | own-name records |
|---|---|---|---|---|---|
| `5-amino-1mq` | 6 | 0 | 6 | 0 | **0** |
| `adamax` | 6 | 0 | 6 | 0 | **0** |
| `ahk-cu` | 5 | 1 | 0 | 4 | 1 |
| `cartalax` | 6 | 0 | 4 | 2 | **0** |
| `glutathione` | 6 | 4 | 0 | 2 | many |
| `hcg` | 6 | 5 | 0 | 1 | many |
| `hgh-191aa-somatropin` | 6 | 6 | 0 | 0 | many |
| `hmg` | 6 | 4 | 0 | 2 | 3862 |
| `pinealon` | 6 | 4 | 2 | 0 | 22 |
| `slu-pp-332-injectable` | 6 | 5 | 0 | 1 | 11 |

### Nothing under its own name

- **`cartalax`** — 0 records (`quotedphrasesnotfound`). Ala-Glu-Asp-Pro is studied as **Cortagen**
  (brain cortex, immune, cardiac gene expression); Ala-Glu-Asp-Leu almost only in tobacco-root
  plant biology. **Neither sequence has any cartilage or connective-tissue literature.** All rows
  are Khavinson short-peptide chemistry.
- **`5-amino-1mq`** — 0 records. Only 3 use the name 5-amino-1-methylquinolinium, none an adipocyte
  study. Rows are NNMT-inhibition chemistry.
- **`adamax`** — 41 records, **all unrelated** (the AdaMax optimiser). Rows are the parent Semax /
  ACTH(4-10) literature. 27586814 is closest — acetylation of Semax — but no paper tests the
  acetylated-amidated variant.
- **`ahk-cu`** — one paper (17703734) studies AHK-Cu in hair follicles and dermal papilla cells.
  The rest concern **GHK-Cu, a different tripeptide**, and are marked `context` for that reason.

## Khavinson survey (no references attached)

`raw` = one esearch on the quoted name. `peptide-linked` = that name AND (Khavinson OR "short
peptide(s)" OR bioregulator(s)); several raw counts are homonym-dominated and overstate things.

| name | raw | peptide-linked | note |
|---|---|---|---|
| bronchogen | 12 | 4 | real Ala-Asp-Glu-Leu papers exist, e.g. 21240358 |
| cardiogen | 82 | 2 | mostly **CardioGen-82**, an Rb-82 generator |
| chonluten | 1 | 1 | |
| cortagen | 13 | 12 | the Ala-Glu-Asp-Pro literature |
| crystagen | 1 | 1 | |
| livagen | 19 | 19 | |
| ovagen | 34 | **0** | **Ovagen**, a veterinary FSH product |
| pancragen | 7 | 6 | |
| prostamax | 6 | 5 | |
| testagen | 2 | 1 | |
| vesugen | 6 | 5 | |
| pinealon | 22 | 15 | best-evidenced of the set |
| cartalax | **0** | 0 | name absent from PubMed |

Of the fourteen, only `pinealon`, `livagen` and `cortagen` have a double-digit peptide literature.
Five (`chonluten`, `crystagen`, `testagen`, `prostamax`, `vesugen`) have five records or fewer;
`cartalax` and `ovagen` have none of their own.
