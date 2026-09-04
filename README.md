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
  PDF. Open `axiom-invoice-a4.html` in a browser: fill in the form on the left, watch the
  A4 sheet redraw on the right, then *Save as PDF* (paper A4, margins none, background
  graphics on). Line items come from a dropdown of the full price list — 79 lots across
  the 9 pathways, plus devices and apparel — so picking a lot fills its price, and a
  *Custom item…* option covers anything off-catalogue. Subtotal, optional discount,
  Jabodetabek shipping, optional PPN and the total are computed, long invoices paginate across A4
  sheets, and inputs are remembered in the browser between sessions. Shipping is charged per
  delivery address — add addresses under *Ship to*, route each line item to one, and the sheet
  prints a Ship-to block showing what went where. Each address carries its own shipping
  amount, calculated by default and overridable, with the total as their sum. Prices in IDR.
  It shares the print skeleton and embedded fonts of
  `business-proposal/axiom-pricelist-print.html`, but its catalogue is generated from
  `invoice/AXIOM-Price-List-v1.0.pdf`, kept alongside it as the pricing source of record.
  Note that `business-proposal/`'s own price list still carries older, higher prices and
  has not been brought onto v1.0.
- `archive/premium-hero/` — an earlier iteration of the product site (peptides-only
  catalogue, root-level layout), superseded by `website/`. Migrated from
  `claude/axiom-premium-hero-uzxjp4` and kept for reference.

## Source

All content originated in `aeroaswar/general` on the following branches, which remain
in that repository's history:

- `claude/axiom-brand-book-0puows`
- `claude/axiom-business-proposal-p57t1y`
- `claude/axiom-check-uk4uhm`
- `claude/axiom-premium-hero-uzxjp4`

None of this content had been merged into `general`'s `main` branch prior to migration.
