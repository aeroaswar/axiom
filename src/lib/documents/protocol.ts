import 'server-only';
import { getTranslations } from 'next-intl/server';
import type { DocBlock, DocumentData } from '@/components/document/document';
import { getSettings } from '@/lib/settings';
import { cardByCode, cardUrl, type Card, type CardItem } from '@/lib/protocol/card';
import { orderedDays, scheduleLabel } from '@/lib/protocol/schedule';
import { qrModules } from '@/lib/protocol/qr';

// The card as an A4 sheet: what goes in the box, or on the wall of a treatment room. It is the same
// document template the invoice uses, printed by the same headless Chromium, so the two cannot
// drift into two house styles.

export const protocolFilename = (number: string) => `${number}.pdf`;

export async function protocolDocument(code: string): Promise<DocumentData | null> {
  const card = await cardByCode(code);
  if (!card) return null;

  const locale = card.locale === 'en' ? 'en' : 'id';
  const [t, ts, td, tc, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'protocol' }),
    getTranslations({ locale, namespace: 'protocol.schedule' }),
    getTranslations({ locale, namespace: 'protocol.schedule.day' }),
    getTranslations({ locale, namespace: 'protocol.coa' }),
    getSettings(),
  ]);

  const schedule = (i: CardItem) => {
    const label = scheduleLabel(i);
    const days = orderedDays(i.byday);
    const parts = [ts(label.key, label.params)];
    if (days.length) parts.push(ts('on_days', { days: days.map(d => td(d.toLowerCase())).join(', ') }));
    parts.push(ts('at_time', { time: i.at_time }));
    if (i.ends_on) parts.push(ts('until', { date: i.ends_on }));
    else if (i.occurrences) parts.push(ts('count', { n: i.occurrences }));
    return parts.join(' · ');
  };

  const blocks: DocBlock[] = card.items.map(i => {
    const rows = [] as { k: string; v: string }[];
    if (i.amount) rows.push({ k: t('item.amount'), v: i.amount });
    if (i.route) rows.push({ k: t('item.route'), v: i.route });
    rows.push({ k: t('item.schedule'), v: schedule(i) });
    if (i.lot_code) rows.push({ k: tc('lot'), v: i.lot_code });
    if (i.coa?.purity_pct != null) rows.push({ k: tc('purity'), v: `${i.coa.purity_pct}%` });
    if (i.coa) rows.push({ k: tc('method'), v: i.coa.method });
    if (!i.active) rows.push({ k: t('item.ended'), v: (i.ended_at ?? '').slice(0, 10) });
    return { title: i.name, sub: `${i.pack} · ${i.content}`, rows, note: i.brief || undefined, muted: !i.active };
  });

  const day = (v: string | null) =>
    v ? new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '';

  return {
    kind: 'protocol_card',
    title: t('card.title'),
    number: card.number,
    meta: [
      { k: t('card.issued'), v: day(card.issued_at) },
      { k: t('card.updated'), v: day(card.updated_at) },
    ],
    amountDue: null,
    columns: { a: t('card.for'), b: t('card.issued_by'), c: t('card.number'), sub: '' },
    parties: {
      billedTo: { name: card.subject, lines: card.title },
      issuedBy: { name: settings.entity?.name ?? 'AXIOM', lines: settings.entity?.address ?? '' },
      details: [{ k: t('card.number'), v: card.number }],
    },
    headings: { ix: '', item: '', qty: '', unit: '', amount: '' },
    lines: [],
    blocks,
    // The same square that is on the box. It points at the card, so this sheet stays current even
    // after it has been printed and filed.
    qr: { modules: qrModules(cardUrl(code)), caption: card.number },
    totals: [],
    grand: null,
    payment: null,
    notes: null,
    delivery: null,
    // Not the site-wide notice: that one says no dosing guidance is given, which is not true of this
    // sheet. The card carries its own, which states what it is and what it is not.
    ruo: t('card.notice'),
    footer: { brand: 'AXIOM', line: t('card.title') },
    lang: locale,
  } satisfies DocumentData & { blocks: DocBlock[] } as DocumentData;
}

export type { Card };
