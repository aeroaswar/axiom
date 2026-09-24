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
pnpm gates        # every gate in §13 that can run locally, as a test
```

Local runs use plain Postgres 16 with a small auth stub (`supabase/local/auth_stub.sql`) so the
identical migrations, policies and functions run without the Supabase stack. `pnpm db:reset`
drops and re-creates the local database. With Docker, `supabase start` works the same way: point
`DATABASE_URL` at it.

## Layout

```
supabase/migrations/   0001 schema · 0002 functions, triggers, views · 0003 row-level security
supabase/seed.sql      THE catalogue — the only file that may carry a price, a name or a dose
supabase/seed_dev.sql  development fixtures, walked through the real functions
src/app/[locale]/(public)   the site: /, /compounds, /price-list, /standard, /process, /faq, /request …
src/app/[locale]/(app)/console   dashboard · orders & quotes · catalogue & stock · pricing · invoices · clients · content · settings
src/app/[locale]/(app)/account   needs you / in progress / earlier · shop · basket · orders · quotes · saved · profile
src/lib/db.ts          one pool; every request is a transaction that adopts the caller's role and claims (RLS applies)
src/lib/domain/        next-action, cut-off, dates — one implementation per rule
src/components/document/  the one A4 document template: invoice, credit note, quote, price list
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
- **Delivery is per consignment**, one SQL function, shown before commitment.
- **Nothing is typed.** Dashboard, Today list, bell and badge derive from `axiom.events()`.
- **No dosing, no claims.** A CI lint over every catalogue and content row; every research claim
  needs a PubMed ID or DOI that resolves, or it does not render.

## Production

Supabase (Postgres, Auth magic link, Storage) + Vercel. Set `DATABASE_URL` to the project's direct
connection, `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL`, and build
**without** `NEXT_PUBLIC_AUTH_MODE` — that variable is inlined at build time, so an artifact built
without it has no seeded sign-in and no runtime setting can add one. Apply `supabase/migrations` and `supabase/seed.sql` (never `seed_dev.sql`).
Fill the « » placeholders in Console → Settings (entity, NPWP, bank, PPN) before the first invoice.
