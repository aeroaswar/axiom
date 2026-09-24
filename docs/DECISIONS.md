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
| 12 | Per-client protocol cards | **AXIOM-authored.** Ops writes a client's schedule in the Console and it renders as AXIOM's, reached by a QR code. The owner asked for this and accepted the change of posture it represents | `protocols`, `protocol_items`, `axiom.protocol_card` |

Sibling prompt §12 items with a stated default: pen Rp 600.000 current; devices/apparel cost assumed
(flagged `cost_assumed`); 45 % reporting floor; no discounts or tiers anywhere; cut-off 15.00 cold /
17.00 ambient WIB; reorder nudges owner-triggered; acknowledgement valid twelve months for every
account type; no partial payment.

## Owner fields still marked « »

Production and staging domains · legal entity, address and NPWP · PKP status and PPN rate · the bank
account on invoices · Google Search Console and analytics property. All are `site_settings` rows or
environment variables; none is code.

## Decision 12 — the protocol card, and the line it moves

A protocol card is one QR per client. The square encodes a URL and nothing else: the card behind it
carries the compound, the guide link, a brief, the schedule, the client's name and the certificate,
and it stays correct as compounds are added, so a card printed with the first consignment is still
the right card on the fifth. Ops writes it in the Console; the account's own members append to it
through the same `axiom.*` functions, reached by a sign-in link sent to the address on the account's
row.

**This moves a line the rest of the platform is built around, and the move was asked for.** The
stated rule is *no dosing, no claims*; §5.2 and gate 9 exist to keep AXIOM out of the business of
telling anyone what to take. A card issued by AXIOM, carrying an amount and a frequency, is AXIOM
doing exactly that. The owner was shown the conflict before any of this was built and chose
AXIOM-authored cards over the two narrower options (a schedule the qualified researcher authors and
AXIOM merely records, or a card with timing and no amounts). What follows is how that choice was
implemented without any gate being weakened to accommodate it.

**The scope boundary, stated rather than inherited.** Every dose value lives in
`public.protocol_items.amount`, `.route` and the recurrence columns — per-client operational rows
about one account. `scripts/gates/copy-lint.mjs` lints `products`, `site_settings` and
`product_references`, which is what AXIOM publishes to everybody, and `scripts/gates/grep.mjs`
forbids a dose literal anywhere in `src/` or `messages/`. Neither reaches `protocol_items`, **by
design and not by oversight**, and neither was changed. What holds instead:

- no amount, frequency or route is a literal in code, in a message catalogue or in a linted content
  table — every value is entered and reaches the page as a parameter;
- every label on the card, in the Console and in the printed sheet is dose-free, and gate 9 still
  lints all of them;
- `axiom.issue_protocol` refuses an account without a current qualified-researcher acknowledgement,
  so the gate that decides whether a peptide has a price decides whether it has a card;
- the card carries its own notice (`protocol.card.notice`) and **not** `site_settings.ruo_notice`.
  The site-wide notice says no dosing or usage guidance is provided. On a card that provides one,
  reprinting it would be a false statement on the same page as the thing it denies. The card's
  notice says what the card is — a schedule AXIOM issued to the named account for its own research
  use — and what it is not: medical advice, and a prescription.

**The site-wide RUO notice is now narrower than the truth**, and no code change can fix that. While
cards exist, `site_settings.ruo_notice` describes the catalogue and not the whole of what AXIOM
issues. That is an owner decision about published copy, and it is left as one.

**Two smaller widenings, both deliberate.**

- `coa_read` is `using (is_sample or axiom.is_staff())`. `axiom.protocol_card` is `security definer`,
  so a card holder sees the certificate metadata for their own lot even though it is not the sample
  row — a certificate is most of the point of a card. It reaches no further than the rows of the
  card whose code was presented, and gate S16 pins that the payload carries no price, cost or margin.
- `asService` is used a second time, to read an account's email address for the sign-in link. Its
  docstring said it was only for establishing a session and for admin scripts; it now says this too.
  The address never crosses to a browser: `axiom.protocol_contact` is revoked from `anon` and
  `authenticated` alike.

**What the card is not.** The QR is a pointer, never a capability: it grants a read and nothing
else, and every write needs a session. There is no way to change a code — a code that has got out
is answered by withdrawing the card, which costs a reprint, and that is the intended price. A
compound is ended, never deleted, because a subscribed calendar keeps an event it merely stops
being told about; `STATUS:CANCELLED` is the only thing that clears one from a client's phone.

**One expectation the copy must not overpromise.** A subscribed feed is not prompt everywhere.
Apple Calendar honours the refresh hint within hours; Google refreshes external ICS feeds on its own
schedule and ignores `REFRESH-INTERVAL` — commonly several hours, sometimes considerably longer, and
not configurable. The card's copy says *updates automatically*, never *immediately*, and offers the
download as the fast path after a compound is added.

**Follow-ups, deliberately not in this change.** Per-lot CoA upload and Supabase Storage: the card
links whatever `coa_documents` row exists and shows the lot metadata when there is one. WhatsApp is
a deep link to AXIOM, not an authentication transport — only email carries a sign-in link. And an
account created by `axiom.submit_public_request` has no member and no address, so its card offers
the WhatsApp fallback instead of a link that would reach nobody.

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
