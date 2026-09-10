import type { IcsFreq } from './ics';

// Turning a stored recurrence into something a person reads. Pure, and it never returns a formatted
// sentence: it returns a message key and its parameters, so both locales come out of the catalogue
// and gate 17 has something to check. The same shape as `leftLabel` in src/lib/domain/cutoff.ts.

export const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type Recurrence = {
  freq: IcsFreq;
  every_n: number;
  byday: string[];
  at_time: string;
  starts_on: string;
  ends_on?: string | null;
  occurrences?: number | null;
};

export type ScheduleLabel = { key: string; params: Record<string, string | number> };

/** The recurrence as a key + params: 'weekly', 'every_n_weeks', 'daily', 'every_n_days', … */
export function scheduleLabel(r: Recurrence): ScheduleLabel {
  const n = Math.max(1, r.every_n || 1);
  if (r.freq === 'once') return { key: 'once', params: {} };
  if (r.freq === 'daily') return n === 1 ? { key: 'daily', params: {} } : { key: 'every_n_days', params: { n } };
  if (r.freq === 'monthly') return n === 1 ? { key: 'monthly', params: {} } : { key: 'every_n_months', params: { n } };
  return n === 1 ? { key: 'weekly', params: {} } : { key: 'every_n_weeks', params: { n } };
}

/** Only the tokens the column constraint allows, in week order, so 'TH,MO' reads as 'Mon, Thu'. */
export function orderedDays(byday: string[]): Weekday[] {
  return WEEKDAYS.filter(d => byday.includes(d));
}

const dayIndex = (d: string) => WEEKDAYS.indexOf(d as Weekday);

/**
 * The first date the schedule actually lands on, at or after its start. A weekly rule whose BYDAY
 * excludes the start date's own weekday does not begin on the start date, and a Google Calendar
 * template link that says it does creates the series a few days early.
 */
export function firstOccurrence(r: Recurrence): string {
  const days = orderedDays(r.byday);
  if (r.freq !== 'weekly' || days.length === 0) return r.starts_on;
  const [y, m, d] = r.starts_on.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  const wanted = days.map(dayIndex);
  for (let i = 0; i < 7; i++) {
    const probe = new Date(start.getTime() + i * 86400000);
    if (wanted.includes(probe.getUTCDay())) return probe.toISOString().slice(0, 10);
  }
  return r.starts_on;
}

/** 'YYYY-MM-DD' + 'HH:MM' + a minute count, as the compact pair Google's template link wants. */
export function googleDates(date: string, time: string, minutes = 15): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const end = new Date(start.getTime() + minutes * 60000);
  const fmt = (x: Date) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return `${fmt(start)}/${fmt(end)}`;
}
