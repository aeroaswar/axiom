import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageTitle } from '@/components/shell/shell-client';
import { Icon } from '@/components/shell/sprite';
import { idr } from '@/lib/money';
import { accountSession, searchAccount, type Hit } from '@/components/account/data';
import { StateChip, chipToneFor } from '@/components/account/ui';

export const dynamic = 'force-dynamic';

const ICONS: Record<Hit['kind'], string> = { quote: 'send', order: 'receipt', invoice: 'file', product: 'flask' };

/** Over this account's own quotes, orders and invoices, and the catalogue it is allowed to see. */
export default async function AccountSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.search');
  const query = q.trim();
  const hits = query.length >= 2 ? await searchAccount(session.uid, session.accountId, query) : null;

  const groups: { key: 'quotes' | 'orders' | 'invoices' | 'catalogue'; kind: Hit['kind'] }[] = [
    { key: 'quotes', kind: 'quote' }, { key: 'orders', kind: 'order' },
    { key: 'invoices', kind: 'invoice' }, { key: 'catalogue', kind: 'product' },
  ];

  return (
    <section className="screen on account">
      <PageTitle title={t('title')} />
      <p className="eyebrow" style={{ marginBottom: 18 }}>{t('placeholder')}</p>

      {!hits ? <p className="empty">{t('prompt')}</p>
        : hits.length === 0 ? <p className="empty">{t('empty', { q: query })}</p>
          : groups.map(g => {
            const rows = hits.filter(h => h.kind === g.kind);
            if (!rows.length) return null;
            return (
              <section className="sec" key={g.key}>
                <div className="sec-h"><span className="kicker">{t(g.key)}</span></div>
                <div className="rows">
                  {rows.map(h => (
                    <Link className="row" key={`${h.kind}-${h.ref}`} href={h.href}>
                      <span className="ic"><Icon name={ICONS[h.kind]} /></span>
                      <span className="bd">
                        <span className="t1">{h.title}</span>
                        <span className="t2">{h.kind === 'product' ? h.sub : ''}</span>
                      </span>
                      <span className="rt">
                        <span className="amt">{idr(h.amount)}</span>
                        {h.kind === 'order' || h.kind === 'quote'
                          ? <StateChip state={h.sub} tone={chipToneFor(h.sub)} /> : null}
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
    </section>
  );
}
