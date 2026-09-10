import { getTranslations } from 'next-intl/server';

/**
 * One page for an unknown code, a draft and a withdrawn card alike, served with a 404. Holding a
 * code that does not resolve must not tell you which of the three it was.
 */
export default async function CardNotFound() {
  const t = await getTranslations('protocol.card');
  return (
    <main className="pc pc-empty">
      <h1>{t('not_found_title')}</h1>
      <p>{t('not_found_body')}</p>
    </main>
  );
}
