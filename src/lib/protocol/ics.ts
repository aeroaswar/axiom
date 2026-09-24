// RFC 5545 for the protocol card's calendar. Pure: no database, no `server-only`, no clock of its
// own — so the unit tests can import it, and so two builds of unchanged data are byte-identical.
// That last property is the whole ETag contract: a DTSTAMP of `now()` would change the body every
// second and no subscriber would ever get a 304.
//
// Nothing in this file is a dose. Every amount, route and note reaches it as data from a per-client
// row and leaves it inside an escaped TEXT value; the literals here are durations, which carry
// digits but no unit gate 1 looks for.

export type IcsFreq = 'once' | 'daily' | 'weekly' | 'monthly';

export type IcsEvent = {
  uid: string;                 // stable for the life of the line: its row id, never derived from content
  seq: number;                 // protocol_items.seq — a calendar ignores a replacement carrying the same one
  summary: string;             // the compound's name, and only that
  description?: string;
  url?: string;
  freq: IcsFreq;
  everyN: number;
  byday: string[];
  startsOn: string;            // 'YYYY-MM-DD', local to the calendar's zone
  atTime: string;              // 'HH:MM', likewise
  endsOn?: string | null;
  occurrences?: number | null;
  reminderMinutes?: number | null;
  durationMinutes?: number;
  cancelled?: boolean;         // an ended compound: the only thing that clears it from a subscriber
  stamp: Date;                 // the row's updated_at
};

export type IcsCalendar = { name: string; events: IcsEvent[]; tz?: string; host: string };

// Indonesia has kept a fixed offset since 1964 and observes no daylight saving, so each zone is one
// STANDARD component with the same offset on both sides. A zone outside this table would need real
// DST rules, so it is not silently mis-emitted — it falls back to WIB, which is the column default.
const ZONES: Record<string, { offset: string; abbr: string }> = {
  'Asia/Jakarta': { offset: '+0700', abbr: 'WIB' },
  'Asia/Makassar': { offset: '+0800', abbr: 'WITA' },
  'Asia/Jayapura': { offset: '+0900', abbr: 'WIT' },
};
const DEFAULT_TZ = 'Asia/Jakarta';
export const zoneOf = (tz?: string | null) => (tz && ZONES[tz] ? tz : DEFAULT_TZ);

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

const CONTROL = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g');

/** A TEXT value. Backslash first, or it re-escapes what the later rules add. `:` is not escaped. */
export function escapeText(value: string): string {
  return String(value)
    .replace(CONTROL, '')
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

const enc = new TextEncoder();
const bytes = (s: string) => enc.encode(s).length;

/**
 * Fold at 75 octets — octets, not characters. The counting unit is the one thing hand-written .ics
 * usually gets wrong: this catalogue is full of separators outside ASCII and Indonesian names carry
 * accents, so a character-count fold produces over-long lines that Apple Calendar rejects outright,
 * silently. A continuation begins with one space, which itself counts toward the 75.
 */
export function foldLine(line: string): string {
  if (bytes(line) <= 75) return line;
  const out: string[] = [];
  let chunk = '';
  let limit = 75;
  for (const ch of line) {            // by code point: a surrogate pair is never split
    if (bytes(chunk) + bytes(ch) > limit) {
      out.push(chunk);
      chunk = ch;
      limit = 74;                     // the leading space of a continuation line
    } else {
      chunk += ch;
    }
  }
  if (chunk) out.push(chunk);
  return out[0] + out.slice(1).map(c => `\r\n ${c}`).join('');
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** 'YYYY-MM-DD' + 'HH:MM' to a local date-time, already in the calendar's zone. */
export function localStamp(date: string, time: string): string {
  const [y, m, d] = date.split('-');
  const [hh, mm] = time.split(':');
  return `${y}${m}${d}T${hh}${mm}00`;
}

const utcStamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
  `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** A local wall-clock time in a fixed-offset zone, as the UTC instant an UNTIL must carry. */
function localToUtc(date: string, time: string, tz: string): Date {
  const sign = ZONES[zoneOf(tz)].offset;
  const mins = Number(sign.slice(1, 3)) * 60 + Number(sign.slice(3, 5));
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - (sign[0] === '-' ? -mins : mins) * 60000);
}

/**
 * The recurrence, or null for a one-off. UNTIL and COUNT are mutually exclusive in RFC 5545 §3.3.10
 * and a rule carrying both is discarded whole; the database refuses the pair, and this prefers
 * UNTIL if one ever arrives anyway.
 */
export function rrule(e: IcsEvent, tz: string): string | null {
  if (e.freq === 'once') return null;
  const parts = [`FREQ=${e.freq.toUpperCase()}`];
  if (e.everyN > 1) parts.push(`INTERVAL=${e.everyN}`);
  if (e.freq === 'weekly') {
    const days = (e.byday ?? []).filter(d => DAYS.includes(d));
    // A weekly rule with no BYDAY repeats on DTSTART's own weekday, which is what a reader means
    // by "weekly" anyway — so an empty list is left out rather than guessed at.
    if (days.length) parts.push(`BYDAY=${days.join(',')}`);
  }
  if (e.endsOn) parts.push(`UNTIL=${utcStamp(localToUtc(e.endsOn, e.atTime, tz))}`);
  else if (e.occurrences) parts.push(`COUNT=${e.occurrences}`);
  return parts.join(';');
}

export function buildIcs(cal: IcsCalendar): string {
  const tz = zoneOf(cal.tz);
  const zone = ZONES[tz];
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AXIOM//Protocol Card//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(cal.name)}`,
    `X-WR-TIMEZONE:${tz}`,
    // Apple honours these; Google refreshes a subscribed feed on its own schedule and ignores them.
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    'X-PUBLISHED-TTL:PT6H',
    'BEGIN:VTIMEZONE',
    `TZID:${tz}`,
    `X-LIC-LOCATION:${tz}`,
    'BEGIN:STANDARD',
    `TZNAME:${zone.abbr}`,
    'DTSTART:19700101T000000',
    `TZOFFSETFROM:${zone.offset}`,
    `TZOFFSETTO:${zone.offset}`,
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const e of cal.events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${e.uid}@${cal.host}`);
    lines.push(`DTSTAMP:${utcStamp(e.stamp)}`);
    lines.push(`LAST-MODIFIED:${utcStamp(e.stamp)}`);
    lines.push(`SEQUENCE:${e.seq}`);
    lines.push(`DTSTART;TZID=${tz}:${localStamp(e.startsOn, e.atTime)}`);
    lines.push(`DURATION:PT${e.durationMinutes ?? 15}M`);
    const rule = rrule(e, tz);
    if (rule) lines.push(`RRULE:${rule}`);
    lines.push(`SUMMARY:${escapeText(e.summary)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeText(e.description)}`);
    if (e.url) lines.push(`URL:${escapeText(e.url)}`);
    // A subscribed calendar keeps an event it is simply no longer told about. Cancelling it is the
    // only thing that takes an ended compound off the client's phone.
    lines.push(`STATUS:${e.cancelled ? 'CANCELLED' : 'CONFIRMED'}`);
    lines.push('TRANSP:TRANSPARENT');
    if (!e.cancelled && e.reminderMinutes && e.reminderMinutes > 0) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:-PT${e.reminderMinutes}M`,
        `DESCRIPTION:${escapeText(e.summary)}`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
