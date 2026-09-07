import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { Icon } from '@/components/shell/sprite';
import type { CutoffSetting } from '@/lib/domain/cutoff';
import type { Figures } from '@/lib/queries/dashboard';
import { rate } from '@/lib/queries/dashboard';
import { isRefused } from '@/lib/queries/orders';
import type { Pipeline } from '@/lib/queries/pipeline';
import { EventFeed, type EventRow } from '../notifications/feed';
import { rv } from '../shared/reveal';
import { CountUp, Spark } from '../motion';
import { PipeStrip } from '../orders/pipe-strip';
import { stageTiles } from '../orders/tiles';

/**
 * One screen answering "what needs me today", in three tiers: three hero figures with the twelve
 * readings behind them, a quiet secondary strip, and the alerts in Today rather than dressed up as
 * KPIs. Every figure is derived from the tables as they stand — where the schema records nothing,
 * as with acquisition cost, the tile says so instead of carrying a number nobody can source.
 */
export async function Dashboard({ figures, gm, pipeline, events, receivable, owner, cutoff }: {
  figures: Figures;
  gm: { gm_pct: string; margin: string } | { refused: string };
  pipeline: Pipeline;
  events: EventRow[];
  receivable: { open: string; overN: number };
  owner: boolean;
  cutoff: CutoffSetting;
}) {
  const t = await getTranslations('commerce.dashboard');
  const to = await getTranslations('commerce.orders');

  const revenue = Number(figures.revenue_mtd);
  const prior = Number(figures.revenue_prior);
  const close = rate(figures.accepted_30, figures.sent_30);
  const reorder = Number(figures.reorder_pct);
  const reorderPrior = Number(figures.reorder_prior);
  const closeSeries = figures.months.map(m => rate(m.accepted, m.sent));
  const priorClose = closeSeries[closeSeries.length - 2] ?? 0;

  const pillarRows = figures.pillars.map(p => ({
    label: t(`pillar_${p.kind}`),
    value: BigInt(p.revenue),
  }));
  const pillarMax = pillarRows.reduce((m, p) => (p.value > m ? p.value : m), 1n);

  const tiles = await stageTiles(pipeline, cutoff);

  return (
    <section className="screen on">
      <div className="sec">
        <div className="sec-h rv" style={rv(0)}><span className="kicker">{t('this_month')}</span></div>

        <div className="kpis hero rv rv-line" style={rv(1)}>
          <div className="kpi">
            <span className="lab">{t('revenue')}</span>
            <span className="val"><CountUp value={revenue} format="idr">{idr(revenue)}</CountUp></span>
            <span className="def">{t('revenue_def')}</span>
            <span className="tgt">{t('prior', { value: idr(prior) })}</span>
            <Spark points={figures.months.map(m => Number(m.revenue))} label={t('revenue')} />
          </div>
          <div className="kpi">
            <span className="lab">{t('close')}</span>
            <span className="val"><CountUp value={close} format="pct">{close}<span className="u">%</span></CountUp></span>
            <span className="def">{t('close_def')}</span>
            <span className="tgt">{t('prior', { value: `${priorClose}%` })}</span>
            <Spark points={closeSeries} label={t('close')} />
          </div>
          <div className="kpi">
            <span className="lab">{t('reorder')}</span>
            <span className="val"><CountUp value={reorder} format="pct">{reorder}<span className="u">%</span></CountUp></span>
            <span className="def">{t('reorder_def')}</span>
            <span className="tgt">{t('prior', { value: `${reorderPrior}%` })}</span>
            <Spark points={figures.months.map(m => Number(m.reorder_pct))} label={t('reorder')} />
          </div>
        </div>

        {/* The column count is a data attribute, not an inline style: an inline grid-template wins
            over the media query below 900 px and held four columns on a phone, where a rupiah figure
            wraps mid-number. CSS decides the count at each width. */}
        <div className="kpis sub rv" data-cols={owner ? 4 : 1} style={rv(2)}>
          <div className="kpi">
            <span className="lab">{t('aov')}</span>
            <span className="val">{idr(figures.aov)}</span>
            <span className="tgt">{t('aov_sub', { n: figures.aov_orders })}</span>
          </div>
          {owner ? (
            <div className="kpi owner-only">
              <span className="lab">{t('gm')}</span>
              <span className="val">{isRefused(gm) ? '—' : <>{Number(gm.gm_pct)}<span className="u">%</span></>}</span>
              <span className="tgt">{t('gm_sub')}</span>
            </div>
          ) : null}
          {owner ? (
            <div className="kpi owner-only">
              <span className="lab">{t('cac')}</span>
              <span className="val dim-2">—</span>
              <span className="tgt">{t('cac_sub')}</span>
            </div>
          ) : null}
          {owner ? (
            <div className="kpi owner-only">
              <span className="lab">{t('ltv')}</span>
              <span className="val">{idr(figures.ltv)}</span>
              <span className="tgt">{t('ltv_sub')}</span>
            </div>
          ) : null}
        </div>

        <div className="sec-h rv" style={{ ...rv(3), marginTop: 22 }}>
          <span className="kicker">{t('pipeline')}</span>
          <span className="sp" />
          <span className="note desktop-only">{to('tap_stage')}</span>
        </div>
        <div className="rv" style={rv(4)}><PipeStrip tiles={tiles} mode="link" mini /></div>
      </div>

      <div className="split">
        <div className="sec">
          <div className="sec-h rv" style={rv(5)}><span className="kicker">{t('pillars')}</span></div>
          {pillarRows.length ? (
            <div className="bars rv rv-line" style={rv(6)}>
              {pillarRows.map(p => (
                <div className="bar-row" key={p.label}>
                  <span className="nm">{p.label}</span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: `${Number((p.value * 100n) / pillarMax)}%` }} />
                  </span>
                  <span className="amt">{idr(p.value)}</span>
                </div>
              ))}
            </div>
          ) : <p className="empty">{t('no_revenue')}</p>}
        </div>

        <div className="sec">
          <div className="sec-h rv" style={rv(5)}>
            <span className="kicker">{t('today')}</span>
            <span className="sp" />
            {events.length ? <span className="chip warn"><span className="dot" />{t('open', { count: events.length })}</span> : null}
          </div>
          {events.length ? <div className="rv rv-line" style={rv(6)}><EventFeed rows={events} /></div> : <p className="empty">{t('clear')}</p>}

          <div className="sec-h rv" style={{ ...rv(7), marginTop: 22 }}>
            <span className="kicker">{t('shortcuts')}</span>
            <span className="sp" />
            <span className="note desktop-only">{t('keys')}</span>
          </div>
          <div className="rows rv" style={rv(8)}>
            {owner ? (
              <Link className="row owner-only" href="/console/pricing">
                <span className="ic"><Icon name="tag" /></span>
                <span className="bd"><span className="t1">{t('pricing')}</span><span className="t2">{t('pricing_sub')}</span></span>
                <span className="rt"><Icon name="caret" /></span>
              </Link>
            ) : null}
            <Link className="row" href="/console/invoices">
              <span className="ic"><Icon name="file" /></span>
              <span className="bd">
                <span className="t1">{t('invoices')}</span>
                <span className="t2">{receivable.overN
                  ? t('invoices_sub_overdue', { n: receivable.overN, outstanding: idr(receivable.open) })
                  : t('invoices_sub', { outstanding: idr(receivable.open) })}</span>
              </span>
              <span className="rt"><Icon name="caret" /></span>
            </Link>
            <Link className="row" href="/console/flow">
              <span className="ic"><Icon name="flow" /></span>
              <span className="bd"><span className="t1">{t('flow')}</span><span className="t2">{t('flow_sub')}</span></span>
              <span className="rt"><Icon name="caret" /></span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
