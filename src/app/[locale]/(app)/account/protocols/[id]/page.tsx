import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { rv } from '@/components/console/shared/reveal';
import { accountSession } from '@/components/account/data';
import { myProtocol, orderedPeptides } from '@/components/account/protocols';
import { AddCompound } from '@/components/account/protocol-forms';
import { CardView } from '@/components/protocol/card-view';
import { cardByCode, cardUrl, googleTemplateUrl, icsPath, webcalUrl, type CardItem } from '@/lib/protocol/card';

export const dynamic = 'force-dynamic';

/**
 * The client's own view of a card. It renders through the same `CardView` a scan opens, so what the
 * account sees and what the QR shows cannot drift; what it adds is the ability to append a compound
 * without waiting for AXIOM.
 */
export default async function AccountProtocol({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await accountSession();
  if (!session) return null;
  const p = await myProtocol(session.uid, session.accountId, id);
  if (!p) notFound();

  const [card, variants] = await Promise.all([
    cardByCode(p.code),
    orderedPeptides(session.uid, session.accountId),
  ]);
  if (!card) notFound();

  const t = await getTranslations('account.protocols');
  const ti = await getTranslations('protocol.item');
  const labels = { amount: ti('amount'), route: ti('route') };

  return (
    <section className="screen on account">
      <PageTitle title={p.title || p.subject_label} />
      <CardView
        card={card}
        code={p.code}
        links={{
          url: cardUrl(p.code),
          webcal: webcalUrl(p.code),
          download: `${icsPath(p.code)}?download=1`,
          google: (i: CardItem) => googleTemplateUrl(i, card, p.code, labels),
        }}
      />
      <div className="sec-h rv" style={{ ...rv(0), marginTop: 24 }}><span className="kicker">{t('add.title')}</span></div>
      {variants.length
        ? <AddCompound protocolId={p.id} variants={variants} />
        : <p className="empty">{t('add.nothing_ordered')}</p>}
      <p className="note" style={{ marginTop: 16 }}>{t('add.note')}</p>
    </section>
  );
}
