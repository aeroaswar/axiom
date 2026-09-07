import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { accountSession, acknowledgement } from '@/components/account/data';
import { getSaved } from '@/components/account/saved';
import { ShopGrid } from '@/components/account/shop';

export const dynamic = 'force-dynamic';

/**
 * The catalogue is the layout and the product sheet is its child route, so opening a compound
 * docks a panel beside the grid on a desktop and rises as a bottom sheet on a phone, without the
 * grid re-rendering or losing its place.
 */
export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.shop');
  const [ack, saved] = await Promise.all([acknowledgement(session.uid, session.accountId), getSaved()]);

  return (
    <>
      <PageTitle title={t('title')} />
      <section className="screen on account">
        <div className="sec-h"><span className="kicker">{t('kicker')}</span></div>
        <Suspense><ShopGrid uid={session.uid} ack={ack} saved={saved} /></Suspense>
      </section>
      {children}
    </>
  );
}
