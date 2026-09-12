import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { JsonLd } from '@/components/site/json-ld';
import { ShopCard } from '@/components/site/shop-card';
import { Stagger } from '@/components/site/reveal';
import { getCatalogue, groupCompounds } from '@/lib/site/catalogue';
import { getSettings } from '@/lib/settings';
import { alternates, breadcrumbLd } from '@/lib/site/seo';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.merch' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/merch') };
}

/** The merch collection: apparel and everyday carry, priced openly, one-time only. */
export default async function MerchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.merch');
  const tn = await getTranslations('nav');
  const ts = await getTranslations('site.common');
  const [rows, settings, tc] = await Promise.all([getCatalogue(), getSettings(), getTranslations('common')]);
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const ruoShort = tc('ruo_short');
  const apparel = groupCompounds(rows.filter(r => r.kind === 'apparel'));
  const devices = groupCompounds(rows.filter(r => r.kind === 'device'));
  return (
    <>
      <JsonLd data={breadcrumbLd(locale, [{ name: 'AXIOM', path: '/' }, { name: t('title'), path: '/merch' }])} />
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{ts('home')}</Link></span><span>{tn('merch')}</span></div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
        </div>
      </section>
      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap" style={{ paddingTop: 44 }}>
          {apparel.length ? (
            <Stagger className="pgrid cards">
              {apparel.map(c => <ShopCard key={c.slug} c={c} locale={locale} purity={threshold} ruo={ruoShort} ppn={Number(settings.ppn_rate)} />)}
            </Stagger>
          ) : <p className="lead">{t('empty')}</p>}
          {devices.length ? (
            <>
              <div className="sp-44" />
              <div className="sec-head" style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 'clamp(22px,2.6vw,30px)' }}>{t('devices')}</h2>
                <Link href={{ pathname: '/products', query: { kind: 'device' } }} className="tlink">{tn('shop')} <Icon name="arrow" className="ar" /></Link>
              </div>
              <div className="pgrid cards">
                {devices.map(c => <ShopCard key={c.slug} c={c} locale={locale} purity={threshold} ruo={ruoShort} ppn={Number(settings.ppn_rate)} />)}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </>
  );
}
