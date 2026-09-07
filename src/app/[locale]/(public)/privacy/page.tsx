import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { alternates } from '@/lib/site/seo';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.privacy' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/privacy') };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.privacy');
  const tn = await getTranslations('nav');
  const tl = await getTranslations('site.legal');
  const clauses = [1, 2, 3, 4, 5, 6, 7, 8].map(i => ({ h: t(`h${i}` as 'h1'), b: t(`b${i}` as 'b1') }));

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs">
            <span><Link href="/">{tn('home')}</Link></span>
            <span><Link href="/legal">{tn('legal')}</Link></span>
            <span>{tn('privacy')}</span>
          </div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          <div className="split flip">
            <nav className="toc" aria-label={tl('privacy')}>
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
