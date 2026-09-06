# AXIOM platform — decisions taken in the build

The platform master prompt (§14) lists open decisions and asks that they be answered by the owner.
This session could not ask mid-build, so it adopted the prompt's own recommendations and stated
every assumption here. Each is one setting or one flag; none needs a rewrite to change.

| # | Decision | Taken as | Where it lives |
|---|---|---|---|
| 1 | Public price list open or gated | **Gated**: identity and research public, prices after the acknowledgement | `site_settings.price_visibility` = `acknowledged` (Console → Settings) |
| 2 | How much of the guide is written at launch | **Identity-only pages for every compound**, published. No research section renders anywhere because no citation could be verified from this environment (PubMed, DOI and Crossref are blocked by the proxy). The migrated `window.REFERENCE` mechanism texts are held as drafts in `products.research_en` and render only once a `product_references` row resolves. | `products.is_published`, `product_references`; gate 8 |
| 3 | Basket sign-in | **No** sign-in to assemble and request; **yes** to see a peptide price | `axiom.submit_public_request`, `v_catalogue` |
| 4 | One deployment or two | **One** Next.js app, three surfaces by route and role | repository layout |
| 5 | PPN | 11 % charged, delivery inside the taxable base (DPP) — **placeholder, confirm with the tax adviser** | `site_settings.ppn_rate`, `delivery_in_dpp` |
| 6 | Invoice identity | « legal entity », « NPWP », « bank » placeholders | `site_settings.entity`, `site_settings.bank` |
| 7 | Delivery beyond Jabodetabek | Rate pending (null) → quotes to those destinations cannot be sent | `delivery_zones` |
| 8 | Quote validity · payment terms | 7 days each | `site_settings.quote_valid_days`, `payment_terms_days` |
| 9 | Who marks an invoice paid | Ops with the transfer reference; flip to owner-only with one flag | `site_settings.paid_by_owner_only` |
| 10 | Clinic members | Unlimited members per account; any member may request and accept; the paid confirmation is AXIOM's | `account_members` |
| 11 | CoA publication | One sample CoA row seeded and shown on The standard; the PDF file itself is not in the repository | `coa_documents.is_sample` |

Sibling prompt §12 items with a stated default: pen Rp 600.000 current; devices/apparel cost assumed
(flagged `cost_assumed`); 45 % reporting floor; no discounts or tiers anywhere; cut-off 15.00 cold /
17.00 ambient WIB; reorder nudges owner-triggered; acknowledgement valid twelve months for every
account type; no partial payment.

## Owner fields still marked « »

Production and staging domains · legal entity, address and NPWP · PKP status and PPN rate · the bank
account on invoices · Google Search Console and analytics property. All are `site_settings` rows or
environment variables; none is code.

## Deviations from the prompt, and why

- **No cited research at launch.** §5.2 forbids an unverified citation; the network policy of this
  build environment refused PubMed, DOI and Crossref, so every research claim was cut rather than
  softened. The CI resolver (gate 8) is in place; add references in Console → Compound guide and
  the section appears.
- **CAS numbers are all null.** §5.2 says never invent one. Candidates from model memory are listed
  in `docs/catalogue/cas-candidates.md` for the owner to verify before entering.
- **`categories` table.** The sibling schema's benefit-named `categories` is replaced by `pathways`
  (research-neutral names, §11) as the single grouping.
- **Cost columns live in `variant_costs`, not on `product_variants`.** Column-level secrecy inside
  one Postgres role is not enforceable; a separate table whose policy raises for non-owners is what
  makes an ops query "refused" rather than empty (gate 5).
- **The app reads Postgres directly** (one pool, a transaction per request that adopts the caller's
  role and JWT claims). RLS therefore applies to the app's own queries exactly as it does to
  PostgREST; the SQL gates set the same claims. Supabase provides Auth, Storage and the database.
