import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Reveal } from '@/components/site/reveal';
import { PriceTable, type PriceRow } from '@/components/site/price-table';
import { getCatalogue, getPricesAsAt, pick } from '@/lib/site/catalogue';
import { alternates } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';
import { fmtLong } from '@/lib/domain/dates';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.price_list' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/price-list') };
}

export default async function PriceList({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.price_list');
  const tc = await getTranslations('common');
  const tn = await getTranslations('nav');
  const [rows, asAt, settings] = await Promise.all([getCatalogue(), getPricesAsAt(), getSettings()]);

  const table: PriceRow[] = rows.map(r => ({
    sku: r.sku,
    name: r.name,
    href: r.kind === 'peptide' ? `/compounds/${r.pathway_slug}/${r.slug}` : `/products/${r.slug}`,
    dose: r.dose,
    content: r.content,
    price: r.price_idr,
    available: r.available,
    pathwayNo: r.pathway_no,
    pathwaySlug: r.pathway_slug,
    pathwayName: pick(locale, r.pathway_en, r.pathway_id_name),
    productId: r.product_id,
  }));

  return (
    <>
      <section className="page-hero">
        <div className="wrap">
          <div className="crumbs"><span><Link href="/">{tn('home')}</Link></span><span>{tn('price_list')}</span></div>
          <span className="kicker">{t('kicker')}</span>
          <h1 style={{ marginTop: 14 }}>{t('title')}</h1>
          <p className="lead">{t('lead')}</p>
          <div className="acts" style={{ marginTop: 34 }}>
            <a className="btn btn-sm" href={`/api/documents/price-list?locale=${locale}`}>
              <Icon name="download" /> {t('pdf')}
            </a>
            {asAt ? <span className="tag mono-n">{tc('prices_as_at', { date: fmtLong(asAt, locale) })}</span> : null}
          </div>
        </div>
      </section>

      <section className="band" style={{ borderTop: 'none' }}>
        <div className="wrap">
          <PriceTable rows={table} signInHref="/price-list" />
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <Reveal as="div" className="split wide">
            <div>
              <span className="kicker">{t('model_kicker')}</span>
              <div className="cp-body" style={{ marginTop: 22 }}>
                <p>{t('model_body')}</p>
                <p>{tc('pen_included')}</p>
              </div>
            </div>
            <div>
              <p className="note">{t('pdf_note')}</p>
              <p className="note" style={{ marginTop: 14 }}>{t('gated_note')}</p>
              <div className="sp-24" />
              <p className="ruo">{pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)}</p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
