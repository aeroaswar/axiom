import { describe, expect, it } from 'vitest';
import { nextAction, nextActionQ, quoteState, stageOfOrder, type OrderView } from './next-action';
import type { CutoffSetting } from './cutoff';

// Every record has exactly one next action; these pin the rules the list, the sheet and the
// primary button all read, so a change to one surface's wording cannot quietly change the rule.

const ref = new Date('2026-09-10T03:00:00Z'); // 10.00 WIB, before both cut-offs
const cutoff: CutoffSetting = { cold: '13:00', ambient: '15:00', tz: 'Asia/Jakarta' };
const order = (o: Partial<OrderView>): OrderView => ({ state: 'awaiting_payment', placed_at: '2026-09-01T03:00:00Z', cold: false, ...o });

describe('quotes', () => {
  it('a sent quote expires after the validity window, not before', () => {
    const sent = { state: 'sent' as const, created_at: '2026-09-01T03:00:00Z', sent_at: '2026-09-04T03:00:00Z', quote_days: 7 };
    expect(quoteState(sent, ref)).toBe('sent');
    expect(quoteState({ ...sent, sent_at: '2026-09-02T03:00:00Z' }, ref)).toBe('expired');
  });

  it('an expired quote asks to be resent, in error', () => {
    const a = nextActionQ({ state: 'sent', created_at: '2026-08-20T03:00:00Z', sent_at: '2026-08-25T03:00:00Z', quote_days: 7 }, ref);
    expect(a).toMatchObject({ key: 'q_expired', tone: 'err', act: 'resend' });
  });

  it('a request from the public site is priced next', () => {
    expect(nextActionQ({ state: 'requested', created_at: '2026-09-09T03:00:00Z' }, ref)).toMatchObject({ key: 'q_requested', act: 'edit' });
  });
});

describe('orders', () => {
  it('an unpaid order past its due date is overdue', () => {
    const a = nextAction(order({ invoice_due_at: '2026-09-05T03:00:00Z' }), cutoff, ref);
    expect(a).toMatchObject({ key: 'o_overdue', tone: 'err', act: 'paid' });
  });

  it('a reported transfer waits to be matched rather than reading as overdue', () => {
    const a = nextAction(order({ invoice_due_at: '2026-09-05T03:00:00Z', paid_claim_at: '2026-09-06T03:00:00Z' }), cutoff, ref);
    expect(a.key).toBe('o_transfer_reported');
  });

  it('a cancelled order still holding money is a refund due, loud', () => {
    const a = nextAction(order({ state: 'cancelled', cancelled_at: '2026-09-08T03:00:00Z', held_idr: '1887000' }), cutoff, ref);
    expect(a).toMatchObject({ key: 'o_refund_due', tone: 'err', act: 'credit' });
    expect(a.quiet).toBeFalsy();
  });

  it('a cancelled order holding nothing is closed and quiet', () => {
    for (const held of [0, '0', null, undefined]) {
      const a = nextAction(order({ state: 'cancelled', cancelled_at: '2026-09-08T03:00:00Z', held_idr: held }), cutoff, ref);
      expect(a).toMatchObject({ key: 'o_cancelled', quiet: true });
    }
  });

  it('packing before the cut-off leaves today', () => {
    expect(nextAction(order({ state: 'packing' }), cutoff, ref).key).toBe('o_pack_today');
  });

  it('a cancelled order sits in the closed stage', () => {
    expect(stageOfOrder({ state: 'cancelled' })).toBe('closed');
    expect(stageOfOrder({ state: 'packing' })).toBe('packing');
  });
});
