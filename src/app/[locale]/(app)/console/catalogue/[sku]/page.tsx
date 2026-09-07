import { notFound } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Sheet } from '@/components/shell/sheet';
import { staffSession } from '@/components/console/shared/act';
import { ledger, variantBySku } from '@/components/console/catalogue/data';
import { VariantSheetBody } from '@/components/console/catalogue/sheet-body';

export const dynamic = 'force-dynamic';

export default async function VariantSheet({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  const session = await staffSession();
  if (!session) return null;
  const v = await variantBySku(session.uid, sku);
  if (!v) notFound();
  const moves = await ledger(session.uid, v.variant_id);
  const locale = await getLocale();
  const tc = await getTranslations('console.common');
  const t = await getTranslations('console.catalogue');
  // The sheet's one solid object: the owner's route to the number this screen may not set.
  const footer = session.role === 'owner'
    ? <Link className="btn btn-sm btn-accent" href={`/console/pricing/${v.sku}`} scroll={false}>{t('sheet.set_in_pricing')}</Link>
    : undefined;
  return (
    <Sheet backHref="/console/catalogue" closeLabel={tc('close')} footer={footer}
      kicker={`${v.pathway_no} · ${locale === 'en' ? v.name_en : v.name_id}`}
      title={`${v.product_name} · ${v.dose}`}>
      <VariantSheetBody v={v} moves={moves} />
    </Sheet>
  );
}
