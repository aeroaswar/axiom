import type { Viewport } from 'next';
import { Inter, Jost } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { Sprite } from '@/components/shell/sprite';
import { cardByCode } from '@/lib/protocol/card';
import { routing } from '@/i18n/routing';
import '../../globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--font-inter', display: 'swap' });
const jost = Jost({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-jost', display: 'swap' });

export const viewport: Viewport = { themeColor: '#070605', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

/**
 * The card sits outside `[locale]` on purpose, and the middleware lets `/k/` through the way it
 * already lets `/auth/` through.
 *
 * A card's language is a property of the card — frozen on the protocol when AXIOM issues it — not
 * of whoever is holding the phone. Routed through next-intl, `/k/CODE` would resolve against the
 * visitor's `axiom_locale` cookie, so a clinic manager whose own preference is English would be
 * handed an Indonesian client's card in English. It would also give one card two URLs, and a
 * pointer printed on a vial box that must never be reprinted can have exactly one.
 *
 * So the locale is read from the row and the provider is built by hand. The font wiring below
 * duplicates `src/app/[locale]/layout.tsx`; only a layout may render <html>, and this tree has to
 * render its own.
 */
export default async function CardLayout({ children, params }: { children: React.ReactNode; params: Promise<{ code: string }> }) {
  const { code } = await params;
  const card = await cardByCode(code);
  const locale = card && (routing.locales as readonly string[]).includes(card.locale) ? card.locale : routing.defaultLocale;
  const messages = (await import(`../../../../messages/${locale}/protocol.json`)).default;
  const core = (await import(`../../../../messages/${locale}/core.json`)).default;

  return (
    <html lang={locale} className={`${inter.variable} ${jost.variable}`}>
      <body>
        <Sprite />
        <NextIntlClientProvider locale={locale} messages={{ ...core, ...messages }} timeZone={card?.tz ?? 'Asia/Jakarta'}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
