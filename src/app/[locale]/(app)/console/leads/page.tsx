import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { leadRows } from '@/components/console/leads/data';
import { LeadsList } from '@/components/console/leads/list';

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.leads');
  const rows = await leadRows(session.uid);
  return (
    <>
      <PageTitle title={t('title')} />
      <LeadsList rows={rows} />
    </>
  );
}
