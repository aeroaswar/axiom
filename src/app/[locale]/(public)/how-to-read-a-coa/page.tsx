import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Stagger } from '@/components/site/reveal';
import { alternates } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.coa' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/how-to-read-a-coa') };
}

export default async function CoaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.coa');
  const tn = await getTranslations('nav');
  const settings = await getSettings();
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const steps = [
    { t: t('s1_t'), b: t('s1_b') },
    { t: t('s2_t'), b: t('s2_b') },
    { t: t('s3_t'), b: t('s3_b', { threshold }) },
    { t: t('s4_t'), b: t('s4_b') },
    { t: t('s5_t'), b: t('s5_b') },
    { t: t('s6_t'), b: t('s6_b') },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <span><Link href="/">{tn('home')}</Link></span>
            <span><Link href="/standard">{tn('standard')}</Link></span>
            <span>{tn('coa')}</span>
          </div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          <Stagger className="psteps" as="div">
            {steps.map((s, i) => (
              <div className="pstep" key={s.t}>
                <span className="no mono-n">{String(i + 1).padStart(2, '0')}</span>
                <div><h3>{s.t}</h3><p>{s.b}</p></div>
              </div>
            ))}
          </Stagger>
          <div className="sp-44" />
          <Link href="/standard#coa" className="tlink">{t('cta')} <Icon name="arrow" className="ar" /></Link>
        </div>
      </section>
    </>
  );
}
