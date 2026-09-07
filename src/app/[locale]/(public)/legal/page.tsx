import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Stagger } from '@/components/site/reveal';
import { pick } from '@/lib/site/catalogue';
import { alternates } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.legal' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/legal') };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.legal');
  const tn = await getTranslations('nav');
  const tt = await getTranslations('site.terms');
  const tp = await getTranslations('site.privacy');
  const settings = await getSettings();

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{tn('home')}</Link></span><span>{tn('legal')}</span></div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          <Stagger className="plist">
            <Link href="/terms" className="prow">
              <span className="no mono-n">01</span>
              <span className="nm">{t('terms')}</span>
              <span className="sm">{tt('description')}</span>
              <span className="ct"><Icon name="arrow" className="ar" /></span>
            </Link>
            <Link href="/privacy" className="prow">
              <span className="no mono-n">02</span>
              <span className="nm">{t('privacy')}</span>
              <span className="sm">{tp('description')}</span>
              <span className="ct"><Icon name="arrow" className="ar" /></span>
            </Link>
          </Stagger>

          <div className="sp-44" />
          <span className="kicker">{t('ruo')}</span>
          <div className="sp-24" />
          <div className="ruo">{pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)}</div>
        </div>
      </section>
    </>
  );
}
