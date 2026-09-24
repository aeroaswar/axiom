import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Reveal } from '@/components/site/reveal';
import { alternates } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.contact' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/contact') };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.contact');
  const tn = await getTranslations('nav');
  const tc = await getTranslations('common');
  const settings = await getSettings();

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{tn('home')}</Link></span><span>{tn('contact')}</span></div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          <Reveal as="div" className="split flip">
            <dl className="dl">
              <div className="r">
                <dt>{t('whatsapp')}</dt>
                <dd><a className="tlink" href={`https://wa.me/${settings.whatsapp.number}`}>{settings.whatsapp.display} <Icon name="arrow" className="ar" /></a></dd>
              </div>
              <div className="r"><dt>{t('hours')}</dt><dd className="mono-n">{t('hours_value')}</dd></div>
              <div className="r"><dt>{t('location')}</dt><dd>{t('location_value')}</dd></div>
            </dl>
            <div>
              <span className="kicker">{t('request')}</span>
              <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', marginTop: 14 }}>{t('request_body')}</h2>
              <div className="acts" style={{ marginTop: 32 }}>
                <Link href="/request" className="btn btn-solid">{t('request_cta')}</Link>
                <Link href="/faq" className="tlink">{tn('faq')} <Icon name="arrow" className="ar" /></Link>
              </div>
              <p className="note" style={{ marginTop: 34 }}>{tc('boilerplate')}</p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
