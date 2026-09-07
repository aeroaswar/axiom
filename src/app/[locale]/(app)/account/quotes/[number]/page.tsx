import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { getSettings } from '@/lib/settings';
import { accountSession, quoteByNumber } from '@/components/account/data';
import { QuoteScreen } from '@/components/account/quote-screen';

export const dynamic = 'force-dynamic';

export default async function QuotePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.quote');

  const [found, settings] = await Promise.all([
    quoteByNumber(session.uid, session.accountId, decodeURIComponent(number)),
    getSettings(),
  ]);
  if (!found) notFound();
  const requested = found.quote.state === 'requested' || found.quote.state === 'draft';

  return (
    <section className="screen on account">
      <PageTitle title={requested ? t('request_title', { number: found.quote.number }) : t('title', { number: found.quote.number })} />
      <QuoteScreen quote={found.quote} lines={found.lines} legs={found.legs}
        whatsapp={settings.whatsapp.number} payDays={settings.payment_terms_days} quoteDays={settings.quote_valid_days} />
    </section>
  );
}
