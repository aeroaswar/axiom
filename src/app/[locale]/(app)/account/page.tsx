import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';

export default async function AccountHome() {
  const t = await getTranslations('shell');
  return (
    <section className="screen on">
      <PageTitle title={t('orders')} />
      <p className="note">{t('nothing_open')}</p>
    </section>
  );
}
