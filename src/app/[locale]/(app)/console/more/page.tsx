import '@/styles/console.css';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { PageTitle } from '@/components/shell/shell-client';
import { Icon } from '@/components/shell/sprite';
import { signOutAction } from '@/app/[locale]/(public)/sign-in/actions';
import { staffSession } from '@/components/console/shared/act';
import { withRls } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Counts = { variants: number; stockouts: number; lots: number; ack_due: number; products: number; published: number };

/**
 * The phone's fifth tab. Nothing in the Console may exist only behind the desktop rail, so every
 * screen is here — and every subtitle is counted from the tables as they stand, never typed.
 */
export default async function MorePage() {
  const session = await staffSession();
  if (!session) return null;
  const t = await getTranslations('console.more');
  const owner = session.role === 'owner';

  const [c] = await withRls({ uid: session.uid }, tx => tx<Counts[]>`
    select
      (select count(*)::int from public.product_variants where is_active) as variants,
      (select count(*)::int from public.v_stock s join public.product_variants v on v.id = s.variant_id
        where v.is_active and s.available <= 0) as stockouts,
      (select count(*)::int from public.product_variants v join public.products p on p.id = v.product_id
        where p.kind = 'peptide' and v.is_active) as lots,
      (select count(*)::int from public.accounts a where axiom.ack_state_for(a.id) <> 'current') as ack_due,
      (select count(*)::int from public.products) as products,
      (select count(*)::int from public.products where is_published) as published`);

  const row = (href: string, icon: string, title: string, sub: string) => (
    <Link className="row" href={href} key={href}>
      <span className="ic"><Icon name={icon} /></span>
      <span className="bd"><span className="t1">{title}</span><span className="t2">{sub}</span></span>
      <span className="rt"><Icon name="caret" /></span>
    </Link>
  );

  return (
    <section className="screen on">
      <PageTitle title={t('title')} />
      <div className="stack">
        <div>
          <div className="sec-h"><span className="kicker">{t('operate')}</span></div>
          <div className="rows">
            {row('/console/catalogue', 'flask', t('catalogue'), t('catalogue_sub', { count: c.variants, stockouts: c.stockouts }))}
            {owner ? row('/console/pricing', 'tag', t('pricing'), t('pricing_sub', { count: c.lots })) : null}
            {row('/console/invoices', 'file', t('invoices'), t('invoices_sub'))}
          </div>
        </div>

        <div>
          <div className="sec-h"><span className="kicker">{t('relationships')}</span></div>
          <div className="rows">
            {row('/console/clients?filter=attention', 'funnel', t('ack_due'), t('ack_due_sub', { count: c.ack_due }))}
            {row('/console/content', 'pen', t('content'), t('content_sub', { published: c.published, total: c.products }))}
          </div>
        </div>

        <div>
          <div className="sec-h"><span className="kicker">{t('settings')}</span></div>
          <div className="rows">
            {row('/console/flow', 'flow', t('flow'), t('flow_sub'))}
            {row('/console/settings', 'user', t('settings_page'), t('settings_sub'))}
          </div>
        </div>

        <form action={signOutAction}>
          <button className="btn btn-sm" type="submit"><Icon name="signout" />{t('sign_out')}</button>
        </form>
      </div>
    </section>
  );
}
