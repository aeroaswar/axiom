import { getTranslations } from 'next-intl/server';
import { Sheet } from '@/components/shell/sheet';
import { staffSession } from '@/components/console/shared/act';
import { formOptions } from '@/components/console/catalogue/data';
import { NewForms } from '@/components/console/catalogue/new-forms';

export const dynamic = 'force-dynamic';

export default async function NewCataloguePage() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.catalogue');
  const tc = await getTranslations('console.common');
  const { pathways, products } = await formOptions(session.uid);
  return (
    <Sheet backHref="/console/catalogue" closeLabel={tc('close')} kicker={t('new_kicker')} title={t('new')}>
      <NewForms pathways={pathways} products={products} />
    </Sheet>
  );
}
