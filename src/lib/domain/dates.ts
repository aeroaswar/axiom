// Date helpers shared by every surface. Times are Asia/Jakarta (WIB); the clock is the device's,
// pinned by window.__now in tests. Nothing here types a date by hand.

export const DAY = 86_400_000;
export const TZ = 'Asia/Jakarta';

export function now(): Date {
  if (typeof window !== 'undefined' && window.__now) return new Date(window.__now);
  if (typeof process !== 'undefined' && process.env.AXIOM_NOW) return new Date(process.env.AXIOM_NOW);
  return new Date();
}

export const toDate = (d: Date | string | number | null | undefined) => (d == null ? null : d instanceof Date ? d : new Date(d));

/** Whole days from `d` to now (positive = in the past). */
export function daysFrom(d: Date | string | null | undefined, ref = now()): number {
  const x = toDate(d); if (!x) return 0;
  return Math.floor((ref.getTime() - x.getTime()) / DAY);
}

export function addDays(d: Date, n: number) { return new Date(d.getTime() + n * DAY); }

export function fmtShort(d: Date | string | null | undefined, locale = 'id'): string {
  const x = toDate(d); if (!x) return '';
  return x.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'short', timeZone: TZ });
}

export function fmtLong(d: Date | string | null | undefined, locale = 'id'): string {
  const x = toDate(d); if (!x) return '';
  return x.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: TZ });
}

export function fmtStamp(d: Date | string | null | undefined, locale = 'id'): string {
  const x = toDate(d); if (!x) return '';
  const date = fmtShort(x, locale);
  const time = x.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).replace(':', '.');
  return `${date} · ${time}`;
}

/** Hours and minutes of a date in WIB. */
export function wibParts(d: Date) {
  const s = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  const [h, m] = s.split(':').map(Number);
  return { h, m };
}
