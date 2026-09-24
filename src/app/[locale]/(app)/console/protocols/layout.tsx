import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { protocolRows } from '@/components/console/protocols/data';
import { ProtocolsList } from '@/components/console/protocols/list';

export const dynamic = 'force-dynamic';

export default async function ProtocolsLayout({ children }: { children: React.ReactNode }) {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.protocols');
  const rows = await protocolRows(session.uid);
  return (
    <>
      <PageTitle title={t('title')} />
      <Suspense><ProtocolsList rows={rows} /></Suspense>
      {children}
    </>
  );
}
