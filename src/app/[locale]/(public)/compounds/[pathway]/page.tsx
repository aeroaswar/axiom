import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Stagger } from '@/components/site/reveal';
import { JsonLd } from '@/components/site/json-ld';
import { getCompoundsInPathway, getPathway, getPathways, pick } from '@/lib/site/catalogue';
import { alternates, breadcrumbLd, definedTermSetLd, describe } from '@/lib/site/seo';

export const revalidate = 60;

export async function generateStaticParams() {
  const pathways = await getPathways();
  return pathways.filter(p => p.kind === 'peptide').map(p => ({ pathway: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; pathway: string }> }): Promise<Metadata> {
  const { locale, pathway } = await params;
  const p = await getPathway(pathway);
  if (!p) return {};
  const t = await getTranslations({ locale, namespace: 'site.compounds' });
  const name = pick(locale, p.name_en, p.name_id);
  return {
    title: t('pathway_title', { name }),
    description: describe(pick(locale, p.summary_en, p.summary_id)),
    alternates: alternates(locale, `/compounds/${p.slug}`),
  };
}

export default async function PathwayPage({ params }: { params: Promise<{ locale: string; pathway: string }> }) {
  const { locale, pathway } = await params;
  setRequestLocale(locale);
  const p = await getPathway(pathway);
  if (!p || p.kind !== 'peptide') notFound();
  const [compounds, pathways] = await Promise.all([getCompoundsInPathway(pathway), getPathways()]);
  const t = await getTranslations('site.compounds');
  const tn = await getTranslations('nav');
  const name = pick(locale, p.name_en, p.name_id);
  const others = pathways.filter(x => x.kind === 'peptide' && x.slug !== p.slug);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(locale, [{ name: 'AXIOM', path: '/' }, { name: tn('compounds'), path: '/compounds' }, { name, path: `/compounds/${p.slug}` }]),
          definedTermSetLd(locale, {
            name,
            description: pick(locale, p.summary_en, p.summary_id),
            path: `/compounds/${p.slug}`,
            terms: compounds.map(c => ({ name: c.name, path: `/compounds/${p.slug}/${c.slug}` })),
          }),
        ]}
      />

      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <span><Link href="/">{tn('home')}</Link></span>
            <span><Link href="/compounds">{tn('compounds')}</Link></span>
            <span>{name}</span>
          </div>
          <span className="kicker mono-n">{p.no}</span>
          <h1 style={{ marginTop: 14 }}>{name}</h1>
          <p className="lead">{pick(locale, p.summary_en, p.summary_id)}</p>
          <p className="tag mono-n" style={{ marginTop: 26 }}>{t('count', { compounds: p.compounds, lots: p.lots })}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          <Stagger className="pgrid">
            {compounds.map((c, i) => {
              return (
                <Link key={c.slug} href={`/compounds/${p.slug}/${c.slug}`} className="pcard">
                  <span className="no mono-n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="nm">{c.name}</span>
                  <span className="cls">{pick(locale, c.compound_class_en, c.compound_class_id)}</span>
                  <span className="doses">
                    {c.variants.map(v => <span className="dose" key={v.variant_id}>{v.dose}</span>)}
                  </span>
                </Link>
              );
            })}
          </Stagger>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <span className="kicker">{t('other_pathways')}</span>
          <div className="sp-24" />
          <Stagger className="plist">
            {others.map(o => (
              <Link key={o.slug} href={`/compounds/${o.slug}`} className="prow">
                <span className="no">{o.no}</span>
                <span className="nm">{pick(locale, o.name_en, o.name_id)}</span>
                <span className="sm">{pick(locale, o.summary_en, o.summary_id)}</span>
                <span className="ct"><span className="mono-n">{t('card_lots', { count: o.lots })}</span><Icon name="arrow" className="ar" /></span>
              </Link>
            ))}
          </Stagger>
        </div>
      </section>
    </>
  );
}
