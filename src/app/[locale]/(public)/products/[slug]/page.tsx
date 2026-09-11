import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Reveal } from '@/components/site/reveal';
import { JsonLd } from '@/components/site/json-ld';
import { BuyBox } from '@/components/site/buy-box';
import { ShopCard } from '@/components/site/shop-card';
import { getCatalogue, getCoasForProduct, getCompound, getPublishedSlugs, groupCompounds, pick } from '@/lib/site/catalogue';
import { alternates, breadcrumbLd, describe, productLd } from '@/lib/site/seo';
import { getPlanTiers, getSettings } from '@/lib/settings';
import { pct } from '@/lib/money';
import { fmtLong } from '@/lib/domain/dates';

export const revalidate = 60;

type Params = Promise<{ locale: string; slug: string }>;

export async function generateStaticParams() {
  const rows = await getPublishedSlugs();
  return rows.map(r => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getCompound(slug);
  if (!p) return {};
  const cls = pick(locale, p.compound_class_en, p.compound_class_id) || pick(locale, p.pathway.name_en, p.pathway.name_id);
  const t = await getTranslations({ locale, namespace: 'site.product' });
  return {
    title: t('meta_title', { name: p.name, cls }),
    description: describe(pick(locale, p.identity_en, p.identity_id)),
    alternates: alternates(locale, `/products/${slug}`),
  };
}

/**
 * A product page for every kind. The purchase box is first on a phone and pinned beside the
 * record on a desktop: the sizes, the price, one-time or a plan, the interval, the quantity, one
 * button. Below it the record: identity, the details, handling, the published certificates and
 * the rest of the pathway. Product structured data is emitted for a device or apparel only — a
 * research compound is never presented to a shopping surface as a consumer good.
 */
export default async function ProductPage({ params, searchParams }: { params: Params; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const p = await getCompound(slug);
  if (!p) notFound();
  const t = await getTranslations('site.product');
  const tn = await getTranslations('nav');
  const ts = await getTranslations('site.common');
  const tc = await getTranslations('common');
  const [settings, tiers, coas, rows] = await Promise.all([getSettings(), getPlanTiers(), getCoasForProduct(p.id), getCatalogue()]);
  const here = `/products/${slug}`;
  const peptide = p.kind === 'peptide';
  const cls = pick(locale, p.compound_class_en, p.compound_class_id);
  const pathwayName = pick(locale, p.pathway.name_en, p.pathway.name_id);
  const identity = pick(locale, p.identity_en, p.identity_id);
  const handling = pick(locale, p.handling_en, p.handling_id) || pick(locale, settings.handling_baseline.en, settings.handling_baseline.id);
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const related = groupCompounds(rows.filter(r => r.pathway_slug === p.pathway.slug && r.slug !== p.slug)).slice(0, 4);
  const variants = p.variants.slice().sort((a, b) => a.sort - b.sort);
  const askedSku = Array.isArray(sp.sku) ? sp.sku[0] : sp.sku;
  const kicker = peptide ? t('kicker_peptide') : p.kind === 'device' ? t('kicker_device') : t('kicker_apparel');
  const icon = peptide ? 'flask' : p.kind === 'device' ? 'sun' : 'shirt';

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(locale, [{ name: 'AXIOM', path: '/' }, { name: tn('shop'), path: '/products' }, { name: p.name, path: here }]),
          ...(peptide ? [] : [productLd(locale, {
            name: p.name, description: describe(identity, 300), path: here, kind: p.kind as 'device' | 'apparel',
            offers: variants.map(v => ({ sku: v.sku, name: v.dose, price: v.price_idr, available: v.available })),
          })]),
        ]}
      />

      <section className="wrap prod">
        <div className="prod-main">
          <div className="prod-head">
            <div className="crumbs">
              <span><Link href="/">{ts('home')}</Link></span>
              <span><Link href="/products">{tn('shop')}</Link></span>
              <span><Link href={{ pathname: '/products', query: { pathway: p.pathway.slug } }}>{pathwayName}</Link></span>
              <span>{p.name}</span>
            </div>
            <span className="kicker mono-n">{p.pathway.no} · {kicker}</span>
            <h1>{p.name}</h1>
            {cls ? <p className="cls">{cls}</p> : null}
          </div>
          <div className="prod-fig" aria-hidden="true">
            <Icon name={icon} />
            <span className="lab">{variants[0]?.content}</span>
          </div>
        </div>

        <BuyBox
          name={p.name} kind={p.kind}
          variants={variants.map(v => ({ sku: v.sku, dose: v.dose, content: v.content, price_idr: v.price_idr, available: v.available, is_cold_chain: v.is_cold_chain }))}
          tiers={tiers} initialSku={askedSku} basketHref="/request" whatsapp={settings.whatsapp.number}
        />

        <div className="prod-body">
          <div className="prod-sec" id="about">
            <h2>{t('about')}</h2>
            <div className="cp-body">{identity ? <p>{identity}</p> : null}</div>
            <dl className="dl" style={{ marginTop: 22 }}>
              <div className="r"><dt>{t('name')}</dt><dd>{p.name}</dd></div>
              {cls ? <div className="r"><dt>{t('cls')}</dt><dd>{cls}</dd></div> : null}
              <div className="r"><dt>{t('pathway')}</dt><dd><Link href={peptide ? `/compounds/${p.pathway.slug}` : { pathname: '/products', query: { pathway: p.pathway.slug } }} className="tlink" style={{ paddingBottom: 2 }}>{p.pathway.no} · {pathwayName}</Link></dd></div>
              <div className="r"><dt>{t('presentation')}</dt><dd>{variants[0]?.content}</dd></div>
              {peptide ? <div className="r"><dt>{t('verification')}</dt><dd>{t('ver_value', { method: settings.verification.method, threshold })}</dd></div> : null}
              {variants.some(v => v.is_cold_chain) ? <div className="r"><dt>{t('cold_chain')}</dt><dd>{tc('yes')}</dd></div> : null}
            </dl>
          </div>

          {peptide ? (
            <div className="prod-sec" id="handling">
              <h2>{t('handling')}</h2>
              <div className="cp-body">{handling.split('\n').filter(Boolean).map((x, i) => <p key={i}>{x}</p>)}</div>
              <p className="note" style={{ marginTop: 14 }}>{t('handling_note')}</p>
            </div>
          ) : null}

          {peptide ? (
            <div className="prod-sec" id="coa">
              <h2>{t('coa_title')}</h2>
              <p className="note" style={{ marginBottom: 16 }}>{coas.length ? t('coa_lead') : t('coa_none')}</p>
              {coas.length ? (
                <div className="tblwrap">
                  <table className="tbl coa-tbl">
                    <tbody>
                      {coas.map(c => (
                        <tr key={c.id}>
                          <td className="k">{c.dose}</td>
                          <td className="lot">{c.lot_code}</td>
                          <td className="n pur">{c.purity_pct === null ? '—' : pct(c.purity_pct, 2)}</td>
                          <td className="n">{c.issued_at ? fmtLong(new Date(c.issued_at), locale) : '—'}</td>
                          <td className="n"><Link href={`/coas/${c.id}`} className="tlink">{t('coa_view')} <Icon name="arrow" className="ar" /></Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              <p style={{ marginTop: 16 }}><Link href="/coas" className="tlink">{t('coa_all')} <Icon name="arrow" className="ar" /></Link></p>
            </div>
          ) : (
            <div className="prod-sec"><p className="note">{t('consumer_note')}</p></div>
          )}

          {peptide ? (
            <div className="prod-sec">
              <Link href={`/compounds/${p.pathway.slug}/${p.slug}`} className="tlink">{t('guide')} <Icon name="arrow" className="ar" /></Link>
            </div>
          ) : null}
        </div>
      </section>

      {related.length ? (
        <section className="band">
          <div className="wrap">
            <Reveal as="div" className="sec-head">
              <h2>{t('related', { pathway: pathwayName })}</h2>
              <Link href={{ pathname: '/products', query: { pathway: p.pathway.slug } }} className="tlink">{tn('shop')} <Icon name="arrow" className="ar" /></Link>
            </Reveal>
            <div className="pgrid">
              {related.map(c => <ShopCard key={c.slug} c={c} locale={locale} />)}
            </div>
          </div>
        </section>
      ) : null}

      {peptide ? (
        <section className="band tight">
          <div className="wrap"><div className="ruo">{pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)}</div></div>
        </section>
      ) : null}
    </>
  );
}
