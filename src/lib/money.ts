/** `Rp 1.600.000` — space, periods as thousands, no decimals. IDR has no subunit in practice. */
export function idr(n: number | bigint | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '—';
  const v = typeof n === 'bigint' ? n : BigInt(Math.round(Number(n)));
  const neg = v < 0n;
  const s = (neg ? -v : v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${neg ? '−' : ''}Rp ${s}`;
}

export function pct(n: number | string | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return '—';
  return `${Number(n).toFixed(digits)}%`;
}

export const num = (n: number | string | bigint | null | undefined) => (n === null || n === undefined ? 0 : Number(n));

/** The net price a plan yields: list less the tier's percentage, rounded to the nearest thousand
 *  rupiah. The same arithmetic `axiom.send_quote` freezes onto the line, so the figure a reader sees
 *  before requesting is the figure the quote will carry. */
export function planNet(list: number, pctOff: number): number {
  if (!pctOff) return list;
  return Math.round((list * (1 - pctOff / 100)) / 1000) * 1000;
}
