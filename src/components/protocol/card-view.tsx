import { useFormatter, useTranslations } from 'next-intl';
import type { Card, CardItem } from '@/lib/protocol/card';
import { orderedDays, scheduleLabel } from '@/lib/protocol/schedule';
import { qrModules, qrPath, qrViewBox } from '@/lib/protocol/qr';

// The card as it renders on a phone held next to the box. The same component backs the client's own
// view under /account, so what a scan shows and what a signed-in member sees cannot drift.

function Schedule({ item }: { item: CardItem }) {
  const t = useTranslations('protocol.schedule');
  const label = scheduleLabel(item);
  const days = orderedDays(item.byday);
  const parts = [t(label.key, label.params)];
  if (days.length) parts.push(t('on_days', { days: days.map(d => t(`day.${d.toLowerCase()}`)).join(', ') }));
  parts.push(t('at_time', { time: item.at_time }));
  if (item.ends_on) parts.push(t('until', { date: item.ends_on }));
  else if (item.occurrences) parts.push(t('count', { n: item.occurrences }));
  return <>{parts.join(' · ')}</>;
}

function Coa({ item }: { item: CardItem }) {
  const t = useTranslations('protocol.coa');
  if (!item.coa) return <p className="pc-none">{t('none')}</p>;
  const rows: [string, string][] = [];
  if (item.lot_code) rows.push([t('lot'), item.lot_code]);
  if (item.coa.purity_pct != null) rows.push([t('purity'), `${item.coa.purity_pct}%`]);
  rows.push([t('method'), item.coa.method]);
  if (item.coa.issued_at) rows.push([t('issued'), item.coa.issued_at]);
  return (
    <dl className="pc-kv">
      {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
    </dl>
  );
}

function Item({ item, code }: { item: CardItem; code: string }) {
  const t = useTranslations('protocol.item');
  const tc = useTranslations('protocol.card');
  const tCoa = useTranslations('protocol.coa');
  return (
    <article className={`pc-item${item.active ? '' : ' is-ended'}`}>
      <header>
        <h3>{item.name}</h3>
        <span className="pc-sku">{item.pack} · {item.content}</span>
        {item.active ? null : <span className="pc-tag">{t('ended')}</span>}
      </header>
      {item.brief ? <p className="pc-brief">{item.brief}</p> : null}
      <dl className="pc-kv">
        {item.amount ? <div><dt>{t('amount')}</dt><dd>{item.amount}</dd></div> : null}
        {item.route ? <div><dt>{t('route')}</dt><dd>{item.route}</dd></div> : null}
        <div><dt>{t('schedule')}</dt><dd><Schedule item={item} /></dd></div>
      </dl>
      <section className="pc-coa">
        <h4>{tCoa('title')}</h4>
        <Coa item={item} />
        {item.coa ? <a className="pc-link" href={`/api/protocol/${code}/coa/${item.id}`}>{tCoa('open')}</a> : null}
      </section>
      {item.published
        ? <a className="pc-link" href={`/compounds/${item.pathway_slug}/${item.slug}`}>{tc('guide')}</a>
        : null}
    </article>
  );
}

export function CardView({ card, code, links }: {
  card: Card;
  code: string;
  links: { url: string; webcal: string; download: string; google: (i: CardItem) => string };
}) {
  const t = useTranslations('protocol.card');
  const tCal = useTranslations('protocol.calendar');
  const f = useFormatter();
  // The same square that is printed on the box, so a client can hand the card on from the screen.
  const modules = qrModules(links.url);

  return (
    <main className="pc">
      <header className="pc-head">
        <svg className="pc-wm" viewBox="0 0 582 70" role="img" aria-label="AXIOM"><use href="#wm" /></svg>
        <p className="pc-title">{t('title')}</p>
        <h1 className="pc-subject">{card.subject}</h1>
        {card.title ? <p className="pc-sub">{card.title}</p> : null}
        <dl className="pc-kv pc-meta">
          <div><dt>{t('number')}</dt><dd>{card.number}</dd></div>
          <div><dt>{t('issued')}</dt><dd>{f.dateTime(new Date(card.issued_at), { dateStyle: 'medium' })}</dd></div>
          <div><dt>{t('updated')}</dt><dd>{f.dateTime(new Date(card.updated_at), { dateStyle: 'medium' })}</dd></div>
        </dl>
      </header>

      <section className="pc-sec">
        <h2>{t('compounds')}</h2>
        {card.items.length === 0
          ? <p className="pc-none">{t('empty')}</p>
          : card.items.map(i => <Item key={i.id} item={i} code={code} />)}
      </section>

      <section className="pc-sec">
        <h2>{tCal('title')}</h2>
        <p className="pc-note">{tCal('subscribe_note')}</p>
        <p className="pc-actions">
          <a className="pc-btn" href={links.webcal}>{tCal('subscribe')}</a>
          <a className="pc-btn pc-btn-quiet" href={links.download}>{tCal('download')}</a>
        </p>
        <p className="pc-note">{tCal('download_note')}</p>
        {card.items.filter(i => i.active).map(i => (
          <a key={i.id} className="pc-link" href={links.google(i)} target="_blank" rel="noreferrer noopener">
            {tCal('google')} · {i.name}
          </a>
        ))}
      </section>

      <section className="pc-sec pc-qr">
        <svg className="pc-qr-svg" viewBox={qrViewBox(modules)} role="img" aria-label={card.number} shapeRendering="crispEdges">
          <path d={qrPath(modules)} />
        </svg>
      </section>

      <footer className="pc-foot">
        <p>{t('notice')}</p>
      </footer>
    </main>
  );
}
