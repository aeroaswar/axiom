import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { Icon } from '@/components/shell/sprite';
import type { CutoffSetting } from '@/lib/domain/cutoff';
import type { Pipeline } from '@/lib/queries/pipeline';
import { MarkSelected } from '../shared/mark-selected';
import { rv } from '../shared/reveal';
import { PipeStrip, ViewToggle } from './pipe-strip';
import { stageTiles } from './tiles';
import { labels, NextCell } from './labels';

/**
 * One list holding quotes and orders in the order they need attention, and one strip above it whose
 * five counts are that same list grouped by stage. Every row carries what it is waiting for and by
 * when; a row with nothing to wait for would be a bug, so `nextAction` is total over every state the
 * database can hold.
 */
export async function OrdersList({ data, cutoff }: { data: Pipeline; cutoff: CutoffSetting }) {
  const t = await getTranslations('commerce.orders');
  const ts = await getTranslations('states');
  const L = await labels();

  const tiles = await stageTiles(data, cutoff);

  // The transfer row is dated by the transfer, not by the invoice's due date.
  const claim = (r: { next: { key: string }; claimAt: Date | null }) =>
    (r.next.key === 'o_transfer_reported' && r.claimAt ? { date: L.stamp(r.claimAt) } : undefined);

  const items = (r: { firstItem: string; lineCount: number }) =>
    r.firstItem + (r.lineCount > 1 ? ` · ${t('more', { n: r.lineCount - 1 })}` : '');

  const stateLabel = (r: { kind: 'quote' | 'order'; state: string }) =>
    r.kind === 'quote' ? ts(`quote.${r.state}`) : ts(`order.${r.state}`);

  return (
    <section className="screen on" data-scope="orders" data-view="open">
      <div className="rv" style={rv(0)}>
        <PipeStrip tiles={tiles} mode="filter" />
        <ViewToggle open={t('foot_open')} closed={t('foot_closed')} hint={t('sorted')} />
      </div>

      <div className="tblwrap desktop-only rv rv-line" style={rv(1)}>
        <table className="tbl">
          <thead>
            <tr>
              <th>{t('ref')}</th>
              <th>{t('account')}</th>
              <th className="col-placed">{t('items')}</th>
              <th>{t('next')}</th>
              <th className="n">{t('total')}</th>
              <th>{t('state')}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map(r => (
              <tr key={r.href} className="lnk" data-href={r.href} data-tags={r.tags}>
                <td className="k"><Link href={r.href} scroll={false}>{r.number}</Link></td>
                <td>{r.account}</td>
                <td className="clip col-placed" title={items(r)}>{items(r)}</td>
                <td className="nx"><NextCell row={r} cutoff={cutoff} text={L.next(r.next, claim(r))} className="nx-t" /></td>
                <td className="n money">{idr(r.total)}</td>
                <td><span className={`chip ${r.chip}`}><span className="dot" />{stateLabel(r)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rows mobile-only rv" style={rv(1)}>
        {data.rows.map(r => (
          <Link key={r.href} className="row" href={r.href} scroll={false} data-href={r.href} data-tags={r.tags}>
            <span className="ic"><Icon name={r.icon} /></span>
            <span className="bd">
              <span className="t1">{r.account}</span>
              <span className="t2">{r.number} · <NextCell row={r} cutoff={cutoff} text={L.next(r.next, claim(r))} className="nx-t" /></span>
            </span>
            <span className="rt">
              <span className="amt">{idr(r.total)}</span>
              <span className={`chip ${r.chip}`}><span className="dot" />{stateLabel(r)}</span>
            </span>
          </Link>
        ))}
      </div>

      <p className="empty" data-none hidden>{t('empty')}</p>
      <p className="note rv" style={{ ...rv(2), marginTop: 14, maxWidth: '78ch' }}>{t('note')}</p>
      <MarkSelected />
    </section>
  );
}
