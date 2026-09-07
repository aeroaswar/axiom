import '@/styles/console.css';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { catalogueRows } from '@/components/console/catalogue/data';
import { CatalogueList } from '@/components/console/catalogue/list';

export const dynamic = 'force-dynamic';

/**
 * Master-detail. The list lives in the layout, so opening a lot docks a panel beside a list that
 * never re-renders, never loses its scroll and never replays its reveal.
 */
export default async function CatalogueLayout({ children }: { children: React.ReactNode }) {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.catalogue');
  const rows = await catalogueRows(session.uid);
  return (
    <>
      <PageTitle title={t('title')} />
      <Suspense><CatalogueList rows={rows} /></Suspense>
      {children}
    </>
  );
}
