import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { Icon } from '@/components/shell/sprite';
import { withRls } from '@/lib/db';

export type EventRow = {
  key: string; kind: string; tone: 'info' | 'warn' | 'err';
  subject_type: 'quote' | 'order' | 'account' | 'variant' | 'lead';
  subject_id: string; ref: string | null; amount_idr: string | null; due_at: Date | null;
  meta: Record<string, string | boolean | null>;
};

/** The one derived feed. Today, the bell and the badge all read it; nothing here is stored. */
export async function events(uid: string) {
  return withRls({ uid }, tx => tx<EventRow[]>`select * from axiom.events()`);
}

const KNOWN = new Set([
  'quote_requested', 'quote_awaiting_reply', 'quote_expired', 'transfer_to_match', 'invoice_overdue',
  'order_awaiting_payment', 'order_to_pack', 'ack_expiring', 'ack_lapsed', 'reorder_overdue',
  'reorder_due', 'stockout', 'quote_to_accept', 'request_being_priced', 'invoice_to_pay',
  'order_packing', 'order_dispatched', 'ack_none', 'refund_due', 'lead_new',
]);

const ICONS: Record<string, string> = {
  quote_requested: 'send', quote_awaiting_reply: 'send', quote_expired: 'clock',
  transfer_to_match: 'file', invoice_overdue: 'file', order_awaiting_payment: 'receipt',
  order_to_pack: 'box', ack_expiring: 'warn', ack_lapsed: 'warn',
  reorder_overdue: 'reorder', reorder_due: 'reorder', stockout: 'flask',
  ack_none: 'warn', refund_due: 'receipt', lead_new: 'send',
};

export async function EventFeed({ rows }: { rows: EventRow[] }) {
  const t = await getTranslations('console.events');
  const locale = await getLocale();
  const df = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short' });

  const href = (e: EventRow) =>
    e.subject_type === 'account' ? `/console/clients/${e.subject_id}`
      : e.subject_type === 'lead' ? '/console/leads'
        : e.subject_type === 'variant' ? `/console/catalogue/${String(e.meta?.sku ?? '')}`
          : `/console/orders/${e.ref ?? ''}`;

  return (
    <div className="rows">
      {rows.map(e => {
        const kind = KNOWN.has(e.kind) ? e.kind : 'unknown';
        const values = {
          ref: e.ref ?? '',
          account: String(e.meta?.account ?? ''),
          amount: e.amount_idr ? idr(e.amount_idr) : '',
          date: e.due_at ? df.format(new Date(e.due_at)) : '',
          sku: String(e.meta?.sku ?? ''),
          quote: String(e.meta?.quote ?? ''),
          chain: e.meta?.cold ? t('cold') : t('ambient'),
        };
        return (
          <Link className="row" key={e.key} href={href(e)}>
            <span className="ic"><Icon name={ICONS[e.kind] ?? 'bell'} /></span>
            <span className="bd">
              <span className="t1">{t(`${kind}.t1`, values)}</span>
              <span className={`t2${e.tone === 'info' ? '' : ` ${e.tone}`}`}>{t(`${kind}.t2`, values)}</span>
            </span>
            <span className="rt"><Icon name="caret" /></span>
          </Link>
        );
      })}
    </div>
  );
}
