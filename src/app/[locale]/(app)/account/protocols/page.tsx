import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageTitle } from '@/components/shell/shell-client';
import { Icon } from '@/components/shell/sprite';
import { rv } from '@/components/console/shared/reveal';
import { accountSession } from '@/components/account/data';
import { myProtocols } from '@/components/account/protocols';

export const dynamic = 'force-dynamic';

/** The account's own cards. A withdrawn card is not listed: it has stopped being a card. */
export default async function AccountProtocols() {
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.protocols');
  const rows = await myProtocols(session.uid, session.accountId);

  return (
    <section className="screen on account">
      <PageTitle title={t('title')} />
      <div className="sec-h rv" style={rv(0)}><span className="kicker">{t('kicker', { count: rows.length })}</span></div>
      {rows.length ? (
        <div className="rows rv" style={rv(1)}>
          {rows.map(p => (
            <Link className="row" key={p.id} href={`/account/protocols/${p.id}`}>
              <span className="ic"><Icon name="file" /></span>
              <span className="bd">
                <span className="t1">{p.title || p.subject_label}</span>
                <span className="t2">{p.number} · {t('items_n', { n: p.items_n })}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : <p className="empty">{t('empty')}</p>}
      <p className="note rv" style={{ ...rv(2), marginTop: 16 }}>{t('note')}</p>
    </section>
  );
}
