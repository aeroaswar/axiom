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

// ---------------------------------------------------------------- structured data
// Organization on the home page; DefinedTerm / DefinedTermSet on the guide; FAQPage on the FAQ.
// Product and Offer are emitted for devices and apparel only — never for a peptide, because that
// invites shopping surfaces to present a research compound as a consumer good.

export type Json = Record<string, unknown>;

export const absolute = (locale: string, path: string) => `${siteUrl()}${localePath(locale, path)}`;

export function organizationLd(locale: string, o: { name: string; description: string; whatsapp: string; sameAs?: string[] }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: o.name,
    url: absolute(locale, '/'),
    description: o.description,
    address: { '@type': 'PostalAddress', addressLocality: 'Jakarta', addressCountry: 'ID' },
    contactPoint: [{ '@type': 'ContactPoint', contactType: 'sales', telephone: `+${o.whatsapp}`, areaServed: 'ID', availableLanguage: ['id', 'en'] }],
    ...(o.sameAs?.length ? { sameAs: o.sameAs } : {}),
  };
}

export function definedTermLd(locale: string, t: { name: string; description: string; path: string; setName: string; setPath: string; synonyms?: string[]; identifier?: string | null }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: t.name,
    description: t.description,
    url: absolute(locale, t.path),
    inDefinedTermSet: { '@type': 'DefinedTermSet', name: t.setName, url: absolute(locale, t.setPath) },
    ...(t.synonyms?.length ? { alternateName: t.synonyms } : {}),
    ...(t.identifier ? { identifier: t.identifier } : {}),
  };
}

export function definedTermSetLd(locale: string, s: { name: string; description: string; path: string; terms: { name: string; path: string }[] }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'DefinedTermSet',
    name: s.name,
    description: s.description,
    url: absolute(locale, s.path),
    hasDefinedTerm: s.terms.map(t => ({ '@type': 'DefinedTerm', name: t.name, url: absolute(locale, t.path) })),
  };
}

export function faqLd(items: { q: string; a: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(i => ({ '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } })),
  };
}

/** Devices and apparel only. Callers must refuse to reach here with a peptide. */
export function productLd(locale: string, p: { name: string; description: string; path: string; kind: 'device' | 'apparel'; offers: { sku: string; name: string; price: number | null; available: number }[] }): Json {
  const priced = p.offers.filter(o => o.price !== null);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    url: absolute(locale, p.path),
    category: p.kind,
    brand: { '@type': 'Brand', name: 'AXIOM' },
    ...(priced.length
      ? {
          offers: priced.map(o => ({
            '@type': 'Offer',
            sku: o.sku,
            name: o.name,
            price: String(o.price),
            priceCurrency: 'IDR',
            availability: o.available > 0 ? 'https://schema.org/InStock' : 'https://schema.org/BackOrder',
            url: absolute(locale, p.path),
          })),
        }
      : {}),
  };
}

export function breadcrumbLd(locale: string, crumbs: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: absolute(locale, c.path) })),
  };
}
