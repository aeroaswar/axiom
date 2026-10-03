# AXIOM — one catalogue, three surfaces

The AXIOM digital property as one Next.js 15 application over one Postgres database: the public
site (compound guide, price list, request), the client Account and the ops/owner Console. Built
from `web-app/axiom-platform-master-prompt.md` together with `web-app/axiom-web-app-master-prompt.md`,
matching `web-app/mockup/index.html`. Decisions and deviations are recorded in `docs/DECISIONS.md`.

## One command

```
pnpm install
pnpm setup        # checks Postgres 16 (or starts a local cluster), migrates, seeds, writes .env.local
pnpm dev          # http://localhost:3000 · /console (sign in as Aero) · /account (sign in as a clinic)
pnpm test         # unit tests for the domain rules (src/**/*.test.ts)
pnpm gates        # every gate in §13 that can run locally, as a test
pnpm db:clean     # empty the demo data, keep the catalogue — see "Starting with real data"
```

Local runs use plain Postgres 16 with a small auth stub (`supabase/local/auth_stub.sql`) so the
identical migrations, policies and functions run without the Supabase stack. `pnpm db:reset`
drops and re-creates the local database. With Docker, `supabase start` works the same way: point
`DATABASE_URL` at it.

## Layout

```
supabase/migrations/   0001 schema · 0002 functions, triggers, views · 0003 row-level security
                       0004 security fixes · 0005 acknowledgement state · 0006 basket uniqueness
                       0007 site ownership · 0008 workflow logic (linking, refunds, lead pipeline)
supabase/seed.sql      THE catalogue — the only file that may carry a price, a name or a dose
supabase/seed_dev.sql  development fixtures, walked through the real functions
src/app/[locale]/(public)   the site: /, /compounds, /price-list, /standard, /process, /faq, /request …
src/app/[locale]/(app)/console   dashboard · orders & quotes · catalogue & stock · pricing · invoices · clients · pipeline · content · settings
src/app/[locale]/(app)/account   needs you / in progress / earlier · shop · basket · orders · quotes · saved · profile
src/lib/db.ts          one pool; every request is a transaction that adopts the caller's role and claims (RLS applies)
src/lib/domain/        next-action, cut-off, dates — one implementation per rule
src/components/document/  the one A4 document template: invoice, credit note, quote, price list
scripts/db/            migrate · seed · reset (local only) · clean (empties operational data, keeps the catalogue)
scripts/gates/         the gate suite (sql · copy lint · greps · i18n · references) and the runner
tests/e2e/             the browser gates (Playwright)
messages/{id,en}/      catalogues per surface, merged at request time; Indonesian is the default locale
```

## Alongside the app

Print and brand collateral, set by hand and kept in the repository:

```
business-proposal/axiom-pricelist-print.html    the A4 price list — 79 lots over 9 pathways, two pages
business-proposal/AXIOM-Price-List.pdf          its render; edit the HTML, never the PDF
business-proposal/order-form/                   the fillable A4 order form (build.cjs, then add-fields.py)
business-proposal/axiom-peptide-pricelist.html  the internal sheet — cost basis and margin per lot
brand-book/ · company-profile/                  brand book and the one-page company profile
stickers/                                       vial label builder (40 × 20) and package label builder (100 × 150)
docs/                                           DECISIONS.md, catalogue notes, design specs
```

The price list is edited in its HTML and re-rendered with headless Chromium:

```
chromium --headless --no-pdf-header-footer \
  --print-to-pdf=business-proposal/AXIOM-Price-List.pdf \
  business-proposal/axiom-pricelist-print.html
```

The header badge reads **For research use only**; the full research-use statement — in-vitro only,
not for human or veterinary use, no dosing guidance — sits at the foot of both pages. The order form
draws its fonts and wordmark from the price-list HTML and its compound list from the price-list PDF,
so rebuild it after the sheet changes.

These sheets carry prices in their own markup, outside the one-catalogue rule below: they are a
printed snapshot, reconciled by hand against `supabase/seed.sql`, which stays the catalogue of record
for every surface the app serves. The internal margin sheet still carries the earlier 52-lot, 8-pathway
list — it needs a cost basis for the 27 lots added since.

## The rules the code enforces

- **One catalogue.** `product_variants` is the home of every price; every surface reads it through
  `v_catalogue`. A price changes once, by the owner, audited in `price_changes`, and the public site
  follows within the stated 60-second window.
- **Education is public, commerce is gated.** The compound guide is identical for crawlers and
  people. A peptide price, quote line or order line for an account without a current qualified-
  researcher acknowledgement is absent from every entry point, because the database returns none.
- **Cost is owner-only at the database.** `variant_costs` and the frozen cost snapshots raise for
  anyone else; an ops query is refused, not emptied.
- **Every order begins as a quote; AXIOM is paid before anything is dispatched.** Acceptance is one
  transaction (order, frozen prices, issued invoice, events); only `axiom.mark_paid` moves an order
  into packing, enforced by a trigger; dispatch writes the sale to the ledger.
- **Stock never lies.** An append-only ledger, a derived balance held above zero by a check
  constraint, reserved = sent quotes + undispatched orders, available is the only public figure.
- **A paid order is not cancelled with the money still in it.** `cancel_order` refuses while the
  order holds a payment and names the sum; the credit note comes first, so a refund is always a
  document. A cancelled order still holding money reads as a refund due, in red, on every surface.
- **A request from the public site can be finished.** It creates an account, a lead and a quote;
  the owner links the person who asked to that account (`axiom.link_member`, owner-only, refusing
  anyone who already belongs elsewhere), they record their acknowledgement, and the quote can go.
- **The pipeline moves itself.** A lead walks `new → contacted → acknowledged → quoted → won` as its
  quote does; nobody updates a stage by hand unless they choose to. A lead is inbound — a client
  typed straight into the Console is already a client and does not appear there.
- **Delivery is per consignment**, one SQL function, shown before commitment.
- **Nothing is typed.** Dashboard, Today list, bell and badge derive from `axiom.events()`.
- **No dosing, no claims.** A CI lint over every catalogue and content row; every research claim
  needs a PubMed ID or DOI that resolves, or it does not render.

## Starting with real data

The development fixtures are demo clients, quotes and orders. To enter real sales, empty them and
keep everything else:

```
pnpm db:clean
```

It removes every account, person who is not staff, lead, quote, order, invoice, shipment, basket
and stock movement, and restarts document numbering, so the first real order is `AX-YYMM-0001`.
The catalogue, cost basis, delivery zones, site settings and the owner and ops logins stay. It runs
in one transaction: either the whole sheet is clean or nothing changed.

It refuses a remote database unless you name it, so it cannot empty Supabase by accident:

```
DATABASE_URL=<supabase direct connection> AXIOM_CLEAN_CONFIRM=<database name> pnpm db:clean
```

On the clean sheet, a first sale runs in this order, each step in the Console:

1. **Clients → New account** — the client and its first delivery site.
2. **Link the person** who signs for the account (they sign in once first), then they record
   their acknowledgement on their own profile. Without it, peptide lines are not offered.
3. **Catalogue & stock** — record opening stock (`intake`). A line never stocked cannot be quoted,
   and does not appear as a stockout in Today until it has had stock and run out.
4. **New quote → send → accept** — acceptance issues the invoice; **mark paid** moves it to
   packing; dispatch and delivery close it.

## The AXIOM wordmark

One vector path, drawn on a 582 × 70 grid, with every stroke 11.8 units wide: the A's legs,
the four arms of the notched X, the I, the O all the way round, and the M's stems and
diagonals. The O keeps its overshoot (0–70 against 2–68). The X's arms run through its centre
and end square-cut, leaving a small square opening in the middle. The master file is
`business-proposal/assets/logo/axiom-wordmark-white.svg` (bone `#F2EDE5`, for dark grounds).

The same path is inlined, byte for byte, in `src/components/shell/sprite-svg.ts` (the web app's
`#wm` symbol), `web-app/mockup/index.html`, `business-proposal/axiom-pricelist-print.html` (which
`order-form/build.cjs` reads it from), `invoice/axiom-invoice-a4.html`, the three pages in
`stickers/`, and `dosage-guide/print/card-print.html`; `dosage-guide/assets/` keeps a copy of
the SVG. Change the path in all of them together. The committed PDFs and the raster lockups
(`brand-book/logo.png`, the two PNGs in `company-profile/assets/`,
`dosage-guide/print/axiom-card-preview.png`) carry the same drawing and need re-exporting too.

## Compound guide and pen card

`dosage-guide/` is a static site, separate from the app: a print-ready 85 × 55 mm card carrying
the wordmark and a QR, and the mobile-first guide the QR opens. It covers every lot in the price
list — 79 lots across 65 compounds, a multi-size compound appearing as one page with a size chip
per lot — with cadence, timing, documented doses, a tap-to-pick pen calculator, dose dates with
Apple and Google Calendar export, and the evidence tier stated for every dosing figure. It is
deployed as its own Vercel project with Root Directory `dosage-guide` and no build step; prices
live only in `dosage-guide/src/`, which is never published. Details in `dosage-guide/README.md`.

## Package label builder

`stickers/package-label.html` makes the 100 × 150 mm thermal shipping label for the mailer from the
invoice. Drop the PDF saved from the invoice builder and each destination becomes a label: the
recipient, address and phone from *Billed to* (or the *Ship to* row when the order goes to several
addresses), the invoice number, and every line with its lot size, across as many pages as the
table runs. A cold-chain invoice turns on *Keep cool*. The invoice is read by layout, anchored on
its headings in English or Indonesian, so the Console's invoices use the same reader.

Invoices often carry no phone number. Drop the client's order form (`AXIOM-Order-Form.pdf`) with
the invoice and its phone, notes and research-use tick fill the invoice's label, matched on first
name; an order form on its own still makes a label, with each typed line matched against
`business-proposal/order-form/compounds.json`. Amber flags mark what needs a look before it ships:
no phone, a compound the catalogue doesn't know, a size that isn't a listed lot, an unticked
research-use box. Long orders go to two columns; anything that still doesn't fit is counted on the
label ("+ 4 more lines — see AX-INV-…"), never dropped silently. Courier, service, resi, handling
marks and a discreet-contents option are set in the builder; the sender is remembered per browser.

Three stocks: **80 × 50 mm**, a compact layout for a small label printer such as the NIIMBOT
B31 that carries only the recipient, the contents and the sender (courier, resi, handling marks
and the note stay on the large label),
and the full **100 × 150 mm** label, or the same turned 90° on **150 × 100 mm**.

PDFs are read in the browser with pdf.js (loaded from cdnjs on first use, so it needs a
connection); nothing is uploaded. Two outputs:

- **Save PNG**, for app-driven printers such as NIIMBOT: the label as a pure black-and-white image
  at 8 dots per mm (203 dpi), exactly the label's size (640 × 400 px for 80 × 50). It is drawn with
  html2canvas, also from cdnjs. In the printer's app, choose the same label size, insert the image
  and fill the label with it. On a phone the share sheet offers *Save Image*.
- **Print**, for printers with a computer driver: one label per page, black only, at the stock's size
  (Paper to match, Scale 100%, Margins None).

## Standalone invoice builder

`invoice/axiom-invoice-a4.html` is a self-contained, dependency-free A4 invoice builder that
predates the Console's invoicing and still runs from a file — useful for issuing an invoice
without the app or a database. Open it in a browser, fill the form on the left, watch the
sheet redraw on the right, then *Save as PDF* (paper A4, background graphics on; a one-page
invoice prints correctly at any margin setting, set margins to None past that).

Line items come from a dropdown of the full price list — 79 lots across the 9 pathways plus
devices and apparel, 84 entries — generated from `invoice/AXIOM-Price-List-v1.0.pdf`, which
is committed beside it. Shipping is Rp 100.000 per 3 units at an address, capped at
Rp 300.000 there, Jabodetabek, charged per address: add addresses under *Ship to*, route each
line item to one, and each carries its own amount, calculated by default and overridable.
`invoice/AXIOM-Invoice-Template.pdf` is what its default data prints to.

This duplicates what `src/components/console/invoices/` and `src/lib/documents/` now do inside
the app, and its catalogue is a second copy of prices that `supabase/seed.sql` owns, as are its
delivery rates against the platform's per-consignment function. Treat the database as
authoritative; retire this file once the Console covers the offline case.

## Production

Supabase (Postgres, Auth magic link, Storage) + Vercel. Set `DATABASE_URL` to the project's direct
connection, `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL`, and build
**without** `NEXT_PUBLIC_AUTH_MODE` — that variable is inlined at build time, so an artifact built
without it has no seeded sign-in and no runtime setting can add one. Apply `supabase/migrations` and `supabase/seed.sql` (never `seed_dev.sql`).
Fill the « » placeholders in Console → Settings (entity, NPWP, bank, PPN) before the first invoice.
