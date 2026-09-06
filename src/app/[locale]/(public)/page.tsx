import { getTranslations, setRequestLocale } from 'next-intl/server';

export const revalidate = 60;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('common');
  return (
    <section className="hero">
      <div className="hero-in">
        <span className="kicker">AXIOM</span>
        <h1>{t('tagline')}</h1>
        <p className="lead">{t('boilerplate')}</p>
      </div>
    </section>
  );
}
