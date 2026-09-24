import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Reveal } from '@/components/site/reveal';
import { JsonLd } from '@/components/site/json-ld';
import { AddToBasket } from '@/components/site/add-to-basket';
import { getCompound, getPublishedSlugs, pick } from '@/lib/site/catalogue';
import { alternates, breadcrumbLd, describe, productLd } from '@/lib/site/seo';
import { idr } from '@/lib/money';

export const revalidate = 60;

export async function generateStaticParams() {
  const rows = await getPublishedSlugs();
  return rows.filter(r => r.kind !== 'peptide').map(r => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getCompound(slug);
  if (!p || p.kind === 'peptide') return {};
  const cls = pick(locale, p.compound_class_en, p.compound_class_id) || pick(locale, p.pathway.name_en, p.pathway.name_id);
  const t = await getTranslations({ locale, namespace: 'site.compound' });
  return {
    title: t('meta_title', { name: p.name, cls }),
    description: describe(pick(locale, p.identity_en, p.identity_id)),
    alternates: alternates(locale, `/products/${slug}`),
  };
}

export default async function ProductPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const p = await getCompound(slug);
  // Peptides are education first and live in the guide. Only a device or a piece of apparel is a
  // product page, and only a product page may carry Product structured data.
  if (!p || p.kind === 'peptide') notFound();

  const t = await getTranslations('site.products');
  const tc = await getTranslations('site.common');
  const tk = await getTranslations('site.compound');
  const tn = await getTranslations('nav');
  const here = `/products/${slug}`;
  const cls = pick(locale, p.compound_class_en, p.compound_class_id);
  const pathwayName = pick(locale, p.pathway.name_en, p.pathway.name_id);
  const identity = pick(locale, p.identity_en, p.identity_id);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(locale, [{ name: 'AXIOM', path: '/' }, { name: t('title'), path: '/compounds' }, { name: p.name, path: here }]),
          productLd(locale, {
            name: p.name,
            description: describe(identity, 300),
            path: here,
            kind: p.kind,
            offers: p.variants.map(v => ({ sku: v.sku, name: v.dose, price: v.price_idr, available: v.available })),
          }),
        ]}
      />

      <section className="cp-head">
        <div className="wrap">
          <div className="crumbs">
            <span><Link href="/">{tn('home')}</Link></span>
            <span><Link href="/compounds">{t('title')}</Link></span>
            <span>{p.name}</span>
          </div>
          <span className="kicker mono-n">{p.pathway.no} · {pathwayName}</span>
          <h1>{p.name}</h1>
          {cls ? <p className="cls">{cls}</p> : null}
        </div>
      </section>

      <section className="cp-sec">
        <div className="wrap">
          <div className="hd"><span className="no">01</span><h2>{t('about')}</h2></div>
          <Reveal as="div" className="split wide">
            <div className="cp-body">{identity ? <p>{identity}</p> : null}</div>
            <dl className="dl">
              <div className="r"><dt>{tk('name')}</dt><dd>{p.name}</dd></div>
              {cls ? <div className="r"><dt>{tk('cls')}</dt><dd>{cls}</dd></div> : null}
              <div className="r"><dt>{t('options')}</dt><dd className="mono-n">{p.variants.length}</dd></div>
            </dl>
          </Reveal>
        </div>
      </section>

      <section className="cp-sec" id="request">
        <div className="wrap">
          <div className="hd"><span className="no">02</span><h2>{t('options')}</h2></div>
          <div className="tblwrap">
            <table className="doses-tbl">
              <caption className="sr-only">{t('options')}</caption>
              <thead>
                <tr>
                  <th scope="col">{tc('option')}</th>
                  <th scope="col">{tc('presentation')}</th>
                  <th scope="col">{tc('availability')}</th>
                  <th scope="col" className="n">{tc('price')}</th>
                  <th scope="col" className="n"><span className="sr-only">{tc('add')}</span></th>
                </tr>
              </thead>
              <tbody>
                {p.variants.map(v => (
                  <tr key={v.variant_id}>
                    <td className="dose">{v.dose}</td>
                    <td>{v.content}</td>
                    <td>
                      <span className={`avail${v.available > 0 ? '' : ' none'}`}>
                        <span className="dot" />
                        {v.available > 0 ? <span className="mono-n">{v.available}</span> : <span aria-hidden="true">—</span>}
                      </span>
                    </td>
                    <td className="n money">{v.price_idr === null ? tc('gated_cell') : idr(v.price_idr)}</td>
                    <td className="n"><AddToBasket sku={v.sku} label={tc('add')} busy={tc('adding')} done={tc('added')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Reveal as="div" className="split wide" style={{ marginTop: 44 }}>
            <div className="cp-body">
              <p>{t('commerce_lead')}</p>
              <div className="acts" style={{ marginTop: 32 }}>
                <Link href="/request" className="btn btn-solid">{tk('request_basket')}</Link>
                <Link href="/price-list" className="tlink">{tn('price_list')} <Icon name="arrow" className="ar" /></Link>
              </div>
            </div>
            <div><p className="note">{t('consumer_note')}</p></div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
