# AXIOM web app — the workflow spine

**Date:** 2026-09-04 · **Status:** built in `web-app/mockup/index.html`, specified in
`web-app/axiom-web-app-master-prompt.md` §4.0, §4.1, §4.7, §8, §10 (gates 26–28), §12 (10, 11, 20–23)

## The problem

Aero: "I cannot see the logical workflow from this." The mockup had screens and a state array but no
chain a reader could follow:

- Quotes were not records — a transient array plus a WhatsApp string. Nothing created an order.
- The first order state was `pending`, and the Today feed called pending orders "quotes awaiting
  reply". A reader could not tell what an order was waiting for.
- An invoice became "issued" as a side effect of Save as PDF. Nothing stopped dispatch before payment.
- No stepper, no stage view, no next action. The Account order page was hard-wired to one order.

## Two decisions that fix the shape

1. **Pay before dispatch.** Cold-chain goods never leave unpaid. The invoice is therefore a payment
   request, and the order's first state is *awaiting payment*.
2. **Quote first, always.** Every order is an accepted quote. One entry point, one audit trail, and
   prices are frozen at the moment of acceptance.

## The line

```
QUOTE    requested → draft → sent → accepted ─┐
                              ├→ expired  (derived, 7 days after sent)
                              └→ lost
ORDER                                         └→ awaiting payment → packing → dispatched → delivered → reorder due
```

| Moment | Actor | Effect |
|---|---|---|
| Requested | Account | Lines the account wants priced (from a product, or a past order). Nothing held. |
| Sent | Console | Priced from the list, delivery per destination, WhatsApp message. **Reserves stock.** |
| Accepted | Account or Console | One action: order created with lines, prices, addresses, delivery frozen; **invoice issued**, due +7 d. |
| Paid | Console | Matched to the bank; who, when, reference. **The only door into packing.** |
| Dispatched | Console | Sale written to the ledger, reservation lifted. ETA = dispatch + 2 d. |
| Delivered | Console | Closes the order; sets the next reorder from cadence. |

Branches: `expired` and `lost` release the hold; `cancel` is allowed only before dispatch and voids
an unpaid invoice. The account may report a transfer (*I have transferred*), which flags the order
for matching and is never itself a payment.

## What the UI does with it

- **One list.** Quotes and orders together, sorted by what is due first; a five-stage strip on top
  (quotes · awaiting payment · to pack · in transit · delivered) with count, value and the one note
  that matters per stage; each tile filters. A *Next* column on every row.
- **One function for "next".** `nextAction(order)` / `nextActionQ(quote)` → label, tone, date,
  button. The row, the sheet's *Next* line and the sheet's primary button all read it.
- **Stepper.** Five moments on the order sheet (accepted · invoiced · paid · dispatched · delivered);
  the Account timeline is the same `orderSteps()` rendered vertically.
- **Account.** *Needs you* (quotes to accept, invoices to pay) · *In progress* · *Earlier*. Accepting
  opens the order with bank details and the invoice number as reference.
- **Explicit issue.** PDF actions never change invoice state; *Issue invoice* does. Acceptance
  issues automatically.
- **Phone.** Tab 5 is *More*, so every Console screen is reachable from the bar.
- **Flow map.** A one-screen reference of the eight steps, who acts, and what each triggers.

## Seeds

Every seeded order carries its history (`quote → accepted → awaiting → …`) and an invoice issued on
its acceptance date; paid ones were matched when packing started; the cancelled one is void. Quotes
seed one of each state. Nothing on screen is typed that the rules would not produce.

## Verification

`scratchpad/v17.js` (Playwright): pipeline counts equal list rows per stage; every row has a next
action; request → send → accept → frozen price → dispatch absent while unpaid → mark paid → packing →
dispatched (stock falls, hold lifted) → delivered → reorder due; expiry derived at +8 d; lost and
cancel release stock; cancel voids; the Account side accepts, reports a transfer, and the Console
sees the match; reorder and product request create `requested` quotes; draft/send write one record;
phone More reaches every screen; copy gate. Existing suites v10, v12, v14, v15, v16 updated for the
state rename and the new seeds. 0 failures across all six.

## Open

§12 items 10, 11 (now decided, with residual questions) and 20–23: quote validity, partial payment,
who accepts, what the client sees while awaiting payment.
