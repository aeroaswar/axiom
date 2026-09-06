import { defineRouting } from 'next-intl/routing';

// Indonesian first: the buyer is an Indonesian clinic manager. '/' is Indonesian, '/en/…' English.
export const routing = defineRouting({
  locales: ['id', 'en'],
  defaultLocale: 'id',
  localePrefix: 'as-needed',
  localeCookie: { name: 'axiom_locale', maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];
