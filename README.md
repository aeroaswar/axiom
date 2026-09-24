# AXIOM

Consolidated AXIOM brand and product materials, migrated from the `aeroaswar/general`
repository, where the work had accumulated across several unmerged topic branches.

## Contents

- `website/` — the current AXIOM product site (Human Performance & Longevity: peptides,
  clinical red-light therapy, recovery, wellness, apparel). Migrated from
  `claude/axiom-check-uk4uhm`, the most complete and recent iteration of the site.
- `brand-book/` — the AXIOM brand book / style guide. Migrated from
  `claude/axiom-brand-book-0puows`.
- `business-proposal/` — business proposal, GTM strategy, and pricing materials.
  Migrated from `claude/axiom-business-proposal-p57t1y`.
- `invoice/` — an A4 invoice builder in the current AXIOM system, plus a sample rendered
  PDF and the price list its catalogue is generated from. See
  [Invoice builder](#invoice-builder) below.
- `archive/premium-hero/` — an earlier iteration of the product site (peptides-only
  catalogue, root-level layout), superseded by `website/`. Migrated from
  `claude/axiom-premium-hero-uzxjp4` and kept for reference.

## Invoice builder

**Files** — `axiom-invoice-a4.html` is the builder itself;
`AXIOM-Invoice-Template.pdf` is what its default data prints to;
`AXIOM-Price-List-v1.0.pdf` is the pricing source of record.

**Use** — open the HTML in a browser, fill in the form on the left, watch the A4 sheet
redraw on the right, then *Save as PDF*. In the print dialog: paper **A4**, **background
graphics on**. A one-page invoice prints correctly at any margin setting; set margins to
**None** once it runs past one page.

**Catalogue** — line items come from a dropdown of the full price list: 79 lots across the
9 pathways plus devices and apparel, 84 entries in all. Picking a lot fills its price,
which stays editable, and a *Custom item…* option covers anything off-catalogue. The
catalogue is generated from `AXIOM-Price-List-v1.0.pdf`.

**Shipping** — Rp 100.000 per 3 units at an address, capped at Rp 300.000 there,
Jabodetabek. It is charged **per address**, so the same goods going to three addresses
cost three times what they cost going to one. Add addresses under *Ship to* (label,
address, phone), route each line item to one with its **Ship to** picker, and the sheet
prints a Ship-to block showing what went where. Each address carries its own amount —
calculated by default, overridable per address — and the total is their sum.

**Also** — optional discount and PPN rows, each dropped from the sheet when zero; long
invoices paginate across A4 sheets; inputs are remembered in the browser between sessions.
Prices in IDR. It shares the print skeleton and embedded fonts of
`business-proposal/axiom-pricelist-print.html`.

> **Known inconsistency:** `business-proposal/axiom-pricelist-print.html` and its
> `AXIOM-Price-List.pdf` still carry the older, higher prices and have not been brought
> onto v1.0. The invoice builder does not use them.

## Source

All content originated in `aeroaswar/general` on the following branches, which remain
in that repository's history:

- `claude/axiom-brand-book-0puows`
- `claude/axiom-business-proposal-p57t1y`
- `claude/axiom-check-uk4uhm`
- `claude/axiom-premium-hero-uzxjp4`

None of this content had been merged into `general`'s `main` branch prior to migration.
