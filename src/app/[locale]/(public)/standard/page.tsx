import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Reveal, Stagger } from '@/components/site/reveal';
import { getSampleCoa, pick } from '@/lib/site/catalogue';
import { coaFileExists } from '@/lib/site/coa';
import { alternates } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';
import { fmtLong } from '@/lib/domain/dates';
import { pct } from '@/lib/money';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.standard' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/standard') };
}

export default async function StandardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.standard');
  const tn = await getTranslations('nav');
  const th = await getTranslations('site.home');
  const [settings, coa] = await Promise.all([getSettings(), getSampleCoa()]);
  const coaFile = coa ? coaFileExists(coa.file_path) : false;
  const method = settings.verification.method;
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const items = [
    { t: t('i1_t', { method }), b: t('i1_b', { method, threshold }) },
    { t: t('i2_t'), b: t('i2_b') },
    { t: t('i3_t'), b: t('i3_b') },
    { t: t('i4_t'), b: t('i4_b') },
    { t: t('i5_t'), b: t('i5_b') },
    { t: t('i6_t'), b: t('i6_b') },
  ];
  const notices = [
    { t: t('n1_t'), b: t('n1_b') },
    { t: t('n2_t'), b: t('n2_b') },
    { t: t('n3_t'), b: t('n3_b') },
    { t: t('n4_t'), b: t('n4_b') },
  ];

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{tn('home')}</Link></span><span>{tn('standard')}</span></div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          <Stagger className="stmts">
            {items.map((it, i) => (
              <div className="stmt" key={it.t}>
                <span className="idx mono-n">{String(i + 1).padStart(2, '0')}</span>
                <div><h3>{it.t}</h3><p>{it.b}</p></div>
                {i === 0 ? <div className="fig mono-n">{threshold}<small>{th('meta_purity')}</small></div> : null}
              </div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ------------------------------------------------------- the sample CoA */}
      <section className="band" id="coa">
        <div className="wrap">
          <Reveal as="div" className="split wide">
            <div>
              <span className="kicker">{t('coa_kicker')}</span>
              <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', marginTop: 14 }}>{t('coa_title')}</h2>
              <p className="lead" style={{ marginTop: 18 }}>{t('coa_lead')}</p>
              <div className="acts" style={{ marginTop: 30 }}>
                <Link href="/how-to-read-a-coa" className="tlink">{t('coa_read')} <Icon name="arrow" className="ar" /></Link>
              </div>
            </div>
            <div>
              {coa ? (
                <>
                  <dl className="dl">
                    {coa.product ? <div className="r"><dt>{t('coa_compound')}</dt><dd>{coa.product}{coa.dose ? ` · ${coa.dose}` : ''}</dd></div> : null}
                    {coa.lot_code ? <div className="r"><dt>{t('coa_lot')}</dt><dd className="mono-n">{coa.lot_code}</dd></div> : null}
                    <div className="r"><dt>{t('coa_method')}</dt><dd>{coa.method}</dd></div>
                    {coa.purity_pct !== null ? <div className="r"><dt>{t('coa_purity')}</dt><dd className="mono-n">{pct(coa.purity_pct, 2)}</dd></div> : null}
                    {coa.issued_at ? <div className="r"><dt>{t('coa_issued')}</dt><dd className="mono-n">{fmtLong(coa.issued_at, locale)}</dd></div> : null}
                  </dl>
                  {coaFile ? (
                    <p style={{ marginTop: 20 }}>
                      <a className="tlink" href="/api/coa"><Icon name="download" /> {t('coa_download')}</a>
                    </p>
                  ) : (
                    <p className="note" style={{ marginTop: 16 }}>{t('coa_file_pending')}</p>
                  )}
                </>
              ) : (
                <p className="note">{t('coa_none')}</p>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------- compliance */}
      <section className="band">
        <div className="wrap">
          <Reveal as="div" className="shead nonum duo">
            <div>
              <span className="kicker k">{t('notice_kicker')}</span>
              <h2>{t('notice_title')}</h2>
            </div>
          </Reveal>
          <Stagger className="stmts">
            {notices.map((nx, i) => (
              <div className="stmt" key={nx.t}>
                <span className="idx mono-n">{String(i + 1).padStart(2, '0')}</span>
                <div><h3>{nx.t}</h3><p>{nx.b}</p></div>
              </div>
            ))}
          </Stagger>
          <div className="sp-44" />
          <div className="ruo">{pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)}</div>
        </div>
      </section>
    </>
  );
}
