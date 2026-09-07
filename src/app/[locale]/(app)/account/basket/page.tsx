import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageTitle } from '@/components/shell/shell-client';
import { getBasket } from '@/lib/basket';
import { idr } from '@/lib/money';
import { getDeliveryZones, getRowsForSkus } from '@/lib/site/catalogue';
import { rv } from '@/components/console/shared/reveal';
import { accountSession, accountSites, deliveryForLines } from '@/components/account/data';
import { DestinationSelect, QtyControl, RemoveLine, RequestQuoteForm } from '@/components/account/client-forms';

export const dynamic = 'force-dynamic';

/**
 * The same basket as the public site, with one thing added: the destination per line, chosen where
 * its cost is visible. Delivery is charged per consignment, so the split is a decision the account
 * makes with the figure in front of it rather than a surprise on the invoice. The tariff comes
 * from `public.delivery_zones` and the charge from `axiom.delivery_for_lines`; neither is typed.
 */
export default async function BasketPage() {
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.basket');
  const tc = await getTranslations('common');

  const [basket, sites, zones] = await Promise.all([
    getBasket(),
    accountSites(session.uid, session.accountId),
    getDeliveryZones(),
  ]);

  // cart_items can hold one row per lot and destination; fold them before rendering.
  const merged = new Map<string, { sku: string; qty: number; site_id: string | null }>();
  for (const i of basket.items) {
    const key = `${i.sku}:${i.site_id ?? ''}`;
    const at = merged.get(key);
    if (at) at.qty += i.qty; else merged.set(key, { sku: i.sku, qty: i.qty, site_id: i.site_id });
  }
  const rows = await getRowsForSkus(session.uid, [...new Set([...merged.values()].map(i => i.sku))]);
  const bySku = new Map(rows.map(r => [r.sku, r]));
  // A stable order: a line that moves to another destination must not jump around the list.
  const lines = [...merged.values()].map(i => ({ ...i, row: bySku.get(i.sku)! })).filter(l => l.row)
    .sort((a, b) => a.row.name.localeCompare(b.row.name) || a.row.dose.localeCompare(b.row.dose));

  const legs = lines.length ? await deliveryForLines(session.uid, session.accountId, lines) : [];
  const deliveryKnown = legs.every(l => l.charge_idr !== null);
  const delivery = legs.reduce((a, l) => a + (l.charge_idr ?? 0), 0);

  const priced = lines.filter(l => l.row.price_idr !== null);
  const goods = priced.reduce((a, l) => a + (l.row.price_idr as number) * l.qty, 0);
  const gated = priced.length !== lines.length;
  const base = zones.find(z => z.per_three_idr !== null);
  const multi = sites.length > 1;

  return (
    <section className="screen on account">
      <PageTitle title={t('title')} />

      {!lines.length ? (
        <>
          <div className="sec-h"><span className="kicker">{t('title')}</span></div>
          <p className="empty">{t('empty')}</p>
          <div className="hrow" style={{ marginTop: 22 }}>
            <Link className="btn btn-sm btn-accent" href="/account/shop">{t('title')}</Link>
          </div>
        </>
      ) : (
        <>
          <div className="sec-h rv" style={rv(0)}><span className="kicker">{t('kicker', { count: lines.length })}</span></div>

          <div className="split">
            <section className="sec rv" style={rv(1)}>
              <div className="basketlines">
                {lines.map(l => (
                  <div className="bline" key={`${l.sku}:${l.site_id ?? ''}`}>
                    <div className="who">
                      <span className="nm">{l.row.name}</span>
                      <span className="sub">{l.row.dose} · {l.row.content}{l.row.price_idr !== null ? ` · ${idr(l.row.price_idr)}` : ''}</span>
                      {multi ? <DestinationSelect sku={l.sku} qty={l.qty} siteId={l.site_id} sites={sites} /> : null}
                    </div>
                    <div className="ctl">
                      <QtyControl sku={l.sku} qty={l.qty} siteId={l.site_id} />
                      <span className="amt">{l.row.price_idr === null ? <span className="dim-2">{t('goods_gated')}</span> : idr(l.row.price_idr * l.qty)}</span>
                      <RemoveLine sku={l.sku} siteId={l.site_id} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="sec rv" style={rv(2)}>
              <div className="sec-h"><span className="kicker">{t('delivery')}</span></div>
              <p className="note">{t('delivery_note', { per: base ? idr(base.per_three_idr) : '—', cap: base ? idr(base.cap_idr) : '—' })}</p>
              <div className="delivery-legs" style={{ marginTop: 14 }} data-legs>
                {legs.map(l => (
                  <div className="kv" key={l.site_id ?? l.site_name} data-leg={l.charge_idr === null ? 'pending' : 'priced'}>
                    <span className="k">{l.site_name} · {tc('units', { count: l.units })}</span>
                    <span className="v">{l.charge_idr === null ? tc('rate_pending') : idr(l.charge_idr)}</span>
                  </div>
                ))}
              </div>

              <div className="totals">
                <div className="kv"><span className="k">{t('goods')}</span><span className="v">{priced.length ? idr(goods) : '—'}</span></div>
                <div className="kv"><span className="k">{t('delivery')}</span><span className="v">{deliveryKnown ? idr(delivery) : tc('rate_pending')}</span></div>
                <div className="big-total">
                  <span className="kicker">{t('total_so_far')}</span>
                  <span className="v">{idr(goods + (deliveryKnown ? delivery : 0))}</span>
                </div>
              </div>
              {gated ? <p className="note">{t('goods_gated')}</p> : null}

              <div className="block">
                <RequestQuoteForm />
              </div>
              <p style={{ marginTop: 16 }}>
                <Link className="tlink" href="/account/profile#sites">{t('add_site')}</Link>
              </p>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
