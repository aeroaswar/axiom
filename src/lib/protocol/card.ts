import 'server-only';
import { asAnon } from '@/lib/db';
import { siteUrl } from '@/lib/site/seo';
import { buildIcs, type IcsCalendar, type IcsEvent, type IcsFreq } from './ics';
import { firstOccurrence, googleDates, type Recurrence } from './schedule';

// The one read model behind the card. The page, the calendar feed and the printable document all
// come through here, so they cannot disagree about what a card says.
//
// Reading is a single call to `axiom.protocol_card`, which is `security definer` and names every
// column it publishes. There is no path from a code to a table: an anonymous holder has no select
// privilege on protocols, protocol_items or protocol_events at all.

export type CardCoa = {
  method: string; purity_pct: string | number | null; issued_at: string | null;
  file_path: string; is_sample: boolean;
};

export type CardItem = {
  id: string;
  name: string;
  sku: string;
  pack: string;                 // the vial's size, from the catalogue — never the client's amount
  content: string;
  cold_chain: boolean;
  slug: string;
  pathway_slug: string;
  published: boolean;
  compound_class_en: string | null;
  compound_class_id: string | null;
  brief: string;
  amount: string | null;
  route: string | null;
  freq: IcsFreq;
  every_n: number;
  byday: string[];
  at_time: string;
  starts_on: string;
  ends_on: string | null;
  occurrences: number | null;
  reminder_min: number;
  seq: number;
  active: boolean;
  ended_at: string | null;
  lot_code: string | null;
  coa: CardCoa | null;
};

export type Card = {
  number: string;
  title: string;
  subject: string;
  locale: string;
  tz: string;
  starts_on: string;
  issued_at: string;
  updated_at: string;
  seq: number;
  items: CardItem[];
};

/** Null for an unknown code, a draft and a withdrawn card alike — the page must not tell them apart. */
export async function cardByCode(code: string): Promise<Card | null> {
  if (!/^[0-9A-HJKMNP-TV-Z]{16}$/.test(code)) return null;
  const rows = await asAnon(tx => tx<{ card: Card | null }[]>`select axiom.protocol_card(${code}) as card`);
  return rows[0]?.card ?? null;
}

export const cardPath = (code: string) => `/k/${code}`;
export const cardUrl = (code: string) => `${siteUrl()}${cardPath(code)}`;
export const icsPath = (code: string) => `/api/protocol/${code}/calendar.ics`;
export const icsUrl = (code: string) => `${siteUrl()}${icsPath(code)}`;

/**
 * A subscription is a scheme swap, not a prefix: `webcal://host/…`, never `webcal://https://…`.
 * Several clients also refuse it against a plain-http host, so the card renders the https link
 * beside it rather than relying on this alone.
 */
export const webcalUrl = (code: string) => `webcal://${new URL(siteUrl()).host}${icsPath(code)}`;

export const cardHost = () => new URL(siteUrl()).host;

const recurrenceOf = (i: CardItem): Recurrence => ({
  freq: i.freq, every_n: i.every_n, byday: i.byday, at_time: i.at_time,
  starts_on: i.starts_on, ends_on: i.ends_on, occurrences: i.occurrences,
});

/** The per-client detail, assembled from data. No label here is a literal; they come from the catalogue. */
export function itemDetail(i: CardItem, labels: { amount: string; route: string }): string {
  const parts: string[] = [];
  if (i.brief) parts.push(i.brief);
  if (i.amount) parts.push(`${labels.amount}: ${i.amount}`);
  if (i.route) parts.push(`${labels.route}: ${i.route}`);
  return parts.join('\n');
}

/**
 * The calendar. `stamp` is the card's own updated_at rather than the clock, so an unchanged card
 * serialises to the same bytes every time — which is what lets the feed answer a conditional GET
 * with 304 instead of the whole file on every poll.
 */
export function calendarFor(
  card: Card, code: string,
  labels: { calendar: string; amount: string; route: string },
): IcsCalendar {
  const stamp = new Date(card.updated_at);
  const events: IcsEvent[] = card.items.map(i => ({
    uid: i.id,
    seq: i.seq,
    summary: i.name,                       // the compound, and only the compound
    description: itemDetail(i, labels),
    url: cardUrl(code),
    freq: i.freq,
    everyN: i.every_n,
    byday: i.byday,
    startsOn: firstOccurrence(recurrenceOf(i)),
    atTime: i.at_time,
    endsOn: i.ends_on,
    occurrences: i.occurrences,
    reminderMinutes: i.reminder_min,
    cancelled: !i.active,
    stamp,
  }));
  return { name: `${labels.calendar} · ${card.subject}`, tz: card.tz, host: cardHost(), events };
}

export const icsFor = (card: Card, code: string, labels: { calendar: string; amount: string; route: string }) =>
  buildIcs(calendarFor(card, code, labels));

/**
 * A one-tap add for a single compound. Google wants the literal `RRULE:…` in `recur`, the *first*
 * occurrence in `dates`, and `ctz` alongside it — without the zone it reads the pair as UTC and the
 * event lands seven hours out.
 */
export function googleTemplateUrl(
  i: CardItem, card: Card, code: string, labels: { amount: string; route: string },
): string {
  const r = recurrenceOf(i);
  const start = firstOccurrence(r);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: i.name,
    dates: googleDates(start, i.at_time),
    ctz: card.tz,
    details: `${itemDetail(i, labels)}\n${cardUrl(code)}`.trim(),
  });
  const rule = buildRecur(i);
  return `https://calendar.google.com/calendar/render?${params.toString()}${rule ? `&recur=${encodeURIComponent(rule)}` : ''}`;
}

function buildRecur(i: CardItem): string | null {
  if (i.freq === 'once') return null;
  const parts = [`FREQ=${i.freq.toUpperCase()}`];
  if (i.every_n > 1) parts.push(`INTERVAL=${i.every_n}`);
  if (i.freq === 'weekly' && i.byday.length) parts.push(`BYDAY=${i.byday.join(',')}`);
  if (i.occurrences) parts.push(`COUNT=${i.occurrences}`);
  return `RRULE:${parts.join(';')}`;
}
