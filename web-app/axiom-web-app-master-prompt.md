# MASTER PROMPT — AXIOM Web App (Console + Account)
**Two surfaces, one codebase · Mobile-first · Smoked-bronze glass in the AXIOM identity · Self-Verifying**

---

## 0 · HOW TO USE
Fill the « » fields if you have opinions; leave them blank and the defaults are used.
Everything outside « » is a **hard requirement, not a suggestion**. This prompt takes the finished
AXIOM brand (Human Performance & Longevity, Jakarta) and produces the **operating software** for
it: an internal admin console and an external client/clinic portal.

Companion document: `business-proposal/axiom-business-master-prompt.md` — the canonical business
model. This prompt is its software counterpart and inherits its §2 business context and §3
compliance guardrails **verbatim**. Where the two disagree, the business prompt wins.

**Fill-in fields**
- Deploy target: «___» — default: Vercel, production + preview.
- Supabase project: «project ref / "create new"» — default: create new, region `ap-southeast-1` (Singapore).
- Seed data: «___» — default: the 79 lots of the AXIOM Margin Structure; devices and apparel from
  `website/index.html` `window.CATALOG`.
- **Canonical price list: the AXIOM Margin Structure** (79 lots with supplier cost and selling price).
  It supersedes both the website catalogue and the older peptide price list where they disagree.
- Device and apparel landed cost: «___» — default: devices 60% of list, apparel 40% of list. Stated
  assumptions, not sourced figures; the Margin Structure does not cover them.
- PPN: «rate / not registered» — default: charge PPN at 11% on invoices, editable per invoice. Verify the
  current rate and the entity's PKP status before launch.
- Default locale: «EN / ID» — default: ID, with an EN toggle persisted per user.
- Currency: **IDR only.** Not a fill-in field. No multi-currency, no FX display.
- Auth method: «___» — default: Supabase email magic-link, plus password for `owner` and `ops`.
- Phase 2 scope: «___» — default: lots + Certificate of Analysis + cold-chain log (see §4.4).

---

## 1 · OPERATING PROTOCOL (follow in order — do not skip steps)
1. **Load context.** Read §2, §3, §9 and §11 in full before writing a line of code. State back, in
   five bullets, what the two surfaces are and what the app may never display.
2. **Schema first.** Build §8 as SQL migrations with **row-level security on every table**, then
   generate types. No UI until `supabase db push` succeeds and the RLS test in §10 fails correctly.
3. **Auth and role routing.** Supabase Auth, the `profiles` table, middleware-enforced route
   groups. A user with the wrong role must be redirected server-side, never merely hidden.
4. **Token layer before components.** Port §11 into a single CSS custom-property layer plus the
   Tailwind theme. Every later component reads tokens — no literal hex anywhere in component code.
5. **Mobile shell before pages.** Build §6 — the tab bar, the per-tab stacks, the bottom sheet —
   and verify it at 390 px before any module screen exists. Building pages first produces a
   desktop app with a tab bar bolted on, which is the failure mode this ordering exists to prevent.
6. **Modules.** §4, in order: commerce ops → accounts → dashboard. Console screens before Account
   screens; the Account surface is a narrower read of the same data, so it is cheaper second.
7. **Verify.** Run every gate in §10 against a real render at 390 px and 1440 px. Fix what fails.
   Never report "done" on unverified work. Report with the gate table filled in and the deploy URL.

**Clarify-or-assume:** if a field is blank or you are told "you decide," adopt the §0 default,
**state the assumption inline**, and proceed. Ask at most **3 sharp questions**, only for
irreversible decisions (Supabase project creation, auth method, whether peptide SKUs are visible
to unverified accounts).

---

## 2 · WHAT THE APP IS
One Next.js codebase serving two surfaces off one Postgres database.

**AXIOM Console** — internal, for `owner` and `ops`.
The operating system of the business: catalogue and stock, quote building, order fulfilment,
client and clinic accounts, the KPI dashboard, and the lead pipeline.

**AXIOM Account** — external, for `client` and `clinic`.
The buyer's own view: the catalogue at their price tier, their quotes, their orders with tracking,
one-tap reorder, their invoices, and their acknowledgement status.

**Three things that are not optional, because the business runs on them:**
- **WhatsApp is a first-class channel, not a footnote.** The documented commercial motion is
  quote → itemised IDR message → close on WhatsApp (`+62 812 857 3396`). The quote builder must
  compose a correctly formatted, compliance-clean WhatsApp message and open the deep link. Treat
  the message composer as a product surface held to the same copy rules as the UI.
- **The acknowledgement gate is a recorded event.** 18+, and for any peptide line a qualified
  researcher or institutional buyer. It is a timestamped row in `acknowledgements` tied to a user
  and a version string — never a `localStorage` flag, never a client-only modal.
- **Bilingual EN/ID.** Every user-facing string goes through the i18n layer from the first
  component. Retrofitting bilingual support is the most expensive avoidable rework in this build.

**What the app is not.** Not a storefront replacement — `website/` remains the public marketing and
catalogue surface. Not a payment processor; there is no card checkout in this phase. Not a medical
or dosing tool of any kind (§9).

---

## 3 · ROLES & ACCESS
Four roles on `profiles.role`:

| Role | Surface | Can |
|---|---|---|
| `owner` | Console | Everything, including pricing, margin figures and user management. |
| `ops` | Console | Catalogue, stock, quotes, orders, fulfilment, clients. **Cannot** see margin, COGS, CAC/LTV or user management. |
| `clinic` | Account | Own account only, at its clinic price tier. Multiple members per account. |
| `client` | Account | Own account only, at list price. |

**Hard requirements.**
- **RLS on every table.** The canonical policy is "a row is visible when it belongs to the
  requesting user's account, or when the requesting user's role is `owner` or `ops`." Margin,
  COGS and acquisition-cost columns are gated to `owner` by column-level policy or a separate
  `owner`-only view — `ops` must not be able to read them through any query path.
- **A client-side role check is not access control.** Enforce in middleware and in RLS. The UI
  hiding a link is a convenience, never the boundary.
- Route groups: `app/(console)/…` and `app/(account)/…`, each with its own layout and shell.
  Middleware reads the session, resolves the role, and redirects a mismatched role server-side
  before any page renders.
- Peptide SKUs are hidden entirely from an account with no current qualified-researcher
  acknowledgement on file. Devices, wellness and apparel remain visible.

---

## 4 · MODULES

### 4.1 Core commerce ops
**Entities:** `categories`, `products`, `product_variants`, `stock_movements`, `quotes`,
`quote_items`, `orders`, `order_items`, `shipments`, `invoices`.

**Console.** Catalogue CRUD across the five pillars, with the variant model carrying `dose` and
`content` as they exist in `window.CATALOG` (a compound at 10 mg and 30 mg is two variants of one
product, not two products). Stock as a derived balance over `stock_movements`, never a mutable
integer column — an append-only ledger is the only way a stockout figure stays trustworthy. A
stockout flag and a low-stock threshold per variant. A quote builder: pick account → add line
items → quantities → per-line and total in IDR → save → compose the WhatsApp message → mark sent.
Quote states `draft · sent · accepted · expired · lost`. Convert an accepted quote to an order in
one action, carrying line items and prices forward frozen. Order states `pending · packing ·
dispatched · delivered · cancelled`. Shipment records with carrier and tracking number. Invoice
generation as a print-ready A4 view on the paper palette (§11), with the RUO footer on any
peptide-adjacent invoice.

**Account.** Browse the catalogue at the account's tier. Request a quote. See own quotes with
state. See own orders with a fulfilment timeline and tracking link. Reorder any past order into a
new quote in one tap. Download invoices.

**Acceptance.** A quote built in the Console reaches WhatsApp as a correctly formatted IDR message;
accepting it produces an order whose line prices match the quote exactly even after the catalogue
price changes.

### 4.2 Clients & clinic accounts
**Entities:** `accounts`, `account_members`, `profiles`, `acknowledgements`, `price_tiers`.

**Console.** An account list with type (`individual` / `clinic` / `institution`), assigned account
manager, lifetime value, reorder count, last order date, and acknowledgement status shown as a
first-class column — an account without a current acknowledgement is visibly flagged. Account
detail: members, price tier, full quote and order history, notes. Clinic accounts carry a tier
that applies a percentage or per-variant override at quote time.

**Account.** Account profile, members, the acknowledgement flow, and the current tier stated plainly.

**Acceptance.** An account whose acknowledgement is missing or lapsed cannot see or be quoted a
peptide SKU, from any entry point, verified by a direct API call and not only through the UI.

### 4.3 KPI dashboard + CRM
**Entities:** `leads`, `activities`, plus aggregate reads over quotes, orders and stock.

**Console.** The dashboard defined in the business prompt §6: quote→close rate, reorder rate,
gross margin by pillar (`owner` only), CAC and LTV (`owner` only), stockout rate, AOV, and revenue
by pillar over time. Each metric states its definition and its target on hover or on a detail row —
a number without its definition is not a KPI. A lead pipeline with stages mapped to the four
personas (Researcher · Decade Athlete · Clinic Buyer · Identity Wearer), each lead carrying source,
persona, owner and an activity log.

**Charts.** Follow the `dataviz` rules on the bronze palette. Bronze carries the primary series
only; additional series use the neutral ramp, never invented colours. Tabular numerals on every
axis label and value. No gradient fills under lines, no 3D, no doughnut with more than five
segments, and no chart junk — the brand's restraint applies to data as much as to type.

**Acceptance.** Every figure on the dashboard is IDR-formatted with tabular numerals, every metric
exposes its definition, and an `ops` session receives a permission error rather than a blank card
where the `owner`-only metrics sit.

### 4.4 Price list & margin engine (owner-only figures)
**Entities:** `product_variants` (`supplier_cost_idr`, `pen_cost_idr`, `price_idr`), `pathways`,
`margin_snapshots`. **Source of truth: the AXIOM Margin Structure — 79 lots, nine pathways.**

**The rule, as the business actually prices.** Every lot is a vial from R-Peptides plus a **Reusable
Injection Pen V2 at Rp 600.000**. Both are goods on the invoice, which is what makes the margin a
true gross margin:

```
base price    = supplier cost + Rp 600.000      (the pen — identical on every lot)
selling price = set per lot                     (from the price list, NOT derived from cost)
margin        = selling price − base price      (gross; carries no operating cost)
```

**Margin is an outcome, not a target.** It ranges 21.9% (BPC-157 10 mg) to 78.0% (GHK-Cu 100 mg);
blended 49.3% on Rp 249.800.000, markup 97.1%. Cost composition 31.8% supplier / 19.0% pen /
49.3% margin. Do **not** derive price from cost with a fixed divisor — an earlier draft of this
prompt did, and it was wrong.

**No price tiers.** The price list carries one selling price per lot. Do not invent clinic or
research discounts: against these margins an 8% discount puts most of the book under 45% GM and a
15% discount takes BPC-157 10 mg to 8.1%. If a discount is ever introduced it needs a floor guard,
and that is a decision for the owner (§12), not a default.

**Console (owner).** A price-list screen with a row per lot: pathway, compound, lot, supplier cost,
pen, base price, selling price, margin in rupiah, GM %. Filter by pathway and by "below the 45%
reporting floor". A per-pathway table that **foots exactly to the document totals** — supplier
Rp 79.320.000, base Rp 126.720.000, selling Rp 249.800.000, margin Rp 123.080.000. A cost-
composition bar. Seven lots sit under 45% at list; they are flagged, not hidden.

**Margin on every transaction.** `quote_items` and `order_items` freeze `unit_price_idr`,
`unit_supplier_cost_idr` and `unit_pen_cost_idr` at write time, so historical margin is exact after a
supplier price moves. Every quote, order and invoice carries an owner-only block showing
supplier + pens = base, then margin and GM %. An `ops` session sees none of it — enforced by RLS on
the cost columns, not by hiding elements.

**Non-peptide lines.** Devices and apparel are outside the Margin Structure. Their cost is an
assumption until real landed cost arrives: label it as such in the UI, exclude them from the
GM-floor count, and keep them out of the pathway table's footing.

### 4.5 Invoice builder with PDF
**Entities:** `invoices`, `invoice_items`, `invoice_sequences`.

**Console.** From any order: build an invoice with number (sequence per year, `INV-YYMM-NNNN`), issue
date, reference, net days driving the due date, billed-to and issued-by blocks, line items picked from
the price list (compound, description, lot / spec, qty, unit price, reorderable), adjustments (handling,
discount, PPN %), payment details (bank, SWIFT when foreign, account name and number, transfer
reference) and notes with a `{TERMS}` token. A live preview renders the invoice **on the dark canvas —
the AXIOM invoice builder's own design**, not the paper palette: near-black ground with a faint bronze
glow, "Invoice" in Jost, an amount-due box, a three-column Billed to / Issued by / Details header,
bronze line numerals and amounts, Payment beside Notes, "Research Use Only." above the footer, and
`AXIOM · Human Performance & Longevity` / `Documented, not promised.` as the last line. A row whose
value is zero is left off the invoice.

**Never clip.** The invoice document keeps A4 *width* and grows in whole A4 pages; it must never be given a fixed height with hidden overflow, because a clipped invoice is a wrong invoice and the preview would then disagree with the PDF. The preview shows every page the PDF will contain, and the page counter is measured, not assumed.

**Delivery is a platform question, not a styling one.** A page embedded in a viewer is sandboxed:
a script-started download is inert (and does not throw, so the failure cannot be caught),
`navigator.share` is undefined, and `window.print()` is refused outright — "the document is
sandboxed, and the 'allow-modals' keyword is not set". Use the host's own file-save capability
where one exists, fall back to a direct save only when the page is top-level, and say plainly which
happened. Never leave a save button that silently does nothing.

**Render the document standalone.** The invoice must carry its own typography and background rather
than inheriting them from the app shell, because the PDF is produced by rendering it in an isolated
document. Capture from that minimal document, never from the live page: cloning a 140 KB app to
compute styles cost 13.7 s per invoice against 0.6 s for a document holding only the invoice.

**One template, two outputs.** The on-screen preview and the PDF are rendered from the **same**
invoice template — the PDF is produced by printing that template server-side (headless Chromium via
Playwright, `printToPDF`, A4, fonts embedded), never by a second hand-laid PDF layout. If the preview
and the PDF can drift, the build is wrong. Three actions: **Download PDF** (A4, Inter and Jost
embedded, tabular numerals, selectable text), **Send PDF** (on a phone, the device share sheet with the PDF attached so WhatsApp and mail
are one tap; on desktop, a signed download link in a WhatsApp message), and **Print**. Issuing an invoice
freezes its lines and prices; a change after issue creates a credit note, never an edit.

**Account.** Own invoices, the same PDF, the same Download and Send.

**Compliance.** An invoice carrying a peptide line prints the RUO disclaimer in its footer, verbatim.
The margin block is shown beside the preview for `owner` and is never part of the printed document.

**Acceptance.** A generated PDF opens with the paper ground, embedded fonts, IDR figures in tabular
numerals, PPN computed correctly at the chosen rate, and the RUO footer present on a peptide invoice and
absent on an apparel-only one.

### 4.6 Deferred — schema-reserved, do not build
Lots, Certificate of Analysis documents, per-lot verification lookup, and the cold-chain
temperature log are **Phase 2**. Do not build the UI. **Do** create `lots` and `coa_documents` in
the migration with their foreign keys from `product_variants` and `order_items`, so Phase 2 is an
additive migration rather than a rewrite. This is the brand's stated moat — the schema must not
make it expensive to add.

---

## 5 · INFORMATION ARCHITECTURE

**Console** — desktop left rail; mobile tabs per §6.

| Route | Tab | Screen |
|---|---|---|
| `/console` | Home | KPI dashboard, today's queue |
| `/console/orders` | Orders | Order list, filters, detail, fulfilment actions |
| `/console/quotes` | Orders | Quote list and detail |
| `/console/quotes/new` | *Quote* | Quote builder (opens as a sheet on mobile) |
| `/console/catalogue` | Home | Products, variants, stock |
| `/console/clients` | Clients | Accounts, detail, acknowledgement status |
| `/console/leads` | Clients | Pipeline |
| `/console/settings` | Account | Profile, users, price tiers |

**Account** — desktop top bar plus a narrow rail; mobile tabs per §6.

| Route | Tab | Screen |
|---|---|---|
| `/account` | Shop | Catalogue at tier |
| `/account/orders` | Orders | Own orders, tracking timeline |
| `/account/quotes` | Orders | Own quotes |
| `/account/reorder` | *Reorder* | Past orders, one-tap repeat (sheet on mobile) |
| `/account/saved` | Saved | Saved items |
| `/account/profile` | Account | Profile, members, tier, acknowledgement, invoices |

---

## 6 · THE MOBILE SHELL — INSTAGRAM-STYLE TAB BAR
The most-used surface in this app is a phone in a warehouse, a clinic or a taxi. Build the shell
first and hold it to this spec exactly.

**Form.**
- Fixed to the bottom, full-bleed, **square corners with a single top hairline** (`--glass-line`).
  A rounded floating pill is the default this build must not take: it breaks the square-and-
  hairline language that carries the whole identity.
- Height `56px`, plus `env(safe-area-inset-bottom)` as bottom padding. On a notched iPhone the
  icons must sit above the home indicator, not under it.
- Background `--glass-nav` with `--blur-nav`, and a solid `--bg` fallback for engines that drop
  `backdrop-filter`.
- Five tabs, equal width, icon-only — no text labels, which is Instagram's own pattern and suits a
  brand that already speaks in restraint. Phosphor icons at 24 px. Touch target ≥ 44 px tall
  including the invisible hit area.

**State.**
- Active: `ph-fill` weight in `--ink`, with a 2 px `--accent` hairline flush against the top edge
  of that tab. Inactive: regular weight in `--muted`.
- Bronze appears **only** on the active tab. One tab out of five, at 2 px, keeps §7's ≤ 8% rule
  intact without argument.
- Press state: opacity to `.6` over 120 ms. No scale bounce.

**Tabs.**

| | 1 | 2 | 3 (center action) | 4 | 5 |
|---|---|---|---|---|---|
| **Console** | Home `house` | Orders `receipt` | **Quote** `plus` | Clients `users-three` | Account `user-circle` |
| **Account** | Shop `squares-four` | Orders `receipt` | **Reorder** `arrow-clockwise` | Saved `bookmark-simple` | Account `user-circle` |

**Behaviour.**
- The center tab is the primary create action. It **opens a glass bottom sheet, it does not
  navigate** — the sheet rises with the signature ease over 220 ms, corners `16px 16px 0 0` (the
  one sanctioned radius), a hairline top edge, a scrim behind it at `rgba(0,0,0,.6)` with
  `blur(6px)`, and it is dismissible by swipe-down, scrim tap and Escape.
- Each tab owns its own navigation history with **preserved scroll position**. Leaving Orders three
  levels deep and coming back returns to that scroll offset, not the top.
- Switching tabs never triggers a full page reload.
- The bar persists across in-tab navigation. It hides only behind a sheet or a full-screen modal.
- Hidden at ≥ 1024 px, where the persistent left rail takes over. There is exactly one navigation
  system visible at any width.
- `prefers-reduced-motion: reduce` replaces the sheet rise and every tab transition with an
  instant state change.

**Above the tab bar,** a sticky top bar at `--glass-nav`: the AXIOM wordmark left, contextual
action right, `44px` tall. It hides on scroll-down and returns on scroll-up, matching
`website/index.html`'s `nav.nav-hidden` treatment and its `.45s cubic-bezier(.16,1,.3,1)`.

---

## 7 · DESIGN SYSTEM — "SMOKED BRONZE GLASS"
Glassmorphism here is an **extension of** the AXIOM system, not a replacement for it. The brand is
square, hairline-textured and restrained; the glass must read as smoked dark glass with a bronze
edge, not as frosted consumer SaaS. Read §11 for the base tokens, then add this layer and do not
exceed it.

```css
:root{
  --glass:        rgba(12,10,9,.62);      /* panel fill                       */
  --glass-2:      rgba(18,15,12,.46);     /* nested / secondary panel         */
  --glass-nav:    rgba(7,6,5,.74);        /* tab bar, top bar, rail           */
  --glass-line:   rgba(242,237,229,.10);  /* glass edge hairline              */
  --glass-hi:     rgba(242,237,229,.05);  /* 1px inset top highlight          */
  --glass-accent: rgba(200,138,78,.10);   /* earned emphasis tint             */
  --blur:         blur(18px) saturate(118%);
  --blur-nav:     blur(24px) saturate(120%);
  --shadow-glass: inset 0 1px 0 var(--glass-hi), 0 24px 60px rgba(0,0,0,.55);
  --glow: radial-gradient(60% 80% at 78% 8%, rgba(200,138,78,.12), transparent 60%),
          radial-gradient(50% 60% at 8% 100%, rgba(124,76,36,.09), transparent 62%);
  --r: 0; --r-sheet: 16px 16px 0 0; --r-pill: 999px;
}
```

**Hard rules.**
- **Square.** `--r: 0` everywhere. The only sanctioned radii are `--r-sheet` on bottom sheets and
  `--r-pill` on status chips. The public site has effectively zero border-radius and the app must
  match it.
- **Hairlines are the texture, not shadows.** Every panel, cell, row and section is delimited by
  `1px solid var(--line)`. Never thicken a hairline for emphasis and never omit one for air. Build
  grids by putting `border-top` and `border-left` on the container and `border-right` and
  `border-bottom` on each cell, as `website/index.html` does. `--shadow-glass` is the **only**
  shadow in the build, and it exists solely to seat a glass surface over the ambient glow.
- **Bronze ≤ 8% of any surface.** It carries section numerals, kickers, the active tab hairline,
  link arrows, primary-series data and hover borders. It is never a background flood, never a
  large fill, never a button fill except on the single primary action of a screen.
- **The ambient glow sits behind a scrim, never behind body text.** `--glow` belongs behind
  headers and empty states. Data tables get a flat `--bg`, because a gradient under a dense column
  of numerals costs legibility for nothing.
- **Glass needs something to refract.** A glass panel on a flat background is a grey box. Every
  glass surface must sit over either the ambient glow or scrolling content. If neither is present,
  use a solid `--bg` panel with a hairline instead — that is the more on-brand answer anyway.
- **Fallback is mandatory.** Firefox and older WebViews drop `backdrop-filter`. Every glass rule
  ships with a solid fallback background inside `@supports not (backdrop-filter: blur(1px))`, and
  the fallback must clear the same contrast bar.
- **Contrast.** Every glass surface clears WCAG AA against the **worst-case** content behind it,
  not against an empty page. Test with a photograph and a dense table underneath.
- **Type.** Jost 300 for display and headlines, sentence case, `-0.01em`. Inter for body, UI and
  the wide-tracked uppercase micro-labels. **Tabular numerals on every price, quantity, spec, ID
  and table figure** — `font-feature-settings:"tnum" 1`.
- **Motion.** Signature ease `cubic-bezier(.16,1,.3,1)`. Micro 220 ms, reveal 700 ms, stagger
  65 ms. Moves ≤ 18 px. No bounce, no spring, no parallax on type. A static equivalent under
  `prefers-reduced-motion`.
- **No purple, no cool blue, no pure black, no pure white.** Semantic states use `--ok --warn
  --err --info` from §11 and nothing else.
- **Print.** Price lists, quotes and packing slips invert to the paper palette: `--bg:#F2EDE5`,
  `--ink:#141210`, accent `--accent-deep:#7C4C24`, because core bronze fails small-text contrast
  on light. **Invoices are the exception**: the house invoice is the dark document the AXIOM
  invoice builder produces, printed with background graphics on. Glass never prints in either case.

**Reuse rather than reinvent.** `website/index.html` already carries production-quality
`.kicker`, `.eyebrow`, `.rule`, `.btn`, `.btn-solid`, `.tlink`, `.chip`, `.tnum` and the `.pcard`
hover-tint. Port those definitions; do not author parallel components with the same job.

---

## 8 · DATA MODEL
Postgres via Supabase. Every table gets RLS enabled and an explicit policy — a table with RLS
enabled and no policy is invisible, which is a silent failure this build must not ship.

```
profiles          id(uuid,fk auth.users) · account_id · role · full_name · locale · created_at
accounts          id · name · type(individual|clinic|institution) · price_tier_id
                  · account_manager_id · notes · created_at
account_members   account_id · profile_id · is_primary
price_tiers       id · name · discount_pct · notes
acknowledgements  id · profile_id · kind(age_18|qualified_researcher) · version
                  · acknowledged_at · ip · user_agent
categories        id · no · name · icon · blurb · is_consumer · sort
products          id · category_id · name · slug · summary · is_active
product_variants  id · product_id · dose · content · price_idr · cost_idr(owner)
                  · supplier_cost_idr(owner) · low_stock_threshold · is_active
stock_movements   id · variant_id · delta · reason(intake|sale|adjust|return) · ref · created_at
quotes            id · account_id · state(draft|sent|accepted|expired|lost) · currency('IDR')
                  · subtotal_idr · total_idr · valid_until · sent_at · created_by · created_at
quote_items       id · quote_id · variant_id · qty · unit_price_idr · unit_cost_idr(owner) · line_total_idr
orders            id · account_id · quote_id · state(pending|packing|dispatched|delivered|cancelled)
                  · total_idr · placed_at
order_items       id · order_id · variant_id · qty · unit_price_idr · unit_cost_idr(owner) · line_total_idr · lot_id(null)
shipments         id · order_id · carrier · tracking_no · dispatched_at · delivered_at
invoices          id · order_id · number · issued_at · due_at · terms_days · ppn_rate · subtotal_idr
                  · ppn_idr · total_idr · notes · bank_details · pdf_path · sent_at · sent_via
invoice_items     id · invoice_id · description · qty · unit_price_idr · line_total_idr
invoice_sequences year · last_number
leads             id · name · persona · source · stage · owner_id · account_id(null) · created_at
activities        id · subject_type · subject_id · kind · body · actor_id · created_at
lots              -- Phase 2, created now, unused
coa_documents     -- Phase 2, created now, unused
```

**Rules.**
- All money as `bigint` rupiah. No floats, no decimals, no cents. IDR has no subunit in practice
  and a float will eventually render `Rp 1.599.999`.
- `quote_items.unit_price_idr` and `order_items.unit_price_idr` are **frozen at write time**. Never
  join to the live variant price to display a historical document.
- Stock is `sum(stock_movements.delta)` per variant, materialised in a view. Never a mutable column.
- `order_items.lot_id` is nullable and unused in this phase; it exists so Phase 2 does not require
  a table rewrite.
- Seed from `window.CATALOG` (`website/index.html:1514`) — 8 categories, 57 items — preserving
  `no`, `icon`, `blurb`, `consumer`, and the `dose` / `content` split onto variants.

---

## 9 · COMPLIANCE GUARDRAILS (non-negotiable — inherited verbatim)
The compliance voice is part of the identity, not an appendix. It binds the UI, the generated
WhatsApp messages, the invoices and the emails equally.

- **RUO / in-vitro standard.** Peptides are **Research Use Only**, intended exclusively for
  in-vitro laboratory and scientific research. They are **not** drugs, food, cosmetics, or
  supplements, and **not** for human or veterinary consumption, diagnosis, or treatment.
- **Zero medical guidance.** The app never renders, stores, generates or accepts dosing,
  administration routes, frequency, cycling, stacking, or any medical advice — including in free
  text fields, notes, and any generated message. Describe mechanism, pharmacokinetics and lab
  handling only.
- **Stated as fact, never buried.** The disclaimer appears on every peptide-adjacent surface —
  product detail, quote, order, invoice, WhatsApp message — set legibly, not as fine print.
- **Acknowledgement gate.** 18+, and a qualified researcher or institutional buyer for any peptide
  line. Recorded per §2 as a timestamped row with a version string.
- **Jurisdiction caution.** Several compounds are controlled or regulated; legality of import,
  possession and handling varies. Buyers are solely responsible for compliance. AXIOM makes no
  representation of legality in any territory.
- **Avoid-list, enforced in CI.** The words *miracle · guaranteed · cure · anti-aging · stack ·
  cycle · boost · best · #1* must not appear in AXIOM's own narrative copy, and **no exclamation
  marks anywhere**. Add a lint step over the i18n string files that fails the build on a hit.
- **Lexicon — use:** standard · verified · documented · protocol · lot · purity · clinical ·
  research-grade · longevity · the long run · Certificate of Analysis · cold-chain.

**RUO disclaimer (copy verbatim):**
> Research Use Only. Intended exclusively for in-vitro laboratory research — not for human or
> veterinary consumption, diagnosis, or treatment. No dosing or usage guidance is provided.

---

## 10 · DEFINITION OF DONE (measurable gates — ALL must pass)

| # | Gate | How it is proven |
|---|---|---|
| 1 | RLS holds | A `client` session issues a direct PostgREST read for another account's orders and receives zero rows. Not a UI check. |
| 2 | Margin is `owner`-only | An `ops` session queries `cost_idr` directly and is refused. |
| 3 | Acknowledgement gates peptides | An account with no current acknowledgement receives zero peptide rows from a direct API call. |
| 4 | Both surfaces render | Console and Account, at 390 px and 1440 px, with no horizontal scroll and no clipped content. |
| 5 | Tab bar is correct | 56 px + safe-area inset; icons clear the iOS home indicator; per-tab scroll preserved; center action opens a sheet without navigating. |
| 6 | One nav system per width | Tab bar hidden ≥ 1024 px; rail hidden < 1024 px. Never both. |
| 7 | Glass has a fallback | With `backdrop-filter` disabled, every glass surface stays legible on its solid fallback. |
| 8 | Contrast | Every glass surface clears WCAG AA over worst-case content behind it. |
| 9 | Bronze ≤ 8% | Measured on the busiest screen (the dashboard), by pixel share. |
| 10 | Square | No `border-radius` in the build except `--r-sheet` on sheets and `--r-pill` on chips. |
| 11 | Money is right | Every figure `Rp 1.600.000`, tabular numerals, `bigint` storage, frozen historical prices. |
| 12 | Copy is clean | CI lint over the i18n files reports zero avoid-list words and zero exclamation marks. |
| 13 | RUO present | The disclaimer renders on every peptide-adjacent surface including generated WhatsApp text and invoices. |
| 14 | Bilingual | Every user-facing string resolves in both EN and ID; no hardcoded strings in components. |
| 15 | Reduced motion | With `prefers-reduced-motion: reduce`, no sheet rise, no reveal, no stagger. |
| 16 | Seed reconciles | 79 lots seeded; supplier, base, selling and margin each foot to the Margin Structure — Rp 79.320.000 / 126.720.000 / 249.800.000 / 123.080.000, 49.3%, markup 97.1%; `base − supplier === 600000` on every lot; pathway counts 10/11/13/8/8/2/6/9/12. |
| 17 | Margin is exact | Changing a supplier cost moves base price and margin but not selling price, and leaves every existing order's frozen margin unchanged. |
| 18 | Invoice PDF | Downloaded PDF is rendered from the same template as the preview and matches the invoice builder's design: dark ground, bronze numerals and amounts, amount-due box, "Documented, not promised." footer; embedded Inter/Jost; correct PPN at the chosen rate; "Research Use Only." on peptide invoices only. |
| 19 | Send PDF | On a phone the share sheet opens with the PDF attached; on desktop a WhatsApp message carries a working download link. |

---

## 11 · BRAND APPENDIX (so the executor never re-fetches the artifact)

**Boilerplate (short, ~40 words) — copy verbatim:**
> AXIOM is a human-performance and longevity house based in Jakarta, Indonesia. We bring
> research-grade peptides, clinical red-light therapy, recovery, wellness and apparel under one
> standard — verified, documented, sourced right. Peptides are Research Use Only, in-vitro. Prices in IDR.

**Style:** currency `Rp 1.600.000` (space, periods as thousands, no decimals). Units spaced:
`10 mg`, `660 nm`, `2–8 °C`, `≥ 98%`. Headlines sentence case; emphasis by colour-shift to
`--muted`, never italics or exclamation. "AXIOM" always all caps; pillars in title case.

**Tokens (from brand.css / tokens.json — the canonical block):**
```css
:root{
  --bg:#070605; --ink:#F2EDE5; --muted:#9C9488; --muted-2:#6A635A;
  --line:rgba(242,237,229,.12); --line-2:rgba(242,237,229,.22); --line-soft:rgba(242,237,229,.06);
  --accent:#C88A4E; --accent-bright:#E7B173; --accent-deep:#7C4C24;
  --accent-soft:rgba(200,138,78,.14); --accent-line:rgba(200,138,78,.34);
  --accent-grad:linear-gradient(120deg,#E7B173 0%,#C88A4E 46%,#9A5F2C 100%);
  --display:"Jost","Century Gothic",system-ui,sans-serif;
  --sans:"Inter",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;
  --maxw:1280px; --pad:34px;
  --paper:#F2EDE5; --paper-ink:#070605;
  --ok:#8FA37E; --warn:#C8A24E; --err:#B0553B; --info:#9C9488;
}
```
- **Type weights:** Jost 300/400/500 · Inter 300/400/500/600. Tracking: wordmark `.44em`,
  kicker `.34em`, eyebrow `.32em`, button `.18em`, nav `.16em`, display `-0.01em`.
- **Space scale:** 8 · 16 · 24 · 34 · 64 · 110. **Motion:** ease `cubic-bezier(.16,1,.3,1)`,
  micro 220 ms, reveal 700 ms, draw 950 ms, stagger 65 ms.
- **Bronze ramp 50→900:** `#F0E8DF #EDE2D7 #E6D3C4 #DDBFA9 #D3A887 #C88A4E #B37B46 #9C6C3D #815932 #604326`.
- **Fonts:** `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Jost:wght@300;400;500&display=swap`
- **Icons:** Phosphor (`@phosphor-icons/react`), matching the public site's `ph` / `ph-fill` usage.

**Reference implementations in this repository:**
- `web-app/mockup/index.html` — the clickable visual target for this prompt. Match it.
- `website/index.html` — token block, component CSS, `window.CATALOG` seed data, nav hide-on-scroll.
- `company-profile/index.html` — the ambient glow and the print palette inversion.
- `business-proposal/axiom-business-master-prompt.md` — business context, compliance, KPI definitions.

---

## 12 · OPEN DECISIONS (ask these before building — do not assume)
1. **Is the Rp 600.000 pen still current?** It is the single largest lever in the model — 19.0% of
   selling price across the book. A change moves base price and margin on all 79 lots at once.
2. **Device and apparel landed cost per SKU.** The 40% / 60% GM defaults are placeholders.
3. **PPN.** Current rate, PKP registration status, and whether Research-tier institutional buyers are
   invoiced differently. Also whether e-Faktur integration is required at launch.
4. **Invoice numbering and legal identity.** The issuing entity's name, NPWP and bank account for the
   invoice footer; whether invoices need e-Meterai above a threshold.
5. **Margin floor.** 45% is the flag threshold in this prompt; confirm, and whether ops may quote below
   it with owner approval or not at all.
6. **Cost basis loading.** Is the Rp 600.000 verification and cold-chain cost per lot, per unit, or per
   shipment? It changes margin on multi-unit lines.
7. **Does any account ever get a discount?** Today there is one price per lot. If a tier is wanted,
   set the floor it may not breach — seven lots are already under 45% at list.
8. **Do the seven sub-45% lots stay at those prices?** BPC-157 10 mg at 21.9%, TB-500 at 25.0% and
   Tesamorelin 10 mg at 26.1% are the thinnest in the book; several are also the best-known compounds,
   so this may be deliberate traffic pricing rather than an error.
9. **Price-list pathway names.** The price list groups peptides as "Weight Loss", "Sexual Health" and
   "Brain Health" — benefit claims the RUO standard forbids. The app must use the site's research-neutral
   category names; confirm the price list is to be reissued to match.

---

*Run this by pointing your agent at it: "Execute web-app/axiom-web-app-master-prompt.md, and match
web-app/mockup/index.html." It will build the schema and RLS, the role-routed shells, the mobile
tab bar, and the three modules — every price in IDR, every peptide surface Research Use Only.*
