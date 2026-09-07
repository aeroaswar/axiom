import '@/styles/console.css';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { clientRows } from '@/components/console/clients/data';
import { ClientsList } from '@/components/console/clients/list';

export const dynamic = 'force-dynamic';

export default async function ClientsLayout({ children }: { children: React.ReactNode }) {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.clients');
  const rows = await clientRows(session.uid);
  return (
    <>
      <PageTitle title={t('title')} />
      <Suspense><ClientsList rows={rows} /></Suspense>
      {children}
    </>
  );
}
