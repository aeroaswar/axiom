import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { getSession } from '@/lib/auth';
import { getQuoteLines } from '@/lib/site/request';
import { alternates, NOINDEX } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';
import { pick } from '@/lib/site/catalogue';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.request' });
  return { title: t('title'), robots: NOINDEX, alternates: alternates(locale, '/request/sent') };
}

export default async function RequestSent({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ quote?: string; received?: string }>;
}) {
  const { locale } = await params;
  const { quote, received } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('site.request');
  const tc = await getTranslations('common');
  const tn = await getTranslations('nav');
  const [session, settings] = await Promise.all([getSession(), getSettings()]);

  const isQuote = Boolean(quote) && received !== '1';
  const lines = session?.uid && isQuote && quote ? await getQuoteLines(session.uid, quote) : [];
  // A compliance-clean handover: the reference, the lots, and the research-use notice. No dose
  // guidance, no price — pricing and sending a quote remain AXIOM's act.
  const waText = isQuote && quote
    ? [t('wa_intro', { number: quote }), ...lines.map(l => t('wa_line', { name: l.name, dose: l.dose, qty: l.qty })), t('wa_close')].join('\n')
    : t('wa_close');
  const waHref = `https://wa.me/${settings.whatsapp.number}?text=${encodeURIComponent(waText)}`;

  return (
    <section className="band" style={{ borderTop: 'none' }}>
      <div className="wrap" style={{ paddingTop: 90 }}>
        <div className="split wide">
          <div>
            <span className="kicker">{t('kicker')}</span>
            <h1 style={{ fontSize: 'clamp(30px,4.4vw,54px)', marginTop: 16 }}>
              {isQuote && quote ? t('sent_title', { number: quote }) : t('received_title')}
            </h1>
            <p className="lead" style={{ marginTop: 20 }}>
              {isQuote ? t('sent_body', { days: settings.quote_valid_days }) : t('received_body')}
            </p>
            <div className="acts" style={{ marginTop: 34 }}>
              <a className="btn btn-solid" href={waHref}>{tc('whatsapp')}</a>
              {session ? (
                <Link href="/account" className="tlink">{t('sent_account')} <Icon name="arrow" className="ar" /></Link>
              ) : (
                <Link href={{ pathname: '/sign-in', query: { next: '/account' } }} className="tlink">{t('received_sign_in')} <Icon name="arrow" className="ar" /></Link>
              )}
            </div>
          </div>
          <div>
            {lines.length ? (
              <dl className="dl">
                {lines.map((l, i) => (
                  <div className="r" key={`${l.name}${l.dose}${i}`}>
                    <dt>{l.dose}</dt>
                    <dd>{l.name} <span className="dim-2 mono-n">× {l.qty}</span></dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="ruo" style={{ marginTop: 24 }}>{pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)}</div>
            <div className="sp-24" />
            <Link href="/compounds" className="tlink">{tn('compounds')} <Icon name="arrow" className="ar" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
