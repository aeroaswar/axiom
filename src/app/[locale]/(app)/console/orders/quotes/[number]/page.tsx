import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Sheet } from '@/components/shell/sheet';
import { staffSession } from '@/components/console/shared/act';
import { getSettings } from '@/lib/settings';
import { quoteBody, quoteByNumber, quoteMargin, variantOptions } from '@/lib/queries/quotes';
import { QuoteBuilderBody, QuoteRecordBody, QuoteSheetFooter, type QuoteProps } from '@/components/console/orders/quote-sheet';

export const dynamic = 'force-dynamic';

/**
 * One quote, in one of two readings. A request or a draft is still being priced, so it opens as the
 * builder; anything the account has already seen is a record with its own actions. Which one it is
 * comes from the state, never from a mode the reader has to choose.
 */
export default async function QuoteSheet({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const session = await staffSession();
  if (!session) return null;

  const quote = await quoteByNumber(session.uid, number);
  if (!quote) notFound();

  const [{ lines, legs, events, sites }, margin, options, settings] = await Promise.all([
    quoteBody(session.uid, quote),
    quoteMargin(session.uid, quote.id),
    variantOptions(session.uid, quote.account_id),
    getSettings(),
  ]);
  const locale = await getLocale();
  const t = await getTranslations('commerce.quote');
  const tc = await getTranslations('console.common');
  const editing = quote.state === 'requested' || quote.state === 'draft';

  const props: QuoteProps = {
    quote, lines, legs, events, sites, options, margin,
    owner: session.role === 'owner',
    quoteDays: settings.quote_valid_days,
    payDays: settings.payment_terms_days,
    ruo: locale === 'en' ? settings.ruo_notice.en : settings.ruo_notice.id,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '',
    floor: settings.gm_floor_pct,
  };

  return (
    <Sheet backHref="/console/orders" closeLabel={tc('close')}
      kicker={`${t(quote.state === 'requested' ? 'kicker_request' : 'kicker')} · ${quote.account}`}
      title={quote.number}
      footer={<QuoteSheetFooter {...props} />}>
      {editing ? <QuoteBuilderBody {...props} /> : <QuoteRecordBody {...props} />}
    </Sheet>
  );
}
