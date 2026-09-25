import 'server-only';
import { asAnon } from '@/lib/db';

// Per-lot verification (§4.6). The lookup is one database function, `axiom.verify_lot`: an exact
// code in, at most one row out. `lots` itself stays staff-only, so this module never selects from
// it — the page reads what the function chose to disclose and nothing else.

export type LotState = 'verified' | 'awaiting' | 'below_threshold' | 'expired';

export type LotRecord = {
  lot_code: string;
  product: string;
  dose: string;
  received_at: string | null;
  expires_at: string | null;
  issued_at: string | null;
  method: string | null;
  purity_pct: number | null;
  is_sample: boolean;
  state: LotState;
};

/** Longest input the lookup accepts; anything longer is not a lot code. */
export const LOT_CODE_MAX = 40;

const day = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

export async function verifyLot(code: string): Promise<LotRecord | null> {
  const input = code.trim().slice(0, LOT_CODE_MAX);
  if (!input) return null;
  const [r] = await asAnon(tx => tx<Record<string, unknown>[]>`select * from axiom.verify_lot(${input})`);
  if (!r) return null;
  return {
    lot_code: String(r.lot_code),
    product: String(r.product),
    dose: String(r.dose),
    received_at: day(r.received_at),
    expires_at: day(r.expires_at),
    issued_at: day(r.issued_at),
    method: (r.method as string | null) ?? null,
    purity_pct: r.purity_pct === null || r.purity_pct === undefined ? null : Number(r.purity_pct),
    is_sample: Boolean(r.is_sample),
    state: r.state as LotState,
  };
}
