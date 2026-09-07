import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Reveal, Stagger } from '@/components/site/reveal';
import { getDeliveryZones, pick } from '@/lib/site/catalogue';
import { alternates } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';
import { idr } from '@/lib/money';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.process' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/process') };
}

export default async function ProcessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.process');
  const tn = await getTranslations('nav');
  const tc = await getTranslations('common');
  const [zones, settings] = await Promise.all([getDeliveryZones(), getSettings()]);
  // The tariff is read, never typed: the delivery rule lives in one place and every surface asks it.
  const base = zones.find(z => z.per_three_idr !== null) ?? zones[0];
  const per = base?.per_three_idr !== null && base?.per_three_idr !== undefined ? idr(base.per_three_idr) : t('delivery_pending');
  const cap = base?.cap_idr !== null && base?.cap_idr !== undefined ? idr(base.cap_idr) : t('delivery_pending');
  const steps = [
    { t: t('s1_t'), b: t('s1_b') },
    { t: t('s2_t'), b: t('s2_b', { days: settings.quote_valid_days }) },
    { t: t('s3_t'), b: t('s3_b') },
    { t: t('s4_t'), b: t('s4_b') },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{tn('home')}</Link></span><span>{tn('process')}</span></div>
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
        </div>
      </section>

      <section className="band" id="delivery">
        <div className="wrap">
          <Reveal as="div" className="split wide">
            <div>
              <span className="kicker">{t('delivery_kicker')}</span>
              <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', marginTop: 14 }}>{t('delivery_title')}</h2>
              <p className="lead" style={{ marginTop: 18 }}>{t('delivery_rule', { per, cap })}</p>
              <p className="note" style={{ marginTop: 20 }}>{t('delivery_note')}</p>
            </div>
            <div>
              <span className="kicker">{t('delivery_zones')}</span>
              <dl className="dl" style={{ marginTop: 22 }}>
                {zones.map(z => (
                  <div className="r" key={z.zone}>
                    <dt>{pick(locale, z.label_en, z.label_id)}</dt>
                    <dd className="mono-n">
                      {z.per_three_idr !== null ? idr(z.per_three_idr) : t('delivery_pending')}
                      <span className="dim-2"> · {t('delivery_eta', { days: z.eta_days })}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="band" id="payment">
        <div className="wrap">
          <Reveal as="div" className="split wide">
            <div>
              <span className="kicker">{t('payment_kicker')}</span>
              <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', marginTop: 14 }}>{t('payment_title')}</h2>
              <p className="lead" style={{ marginTop: 18 }}>{t('payment_body')}</p>
            </div>
            <div>
              <span className="kicker">{t('whatsapp_kicker')}</span>
              <h3 style={{ fontSize: 22, marginTop: 14 }}>{t('whatsapp_title')}</h3>
              <p className="note" style={{ marginTop: 14 }}>{t('whatsapp_body')}</p>
              <p style={{ marginTop: 22 }}>
                <a href={`https://wa.me/${settings.whatsapp.number}`} className="tlink">
                  {tc('whatsapp')} <Icon name="arrow" className="ar" />
                </a>
              </p>
            </div>
          </Reveal>
          <div className="sp-44" />
          <div className="acts">
            <Link href="/request" className="btn btn-solid">{tn('request')}</Link>
            <Link href="/faq" className="tlink">{tn('faq')} <Icon name="arrow" className="ar" /></Link>
          </div>
        </div>
      </section>
    </>
  );
}
