import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Sheet } from '@/components/shell/sheet';
import { getSettings } from '@/lib/settings';
import { staffSession } from '@/components/console/shared/act';
import { productBySlug } from '@/components/console/content/data';
import { ContentEditor } from '@/components/console/content/editor';

export const dynamic = 'force-dynamic';

export default async function ContentSheet({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await staffSession();
  if (!session) return null;
  const found = await productBySlug(session.uid, slug);
  if (!found) notFound();
  const settings = await getSettings();
  const locale = await getLocale();
  const tc = await getTranslations('console.common');
  const { product, references, lots } = found;
  return (
    <Sheet backHref="/console/content" closeLabel={tc('close')}
      kicker={`${product.pathway_no} · ${locale === 'en' ? product.name_en : product.name_id}`}
      title={product.name}>
      <ContentEditor p={product} references={references} lots={lots} settings={settings} />
    </Sheet>
  );
}
