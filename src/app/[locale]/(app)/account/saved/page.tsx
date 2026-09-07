import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageTitle } from '@/components/shell/shell-client';
import { Icon } from '@/components/shell/sprite';
import { idr } from '@/lib/money';
import { getRowsForSkus } from '@/lib/site/catalogue';
import { rv } from '@/components/console/shared/reveal';
import { accountSession } from '@/components/account/data';
import { getSaved } from '@/components/account/saved';
import { AddToBasket, SaveToggle } from '@/components/account/client-forms';

export const dynamic = 'force-dynamic';

/**
 * Saved compounds. The list is a cookie written by a server action, so it survives a reload on
 * this browser and nothing more; a `saved_items` table is its durable home and the note says so
 * rather than implying the account remembers.
 */
export default async function SavedPage() {
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.saved');
  const ts = await getTranslations('account.shop');
  const skus = await getSaved();
  const rows = skus.length ? await getRowsForSkus(session.uid, skus) : [];
  const order = new Map(skus.map((s, i) => [s, i]));
  rows.sort((a, b) => (order.get(a.sku) ?? 0) - (order.get(b.sku) ?? 0));

  return (
    <section className="screen on account">
      <PageTitle title={t('title')} />
      <div className="sec-h rv" style={rv(0)}><span className="kicker">{t('kicker', { count: rows.length })}</span></div>

      {rows.length ? (
        <div className="rows rv" style={rv(1)}>
          {rows.map(r => (
            <div className="row rowa" key={r.sku}>
              <span className="ic"><Icon name="bookmark-f" /></span>
              <span className="bd">
                <Link className="t1 lk" href={`/account/shop/${r.slug}`}>{r.name} · {r.dose}</Link>
                <span className="t2">{r.pathway_no} · {r.content}</span>
              </span>
              <span className="rt"><span className="amt">{r.price_idr === null ? ts('gated') : idr(r.price_idr)}</span></span>
              <span className="act">
                {r.available > 0 ? <AddToBasket sku={r.sku} label={ts('add')} done={ts('added')} /> : null}
                <SaveToggle sku={r.sku} saved />
              </span>
            </div>
          ))}
        </div>
      ) : <p className="empty">{t('empty')}</p>}

      <p className="note rv" style={{ ...rv(2), marginTop: 18 }}>{t('note')}</p>
    </section>
  );
}
