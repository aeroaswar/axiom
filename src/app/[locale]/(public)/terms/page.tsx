import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getDeliveryZones } from '@/lib/site/catalogue';
import { alternates } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';
import { idr } from '@/lib/money';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.terms' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/terms') };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.terms');
  const tn = await getTranslations('nav');
  const tl = await getTranslations('site.legal');
  const [zones, settings] = await Promise.all([getDeliveryZones(), getSettings()]);
  const base = zones.find(z => z.per_three_idr !== null);
  const per = base ? idr(base.per_three_idr) : '—';
  const cap = base ? idr(base.cap_idr) : '—';
  const days = settings.quote_valid_days;

  const clauses = [
    { h: t('h1'), b: t('b1') },
    { h: t('h2'), b: t('b2') },
    { h: t('h3'), b: t('b3') },
    { h: t('h4'), b: t('b4') },
    { h: t('h5'), b: t('b5', { days }) },
    { h: t('h6'), b: t('b6', { per, cap }) },
    { h: t('h7'), b: t('b7') },
    { h: t('h8'), b: t('b8') },
    { h: t('h9'), b: t('b9') },
    { h: t('h10'), b: t('b10') },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <span><Link href="/">{tn('home')}</Link></span>
            <span><Link href="/legal">{tn('legal')}</Link></span>
            <span>{tn('terms')}</span>
          </div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          <div className="split flip">
            <nav className="toc" aria-label={tl('terms')}>
              {clauses.map((c, i) => <a key={c.h} href={`#c${i + 1}`}>{c.h}</a>)}
            </nav>
            <div className="prose">
              {clauses.map((c, i) => (
                <section key={c.h} id={`c${i + 1}`}>
                  <h2>{c.h}</h2>
                  <p>{c.b}</p>
                </section>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
