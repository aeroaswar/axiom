import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { JsonLd } from '@/components/site/json-ld';
import { CoaCards, filterCoas, type CoaQuery } from '@/components/site/coa-cards';
import { getCoas, pick } from '@/lib/site/catalogue';
import { getSettings } from '@/lib/settings';
import { alternates, breadcrumbLd } from '@/lib/site/seo';

export const revalidate = 60;

type Params = Promise<{ locale: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.coas' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/coas') };
}

/** The certificate library: every certificate the policy publishes, searchable by compound or lot. */
export default async function CoasPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const q: CoaQuery = { q: one(sp.q) };
  const t = await getTranslations('site.coas');
  const tn = await getTranslations('nav');
  const ts = await getTranslations('site.common');
  const [all, settings] = await Promise.all([getCoas(), getSettings()]);
  const rows = filterCoas(all, q);
  const method = settings.verification.method;
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const compounds = new Set(all.map(c => c.slug).filter(Boolean)).size;
  return (
    <>
      <JsonLd data={breadcrumbLd(locale, [{ name: 'AXIOM', path: '/' }, { name: t('title'), path: '/coas' }])} />
      <section className="page-hero" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div className="wrap">
          <div className="crumbs" style={{ justifyContent: 'center' }}><span><Link href="/">{ts('home')}</Link></span><span>{tn('coas')}</span></div>
          <div className="chead">
            <h1 style={{ fontSize: 'clamp(36px,5vw,64px)' }}>{t('title').replace(t('title_em'), '').trim()} <em>{t('title_em')}</em></h1>
            <p className="lead">{t('lead')}</p>
            <span className="pill"><Icon name="check" />{t('verified_pill', { method, threshold })}</span>
            <p style={{ marginTop: 18 }}><Link href="/how-to-read-a-coa" className="tlink">{t('how')} <Icon name="arrow" className="ar" /></Link></p>
          </div>
        </div>
      </section>
      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap" style={{ paddingTop: 0 }}>
          <CoaCards rows={rows} q={q} locale={locale} total={all.length} compounds={compounds} method={method} threshold={threshold}
            purityLabel={threshold} ruo={pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)} />
        </div>
      </section>
    </>
  );
}
