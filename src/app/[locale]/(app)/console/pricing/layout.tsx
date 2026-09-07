import '@/styles/console.css';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { staffSession } from '@/components/console/shared/act';
import { gmFloor, pricingBook } from '@/components/console/pricing/data';
import { PricingScreen } from '@/components/console/pricing/screen';

export const dynamic = 'force-dynamic';

/**
 * Owner only, at the database. An ops session is refused by the policy on `variant_costs`; the
 * refusal is rendered as the owner-only state, never as a blank card and never as an error page.
 */
export default async function PricingLayout({ children }: { children: React.ReactNode }) {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.pricing');
  const book = await pricingBook(session.uid);
  if ('refused' in book) {
    return (
      <section className="screen on">
        <PageTitle title={t('title')} />
        <div className="empty">{t('gated')}</div>
      </section>
    );
  }
  const floor = await gmFloor(session.uid);
  return (
    <>
      <PageTitle title={t('title')} />
      <Suspense><PricingScreen rows={book.rows} floor={floor} /></Suspense>
      {children}
    </>
  );
}
