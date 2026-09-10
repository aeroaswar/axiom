import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Sheet } from '@/components/shell/sheet';
import { ActionButton } from '@/components/console/shared/action-form';
import { staffSession } from '@/components/console/shared/act';
import {
  lotsForVariant, peptideVariants, protocolById, protocolEvents, protocolItems,
} from '@/components/console/protocols/data';
import { ProtocolSheetBody } from '@/components/console/protocols/sheet-body';
import { revokeProtocol } from '@/components/console/protocols/actions';
import { cardUrl, icsPath, webcalUrl } from '@/lib/protocol/card';
import { qrModules, qrPath, qrViewBox } from '@/lib/protocol/qr';

export const dynamic = 'force-dynamic';

export default async function ProtocolSheet({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await staffSession();
  if (!session) return null;
  const p = await protocolById(session.uid, id);
  if (!p) notFound();

  const [items, events, variants] = await Promise.all([
    protocolItems(session.uid, p.id),
    protocolEvents(session.uid, p.id),
    peptideVariants(session.uid),
  ]);
  // Every lot of every compound already on the card, so a line can be pointed at the vial that was
  // actually sent. `axiom.lot_of` refuses one belonging to a different compound regardless.
  const lots = (await Promise.all(
    [...new Set(items.map(i => i.variant_id))].map(v => lotsForVariant(session.uid, v)),
  )).flat();

  const t = await getTranslations('console.protocols');
  const tc = await getTranslations('console.common');
  const modules = qrModules(cardUrl(p.code));

  const footer = p.state === 'issued' ? (
    <div className="hrow">
      {/* Withdrawing is the only answer to a code that has got out: the square already printed
          stops resolving. There is no way to change a code without printing a new card. */}
      <ActionButton action={revokeProtocol} submit={t('revoke')} tone="danger" hidden={{ protocol_id: p.id }} />
    </div>
  ) : null;

  return (
    <Sheet kicker={p.number} title={p.subject_label} backHref="/console/protocols" closeLabel={tc('close')} footer={footer} wide>
      <div className="kv"><span className="k">{t('sheet.account')}</span><span className="v">{p.account}</span></div>
      <div className="kv"><span className="k">{t('sheet.study')}</span>
        <span className="v">{p.title || <span className="dim-2">{t('no_title')}</span>}</span></div>
      <div className="kv"><span className="k">{t('sheet.state')}</span><span className="v">{t(`state.${p.state}`)}</span></div>
      <div className="kv"><span className="k">{t('sheet.locale')}</span><span className="v">{p.locale}</span></div>

      {p.state === 'issued' ? (
        <section>
          <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('sheet.qr')}</span></div>
          <p className="note">{t('sheet.qr_note')}</p>
          <div className="qrbox">
            <svg className="qr-svg" viewBox={qrViewBox(modules)} role="img" aria-label={p.number} shapeRendering="crispEdges">
              <path d={qrPath(modules)} />
            </svg>
          </div>
          <div className="hrow" style={{ marginTop: 12 }}>
            <a className="btn btn-sm" href={cardUrl(p.code)} target="_blank" rel="noreferrer noopener">{t('sheet.open_card')}</a>
            <a className="btn btn-sm" href={`/api/protocol/${p.code}/qr`} target="_blank" rel="noreferrer noopener">{t('sheet.qr_svg')}</a>
            <a className="btn btn-sm" href={`/api/documents/protocol/${p.code}`} target="_blank" rel="noreferrer noopener">{t('sheet.print')}</a>
            <a className="btn btn-sm" href={`${icsPath(p.code)}?download=1`}>{t('sheet.ics')}</a>
          </div>
          <p className="note" style={{ marginTop: 10 }}>{t('sheet.subscribe_url')}</p>
          <p className="mono dim-2" style={{ wordBreak: 'break-all' }}>{webcalUrl(p.code)}</p>
        </section>
      ) : null}

      <ProtocolSheetBody p={p} items={items} events={events} variants={variants} lots={lots} />
    </Sheet>
  );
}
