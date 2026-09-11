import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { JsonLd } from '@/components/site/json-ld';
import { CoaTable, filterCoas, type CoaQuery } from '@/components/site/coa-table';
import { getCoas, getPathways } from '@/lib/site/catalogue';
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
  const q: CoaQuery = { q: one(sp.q), pathway: one(sp.pathway) };
  const t = await getTranslations('site.coas');
  const tn = await getTranslations('nav');
  const ts = await getTranslations('site.common');
  const [all, pathways] = await Promise.all([getCoas(), getPathways()]);
  const rows = filterCoas(all, q);
  return (
    <>
      <JsonLd data={breadcrumbLd(locale, [{ name: 'AXIOM', path: '/' }, { name: t('title'), path: '/coas' }])} />
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{ts('home')}</Link></span><span>{tn('coas')}</span></div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
          <p style={{ marginTop: 22 }}><Link href="/how-to-read-a-coa" className="tlink">{t('how')} <Icon name="arrow" className="ar" /></Link></p>
        </div>
      </section>
      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap" style={{ paddingTop: 0 }}>
          <CoaTable rows={rows} q={q} pathways={pathways} locale={locale} total={all.length} />
        </div>
      </section>
    </>
  );
}
