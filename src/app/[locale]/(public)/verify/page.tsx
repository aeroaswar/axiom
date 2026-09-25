import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Reveal } from '@/components/site/reveal';
import { getSampleCoa, pick } from '@/lib/site/catalogue';
import { coaFileExists } from '@/lib/site/coa';
import { verifyLot, LOT_CODE_MAX, type LotState } from '@/lib/site/lots';
import { alternates, NOINDEX } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';
import { fmtLong } from '@/lib/domain/dates';
import { pct } from '@/lib/money';

// The lookup answers from the database on every request, and the code arrives in the query string
// (`/verify?lot=…`), which is also what a label's QR code carries. A result page is one lot's record,
// not something to index, so only the bare page is crawlable.
export const dynamic = 'force-dynamic';

type Search = Promise<{ lot?: string | string[] }>;
const codeOf = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim().slice(0, LOT_CODE_MAX) ?? '';

const TONE: Record<LotState, string> = { verified: 'ok', awaiting: 'warn', below_threshold: 'err', expired: 'warn' };

export async function generateMetadata({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Search }): Promise<Metadata> {
  const { locale } = await params;
  const code = codeOf((await searchParams).lot);
  const t = await getTranslations({ locale, namespace: 'site.verify' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/verify'), ...(code ? { robots: NOINDEX } : {}) };
}

export default async function VerifyPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Search }) {
  const { locale } = await params;
  const code = codeOf((await searchParams).lot);
  setRequestLocale(locale);
  const t = await getTranslations('site.verify');
  const tn = await getTranslations('nav');
  const [settings, record] = await Promise.all([getSettings(), code ? verifyLot(code) : Promise.resolve(null)]);
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const wa = (text: string) => `https://wa.me/${settings.whatsapp.number}?text=${encodeURIComponent(text)}`;
  // A certificate file is linked only when it is the published sample and the file is filed; every
  // other certificate is sent on request, so the page never links to a document it cannot serve.
  const sample = record?.is_sample ? await getSampleCoa() : null;
  const downloadable = Boolean(sample && coaFileExists(sample.file_path));

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{tn('home')}</Link></span><span>{tn('verify')}</span></div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          <form method="get" className="tools" role="search" aria-label={t('title')}>
            <div className="field grow">
              <label htmlFor="lot">{t('label')}</label>
              <input id="lot" name="lot" type="text" defaultValue={code} maxLength={LOT_CODE_MAX} autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-describedby="lot-hint" required />
            </div>
            <button type="submit" className="btn btn-solid">{t('submit')}</button>
          </form>
          <p className="note" id="lot-hint" style={{ marginTop: 12 }}>{t('hint')}</p>

          {code && record ? (
            <Reveal as="div" className="split wide" style={{ marginTop: 56 }}>
              <div>
                <span className="kicker">{t('found_kicker')}</span>
                <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', marginTop: 14 }}>{record.product} · {record.dose}</h2>
                <p style={{ marginTop: 18 }}>
                  <span className={`chip ${TONE[record.state]}`} data-state={record.state}><span className="dot" />{t(`state_${record.state}`)}</span>
                </p>
                <p className="lead" style={{ marginTop: 18 }}>{t(`note_${record.state}`, { threshold })}</p>
                <div className="acts" style={{ marginTop: 30 }}>
                  {downloadable ? (
                    <a className="tlink" href="/api/coa"><Icon name="download" /> {t('download')}</a>
                  ) : (
                    <a className="tlink" href={wa(t('wa_coa', { lot: record.lot_code }))} target="_blank" rel="noopener">{t('request_coa')} <Icon name="arrow" className="ar" /></a>
                  )}
                  <Link href="/how-to-read-a-coa" className="tlink">{t('how_to_read')} <Icon name="arrow" className="ar" /></Link>
                </div>
              </div>
              <dl className="dl">
                <div className="r"><dt>{t('f_compound')}</dt><dd>{record.product} · {record.dose}</dd></div>
                <div className="r"><dt>{t('f_lot')}</dt><dd className="mono-n">{record.lot_code}</dd></div>
                {record.method ? <div className="r"><dt>{t('f_method')}</dt><dd>{record.method}</dd></div> : null}
                {record.purity_pct !== null ? <div className="r"><dt>{t('f_purity')}</dt><dd className="mono-n">{pct(record.purity_pct, 2)}</dd></div> : null}
                {record.issued_at ? <div className="r"><dt>{t('f_issued')}</dt><dd className="mono-n">{fmtLong(record.issued_at, locale)}</dd></div> : null}
                {record.received_at ? <div className="r"><dt>{t('f_received')}</dt><dd className="mono-n">{fmtLong(record.received_at, locale)}</dd></div> : null}
                {record.expires_at ? <div className="r"><dt>{t('f_expires')}</dt><dd className="mono-n">{fmtLong(record.expires_at, locale)}</dd></div> : null}
              </dl>
            </Reveal>
          ) : null}

          {code && !record ? (
            <Reveal as="div" className="split wide" style={{ marginTop: 56 }}>
              <div>
                <h2 style={{ fontSize: 'clamp(22px,2.6vw,32px)' }}>{t('none_title')}</h2>
                <p className="lead" style={{ marginTop: 18 }}>{t('none_body')}</p>
                <div className="acts" style={{ marginTop: 30 }}>
                  <a className="tlink" href={wa(t('wa_trace', { lot: code }))} target="_blank" rel="noopener">{t('send_label')} <Icon name="arrow" className="ar" /></a>
                </div>
              </div>
            </Reveal>
          ) : null}

          {!code ? (
            <div className="acts" style={{ marginTop: 30 }}>
              <Link href="/how-to-read-a-coa" className="tlink">{t('how_to_read')} <Icon name="arrow" className="ar" /></Link>
            </div>
          ) : null}

          <div className="sp-44" />
          <div className="ruo">{pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)}</div>
        </div>
      </section>
    </>
  );
}
