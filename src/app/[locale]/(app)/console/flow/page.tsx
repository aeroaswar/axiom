import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { getSettings } from '@/lib/settings';
import { FlowMap } from '@/components/console/flow/screen';

export const dynamic = 'force-dynamic';

export default async function FlowPage() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('commerce.flow');
  const settings = await getSettings();
  return (
    <>
      <PageTitle title={t('title')} />
      <FlowMap quoteDays={settings.quote_valid_days} payDays={settings.payment_terms_days}
        cold={settings.cutoff.cold} ambient={settings.cutoff.ambient} />
    </>
  );
}
