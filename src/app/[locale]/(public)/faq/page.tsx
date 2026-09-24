import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { JsonLd } from '@/components/site/json-ld';
import { getDeliveryZones, pick } from '@/lib/site/catalogue';
import { alternates, faqLd } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';
import { idr } from '@/lib/money';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.faq' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/faq') };
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.faq');
  const tn = await getTranslations('nav');
  const [zones, settings] = await Promise.all([getDeliveryZones(), getSettings()]);
  const base = zones.find(z => z.per_three_idr !== null);
  const per = base ? idr(base.per_three_idr) : '—';
  const cap = base ? idr(base.cap_idr) : '—';
  const method = settings.verification.method;
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const handling = pick(locale, settings.handling_baseline.en, settings.handling_baseline.id);

  const items = [
    { q: t('q1'), a: t('a1', { handling }) },
    { q: t('q2'), a: t('a2', { method, threshold }) },
    { q: t('q3'), a: t('a3', { per, cap }) },
    { q: t('q4'), a: t('a4') },
    { q: t('q5'), a: t('a5', { days: settings.quote_valid_days }) },
    { q: t('q6'), a: t('a6') },
    { q: t('q7'), a: t('a7') },
    { q: t('q8'), a: t('a8') },
  ];

  return (
    <>
      <JsonLd data={faqLd(items)} />
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{tn('home')}</Link></span><span>{tn('faq')}</span></div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          <div className="qa">
            {items.map((it, i) => (
              <details key={it.q} name="faq">
                <summary>
                  <span className="no mono-n">{String(i + 1).padStart(2, '0')}</span>
                  {it.q}
                  <Icon name="caret" className="ar" />
                </summary>
                <p className="ans">{it.a}</p>
              </details>
            ))}
          </div>
          <div className="sp-44" />
          <div className="acts">
            <Link href="/contact" className="tlink">{tn('contact')} <Icon name="arrow" className="ar" /></Link>
            <Link href="/process" className="tlink">{tn('process')} <Icon name="arrow" className="ar" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
