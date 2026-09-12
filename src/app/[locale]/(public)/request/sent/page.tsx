import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { CopyButton } from '@/components/site/copy-button';
import { FlowStrip } from '@/components/site/flow-strip';
import { PrintButton } from '@/components/site/print-button';
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

/**
 * The confirmation. The quote number is the reference for everyone, signed in or not: it is on
 * this page, in the WhatsApp handoff and on the quote AXIOM sends, so the three can be matched
 * without an account. Under it, the flow strip at stage two and the four things that happen next,
 * so a reader who expected a checkout knows nothing is charged until they accept the quote.
 */
export default async function RequestSent({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ quote?: string; received?: string }>;
}) {
  const { locale } = await params;
  const { quote, received } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('site.request');
  const tc = await getTranslations('common');
  const [session, settings] = await Promise.all([getSession(), getSettings()]);

  const number = quote ?? '';
  const isQuote = Boolean(number) && received !== '1';
  const lines = session?.uid && isQuote && number ? await getQuoteLines(session.uid, number) : [];
  const ppn = Number(settings.ppn_rate);
  // A compliance-clean handover: the reference, the lots, and the research-use notice. No dose
  // guidance, no price — pricing and sending a quote remain AXIOM's act.
  const waText = number
    ? [isQuote ? t('wa_intro', { number }) : t('wa_ref', { number }), ...lines.map(l => t('wa_line', { name: l.name, dose: l.dose, qty: l.qty }) + (l.interval_days ? ` · ${t('wa_plan', { days: l.interval_days })}` : '')), t('wa_close')].join('\n')
    : t('wa_close');
  const waHref = `https://wa.me/${settings.whatsapp.number}?text=${encodeURIComponent(waText)}`;

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{(await getTranslations('site.common'))('home')}</Link></span><span>{t('title')}</span></div>
          <span className="kicker">{t('received_kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{number ? t('received_title', { number }) : t('received_kicker')}</h1>
          <p className="lead">
            {isQuote ? t('sent_body', { number, days: settings.quote_valid_days }) : t('received_body', { number })}
          </p>
          <div className="ref-acts">
            {number ? <CopyButton value={number} label={t('copy_ref')} done={t('copied')} className="btn btn-sm" /> : null}
            <a className="btn btn-sm" href={waHref}><Icon name="wa" /> {tc('whatsapp')}</a>
            <PrintButton label={t('save_copy')} />
          </div>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap" style={{ paddingTop: 0 }}>
          <FlowStrip at={2} />
          <div className="req-grid" style={{ marginTop: 44 }}>
            <div>
              {lines.length ? (
                <>
                  <span className="kicker">{t('lines')}</span>
                  <div style={{ marginTop: 18, borderTop: '1px solid var(--line)' }}>
                    {lines.map((l, i) => (
                      <div className="req-line" key={`${l.name}${l.dose}${i}`}>
                        <div>
                          <div className="nm">{l.name}</div>
                          <div className="sub">{l.dose}{l.interval_days ? ` · ${t('plan_every', { days: l.interval_days })}` : ` · ${t('plan_once')}`}</div>
                        </div>
                        <div className="ctl"><span className="sub">× {l.qty}</span></div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              <div className="ruo" style={{ marginTop: lines.length ? 24 : 0 }}>{pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)}</div>
            </div>
            <aside className="req-side">
              <span className="kicker">{t('next_title')}</span>
              <ol className="next">
                {([1, 2, 3, 4] as const).map(n => (
                  <li key={n}><span><b>{t(`next_${n}_t`)}</b> {t(`next_${n}_b`, { ppn, days: settings.quote_valid_days })}</span></li>
                ))}
              </ol>
              <div className="acts" style={{ marginTop: 28 }}>
                <Link href="/products" className="btn btn-solid">{t('back_shop')}</Link>
                {session ? (
                  <Link href="/account" className="tlink">{t('sent_account')} <Icon name="arrow" className="ar" /></Link>
                ) : (
                  <Link href={{ pathname: '/sign-in', query: { next: '/account' } }} className="tlink">{t('track')} <Icon name="arrow" className="ar" /></Link>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
