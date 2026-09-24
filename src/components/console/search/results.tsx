import { Fragment } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { Icon } from '@/components/shell/sprite';
import { withRls } from '@/lib/db';

export type Hits = {
  quotes: { id: string; number: string; account: string; state: string; total: string | null }[];
  orders: { id: string; number: string; account: string; state: string; total: string }[];
  accounts: { id: string; name: string; type: string; orders_n: number; ack: string }[];
  variants: { sku: string; name: string; dose: string; pathway_no: string; pathway: string; price_idr: string; available: number }[];
  invoices: { id: string; number: string; account: string; total_idr: string }[];
};

/** One query over the five records the Console holds. `%` is escaped so a stray wildcard cannot widen it. */
export async function search(uid: string, q: string): Promise<Hits> {
  const like = `%${q.replace(/[%_\\]/g, m => '\\' + m)}%`;
  return withRls({ uid }, async tx => ({
    quotes: await tx`
      select q.id::text as id, q.number, a.name as account, axiom.quote_state(q.*) as state,
             (select sum(qi.line_total_idr)::text from public.quote_items qi where qi.quote_id = q.id) as total
      from public.quotes q join public.accounts a on a.id = q.account_id
      where q.number ilike ${like} or a.name ilike ${like}
      order by q.created_at desc limit 6` as unknown as Hits['quotes'],
    orders: await tx`
      select o.id::text as id, o.number, a.name as account, o.state::text as state, o.total_idr::text as total
      from public.orders o join public.accounts a on a.id = o.account_id
      where o.number ilike ${like} or a.name ilike ${like}
      order by o.placed_at desc limit 6` as unknown as Hits['orders'],
    accounts: await tx`
      select a.id, a.name, a.type::text as type, axiom.ack_state_for(a.id) as ack,
             (select count(*)::int from public.orders o where o.account_id = a.id and o.state <> 'cancelled') as orders_n
      from public.accounts a left join public.profiles m on m.id = a.account_manager_id
      where a.name ilike ${like} or a.type::text ilike ${like} or m.full_name ilike ${like}
      order by a.name limit 6` as unknown as Hits['accounts'],
    variants: await tx`
      select v.sku, p.name, v.dose, pw.no as pathway_no, pw.name_en as pathway, v.price_idr, st.available
      from public.product_variants v
      join public.products p on p.id = v.product_id
      join public.pathways pw on pw.id = p.pathway_id
      join public.v_stock st on st.variant_id = v.id
      where p.name ilike ${like} or v.dose ilike ${like} or v.sku ilike ${like}
         or pw.name_en ilike ${like} or pw.name_id ilike ${like}
      order by pw.sort, p.name, v.sort limit 8` as unknown as Hits['variants'],
    invoices: await tx`
      select i.id::text as id, i.number, a.name as account, i.total_idr
      from public.invoices i join public.orders o on o.id = i.order_id join public.accounts a on a.id = o.account_id
      where i.issued_at is not null and (i.number ilike ${like} or a.name ilike ${like})
      order by i.issued_at desc limit 6` as unknown as Hits['invoices'],
  }));
}

/** The matched run, marked in place, so the reader sees why a row is here. */
function Mark({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export async function SearchResults({ hits, q }: { hits: Hits; q: string }) {
  const t = await getTranslations('console.search');
  const ts = await getTranslations('states');
  const ta = await getTranslations('console.clients.ack');
  const tc = await getTranslations('console.common');
  const count = hits.quotes.length + hits.orders.length + hits.accounts.length + hits.variants.length + hits.invoices.length;

  if (!count) return <p className="empty">{t('empty', { q })}</p>;

  return (
    <div className="hits">
      {hits.quotes.length ? (
        <Fragment>
          <div className="sec-h"><span className="kicker">{t('groups.quotes')}</span></div>
          <div className="rows">
            {hits.quotes.map(x => (
              <Link className="row" key={x.id} href={`/console/orders/${x.number}`}>
                <span className="ic"><Icon name="send" /></span>
                <span className="bd">
                  <span className="t1"><Mark text={x.number} q={q} /> · <Mark text={x.account} q={q} /></span>
                  <span className="t2">{ts(`quote.${x.state}`)}</span>
                </span>
                <span className="rt"><span className="amt">{idr(x.total ?? 0)}</span></span>
              </Link>
            ))}
          </div>
        </Fragment>
      ) : null}

      {hits.orders.length ? (
        <Fragment>
          <div className="sec-h"><span className="kicker">{t('groups.orders')}</span></div>
          <div className="rows">
            {hits.orders.map(x => (
              <Link className="row" key={x.id} href={`/console/orders/${x.number}`}>
                <span className="ic"><Icon name="receipt" /></span>
                <span className="bd">
                  <span className="t1"><Mark text={x.number} q={q} /> · <Mark text={x.account} q={q} /></span>
                  <span className="t2">{ts(`order.${x.state}`)}</span>
                </span>
                <span className="rt"><span className="amt">{idr(x.total)}</span></span>
              </Link>
            ))}
          </div>
        </Fragment>
      ) : null}

      {hits.accounts.length ? (
        <Fragment>
          <div className="sec-h"><span className="kicker">{t('groups.accounts')}</span></div>
          <div className="rows">
            {hits.accounts.map(x => (
              <Link className="row" key={x.id} href={`/console/clients/${x.id}`}>
                <span className="ic"><Icon name="users" /></span>
                <span className="bd">
                  <span className="t1"><Mark text={x.name} q={q} /></span>
                  <span className="t2">{tc('orders', { count: x.orders_n })}</span>
                </span>
                <span className="rt">
                  <span className={`chip ${x.ack === 'current' ? 'quiet ok' : x.ack === 'lapsed' ? 'err' : 'warn'}`}>
                    <span className="dot" />{ta(x.ack)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </Fragment>
      ) : null}

      {hits.variants.length ? (
        <Fragment>
          <div className="sec-h"><span className="kicker">{t('groups.variants')}</span></div>
          <div className="rows">
            {hits.variants.map(x => (
              <Link className="row" key={x.sku} href={`/console/catalogue/${x.sku}`}>
                <span className="ic"><Icon name="flask" /></span>
                <span className="bd">
                  <span className="t1"><Mark text={`${x.name} · ${x.dose}`} q={q} /></span>
                  <span className="t2">{x.pathway_no} · <Mark text={x.pathway} q={q} /></span>
                </span>
                <span className="rt"><span className="amt">{idr(x.price_idr)}</span></span>
              </Link>
            ))}
          </div>
        </Fragment>
      ) : null}

      {hits.invoices.length ? (
        <Fragment>
          <div className="sec-h"><span className="kicker">{t('groups.invoices')}</span></div>
          <div className="rows">
            {hits.invoices.map(x => (
              <Link className="row" key={x.id} href={`/console/invoices/${x.number}`}>
                <span className="ic"><Icon name="file" /></span>
                <span className="bd">
                  <span className="t1"><Mark text={x.number} q={q} /></span>
                  <span className="t2"><Mark text={x.account} q={q} /></span>
                </span>
                <span className="rt"><span className="amt">{idr(x.total_idr)}</span></span>
              </Link>
            ))}
          </div>
        </Fragment>
      ) : null}
    </div>
  );
}
