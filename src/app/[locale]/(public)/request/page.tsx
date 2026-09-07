import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { QtyControl, RemoveLine, DestinationSelect } from '@/components/site/basket-controls';
import { AccountRequestForm, LeadRequestForm } from '@/components/site/request-forms';
import { getBasket } from '@/lib/basket';
import { getSession } from '@/lib/auth';
import { getDeliveryZones, getRowsForSkus, pick } from '@/lib/site/catalogue';
import { getAccountSites, getDeliveryForLines } from '@/lib/site/request';
import { alternates, NOINDEX } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';
import { idr } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.request' });
  return { title: t('title'), description: t('description'), robots: NOINDEX, alternates: alternates(locale, '/request') };
}

export default async function RequestPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.request');
  const tc = await getTranslations('common');
  const ts = await getTranslations('site.common');
  const tn = await getTranslations('nav');

  const [session, basket, zones, settings] = await Promise.all([getSession(), getBasket(), getDeliveryZones(), getSettings()]);
  const skus = basket.items.map(i => i.sku);
  const rows = await getRowsForSkus(session?.uid ?? null, skus);
  const bySku = new Map(rows.map(r => [r.sku, r]));
  const lines = basket.items
    .map(i => ({ ...i, row: bySku.get(i.sku) }))
    .filter(l => l.row);

  const sites = session?.uid && session.accountId ? await getAccountSites(session.uid, session.accountId) : [];
  const multiSite = sites.length > 1;
  const delivery = session?.uid && session.accountId && lines.length
    ? await getDeliveryForLines(session.uid, session.accountId, lines.map(l => ({ sku: l.sku, qty: l.qty, site_id: l.site_id })))
    : [];
  const deliveryTotal = delivery.every(d => d.charge_idr !== null)
    ? delivery.reduce((a, d) => a + (d.charge_idr ?? 0), 0)
    : null;

  const priced = lines.filter(l => l.row!.price_idr !== null);
  const goods = priced.reduce((a, l) => a + (l.row!.price_idr as number) * l.qty, 0);
  const partial = priced.length !== lines.length;
  const base = zones.find(z => z.per_three_idr !== null);
  const per = base ? idr(base.per_three_idr) : '—';
  const cap = base ? idr(base.cap_idr) : '—';

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{ts('home')}</Link></span><span>{tn('request')}</span></div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          {!lines.length ? (
            <div style={{ paddingTop: 20 }}>
              <h2 style={{ fontSize: 'clamp(24px,3vw,36px)' }}>{t('empty_title')}</h2>
              <p className="lead" style={{ marginTop: 16 }}>{t('empty_body')}</p>
              <div className="acts" style={{ marginTop: 32 }}>
                <Link href="/compounds" className="btn btn-solid">{t('empty_cta')}</Link>
                <Link href="/price-list" className="tlink">{t('empty_prices')} <Icon name="arrow" className="ar" /></Link>
              </div>
            </div>
          ) : (
            <div className="req">
              {/* ------------------------------------------------------- the lines */}
              <div>
                <span className="kicker">{t('lines')}</span>
                {multiSite ? <p className="note" style={{ marginTop: 12 }}>{t('sites_note')}</p> : null}
                <div style={{ marginTop: 18, borderTop: '1px solid var(--line)' }}>
                  {lines.map(l => {
                    const r = l.row!;
                    const price = r.price_idr;
                    return (
                      <div className="req-line" key={`${l.sku}:${l.site_id ?? ''}`}>
                        <div>
                          <div className="nm">{r.name}</div>
                          <div className="sub">{r.dose} · {r.content}{price !== null ? ` · ${idr(price)}` : ''}</div>
                          {multiSite ? <DestinationSelect sku={l.sku} qty={l.qty} siteId={l.site_id} sites={sites} /> : null}
                        </div>
                        <div className="ctl">
                          <QtyControl sku={l.sku} qty={l.qty} siteId={l.site_id} />
                          <span className="amt">{price !== null ? idr(price * l.qty) : <span className="gated">{ts('gated_cell')}</span>}</span>
                          <RemoveLine sku={l.sku} siteId={l.site_id} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ------------------------------------------------------ the summary */}
              <aside className="req-side">
                <div className="kv"><span className="k">{t('goods')}</span><span className="v">{priced.length ? idr(goods) : ts('gated_cell')}</span></div>
                {partial ? <p className="note" style={{ marginTop: 10 }}>{t('goods_partial')}</p> : null}

                <div className="sp-24" />
                <span className="kicker">{t('delivery')}</span>
                <p className="note" style={{ marginTop: 12 }}>{t('delivery_lead', { per, cap })}</p>
                {delivery.length ? (
                  <div style={{ marginTop: 16 }}>
                    {delivery.map(d => (
                      <div className="kv" key={d.site_id ?? d.site_name}>
                        <span className="k">{t('delivery_row', { name: d.site_name, units: d.units })}</span>
                        <span className="v">{d.charge_idr === null ? tc('rate_pending') : idr(d.charge_idr)}</span>
                      </div>
                    ))}
                    <div className="kv"><span className="k">{t('delivery_total')}</span><span className="v">{deliveryTotal === null ? tc('rate_pending') : idr(deliveryTotal)}</span></div>
                  </div>
                ) : null}

                <div className="sp-44" />
                {session?.accountId ? <AccountRequestForm account={session.name || tn('account')} /> : <LeadRequestForm />}

                <div className="sp-24" />
                <div className="ruo">{pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)}</div>
                <p style={{ marginTop: 18 }}>
                  <a className="tlink" href={`https://wa.me/${settings.whatsapp.number}`}>{tc('whatsapp')} <Icon name="arrow" className="ar" /></a>
                </p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
