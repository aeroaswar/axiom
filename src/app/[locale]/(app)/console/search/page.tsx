import '@/styles/console.css';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { search, SearchResults } from '@/components/console/search/results';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.search');
  const query = q.trim();
  const hits = query.length >= 2 ? await search(session.uid, query) : null;

  return (
    <section className="screen on">
      <PageTitle title={t('title')} />
      <p className="eyebrow" style={{ marginBottom: 18 }}>
        {query.length >= 2 ? t('results', { q: query }) : t('kicker')}
      </p>
      {hits ? <SearchResults hits={hits} q={query} /> : <p className="empty">{t('hint')}</p>}
    </section>
  );
}
