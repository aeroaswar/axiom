import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Sheet } from '@/components/shell/sheet';
import { staffSession } from '@/components/console/shared/act';
import { gmFloor, pricingLot } from '@/components/console/pricing/data';
import { PricingSheetBody } from '@/components/console/pricing/sheet-body';

export const dynamic = 'force-dynamic';

export default async function PricingSheet({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  const session = await staffSession();
  if (!session) return null;
  const lot = await pricingLot(session.uid, sku);
  if ('refused' in lot) return null;
  if (!lot.row) notFound();
  const floor = await gmFloor(session.uid);
  const locale = await getLocale();
  const tc = await getTranslations('console.common');
  const r = lot.row;
  return (
    <Sheet backHref="/console/pricing" closeLabel={tc('close')}
      kicker={`${r.pathway_no} · ${locale === 'en' ? r.pathway_en : r.pathway_id_name}`}
      title={`${r.name} · ${r.dose}`}>
      <PricingSheetBody r={r} changes={lot.changes} floor={floor} />
    </Sheet>
  );
}
