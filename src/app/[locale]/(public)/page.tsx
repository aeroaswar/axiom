import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { HeroMount } from '@/components/site/hero-mount';
import { Reveal, Stagger } from '@/components/site/reveal';
import { JsonLd } from '@/components/site/json-ld';
import { getCounts, getPathways, pick } from '@/lib/site/catalogue';
import { alternates, organizationLd } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.home' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/') };
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.home');
  const tc = await getTranslations('common');
  const tn = await getTranslations('nav');
  const [counts, pathways, settings] = await Promise.all([getCounts(), getPathways(), getSettings()]);
  const research = pathways.filter(p => p.kind === 'peptide');
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const method = settings.verification.method;

  return (
    <>
      <JsonLd data={organizationLd(locale, { name: 'AXIOM', description: tc('boilerplate'), whatsapp: settings.whatsapp.number })} />
      <HeroMount />

      {/* ------------------------------------------------------------- hero */}
      <section className="hero">
        <div className="wrap hero-in">
          <span className="kicker">{t('kicker')}</span>
          <h1>{tc('tagline')}</h1>
          <p className="lead">{t('lead')}</p>
          <div className="hero-cta">
            <Link href="/request" className="btn btn-solid">{t('cta_request')}</Link>
            <Link href="/compounds" className="tlink">{t('cta_guide')} <Icon name="arrow" className="ar" /></Link>
          </div>
        </div>
        <div className="hero-meta">
          <div className="wrap">
            <div className="m"><div className="k">{t('meta_compounds')}</div><div className="v mono-n">{counts.compounds}</div></div>
            <div className="m"><div className="k">{t('meta_lots')}</div><div className="v mono-n">{counts.lots}</div></div>
            <div className="m"><div className="k">{t('meta_pathways')}</div><div className="v mono-n">{counts.pathways}</div></div>
            <div className="m"><div className="k">{t('meta_purity')}</div><div className="v mono-n">{threshold}</div></div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- 01 position */}
      <section className="band" id="position">
        <div className="wrap">
          <Reveal as="div" className="shead duo">
            <span className="no">{t('pos_no')}</span>
            <div>
              <span className="kicker k">{t('pos_kicker')}</span>
              <h2>{t('pos_title')}</h2>
              <p>{t('pos_body')}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------- 02 standard */}
      <section className="band" id="standard">
        <div className="wrap">
          <Reveal as="div" className="shead duo">
            <span className="no">{t('std_no')}</span>
            <div>
              <span className="kicker k">{t('std_kicker')}</span>
              <h2>{t('std_title')}</h2>
              <p>{t('std_body')}</p>
            </div>
          </Reveal>
          <Stagger className="stmts">
            <div className="stmt">
              <span className="idx">01</span>
              <div><h3>{t('std_purity_t', { method })}</h3><p>{t('std_purity_b', { method, threshold })}</p></div>
              <div className="fig mono-n">{threshold}<small>{t('meta_purity')}</small></div>
            </div>
            <div className="stmt">
              <span className="idx">02</span>
              <div><h3>{t('std_coa_t')}</h3><p>{t('std_coa_b')}</p></div>
              <div className="fig mono-n">{counts.lots}<small>{t('meta_lots')}</small></div>
            </div>
            <div className="stmt">
              <span className="idx">03</span>
              <div><h3>{t('std_cold_t')}</h3><p>{t('std_cold_b')}</p></div>
            </div>
          </Stagger>
          <div className="sp-44" />
          <Link href="/standard" className="tlink">{t('std_link')} <Icon name="arrow" className="ar" /></Link>
        </div>
      </section>

      {/* --------------------------------------------------------- 03 pillars */}
      <section className="band" id="pillars">
        <div className="wrap">
          <Reveal as="div" className="shead duo">
            <span className="no">{t('pil_no')}</span>
            <div>
              <span className="kicker k">{t('pil_kicker')}</span>
              <h2>{t('pil_title')}</h2>
              <p>{t('pil_body')}</p>
            </div>
          </Reveal>

          <Stagger className="pillars">
            <div className="lead-cell">
              <div>
                <span className="no">01</span>
                <h3>{t('pil_peptide')}</h3>
                <p className="proof">{t('pil_peptide_proof', { compounds: counts.compounds, pathways: counts.pathways, lots: counts.lots })}</p>
              </div>
              <div style={{ marginTop: 26 }}>
                <Link href="/compounds" className="tlink">{tn('compounds')} <Icon name="arrow" className="ar" /></Link>
              </div>
            </div>
            <div>
              <span className="no">02</span>
              <h3>{t('pil_therapy')}</h3>
              <p className="proof">{t('pil_therapy_proof', { count: counts.devices })}</p>
            </div>
            <div>
              <span className="no">03</span>
              <h3>{t('pil_apparel')}</h3>
              <p className="proof">{t('pil_apparel_proof', { count: counts.apparel })}</p>
            </div>
          </Stagger>

          <div className="sp-44" />
          <span className="kicker">{t('pil_pathways')}</span>
          <div className="sp-24" />
          <Stagger className="plist">
            {research.map(p => (
              <Link key={p.slug} href={`/compounds/${p.slug}`} className="prow">
                <span className="no">{p.no}</span>
                <span className="nm">{pick(locale, p.name_en, p.name_id)}</span>
                <span className="sm">{pick(locale, p.summary_en, p.summary_id)}</span>
                <span className="ct">
                  <span className="mono-n">{p.compounds}</span>
                  <Icon name="arrow" className="ar" />
                </span>
              </Link>
            ))}
          </Stagger>
        </div>
      </section>

      {/* --------------------------------------------------------- 04 next */}
      <section className="band" id="next">
        <div className="wrap">
          <Reveal as="div" className="shead">
            <span className="no">{t('cta_no')}</span>
            <div>
              <span className="kicker k">{t('cta_kicker')}</span>
              <div className="cta-band">
                <h2>{t('cta_title')}</h2>
              </div>
              <p>{t('cta_body')}</p>
              <div className="acts" style={{ marginTop: 38 }}>
                <Link href="/request" className="btn btn-solid">{t('cta_request_btn')}</Link>
                <Link href="/price-list" className="tlink">{tn('price_list')} <Icon name="arrow" className="ar" /></Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
