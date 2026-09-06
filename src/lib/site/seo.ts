import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

// hreflang and canonical for the public site: '/…' is Indonesian, '/en/…' English, x-default Indonesian.
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export function localePath(locale: string, path: string): string {
  const p = path === '/' ? '' : path;
  return locale === routing.defaultLocale ? (p || '/') : `/${locale}${p}`;
}

export function alternates(locale: string, path: string): NonNullable<Metadata['alternates']> {
  const languages: Record<string, string> = {};
  for (const l of routing.locales) languages[l] = localePath(l, path);
  languages['x-default'] = localePath(routing.defaultLocale, path);
  return { canonical: localePath(locale, path), languages };
}

export const NOINDEX: Metadata['robots'] = { index: false, follow: false };

/** A description derived from a record: the first sentence or two, trimmed to a search-friendly length. */
export function describe(text: string | null | undefined, max = 158): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' '));
  return `${cut.slice(0, end > 40 ? end : max).trim()}…`;
}
