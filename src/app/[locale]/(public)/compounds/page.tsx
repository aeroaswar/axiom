import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Reveal, Stagger } from '@/components/site/reveal';
import { JsonLd } from '@/components/site/json-ld';
import { getCatalogue, getPathways, groupCompounds, pick } from '@/lib/site/catalogue';
import { alternates, breadcrumbLd } from '@/lib/site/seo';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.compounds' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/compounds') };
}

export default async function CompoundIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.compounds');
  const tn = await getTranslations('nav');
  const th = await getTranslations('site.home');
  const tp = await getTranslations('site.products');
  const [rows, pathways] = await Promise.all([getCatalogue(), getPathways()]);
  const research = pathways.filter(p => p.kind === 'peptide');
  const totals = research.reduce((a, p) => ({ compounds: a.compounds + p.compounds, lots: a.lots + p.lots }), { compounds: 0, lots: 0 });
  const others = groupCompounds(rows.filter(r => r.kind !== 'peptide'));

  return (
    <>
      <JsonLd data={breadcrumbLd(locale, [{ name: 'AXIOM', path: '/' }, { name: t('title'), path: '/compounds' }])} />

      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{tn('home')}</Link></span><span>{tn('compounds')}</span></div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
          <p className="tag mono-n" style={{ marginTop: 26 }}>{t('count', { compounds: totals.compounds, lots: totals.lots })}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          <span className="kicker">{t('pathways_kicker')}</span>
          <div className="sp-24" />
          <Stagger className="plist">
            {research.map(p => (
              <Link key={p.slug} href={`/compounds/${p.slug}`} className="prow">
                <span className="no">{p.no}</span>
                <span className="nm">{pick(locale, p.name_en, p.name_id)}</span>
                <span className="sm">{pick(locale, p.summary_en, p.summary_id)}</span>
                <span className="ct"><span className="mono-n">{t('card_lots', { count: p.lots })}</span><Icon name="arrow" className="ar" /></span>
              </Link>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <Reveal as="div" className="split wide">
            <div>
              <span className="kicker">{t('about_kicker')}</span>
              <div className="stmts" style={{ marginTop: 30 }}>
                <div className="stmt"><span className="idx">01</span><div><p>{t('about_1')}</p></div></div>
                <div className="stmt"><span className="idx">02</span><div><p>{t('about_2')}</p></div></div>
                <div className="stmt"><span className="idx">03</span><div><p>{t('about_3')}</p></div></div>
              </div>
            </div>
            <div>
              <span className="kicker">{t('all_kicker')}</span>
              <dl className="dl" style={{ marginTop: 30 }}>
                <div className="r"><dt>{th('meta_compounds')}</dt><dd>{totals.compounds}</dd></div>
                <div className="r"><dt>{th('meta_lots')}</dt><dd>{totals.lots}</dd></div>
                <div className="r"><dt>{th('meta_pathways')}</dt><dd>{research.length}</dd></div>
              </dl>
              <div className="sp-24" />
              <Link href="/price-list" className="tlink">{tn('price_list')} <Icon name="arrow" className="ar" /></Link>
            </div>
          </Reveal>
        </div>
      </section>

      {others.length ? (
        <section className="band">
          <div className="wrap">
            <span className="kicker">{tp('title')}</span>
            <div className="sp-24" />
            <Stagger className="plist">
              {others.map(c => (
                <Link key={c.slug} href={`/products/${c.slug}`} className="prow">
                  <span className="no">{c.pathway.no}</span>
                  <span className="nm">{c.name}</span>
                  <span className="sm">{pick(locale, c.compound_class_en, c.compound_class_id)}</span>
                  <span className="ct"><span className="mono-n">{t('card_lots', { count: c.variants.length })}</span><Icon name="arrow" className="ar" /></span>
                </Link>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}
    </>
  );
}
