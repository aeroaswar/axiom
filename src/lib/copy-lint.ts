// Copy lint — the same rules the CI gate runs over the message catalogues and the content tables
// (platform prompt §11, gate 9). Pure, dependency-free, so a script can import it too.
//
// Refuses: avoid-list words, exclamation marks, and dose-and-frequency patterns (a quantity with a
// unit followed within a few words by a frequency, or a route of administration used as usage).

export type LintCode = 'avoid' | 'exclamation' | 'dose' | 'route';
export type LintFinding = { code: LintCode; detail: string };

const AVOID: RegExp[] = [
  /\bmiracles?\b/i, /\bguaranteed?\b/i, /\bcures?\b/i, /\banti[- ]?ag(e|ing)\b/i, /\bbest\b/i, /#\s?1\b/i,
  /\bstacks?\b/i, /\bcycles?\b/i, /\bboost(s|ed|ing)?\b/i,
  // the same vocabulary in Indonesian
  /\bajaib\b/i, /\bdijamin\b/i, /\bmenyembuhkan\b/i, /\banti[- ]?penuaan\b/i, /\bterbaik\b/i, /\bnomor\s?1\b/i,
];

const UNIT = String.raw`(?:mg|mcg|µg|ug|iu|ml|mL|units?|unit)`;
const FREQ = String.raw`(?:daily|weekly|monthly|per\s+day|per\s+week|a\s+day|a\s+week|twice|once|every|each|x\s?\/\s?week|\/\s?day|\/\s?week|\/\s?d|\/\s?wk|sehari|seminggu|per\s+hari|per\s+minggu|setiap|sekali|dua\s+kali|tiap)`;
// a number with a unit, then up to four words, then a frequency
const DOSE = new RegExp(String.raw`\b\d+(?:[.,]\d+)?\s*${UNIT}\b(?:\W+\w+){0,4}?\W+${FREQ}\b`, 'i');
const DOSE_ALL = new RegExp(DOSE.source, 'gi');
// routes of administration read as usage guidance ("injection pen" is a product, not a route)
const ROUTE = /\b(subcutaneous(?:ly)?|intramuscular(?:ly)?|intravenous(?:ly)?|subkutan|intramuskular|intravena|disuntik\w*|menyuntik\w*|inject(?:ed|ing)|injections?(?!\s+pen))\b/gi;

export function lintFindings(text: string | null | undefined): LintFinding[] {
  const out: LintFinding[] = [];
  const s = String(text ?? '');
  if (!s.trim()) return out;
  for (const re of AVOID) {
    const m = s.match(re);
    if (m) out.push({ code: 'avoid', detail: m[0] });
  }
  if (s.includes('!')) out.push({ code: 'exclamation', detail: '!' });
  for (const m of s.matchAll(DOSE_ALL)) out.push({ code: 'dose', detail: m[0].replace(/\s+/g, ' ') });
  for (const m of s.matchAll(ROUTE)) out.push({ code: 'route', detail: m[0] });
  return out;
}

/** Human-readable findings, one per line, for the CI gate and scripts. Empty array = clean. */
export function lintCopy(text: string | null | undefined): string[] {
  return lintFindings(text).map(f =>
    f.code === 'avoid' ? `avoid-list word: "${f.detail}"`
    : f.code === 'exclamation' ? 'exclamation mark'
    : f.code === 'dose' ? `dose-and-frequency pattern: "${f.detail}"`
    : `route of administration as usage: "${f.detail}"`);
}
