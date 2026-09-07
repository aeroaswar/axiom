# AXIOM Console & Account — alive UX and system rules

**Date** 2026-09-02 · **Scope** `web-app/mockup/index.html`, `web-app/axiom-web-app-master-prompt.md`
· **Status** implemented and verified in this branch

## 1 · Why

The mockup was static between clicks: screens swapped instantly, KPI values were typed text,
nothing on screen reflected time, and the tab bar only toggled a fill glyph. Underneath, the flows
did not connect: advancing an order never touched stock, an invoice could be issued but never
paid, the dashboard's "Today" list and the bell were hand-written strings, the 15.00 cut-off was a
label, a quote could promise stock that did not exist, and "lapsed" was a status string that could
never happen on its own.

Aero's ask was two things at once: make it *feel alive*, and make it *a better, more logical
system*. This spec covers both. The brand's own rules bound the first — one ease, four budgets,
moves under 18 px, no bounce, bronze as a line not a wash, reduced motion honoured — so "alive"
here means responsive and time-aware, never decorated.

## 2 · Alive — the motion vocabulary

All under `prefers-reduced-motion`. Durations from the brand: micro 220 ms, reveal 700 ms,
draw 950 ms, stagger 65 ms. Ease `cubic-bezier(.16,1,.3,1)`.

| Element | Behaviour | Budget |
|---|---|---|
| Screen reveal | Blocks of the entering screen rise 14 px and settle 65 ms apart; list blocks stagger their first ten rows. Class removed on `animationend`, never replayed on re-render. | 700 ms |
| Hairline draw-in | The top rule of a list, KPI grid, chart or receivables strip draws from the left in bronze and rests as the hairline. The one signature motion. | 950 ms |
| KPI count-up | `data-n` target, ease-out cubic, tabular numerals, once per figure. Reduced motion paints the final figure. | 950 ms |
| Sparklines | Four headline KPIs carry twelve readings; a 1.2 px muted polyline draws in (`pathLength=1`, dash-offset) with a bronze dot on the last point. The dot is a CSS element so non-uniform SVG scaling cannot stretch it. | 950 ms |
| Tab indicator | One 2 px bronze line slides between tabs; hidden for the centre action. | 220 ms |
| Clock & countdown | Top bar shows `Wed 02 Sep · 14.06`; the pack row counts down to the cut-off. Ticks every 30 s from the device clock; `window.__now` pins it for tests. | — |
| Row mark | A row whose state just changed draws a 2 px bronze mark down its left edge and lets go; a table row flashes its glass tint. | 1.2 s |
| Pressed | Rows, cards, buttons, tabs move 1 px down on press. | 120 ms |
| Ambient | The glow behind the glass drifts ±1.5% on a 40 s alternate cycle. | 40 s |
| Badge | The bell carries a count that scales in; empty means hidden. | 220 ms |
| Keyboard | `/` search · `n` new quote · `1–5` tabs · `Esc` closes. Never while typing. | — |

Deliberately not built: skeleton shimmer on first paint (a single-file mockup has no latency to
demonstrate; the prompt already requires it for the real app), confetti, pulses, urgency timers on
customer surfaces.

## 3 · Logical — system rules

| Rule | Implementation in the mockup |
|---|---|
| Stock has three figures | `onHand` on the variant; `reserved(v)` sums lines on pending and packing orders; `available(v)` is the difference. Catalogue shows all three. `advance()` to dispatched deducts on hand; `cancel()` releases. |
| Availability gates the quote | `shortBy(lines)` lists lines over available; the quote sheet shows "2 available · 3 requested" on the line, a note, and disables Send. Zero-available variants are disabled in the picker; on the Account the product sheet offers *Tell me when it is back*. |
| Invoice lifecycle | `invStatus(inv)` → draft / issued / overdue / paid, overdue derived from `due < today`. `markPaid()` logs actor, time and transfer reference. Invoices screen has a receivables strip (outstanding, overdue, paid this month) and Awaiting / Overdue / Paid filters. Account order shows the same chip and a *Pay invoice* action. |
| Cut-off rule | `CUTOFF = {cold:[15,0], ambient:[17,0]}`; `dispatchEta(order)` returns dispatch and delivery dates and labels. Used by the pack event, the order sheet and the Account timeline — one function. |
| One event feed | `events()` derives: orders to pack, quotes awaiting reply, overdue invoices, acknowledgement lapsed or expiring, reorders overdue / due this week / next due, stockouts. Account surface: its own open orders, unpaid invoices, low-balance saved items. `renderEvents()` paints Today, the badge; `openNotifications()` renders the same list and marks it seen. |
| Acknowledgement expires | `ackAt` ISO on the client; `ackState()` current < 11 months, expiring 11–12, lapsed > 12; `null` means 18+ only. Chips, filters, the rail link and the client sheet read it; expiring gets *Request renewal*. |
| Reorder cadence | `cadenceDays(c)` median gap with ≥ 3 orders, else the agreed `cadence`; `reorderDue(c)` gives due date and label. Clients table has a *Next reorder* column and a *Reorder due* filter; the client sheet has *Nudge* with a pre-filled message. |
| Audit log | `o.log = [[at, who, from, to]]` appended by `advance()` and `cancel()`; invoice `inv.log` by issue, send, paid. Shown in reverse in the sheets. Cancel is a state, allowed from pending or packing only. |
| Global search | `searchAll(q)` over orders, accounts, variants, invoices; a glass panel under the top bar shows grouped, highlighted results; a result opens its sheet and closes search. The old per-screen filter still applies while typing and is fully restored on close. |

Also fixed while here: the variant sheet still listed four tier prices from the removed tier model
(all identical); it now shows supplier, base and selling with GM.

## 4 · Data changes

- `VARIANTS[].stock` → `onHand`. Seeds unchanged.
- `CLIENTS[].ack` string → `ackAt` ISO date or `null`; `cadence` days added.
- `ORDERS` gains `log`; three older orders added so cadence can be derived for two accounts;
  `"cancelled"` is a state outside `STATES`.
- Seeded invoices: 0139 issued (due 17 Sep), 0128 overdue (due 01 Sep), 0145 and 0117 paid.
- `window.__now` overrides the clock; `window.__axiom` exposes helpers for tests.

## 5 · Verification

`scratchpad/v15.js`, 38 checks, all passing, plus the existing v10 (23), v12 (8) and v14 (8):

1. Computed durations 700 / 220 / 220 ms; max keyframe translate 14 px; brand ease; reveal classes
   gone after animation; count-up lands exactly; four sparklines; reduced motion runs nothing.
2. reta10 20 / 2 / 18; Today, badge and open count equal; dispatch → 18 / 0 / 18, pack event gone,
   log `["Aero","packing","dispatched"]`, row marked; cancel releases 3 tees.
3. Quote with 3 of 2 available disables Send and explains; back to 2 re-enables.
4. Seeded statuses; receivables Rp 22.266.000 / 12.550.000 / 10.570.000; Mark paid → Paid,
   history, overdue event gone; strip recomputes to 9.716.000 / 0 / 23.120.000.
5. Clock at 14.30: "Dispatch today · cut-off 15.00 · in 30 min", warn, delivery 04 Sep; at 15.30:
   "Cut-off 15.00 passed · dispatch tomorrow", err, delivery 05 Sep; Account timeline identical.
6. Ack states current / expiring / lapsed / 18+; cadence 16 d derived, 14 d derived, none;
   eighteen days on, prasetyo "Overdue 5 d" and the feed says so.
7. `/` focuses search; "regenera" returns orders, the account and three invoices; a result closes
   search and opens the sheet; `4` and `n` work.

## 6 · Open decisions for Aero

Added to the prompt as §12 items 10–15: payment terms by account type; whether a reservation
expires with the quote; cut-off scope and days; who may mark paid; automatic versus owner-triggered
nudges; acknowledgement renewal cadence.
