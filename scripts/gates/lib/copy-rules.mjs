// Copy rules, one implementation: used by the CI lint (gate 9) and by the Console content editor.
// Avoid-list words, exclamation marks, and dose-and-frequency or route patterns in body copy.

export const AVOID = ['miracle', 'guaranteed', 'cure', 'anti-aging', 'anti aging', 'antiaging', 'stack', 'cycle', 'boost', '#1', 'best'];

// a quantity with a unit followed within a few words by a frequency, or a route stated as use
const DOSE = /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|µg|ug|iu|ml|units?)\b(?:\W+\w+){0,4}?\W+(?:daily|weekly|nightly|per\s+day|per\s+week|a\s+day|a\s+week|twice|once|every|each\s+day|\/day|\/week|x\s?\/?\s?week|sehari|seminggu|per\s+hari|per\s+minggu|setiap|dua\s+kali|sekali)\b/i;
const ROUTE = /\b(?:inject(?:ed|ion)?\s+(?:daily|weekly|subcutaneous|intramuscular|before|after)|subcutaneous(?:ly)?\s+(?:daily|weekly|inject)|intramuscular(?:ly)?\s+(?:daily|weekly|inject)|take\s+\d|dose\s+of\s+\d|dosis\s+\d|suntik(?:kan)?\s+\d)/i;
const WORD = (w) => new RegExp(`(^|[^\\w-])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\w-])`, 'i');

/** Returns findings for a piece of user-facing copy; empty when clean. */
export function lintCopy(text, { allowBest = false } = {}) {
  const out = [];
  if (!text) return out;
  const s = String(text);
  for (const w of AVOID) {
    if (w === 'best' && allowBest) continue;
    if (WORD(w).test(s)) out.push(`avoid-list word "${w}"`);
  }
  if (/!/.test(s)) out.push('exclamation mark');
  if (DOSE.test(s)) out.push('dose-and-frequency pattern');
  if (ROUTE.test(s)) out.push('route or usage instruction');
  return out;
}

/** Walk a nested message catalogue and lint every string. */
export function lintCatalogue(obj, path = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj || {})) {
    const p = path ? `${path}.${k}` : k;
    if (typeof v === 'string') for (const f of lintCopy(v)) out.push({ path: p, finding: f, text: v });
    else if (v && typeof v === 'object') out.push(...lintCatalogue(v, p));
  }
  return out;
}
