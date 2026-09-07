// Copy lint — one rule, one implementation. The detection lives in
// `scripts/gates/lib/copy-rules.mjs`, which the CI gate (platform prompt §11, gate 9) runs over the
// message catalogues and the content tables. This module is the same rule, re-exported for the
// Console content editor, with each finding mapped to a translatable code so the editor can say
// which field failed in the reader's own language. No second regex lives here.
import { lintCopy as lintRules } from '../../scripts/gates/lib/copy-rules.mjs';

export type LintCode = 'avoid' | 'exclamation' | 'dose' | 'route';
export type LintFinding = { code: LintCode; detail: string };

function classify(finding: string): LintFinding {
  const avoid = /^avoid-list word "(.+)"$/.exec(finding);
  if (avoid) return { code: 'avoid', detail: avoid[1] };
  if (finding === 'exclamation mark') return { code: 'exclamation', detail: '!' };
  if (finding.startsWith('dose')) return { code: 'dose', detail: finding };
  return { code: 'route', detail: finding };
}

/** Structured findings for the editor. Empty array = clean. */
export function lintFindings(text: string | null | undefined): LintFinding[] {
  return lintCopy(text).map(classify);
}

/** The gate's own findings, verbatim, for scripts and server logs. Empty array = clean. */
export function lintCopy(text: string | null | undefined): string[] {
  const s = String(text ?? '');
  if (!s.trim()) return [];
  return lintRules(s) as string[];
}

/** Lint several named fields at once; returns one entry per finding, carrying the field it came from. */
export function lintFields(fields: Record<string, string | null | undefined>): (LintFinding & { field: string })[] {
  return Object.entries(fields).flatMap(([field, value]) => lintFindings(value).map(f => ({ ...f, field })));
}
