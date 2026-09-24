import { addDays, now, wibParts, DAY } from './dates';

// Dispatch cut-off is a rule, not a label. Cold-chain lines close at the cold cut-off, ambient at
// the ambient one; before it an order packed today leaves today, after it tomorrow. Estimated
// delivery is dispatch + the zone's eta days. One function feeds the pack row, the order sheet,
// the Account timeline and the pipeline strip.

export type CutoffSetting = { cold: string; ambient: string; tz: string };

export type Eta = {
  cold: boolean;
  cutLabel: string;          // '15.00'
  late: boolean;             // past the cut-off today
  minsLeft: number;          // to the cut-off (negative when passed)
  dispatch: Date;
  deliver: Date;
  state: 'closed' | 'warn' | 'ok';
};

export function dispatchEta(opts: { cold: boolean; cutoff: CutoffSetting; etaDays?: number; dispatchedAt?: Date | string | null; ref?: Date }): Eta {
  const ref = opts.ref ?? now();
  const [ch, cm] = (opts.cold ? opts.cutoff.cold : opts.cutoff.ambient).split(':').map(Number);
  const { h, m } = wibParts(ref);
  const minsLeft = (ch * 60 + cm) - (h * 60 + m);
  const late = minsLeft <= 0;
  let dispatch = opts.dispatchedAt ? new Date(opts.dispatchedAt) : (late ? addDays(ref, 1) : ref);
  const deliver = addDays(dispatch, opts.etaDays ?? 2);
  const cutLabel = `${String(ch).padStart(2, '0')}.${String(cm).padStart(2, '0')}`;
  return { cold: opts.cold, cutLabel, late, minsLeft, dispatch, deliver, state: late ? 'closed' : minsLeft < 60 ? 'warn' : 'ok' };
}

/** 'closed' | 'in 30 min' | 'in 2 h 05 m' — as message-key + params so the surface translates it. */
export function leftLabel(minsLeft: number): { key: 'closed' | 'in_min' | 'in_h'; params: Record<string, number | string> } {
  if (minsLeft <= 0) return { key: 'closed', params: {} };
  if (minsLeft < 60) return { key: 'in_min', params: { m: minsLeft } };
  return { key: 'in_h', params: { h: Math.floor(minsLeft / 60), m: String(minsLeft % 60).padStart(2, '0') } };
}

export const msToDays = (ms: number) => Math.round(ms / DAY);
