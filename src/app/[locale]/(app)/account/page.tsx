import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { getSettings } from '@/lib/settings';
import { getBasket } from '@/lib/basket';
import { accountSession } from '@/components/account/data';
import { AccountHome } from '@/components/account/home';

export const dynamic = 'force-dynamic';

/** What needs you, what is moving, what is done — the spine from the buyer's side. */
export default async function AccountHomePage() {
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.home');
  const [settings, basket] = await Promise.all([getSettings(), getBasket()]);

  return (
    <section className="screen on account">
      <PageTitle title={t('title')} />
      <AccountHome uid={session.uid} accountId={session.accountId} cutoff={settings.cutoff}
        basketCount={basket.items.length} />
    </section>
  );
}
