import '@/styles/console.css';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { contentRows } from '@/components/console/content/data';
import { ContentList } from '@/components/console/content/list';

export const dynamic = 'force-dynamic';

export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.content');
  const rows = await contentRows(session.uid);
  return (
    <>
      <PageTitle title={t('title')} />
      <Suspense><ContentList rows={rows} /></Suspense>
      {children}
    </>
  );
}
