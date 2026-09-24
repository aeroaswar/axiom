# AXIOM PLATFORM — MASTER BUILD PROMPT
### One catalogue. Three surfaces. Public site · Client account · Admin console.

*Point an executing agent at this file. It is the entry document for the whole AXIOM digital
property: the public website (with its price list and compound guide) and the back office that
runs behind it (dashboard, orders & quotes, catalogue & stock, price list & margins, invoice
builder, clients).*

---

## 0 · HOW TO USE THIS FILE

**Two files, one specification.** This document is the entry point and owns the platform: the
stack, the roles, the route map, the public site, the data model, and the gates. Its sibling,
`web-app/axiom-web-app-master-prompt.md`, owns the *interior detail* of the Console and Account —
the commercial flow (§4.0 there), the module behaviour (§4.1–§4.6), the system rules (§4.7), the
mobile shell (§6) and the design system (§7). **Read both before writing code.** Where they touch
the same rule, the sibling file wins on Console/Account behaviour and this file wins on anything
public-facing or platform-wide. Never restate a rule in both — move it, or reference it.

**The clickable target.** `web-app/mockup/index.html` is a working single-file mockup of the
Console and Account. It is the visual and behavioural contract for those two surfaces: if the
build disagrees with the mockup, the mockup is right unless this file says otherwise.

**Fill these in before you start.** Fields marked « » are unknown to the author of this prompt and
must be answered by the owner, not guessed:

- Production domain « » · staging domain « »
- Legal entity name, address and NPWP for invoices « »
- PKP status and current PPN rate « »
- Bank account shown on invoices « » (the mockup carries a placeholder)
- Google Search Console + analytics property « »
- Whether the public price list is open or gated (§14, decision 1)

---

## 1 · OPERATING PROTOCOL — build in this order, do not skip

The order matters because each step is the foundation of the next. Building the public site before
the catalogue is reconciled will bake the wrong prices into static pages.

1. **Reconcile the catalogue to one source.** See §2. Nothing else starts until there is one
   agreed list of lots and one agreed price per lot.
2. **Answer §14 decisions 1–4** with the owner. They change information architecture, not styling.
3. **Schema, RLS, seed.** §10. Every table gets an explicit policy. Seed from the reconciled
   catalogue, not from either legacy file.
4. **Console: Catalogue & stock, then Price list & margins.** These are the editing surfaces for
   the data everything else reads. Build them first so there is somewhere to correct a price.
5. **Public site.** §5. It reads the catalogue; it never carries its own copy.
6. **Console: Orders & quotes → Invoice builder → Clients → Dashboard.** The dashboard is last
   because every figure on it is derived from the modules above.
7. **Account.** §6.
8. **Gates.** §13. Every gate is a test in CI, not a claim in a document.

---

## 2 · THE PROBLEM THIS BUILD EXISTS TO SOLVE

Today AXIOM's product data lives in at least two places and they disagree:

| | `website/index.html` (`window.CATALOG`) | `web-app/mockup/index.html` (Margin Structure) |
|---|---|---|
| Items | 57, in 8 benefit-named categories | 79 priced lots + 8 devices/apparel, 11 research-neutral categories |
| Retatrutide 10 mg | Rp 1.900.000 | Rp 2.700.000 |
| Tirzepatide 10 mg | Rp 1.500.000 | Rp 2.200.000 |
| Cost basis | none | supplier cost, pen, base price, margin per lot |
| Compound research | `window.REFERENCE`, a drawer | none |

A clinic can therefore read one price on the website and receive another on a quote. That is the
defect this platform is built to make structurally impossible.

**The rule that follows from it, and the single most important rule in this document:**

> There is exactly one catalogue. `product_variants` is its home. The public price list, the public
> compound guide, the client's shop, the quote builder, the order, the invoice and the margin
> report all read the same row. A price is changed in one place, by one role, and every surface
> follows. **Any second copy of a price, a product name, a dose or a compound description is a
> build failure**, including a hardcoded array in a template, a CSV in the repo, or a duplicated
> constant in a script.

**Reconciliation task (step 1 of §1). Settled by the owner: the catalogue is the 79 lots.** The
Margin Structure's 79 priced peptide lots, plus the eight devices and apparel items, are the
commercial truth and the only catalogue. They are also the only set with a cost basis and a stated
margin. **The website's 57-item list is retired**, not maintained in parallel and not offered as a
public subset; its stale prices are the defect above. Migrate anything worth keeping out of it
before deleting it.

**A lot is not a compound.** The 79 lots collapse to roughly 52 distinct compounds, because a
compound is sold at several doses — Retatrutide is one compound at five lots, Tirzepatide at three.
This distinction runs through the whole build: **stock, price and margin are per lot; the guide
page, the card and the search result are per compound**, with its lots as dose options on the page.
Getting this backwards produces five near-identical Retatrutide pages competing with each other in
search and a shop that reads as a spreadsheet.

The website's *category names* are benefit-framed ("Metabolic & Weight Management",
"Sexual Health") and must be replaced by the research-neutral names already used in the app
(Metabolic, Growth Factors, Tissue Repair, Neuro, Cellular Energy, Immune, Reproductive,
Longevity, Bioregulators, Therapy, Apparel) — see §11. The website's `window.REFERENCE` research
notes are good source material for §5.2 and should be migrated, not discarded, and then held to
the citation discipline in §5.2.

---

## 3 · SURFACES, ROUTES AND STACK

**Stack.** Next.js 15 (App Router) + TypeScript + Supabase (Postgres, Auth, Storage, RLS) +
Tailwind, deployed on Vercel. One repository, one deployment, three surfaces separated by route
and role — not three apps. This is what keeps the catalogue single.

**Rendering.** Public pages are statically generated with incremental revalidation so a price
change in the Console reaches the site without a deploy; the revalidation window is a stated
number (default 60 seconds) and appears in §13 as a gate. Console and Account are dynamic and
authenticated. No public page may be client-rendered from an API call for its primary content —
the compound guide must be in the HTML for crawlers and for a clinic on a poor connection.

**Route map.**

```
PUBLIC                                     ROLE: anon
/                                          home — positioning, the standard, the pillars
/compounds                                 the compound guide index
/compounds/[pathway]                       one of nine research pathways
/compounds/[pathway]/[slug]                one compound: identity, research, handling, verification
/price-list                                every lot, one price, IDR, filterable, downloadable
/products/[slug]                           a purchasable lot (peptide, device, apparel)
/standard                                  how AXIOM verifies: HPLC/MS, CoA, cold chain
/how-to-read-a-coa                         explainer — the trust asset
/process                                   enquiry to doorstep, four steps
/faq · /contact · /legal/* · /terms · /privacy
/request                                   the basket and the quote request form

ACCOUNT                                    ROLE: client · clinic
/account                                   needs you · in progress · earlier
/account/shop · /account/orders · /account/quotes/[id] · /account/orders/[id]
/account/invoices · /account/saved · /account/profile

CONSOLE                                    ROLE: ops · owner
/console                                   dashboard
/console/orders                            orders & quotes — one pipeline
/console/catalogue                         catalogue & stock
/console/pricing                           price list & margins            (owner only)
/console/invoices · /console/invoices/[id] invoice builder
/console/clients · /console/clients/[id]   clients
/console/content                           compound guide editing          (§5.2)
/console/settings
```

---

## 4 · ROLES, ACCESS AND THE ACKNOWLEDGEMENT GATE

**Roles.** `anon` · `client` · `clinic` · `ops` · `owner`. Row-level security on every table with
an explicit policy; a table with RLS enabled and no policy is invisible, which is a silent failure
this build must not ship. Cost, base price, margin, CAC and LTV are `owner`-only **at the
database**, not hidden with CSS. An `ops` session that queries `supplier_cost_idr` directly is
refused.

**The acknowledgement gate, stated precisely.** This is the most consequential access rule in the
platform and it has been the vaguest. It splits in two:

- **Education is public.** A compound's identity, class, mechanism-of-study summary, cited
  research, handling and verification are readable by anyone, indexed by search engines, and
  served identically to crawlers and to people. Gating this would be both bad for the business and
  a cloaking risk.
- **Commerce is gated.** Price, availability, the basket, the request form and every account
  surface require a recorded acknowledgement: 18+ **and** qualified researcher, versioned and
  timestamped, valid twelve months. Months eleven and twelve are *expiring*; after twelve it is
  *lapsed* and peptide commerce closes for that account the same day.

**The gate is a rule in the data, not a button in the UI.** The mockup currently swaps a button on
the client sheet, which one path can walk around. In this build: a query for a peptide price, a
peptide quote line, or a peptide order by an account without a current acknowledgement returns
nothing, from every entry point — the shop, a reorder, a requote, a direct API call. Prove it in
§13, gate 6, by calling the API and not by clicking the UI.

---

## 5 · THE PUBLIC SITE

The site's job is to make a clinic believe AXIOM is the serious supplier, and then to hand a
qualified buyer to the account with the least friction the compliance rules allow. It is not a
consumer store and must never read as one.

### 5.1 Pages, and what each is for

- **Home.** Positioning, the standard, the pillars, one proof point per pillar, one call to
  action. Keep the existing hero treatment and its reduced-motion fallback; the field animation is
  a brand asset, but it must never block first paint or ship on a phone that asks for less motion.
- **The compound guide** (§5.2). The authority layer and the reason a clinic finds AXIOM in search
  rather than through an introduction.
- **The price list** (§5.3). One price per lot, stated plainly, with the honesty of the model as
  the argument: no tiers, no negotiation theatre.
- **The standard** and **How to read a CoA**. AXIOM's line is "Documented, not promised". These two
  pages are where the documents actually appear. A clinic that has been burned by an unverified
  supplier is the ideal reader.
- **Process** and **FAQ**. Cut the friction of a first order: what happens after the enquiry, how
  cold chain works, what delivery costs, how payment works.
- **Request** (§5.4). The basket and the quote request.

### 5.2 The compound guide — the highest-value and highest-risk content on the site

**Shape.** An index, nine pathway pages, and **one page per compound — roughly 52 pages covering
the 79 lots**, never one page per lot (§2). A compound page carries, in this order:

1. **Identity.** Name, synonyms, compound class, molecular class, **every lot AXIOM supplies as a
   dose row** (10 mg / 20 mg / 30 mg …) with its own price and availability, presentation
   (vial + reusable injection pen), and CAS number where a real one exists. Never invent a CAS
   number or a molecular weight.
2. **What has been studied.** Two to four short paragraphs describing what published research has
   *investigated*, in research models. Each claim carries a citation.
3. **Handling.** Storage, reconstitution, stability, freeze–thaw, as laboratory practice. Migrate
   `window.REF_HANDLING` from the current site as the shared baseline and let a compound override it.
4. **Verification.** Purity method (HPLC/MS), the threshold AXIOM holds, that every lot travels with
   its Certificate of Analysis, and a link to a sample CoA.
5. **Related compounds** in the same pathway.
6. **Commerce block** — price and Request, behind the acknowledgement gate (§4).
7. **The Research Use Only notice**, in full, on every compound page.

**Citation discipline — non-negotiable.**

- Every statement about what a compound does, or has been studied for, carries a citation with a
  **PubMed ID or DOI that resolves**. A `product_references` row holds it (§10).
- **The executing agent must not invent, guess or approximate a citation.** If a claim cannot be
  supported by a reference the agent has actually verified resolves, the claim is **cut**, not
  softened. A page with three cited sentences is worth more than a page with twenty uncited ones,
  and is the difference between an asset and a liability.
- CI resolves every PMID and DOI on every build and fails on a dead reference (§13, gate 8).
- Where the current site's `window.REFERENCE` text makes a mechanistic claim without a source,
  either source it or reduce it to the compound's class and structure, which are facts about the
  molecule rather than claims about its effect.

**Language rules.** Allowed: "has been studied for", "investigated in preclinical models",
"research into", "in vitro". Forbidden, on every public surface: any dose, any protocol, any
schedule, any regimen, any duration of use, any human outcome, any before-and-after, any
testimonial, any comparison to a prescription medicine as a treatment, and every word on the
avoid-list in §11. A compound page that tells a reader how much to use is a failure of the build
regardless of how well it reads.

**Editing.** `/console/content` lets the owner edit a compound's guide fields and its references
with a preview. Content is versioned; publishing is explicit. No compound page goes live with
`is_published = false`.

### 5.3 The price list

- **All 79 lots**, grouped by the nine research pathways, plus the devices and apparel, with dose,
  presentation and one price in IDR. Lots of the same compound sit together under one heading rather
  than repeating the compound name down the column. Tabular numerals, `Rp 1.600.000`, no cents.
- Filter by pathway, search by name, sort by name or price.
- **Reads `product_variants.price_idr` directly.** The page carries a "prices as at" date derived
  from the most recent price change, not typed.
- A downloadable PDF generated from the same data and the same document template as the invoice, so
  the price list a clinic files and the invoice it later receives are visibly the same system.
- A plain statement of the pricing model: one price per lot, the same for every account, the pen
  included. That is a differentiator in this market and should be said, not implied.
- Whether prices render for `anon` or only after the acknowledgement is §14 decision 1. Build it as
  a single configuration flag read server-side, so the answer can change without a rewrite.

### 5.4 The basket and the request path

The current site already has a basket in `localStorage` (`axiom_cart_v1`); the app mockup has
none, and its client can only request one product at a time. Reconcile in favour of the basket —
a clinic orders five things at once, and making it ask five times is the fastest way to lose the
order to WhatsApp.

- **Basket.** Add any lot with a quantity; persists per browser; survives sign-in by merging into
  the account.
- **Destinations.** An account with more than one address assigns a destination per line, in the
  basket, before it submits. Delivery is charged per consignment (Rp 100.000 per three units per
  destination, capped at Rp 300.000 per destination), so **the person choosing the destinations
  must see what the split costs at the moment they choose it**, not on the invoice. Show the
  running delivery charge and name each destination.
- **Submit.** The basket becomes a `requested` quote — a real record — visible in the Console
  pipeline immediately. It does not become an order, and it does not commit a price: pricing and
  sending remain the Console's act, per the flow in the sibling prompt.
- **Signed out.** The same form also captures name, clinic, role, email and WhatsApp, creates a
  `lead` and an unverified account, and sends the acknowledgement request. Nothing peptide-priced
  is shown until it is completed.
- **WhatsApp stays first-class.** Every request path ends with the option to continue on WhatsApp
  to `+62 812 857 3396`, because that is where this market closes.

### 5.5 Search, structured data, performance, language

- **Indexable:** home, compound guide, pathways, standard, CoA explainer, process, FAQ, legal.
  **Not indexable:** account, console, basket, request confirmation.
- **Structured data:** `Organization` on the home page; `TechArticle` or `DefinedTerm` on compound
  and pathway pages; `FAQPage` on the FAQ. **Do not emit `Product` or `Offer` markup on any
  peptide page.** It invites shopping surfaces to present research chemicals as consumer goods,
  which is the exact misreading the entire compliance posture exists to prevent. Devices and
  apparel may carry `Product`.
- **Titles and descriptions** are derived from the compound record, never hand-written per page,
  so a renamed compound cannot leave a stale title behind.
- **Performance:** largest contentful paint under 2.5 s on a mid-range Android over 4G; the hero
  animation is deferred, is disabled under `prefers-reduced-motion`, and never blocks paint;
  images are responsive and lazy below the fold.
- **Bilingual, properly.** Indonesian and English, with `hreflang`, a language switch that persists,
  and every string in a message catalogue. This matters more on the public site than anywhere else:
  the buyer is an Indonesian clinic manager. No hardcoded strings in components.
- **Accessibility:** every interactive element reachable and operable by keyboard, visible focus,
  WCAG AA contrast on the dark palette, and a table row that opens a detail is a real control, not
  a `tr` with a click handler.

---

## 6 · THE ACCOUNT (client · clinic)

Detail lives in the sibling prompt §4.1 (Account paragraph) and §4.7. The platform-level
requirements:

- The account is **post-purchase plus repeat purchase**: what needs you, what is in progress, what
  is done, and one-tap repeat of any past order.
- It uses the **same basket** as the public site (§5.4), including per-line destinations.
- It shows the order's fulfilment timeline, the invoice with bank details and reference while
  payment is due, an "I have transferred" flag, and every past invoice as a PDF.
- **A clinic is more than one person.** Support at least two members per account with distinct
  sign-ins, and record which member requested, accepted and paid. A nurse ordering and a director
  approving is the normal shape of the buyer; one anonymous login per clinic is not.
- Its vocabulary is the client's, not the state machine's: "waiting for your acceptance", "payment
  due 11 Sep", "on its way", not `awaiting_payment` or a quote reference alone.

---

## 7 · THE CONSOLE (ops · owner) — the six modules

Interior behaviour is specified in the sibling prompt §4.1–§4.7 and demonstrated in the mockup.
What each module owes the platform:

**7.1 Dashboard.** One screen answering "what needs me today". A five-stage pipeline strip (quotes ·
awaiting payment · to pack · in transit · delivered) with count, value and the one figure that
matters per stage; a derived Today feed; the month's KPIs. **Every number is derived from the
tables as they stand.** Revenue, quote-to-close, reorder rate, AOV, gross margin, CAC and LTV are
computed, never typed — the mockup still carries literals here and the build must not. Grep the
components for a hardcoded figure: zero results.

**7.2 Orders & quotes.** One list holding both, sorted by what is due first, each row carrying its
next action and its deadline. The whole commercial flow — requested → sent → accepted → awaiting
payment → packing → dispatched → delivered — with acceptance issuing the invoice and payment
gating dispatch. This is specified in full in the sibling prompt §4.0 and must not be re-specified
here.

**7.3 Catalogue & stock.** Variant CRUD across the pillars. Stock as a derived balance over an
append-only `stock_movements` ledger, never a mutable integer column. Three figures on screen: on
hand, reserved, available. A sent quote and an undispatched order hold their lines; dispatch writes
the sale and lifts the hold; expiry, loss and cancellation release it. On hand can never go
negative — enforce with a check constraint, not with UI validation.

**7.4 Price list & margins** (owner only). All lots with supplier cost, the Rp 600.000 injection
pen, base price, selling price, margin and gross margin percentage; a per-pathway roll-up that
foots to the document; a cost-composition view; a flag for lots under the reporting floor.
`base = supplier + pen`, `margin = selling − base`, and **selling price is set per lot, never
derived from cost** — margin is an outcome, not a target. A price change here is the change the
public site publishes, so it is audited: who, when, from, to.

**7.5 Invoice builder.** The A4 dark document already built in the mockup, rendered from the same
template as its preview and as its PDF. Issuing freezes lines and prices and starts the payment
clock; a change after issue is a credit note, never an edit; cancelling an unpaid order voids the
invoice. Save, send by WhatsApp or mail, print. Also generate a **quote document** on the same
template — an institution's procurement office needs a quotation on letterhead, and a WhatsApp
message will not clear their process.

**7.6 Clients.** Accounts with type, manager, lifetime value, order count, reorder cadence derived
from order history, acknowledgement state with its expiry, delivery addresses, members, and every
document ever sent. Overdue and expiring accounts surface themselves in the Today feed with a
pre-filled message rather than waiting to be found.

---

## 8 · THE COMMERCIAL FLOW

Specified in full in `web-app/axiom-web-app-master-prompt.md` §4.0. In one line, so this document
is readable on its own:

```
QUOTE   requested → draft → sent → accepted ─┐        (expired derived at 7 days · lost)
ORDER                                        └→ awaiting payment → packing → dispatched → delivered → reorder due
```

Two decisions fix its shape and both are settled: **AXIOM is paid before anything is dispatched**,
and **every order begins as a quote**. Acceptance is one action that creates the order with lines,
prices, addresses and delivery frozen and issues the invoice. Payment is the only door into
packing. Cancel is allowed only before dispatch and voids an unpaid invoice.

The public site's contribution to this flow is the **`requested`** state and nothing further: it
can raise a request, never a price and never an order.

---

## 9 · SYSTEM RULES THAT SPAN SURFACES

The full list is the sibling prompt §4.7. These are the ones that only exist because there is now
a public site, and they belong here:

- **One catalogue** (§2). Restated because it is the rule most likely to be broken by convenience.
- **One price, one place, one moment.** The number on the public price list, in the compound page's
  commerce block, in the basket, on the quote, on the order and on the invoice is the same number,
  and it is frozen onto the quote line the moment the quote is sent. A public price change never
  touches a sent quote or an accepted order.
- **Education is public, commerce is gated** (§4). Applied identically to people and to crawlers.
- **Availability is the only stock figure a public surface shows.** On hand and reserved are
  internal. A lot with nothing available reads "ask to be told when it is back" and can be
  requested but not priced into a sendable quote.
- **Delivery is charged per consignment and shown before commitment** (§5.4).
- **Every state change is logged** with actor and timestamp, on quotes, orders and invoices, and a
  cancel is a state rather than a delete.
- **Nothing on a dashboard, a badge or a notification is typed by hand.** One derived query feeds
  the Today list, the bell and the count, and each item disappears on its own when the work is done.

---

## 10 · DATA MODEL

Take the schema in the sibling prompt §8 as the base — `profiles`, `accounts`, `account_members`,
`acknowledgements`, `categories`, `products`, `product_variants`, `stock_movements`, `quotes`,
`quote_items`, `quote_events`, `orders`, `order_items`, `order_events`, `shipments`, `invoices`,
`invoice_items`, `invoice_sequences`, `leads`, `activities`, plus the reserved `lots` and
`coa_documents`. The platform adds the content and site layer:

```
pathways          id · no · slug · name_en · name_id · summary_en · summary_id · sort
                  -- research-neutral names only (§11)
products          + slug · identity_en · identity_id · research_en · research_id
                  + handling_en · handling_id · cas_no(null) · is_published · published_at
product_references id · product_id · claim_key · citation · pubmed_id(null) · doi(null) · url
                  -- every research claim maps to at least one row here (§5.2)
coa_documents     id · variant_id · lot_code · file_path · issued_at · method · purity_pct
                  -- was reserved; the platform uses it for the sample CoA and, later, per-lot
site_settings     key · value            -- price visibility flag, revalidation window, banners
price_changes     id · variant_id · from_idr · to_idr · changed_by · changed_at
                  -- what the public "prices as at" date reads, and the audit trail
carts             id · account_id(null) · anon_key(null) · created_at
cart_items        id · cart_id · variant_id · qty · site_id(null)
```

**Rules.** All money is `bigint` rupiah — no floats, no cents. `quote_items.unit_price_idr` and
`order_items.unit_price_idr` are frozen at write time and never joined back to the live variant
price to render a historical document. Stock is `sum(stock_movements.delta)` in a view. Accepting a
quote is one transaction that inserts the order, its items and its invoice and logs both events —
all of it lands or none of it does. `orders.state` may move from awaiting payment to packing only
in the same transaction that sets `invoices.paid_at`; enforce it in a trigger, not in the client.

---

## 11 · CONTENT AND COMPLIANCE

Inherited verbatim from the business master prompt and non-negotiable:

- **Research Use Only.** Every peptide-adjacent surface — page, drawer, PDF, invoice, generated
  WhatsApp message — carries the notice. In-vitro laboratory research only; not for human or
  veterinary consumption, diagnosis or treatment; no dosing or usage guidance provided.
- **Research-neutral category names** on every customer-facing surface: Metabolic, Growth Factors,
  Tissue Repair, Neuro, Cellular Energy, Immune, Reproductive, Longevity, Bioregulators, Therapy,
  Apparel. The price list's own benefit-framed labels are therapeutic claims and must not appear.
- **Avoid-list, enforced by CI lint over the message catalogues:** miracle, guaranteed, cure,
  anti-aging, best, #1, and the bodybuilding vocabulary of protocols and repeated courses. Zero
  exclamation marks in user-facing copy.
- **No dosing regex** in the same lint: any number followed by a frequency or a route in body copy
  fails the build.
- **Indonesian context.** The invoice is an Indonesian tax document: entity name, NPWP, PPN handling
  and e-Meterai threshold per §14. Terms and privacy pages reflect UU PDP for personal data, and the
  acknowledgement record is personal data with a retention position.

---

## 12 · DESIGN SYSTEM

The brand tokens, the smoked-bronze glass layer, the motion budgets and the hierarchy rules are in
the sibling prompt §7 and its §11 brand appendix. Do not re-derive them. Platform-level notes:

- **The public site and the app are one visual system**, not a marketing skin over an admin tool.
  Same tokens, same type, square corners, hairline depth, bronze under eight per cent by pixel share
  on the busiest screen.
- **The public site is the calmer end of the range.** More space, larger type, fewer chips. An
  operator's screen is dense because density is speed; a clinic's first visit is not.
- **The document template is shared.** Invoice, quote document and price-list PDF are the same
  component with different content.
- **Motion budgets:** micro 220 ms, reveal 700 ms, draw 950 ms, stagger 65 ms, movement under 18 px,
  no bounce, and everything off under `prefers-reduced-motion`.

---

## 13 · DEFINITION OF DONE — every gate is a test in CI

| # | Gate | Proven by |
|---|---|---|
| 1 | One catalogue | Grep the repository for a second price, product name or dose literal outside the seed migration: zero. Changing a price in the Console changes `/price-list` within the stated revalidation window. |
| 2 | Prices reconcile | 79 peptide lots seeded, plus 8 devices and apparel, footing to the Margin Structure: supplier Rp 79.320.000, base Rp 126.720.000, selling Rp 249.800.000, margin Rp 123.080.000 at 49.3%, markup 97.1%; `base − supplier` is Rp 600.000 on every peptide lot; pathway counts 10/11/13/8/8/2/6/9/12. |
| 2b | A lot is not a compound | The guide renders one page per compound with its lots as dose rows, not one page per lot; every one of the 79 lots is reachable from exactly one compound page and appears on the price list. |
| 3 | Frozen prices | Accept a quote, raise the catalogue price, reload the order and the invoice: both unchanged. |
| 4 | RLS holds | A `client` session issues a direct PostgREST read for another account's orders and receives zero rows. |
| 5 | Margin is owner-only | An `ops` session queries `supplier_cost_idr` directly and is refused. |
| 6 | Acknowledgement gates commerce | An account without a current acknowledgement receives zero peptide **prices** from a direct API call, from every entry point, while the same account still reads the compound guide in full. |
| 7 | Education is not cloaked | The compound page served to a crawler user-agent is byte-identical to the one served to an anonymous visitor. |
| 8 | Every claim is cited | Each `product_references` PMID or DOI resolves; a dead reference fails the build. No research statement renders without at least one reference. |
| 9 | No dosing, no claims | Lint over the message catalogues and content tables reports zero avoid-list words, zero exclamation marks and zero dose-and-frequency patterns. |
| 10 | No consumer markup | No `Product` or `Offer` structured data on any peptide page. |
| 11 | Payment gates dispatch | On an unpaid order the dispatch action is absent and a direct state write is refused; marking paid records who, when and the reference and moves the order to packing in one transaction. |
| 12 | Stock never lies | Sending a quote raises reserved; dispatch lowers on hand and clears the hold; cancel releases it; a write that would take on hand below zero is refused by a constraint. |
| 13 | Nothing is typed | Dashboard, Today list, bell and badge all render from one derived query; grep for a hardcoded KPI or notification string returns zero. |
| 14 | The basket is honest | A basket split across three destinations shows Rp 300.000 delivery before submission, and the resulting quote, its message, the order, the timeline and the invoice all show that same figure. |
| 15 | Both surfaces render | Public, Account and Console at 390 px and 1440 px with no horizontal scroll and no clipped content. |
| 16 | One nav per width | Tab bar under 1024 px, rail above, never both. |
| 17 | Bilingual | Every user-facing string resolves in Indonesian and English; no hardcoded strings; `hreflang` correct. |
| 18 | Keyboard and contrast | Every interactive element operable by keyboard with visible focus; WCAG AA on the dark palette. |
| 19 | Reduced motion | With `prefers-reduced-motion`, no hero animation, no reveal, no stagger. |
| 20 | Performance | Largest contentful paint under 2.5 s on a throttled mid-range mobile profile for home, price list and a compound page. |
| 21 | Documents match | Invoice, quote document and price-list PDF render from one template; the downloaded PDF matches its on-screen preview. |
| 22 | Everything is logged | Every quote, order and invoice state change appears with actor and timestamp; a cancelled order stays readable. |

---

## 14 · OPEN DECISIONS — ask before building, do not assume

1. **Is the public price list open or gated?** Open builds trust and wins search traffic, and it
   publishes the whole book to competitors. Gated protects the book and adds friction to a first
   visit. Recommendation: identity and research public, price behind the acknowledgement, which is
   also the cleanest compliance story. Build it as one flag either way.
2. **How much of the compound guide is written at launch?** The 79 lots are settled, but around
   fifty-two cited compound pages is a research project in itself. Recommendation: publish the nine
   pathway pages plus the twelve highest-demand compounds fully cited, and hold the rest as
   identity-only stubs — name, class, lots, price, handling, verification — marked unpublished
   until their research section is sourced. Identity is fact about the molecule and needs no
   citation; a mechanism claim does.
3. **Does the public basket require sign-in before submitting?** Recommendation: no for the basket,
   yes for a price — an anonymous visitor may assemble and request; they see figures only after the
   acknowledgement.
4. **One deployment or two?** This prompt assumes one Next.js app. If marketing must ship
   independently of the back office, the catalogue must still be one API and never a copy.
5. **PPN.** Current rate, PKP status, whether delivery sits inside the taxable base or is a
   reimbursement outside it, and whether e-Faktur integration is needed at launch.
6. **Invoice identity.** Legal entity, NPWP, bank account, and the e-Meterai threshold.
7. **Delivery beyond Jabodetabek.** The zone is reserved and unpriced, which blocks those quotes by
   design. Supply the tariff, and say whether it is flat per zone or weight-based.
8. **Quote validity and payment terms.** Seven days each in the current build. Confirm, and say
   whether an established clinic may ever be moved to terms after dispatch.
9. **Who may mark an invoice paid** — owner only, or ops with the transfer reference attached.
10. **Clinic members.** How many sign-ins per account, and whether a director must approve an order
    a nurse assembled.
11. **CoA publication.** A sample CoA on the public site is the strongest trust asset available.
    Confirm one may be published, and whether per-lot CoAs reach the client's order page in phase
    one or phase two.

*Settled and no longer open: the catalogue is the 79 lots plus devices and apparel, and the
57-item legacy list is retired (§2).*

---

## 15 · HANDOVER

Definition of done for the *build*, not the product: a new engineer clones the repository, runs one
command, gets a seeded local stack with all three surfaces working and every gate in §13 runnable
locally. The test suite lives in the repository, not in a scratch directory, and runs in CI on every
pull request. A gate that cannot be run is a gate that is not met.

*Run this by pointing an agent at it: "Execute web-app/axiom-platform-master-prompt.md together
with web-app/axiom-web-app-master-prompt.md, and match web-app/mockup/index.html." Start with §1,
step 1 — reconcile the catalogue — and do not skip to the interesting parts.*
