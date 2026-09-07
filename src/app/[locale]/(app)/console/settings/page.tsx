import '@/styles/console.css';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { settingsFor } from '@/components/console/settings/data';
import { SettingsScreen } from '@/components/console/settings/screen';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.settings');
  const { map, zones, staff } = await settingsFor(session.uid);
  return (
    <>
      <PageTitle title={t('title')} />
      <SettingsScreen session={session} map={map} zones={zones} staff={staff} />
    </>
  );
}
