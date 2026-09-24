import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

// Message catalogues are split per surface (core · site · console · account) and merged here, so
// every user-facing string still resolves through one i18n layer. Gate 17 checks both locales.
const parts = ['core', 'site', 'console', 'commerce', 'account'] as const;

async function load(locale: string) {
  const merged: Record<string, unknown> = {};
  for (const p of parts) {
    try {
      const mod = (await import(`../../messages/${locale}/${p}.json`)).default as Record<string, unknown>;
      Object.assign(merged, mod);
    } catch { /* a surface not yet built has no catalogue */ }
  }
  return merged;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: await load(locale), timeZone: 'Asia/Jakarta' };
});
