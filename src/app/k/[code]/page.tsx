import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { CardView } from '@/components/protocol/card-view';
import { RequestEdit } from '@/components/protocol/request-edit';
import { NOINDEX } from '@/lib/site/seo';
import {
  cardByCode, cardUrl, googleTemplateUrl, icsPath, webcalUrl, type CardItem,
} from '@/lib/protocol/card';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { robots: NOINDEX, title: 'AXIOM' };

/**
 * What a scan opens. Read-only: the QR is a pointer, never a capability, so nothing on this page
 * writes. Adding a compound goes through the sign-in link below, and from there through the
 * account's own session and its row-level security.
 *
 * An unknown code, a draft and a withdrawn card all render exactly this, so holding a code tells
 * you nothing you did not already know.
 */
export default async function ProtocolCardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const card = await cardByCode(code);
  // notFound() rather than a 200 carrying an apology: a card that does not resolve is a 404, and
  // the co-located not-found page says the same thing for unknown, draft and withdrawn alike.
  if (!card) notFound();

  const ti = await getTranslations('protocol.item');
  const labels = { amount: ti('amount'), route: ti('route') };

  return (
    <>
      <CardView
        card={card}
        code={code}
        links={{
          url: cardUrl(code),
          webcal: webcalUrl(code),
          download: `${icsPath(code)}?download=1`,
          google: (i: CardItem) => googleTemplateUrl(i, card, code, labels),
        }}
      />
      <RequestEdit code={code} />
    </>
  );
}
