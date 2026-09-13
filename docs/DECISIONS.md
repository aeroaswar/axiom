# AXIOM platform — decisions taken in the build

The platform master prompt (§14) lists open decisions and asks that they be answered by the owner.
This session could not ask mid-build, so it adopted the prompt's own recommendations and stated
every assumption here. Each is one setting or one flag; none needs a rewrite to change.

| # | Decision | Taken as | Where it lives |
|---|---|---|---|
| 1 | Public price list open or gated | **Open** since the storefront (was gated): every lot priced for every reader; the acknowledgement is still required before AXIOM sends a peptide quote, and the research-use notice stays on every peptide surface. Gate 6 and the site smoke read the setting and assert whichever mode is live. | `site_settings.price_visibility` = `open` (Console → Settings) |
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
(flagged `cost_assumed`); 45 % reporting floor; cut-off 15.00 cold / 17.00 ambient WIB; reorder
nudges owner-triggered; acknowledgement valid twelve months for every account type; no partial
payment. **"No discounts or tiers anywhere" is superseded** by the storefront's one exception below.

## The storefront (migration 0008)

The public site is a shop: `/products` (every lot, one card per compound, filters as URL parameters),
`/products/[slug]` for every kind, `/merch`, `/coas` (the certificate library) and `/coas/[id]` (one
certificate on the document template, PDF from the same markup). Decisions taken with the owner:

| # | Decision | Taken as | Where it lives |
|---|---|---|---|
| 12 | One-time or a delivery plan | A line carries `interval_days` (30 / 60 / 90) from basket to quote to order. The discount is a database rule: `site_settings.subscribe_tiers` (15 / 12 / 10 %), applied by `axiom.send_quote` at the moment prices freeze, rounded to the nearest Rp 1.000; `list_price_idr` and `discount_pct` are frozen beside the net `unit_price_idr`. Peptides only; a plan on a device or apparel is refused at the basket. | `0008_subscriptions.sql`, Console → Settings |
| 13 | What a subscription is | A paid plan line becomes a `subscriptions` row with a next-due date. AXIOM raises the next quote (`axiom.raise_renewal`, one per period), the client accepts and pays as usual, and payment advances the date. Skip, pause, resume, cancel and a change of interval are the client's. No card is stored; nothing is charged automatically. | `public.subscriptions`, Account → Subscriptions, Console → Subscriptions |
| 14 | Reorder nudge versus plan | An account with a live plan gets the renewal event, not the reorder nudge. | `axiom.events()`, `withReorderDue` |
| 15 | The declaration on the public request | A research compound on a signed-out request needs the reader's research-use declaration (`leads.ruo_declared_at`). The formal acknowledgement is still recorded in the account, and `send_quote` still refuses without it. | `axiom.submit_public_request` |
| 16 | Certificate publication | A certificate row may be published per lot (`coa_documents.is_public`); the library lists the published rows and the sample. The rendered certificate states only what the row holds. Production seeds one sample row; the file itself is filed under `public/coa` when storage lands. | `axiom.publish_coa`, `/coas` |
| 17 | Product imagery | The owner's pen catalogue (Drive: *AXIOM-65-PEN-CATALOGUE-WEB-STRAIGHT-ZERO-LABEL-40x20MM*) is rebuilt in the repository: `scripts/pens/build.py` composes the blank pen and the sprite's own wordmark with each row's name and smallest lot, at the catalogue's 40 × 20 mm label geometry, and writes `public/products/<slug>-{400,800,1280}.webp`. `ProductImage` serves the pen when one exists for the slug and the CSS vial tile otherwise (devices, apparel, a compound added before the next build). Nothing on a label is typed: name and quantity come from the row, the clicker reads 0 by rule. | `scripts/pens/`, `product-image.tsx` |
| 18 | Motion | Three behaviours, chosen by the owner: the hero pen as a lit three.js object (matte body, bronze collar and rings, the label wrapped on the barrel from the same row) that rolls slowly and leans toward the pointer; GSAP ScrollTrigger reveals in place of the class-based ones (700 ms, 65 ms stagger, 16 px); a settle-in on client navigation and a magnetic lean on `.btn` for fine pointers. Restrained by rule: eases out, never bounces. Every behaviour sits inside `gsap.matchMedia`, so a reduced-motion preference leaves the page static, and the 3D pen mounts only after idle, only with WebGL, over a still that stays for crawlers. Bundled from npm; the CSP is unchanged. | `pen-3d.tsx`, `pen-hero.tsx`, `motion.tsx`, `reveal.tsx` |
| 19 | The quote-first flow, stated | A usability pass on the storefront. The basket and the confirmation carry a four-stage strip (request → quote → pay → dispatch) with the stage the reader is on; the quote number is every requester's reference, signed in or not, and rides the WhatsApp handoff. The price is stated with what it excludes (PPN at `site_settings.ppn_rate`, delivery from the nearest published zone). A card's Add opens a chooser (size, one-time or a plan) where there is a choice, so the card honours the tag it carries; a mini basket opens on every add and reads the basket back from `/api/basket?detail=1`. One name for the container: Basket; "Request a quote" is the action. The shop searches synonyms, opens one page of 24 deep with a "Show more" link, and offers a way out of an empty result; a phone shows two cards across under a filter row that stays put. The lead form says per field what is wrong. The frequency chips state the next two delivery dates from the device's date. The certificate promise is worded to what is true at the point of decision, and the mark appears only where a certificate is published. | `flow-strip.tsx`, `quick-add.tsx`, `mini-basket.tsx`, `request-forms.tsx`, `request/sent` |
| 20 | After the request: WhatsApp | The owner's call for the guest path. The confirmation leads with **Continue on WhatsApp**, message prefilled with the reference; the team confirms lines and address in the chat, sends the quote there and takes the bank transfer. No NPWP or PO fields on the request (not needed). The dispatch cut-off in `site_settings.cutoff` is now stated on the product page, the basket and the confirmation. A sold-out lot takes a "tell me when it is back": one email or mobile number through `axiom.request_stock_notice` into `public.stock_notices` (staff-only read, `axiom.stock_notices_open()` per lot); WhatsApp stays beside it. | `0009_stock_notices.sql`, `notify-form.tsx`, `buy-box.tsx`, `request/sent` |

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

## Findings closed after the commerce and account modules landed

A security review over the console-commerce and account code found two authorisation defects and
two smaller ones. All four are fixed; each of the first two is pinned by a gate so it stays fixed.

- **A quotation could be printed before AXIOM sent it.** `/api/documents/quote/{number}`
  authorised on visibility alone, and `quotes_read` carries no state predicate, so a client who
  had merely *requested* a quote could fetch a formal, letterheaded, fully priced quotation for it
  — `quoteBody` falls back to today's list price for a line that is not yet frozen. That skipped
  every test `axiom.send_quote` applies before pricing leaves the building: current acknowledgement
  on peptide lines, quantities actually available, a rate for every destination. The route now
  requires `sent_at is not null` for a non-staff caller; staff may still preview their own draft.
  Pinned by the Playwright gate *a quotation exists only once AXIOM sends it*.
- **A destination was never checked against the account that owns it.** `site_id` arrived from a
  form field and was stored verbatim by `axiom.cart_set`, `axiom.request_quote` and
  `axiom.save_quote_draft`, and `axiom.delivery_for_lines` — `security definer`, so RLS did not
  apply inside it — joined `account_sites` with no account filter and would name any site it was
  handed. Migration `0007` adds `axiom.site_of`, which refuses a destination that does not belong
  to the account, puts all three writers through it, and filters the join as well. Pinned by SQL
  gate S14.
- **Payment and void were writable as plain columns.** `guard_invoice_edit` froze the money on an
  issued invoice but left `paid_at`, `paid_ref` and `voided_at` open, while `invoices_write` is
  `for all using (axiom.is_staff())` — so the `paid_by_owner_only` setting was a check on one code
  path, not on the column, and the Console already writes `public.invoices` directly for notes and
  the sent stamp. `0007` moves those columns behind the same transaction frame the domain layer
  uses; `axiom.mark_paid` and `axiom.cancel_order` name themselves, and nothing else may. The dev
  fixtures backdate invoices through a session-local helper for the same reason. Pinned by S15.
- **A driver error reached a clinic's screen.** The account surface rendered `pgMessage(e)` for any
  failure. The domain layer marks the refusals it *wants* read with `errcode = 'check_violation'`,
  so `pgRefusal` passes only those through and everything else becomes one plain sentence.

Two things the review raised that were checked and left alone: cost and margin never reach a
non-owner (every cost read joins a relation whose policy raises, and `deliveredMargin` returns a
refusal for an ops session), and no action anywhere accepts a price, total or discount from a form.
