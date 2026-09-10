import { describe, expect, it } from 'vitest';
import { buildIcs, escapeText, foldLine, rrule, type IcsEvent } from '@/lib/protocol/ics';
import { firstOccurrence, orderedDays, scheduleLabel } from '@/lib/protocol/schedule';

// The calendar feed is the first thing in this repository that is neither a database rule nor a
// screen, so it is the first thing the SQL gates and Playwright both miss. Every assertion here is
// a way a subscribed calendar fails quietly: a line one octet too long that Apple discards whole, a
// UID that moves and duplicates the series, a DTSTAMP of `now()` that defeats every conditional GET.

const bytes = (s: string) => new TextEncoder().encode(s).length;

const event = (over: Partial<IcsEvent> = {}): IcsEvent => ({
  uid: '11111111-2222-4333-8444-555555555555',
  seq: 0,
  summary: 'Compound',
  freq: 'weekly',
  everyN: 1,
  byday: ['MO', 'TH'],
  startsOn: '2026-09-14',
  atTime: '08:00',
  reminderMinutes: 30,
  stamp: new Date('2026-09-10T04:05:06Z'),
  ...over,
});

const cal = (events: IcsEvent[]) => buildIcs({ name: 'Card', host: 'axiom.example', events });

describe('line folding', () => {
  it('leaves a line of exactly 75 octets alone', () => {
    const line = 'X'.repeat(75);
    expect(foldLine(line)).toBe(line);
    expect(bytes(foldLine(line))).toBe(75);
  });

  it('folds at 76 and the continuation reassembles to the original', () => {
    const line = 'X'.repeat(76);
    const folded = foldLine(line);
    expect(folded).toContain('\r\n ');
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });

  it('counts octets, not characters', () => {
    // 74 ASCII + one 2-byte character is 76 octets but only 75 characters. A character-count fold
    // leaves this unfolded, and Apple Calendar rejects the file without saying why.
    const line = 'X'.repeat(74) + '·';
    expect(line.length).toBe(75);
    expect(bytes(line)).toBe(76);
    expect(foldLine(line)).toContain('\r\n ');
  });

  it('never splits a multi-byte character across the boundary', () => {
    const line = 'A'.repeat(60) + 'é·—'.repeat(10);
    for (const part of foldLine(line).split('\r\n')) {
      expect(bytes(part)).toBeLessThanOrEqual(75);
    }
    expect(foldLine(line).replace(/\r\n /g, '')).toBe(line);
  });

  it('never splits a surrogate pair', () => {
    const line = 'A'.repeat(70) + '\u{1f9ea}'.repeat(6);
    const folded = foldLine(line);
    expect(folded).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
    expect(folded.replace(/\r\n /g, '')).toBe(line);
  });

  it('holds for every line of a real calendar, including a long client name', () => {
    const out = cal([event({
      summary: 'Compound with a deliberately long catalogue name for folding',
      description: 'Sebuah catatan yang panjang sekali untuk klinik ini · dengan pemisah · dan aksen é',
    })]);
    for (const line of out.split('\r\n')) expect(bytes(line)).toBeLessThanOrEqual(75);
  });
});

describe('line endings', () => {
  it('uses CRLF throughout and ends with one', () => {
    const out = cal([event()]);
    expect(out.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(out.replace(/\r\n/g, '')).not.toContain('\n');
    expect(out.replace(/\r\n/g, '')).not.toContain('\r');
  });
});

describe('TEXT escaping', () => {
  it('escapes backslash, semicolon, comma and newline, and leaves the colon alone', () => {
    expect(escapeText('a\\b;c,d\ne: f')).toBe('a\\\\b\\;c\\,d\\ne: f');
  });

  it('escapes the backslash first, so an escape is not escaped twice', () => {
    expect(escapeText('\\;')).toBe('\\\\\\;');
  });

  it('strips control characters, so a note cannot write a line of its own', () => {
    const out = cal([event({ description: 'note\r\nSUMMARY:injected' })]);
    expect(out).not.toContain('\r\nSUMMARY:injected');
    expect(out).toContain('DESCRIPTION:note\\nSUMMARY:injected');
  });
});

describe('VTIMEZONE', () => {
  it('carries Asia/Jakarta once, at a fixed offset, with no DST component', () => {
    const out = cal([event()]);
    expect(out.match(/BEGIN:VTIMEZONE/g)).toHaveLength(1);
    expect(out).toContain('TZID:Asia/Jakarta');
    expect(out).toContain('TZOFFSETFROM:+0700');
    expect(out).toContain('TZOFFSETTO:+0700');
    expect(out).not.toContain('BEGIN:DAYLIGHT');
  });

  it('anchors DTSTART to that zone rather than emitting a bare UTC instant', () => {
    expect(cal([event()])).toContain('DTSTART;TZID=Asia/Jakarta:20260914T080000');
  });

  it('falls back to WIB for a zone whose DST rules it does not carry', () => {
    const out = buildIcs({ name: 'Card', host: 'h', tz: 'Europe/London', events: [event()] });
    expect(out).toContain('TZID:Asia/Jakarta');
  });
});

describe('identity and versioning', () => {
  it('keeps the UID stable when the content changes', () => {
    const a = cal([event()]);
    const b = cal([event({ summary: 'Renamed', description: 'different' })]);
    const uid = /UID:(.+)/.exec(a)![1];
    expect(b).toContain(`UID:${uid}`);
  });

  it('scopes the UID to the host', () => {
    expect(cal([event()])).toContain('UID:11111111-2222-4333-8444-555555555555@axiom.example');
  });

  it('carries the line’s own SEQUENCE, so an edit replaces rather than duplicates', () => {
    expect(cal([event({ seq: 4 })])).toContain('SEQUENCE:4');
  });

  it('stamps from the row, not the clock: two builds of unchanged data are byte-identical', () => {
    // This is the ETag contract. With DTSTAMP: now() the body changes every second and a
    // subscribing calendar re-downloads the whole file on every poll instead of getting a 304.
    expect(cal([event()])).toBe(cal([event()]));
    expect(cal([event()])).toContain('DTSTAMP:20260910T040506Z');
  });
});

describe('RRULE', () => {
  const tz = 'Asia/Jakarta';

  it('omits the rule entirely for a one-off', () => {
    expect(rrule(event({ freq: 'once' }), tz)).toBeNull();
    expect(cal([event({ freq: 'once' })])).not.toContain('RRULE');
  });

  it('writes a weekly rule with its days', () => {
    expect(rrule(event(), tz)).toBe('FREQ=WEEKLY;BYDAY=MO,TH');
  });

  it('includes INTERVAL only when it is not one', () => {
    expect(rrule(event({ everyN: 2 }), tz)).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH');
  });

  it('drops a weekday the calendar would not understand', () => {
    expect(rrule(event({ byday: ['MO', 'XX'] }), tz)).toBe('FREQ=WEEKLY;BYDAY=MO');
  });

  it('emits UNTIL as a UTC instant, converted off the local wall clock', () => {
    // 08:00 WIB is 01:00 UTC the same day. An UNTIL left in local time ends the series late.
    expect(rrule(event({ endsOn: '2026-12-31' }), tz)).toContain('UNTIL=20261231T010000Z');
  });

  it('never carries UNTIL and COUNT together', () => {
    const rule = rrule(event({ endsOn: '2026-12-31', occurrences: 8 }), tz)!;
    expect(rule).toContain('UNTIL=');
    expect(rule).not.toContain('COUNT=');
  });

  it('uses COUNT when there is no end date', () => {
    expect(rrule(event({ occurrences: 8 }), tz)).toBe('FREQ=WEEKLY;BYDAY=MO,TH;COUNT=8');
  });
});

describe('an ended compound', () => {
  it('is cancelled rather than dropped, and loses its alarm', () => {
    // A subscribed calendar keeps an event it is simply no longer told about, so a client would go
    // on being reminded of a compound they stopped. CANCELLED is what clears it.
    const out = cal([event({ cancelled: true, seq: 3 })]);
    expect(out).toContain('STATUS:CANCELLED');
    expect(out).toContain('SEQUENCE:3');
    expect(out).not.toContain('BEGIN:VALARM');
  });

  it('while a live one is confirmed and carries its reminder', () => {
    const out = cal([event()]);
    expect(out).toContain('STATUS:CONFIRMED');
    expect(out).toContain('TRIGGER:-PT30M');
  });

  it('has no alarm when no reminder is set', () => {
    expect(cal([event({ reminderMinutes: 0 })])).not.toContain('BEGIN:VALARM');
  });
});

describe('structure', () => {
  it('balances its components and carries one VEVENT per line', () => {
    const out = cal([event(), event({ uid: 'other' })]);
    expect(out.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(out.match(/END:VEVENT/g)).toHaveLength(2);
    expect(out.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(out).toContain('METHOD:PUBLISH');
  });
});

describe('schedule labels', () => {
  it('returns a key and its parameters, never a formatted sentence', () => {
    expect(scheduleLabel({ freq: 'weekly', every_n: 1, byday: [], at_time: '08:00', starts_on: '2026-09-14' }))
      .toEqual({ key: 'weekly', params: {} });
    expect(scheduleLabel({ freq: 'weekly', every_n: 2, byday: [], at_time: '08:00', starts_on: '2026-09-14' }))
      .toEqual({ key: 'every_n_weeks', params: { n: 2 } });
    expect(scheduleLabel({ freq: 'daily', every_n: 3, byday: [], at_time: '08:00', starts_on: '2026-09-14' }))
      .toEqual({ key: 'every_n_days', params: { n: 3 } });
  });

  it('orders days by the week, not by how they were typed', () => {
    expect(orderedDays(['TH', 'MO', 'SU'])).toEqual(['SU', 'MO', 'TH']);
  });
});

describe('first occurrence', () => {
  it('moves to the first day the rule actually lands on', () => {
    // 2026-09-14 is a Monday; a Tue/Fri rule does not begin that day.
    expect(firstOccurrence({ freq: 'weekly', every_n: 1, byday: ['TU', 'FR'], at_time: '08:00', starts_on: '2026-09-14' }))
      .toBe('2026-09-15');
  });

  it('stays on the start date when that day is in the rule', () => {
    expect(firstOccurrence({ freq: 'weekly', every_n: 1, byday: ['MO'], at_time: '08:00', starts_on: '2026-09-14' }))
      .toBe('2026-09-14');
  });

  it('leaves a non-weekly rule where it starts', () => {
    expect(firstOccurrence({ freq: 'daily', every_n: 1, byday: [], at_time: '08:00', starts_on: '2026-09-14' }))
      .toBe('2026-09-14');
  });
});
