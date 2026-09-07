import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { Reveal } from '@/components/site/reveal';
import { JsonLd } from '@/components/site/json-ld';
import { LivePrice } from '@/components/site/prices';
import { AddToBasket } from '@/components/site/add-to-basket';
import { getCompound, getPublishedSlugs, pick } from '@/lib/site/catalogue';
import { alternates, breadcrumbLd, definedTermLd, describe } from '@/lib/site/seo';
import { getSettings } from '@/lib/settings';
import { idr } from '@/lib/money';

export const revalidate = 60;

export async function generateStaticParams() {
  const rows = await getPublishedSlugs();
  return rows.filter(r => r.kind === 'peptide').map(r => ({ pathway: r.pathway_slug, slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; pathway: string; slug: string }> }): Promise<Metadata> {
  const { locale, pathway, slug } = await params;
  const c = await getCompound(slug);
  if (!c || c.pathway.slug !== pathway) return {};
  const t = await getTranslations({ locale, namespace: 'site.compound' });
  const cls = pick(locale, c.compound_class_en, c.compound_class_id) || pick(locale, c.pathway.name_en, c.pathway.name_id);
  return {
    title: t('meta_title', { name: c.name, cls }),
    description: describe(pick(locale, c.identity_en, c.identity_id)),
    alternates: alternates(locale, `/compounds/${pathway}/${slug}`),
  };
}

export default async function CompoundPage({ params }: { params: Promise<{ locale: string; pathway: string; slug: string }> }) {
  const { locale, pathway, slug } = await params;
  setRequestLocale(locale);
  const c = await getCompound(slug);
  if (!c || c.kind !== 'peptide' || c.pathway.slug !== pathway) notFound();

  const settings = await getSettings();
  const t = await getTranslations('site.compound');
  const tc = await getTranslations('site.common');
  const tn = await getTranslations('nav');
  const here = `/compounds/${pathway}/${slug}`;
  const cls = pick(locale, c.compound_class_en, c.compound_class_id);
  const pathwayName = pick(locale, c.pathway.name_en, c.pathway.name_id);
  const identity = pick(locale, c.identity_en, c.identity_id);
  const handling = pick(locale, c.handling_en, c.handling_id) || pick(locale, settings.handling_baseline.en, settings.handling_baseline.id);
  const usesBaseline = !(c.handling_en || c.handling_id);
  const research = pick(locale, c.research_en, c.research_id);
  // Education is public, but a research statement renders only when a reference actually supports
  // it. No product carries references yet, so this section is absent from every page — no stub,
  // no placeholder, no promise of research to come.
  const showResearch = c.reference_count > 0 && research.trim().length > 0;
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const anyPrice = c.variants.some(v => v.price_idr !== null);

  // Section numerals follow what actually renders, so the page never skips a number.
  let n = 0;
  const no = () => String(++n).padStart(2, '0');
  const nIdentity = no();
  const nResearch = showResearch ? no() : null;
  const nHandling = no();
  const nVerification = no();
  const nRelated = c.related.length ? no() : null;
  const nCommerce = no();
  const nRuo = no();

  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(locale, [
            { name: 'AXIOM', path: '/' },
            { name: tn('compounds'), path: '/compounds' },
            { name: pathwayName, path: `/compounds/${pathway}` },
            { name: c.name, path: here },
          ]),
          definedTermLd(locale, {
            name: c.name,
            description: describe(identity, 300),
            path: here,
            setName: pathwayName,
            setPath: `/compounds/${pathway}`,
            synonyms: c.synonyms,
            identifier: c.cas_no,
          }),
        ]}
      />

      <section className="cp-head">
        <div className="wrap">
          <div className="crumbs">
            <span><Link href="/">{tn('home')}</Link></span>
            <span><Link href="/compounds">{tn('compounds')}</Link></span>
            <span><Link href={`/compounds/${pathway}`}>{pathwayName}</Link></span>
            <span>{c.name}</span>
          </div>
          <span className="kicker mono-n">{c.pathway.no} · {pathwayName}</span>
          <h1>{c.name}</h1>
          {cls ? <p className="cls">{cls}</p> : null}
        </div>
      </section>

      {/* ------------------------------------------------------------ identity */}
      <section className="cp-sec" id="identity">
        <div className="wrap">
          <div className="hd"><span className="no">{nIdentity}</span><h2>{t('s1')}</h2></div>
          <Reveal as="div" className="split wide">
            <div className="cp-body">
              {identity ? <p>{identity}</p> : null}
            </div>
            <dl className="dl">
              <div className="r"><dt>{t('name')}</dt><dd>{c.name}</dd></div>
              {c.synonyms.length ? <div className="r"><dt>{t('synonyms')}</dt><dd>{c.synonyms.join(' · ')}</dd></div> : null}
              {cls ? <div className="r"><dt>{t('cls')}</dt><dd>{cls}</dd></div> : null}
              {pick(locale, c.molecular_class_en, c.molecular_class_id) ? (
                <div className="r"><dt>{t('molecular')}</dt><dd>{pick(locale, c.molecular_class_en, c.molecular_class_id)}</dd></div>
              ) : null}
              {c.cas_no ? <div className="r"><dt>{t('cas')}</dt><dd className="mono-n">{c.cas_no}</dd></div> : null}
              <div className="r"><dt>{t('lots')}</dt><dd className="mono-n">{tc('lots_count', { count: c.variants.length })}</dd></div>
            </dl>
          </Reveal>

          <div className="sp-44" />
          <div className="tblwrap">
            <table className="doses-tbl">
              <caption className="sr-only">{t('lots')}</caption>
              <thead>
                <tr>
                  <th scope="col">{tc('dose')}</th>
                  <th scope="col">{tc('presentation')}</th>
                  <th scope="col">{tc('availability')}</th>
                  <th scope="col" className="n">{tc('price')}</th>
                  <th scope="col" className="n"><span className="sr-only">{tc('add')}</span></th>
                </tr>
              </thead>
              <tbody>
                {c.variants.map(v => (
                  <tr key={v.variant_id}>
                    <td className="dose">{v.dose}</td>
                    <td>{v.content}{v.is_cold_chain ? ` · ${tc('cold_chain')}` : ''}</td>
                    <td>
                      <span className={`avail${v.available > 0 ? '' : ' none'}`}>
                        <span className="dot" />
                        {v.available > 0 ? <span className="mono-n">{v.available}</span> : <span aria-hidden="true">—</span>}
                      </span>
                    </td>
                    <td className={v.price_idr === null ? 'n gate' : 'n money'}>
                      <LivePrice sku={v.sku}>{v.price_idr === null ? tc('gated_cell') : idr(v.price_idr)}</LivePrice>
                    </td>
                    <td className="n">
                      <AddToBasket sku={v.sku} label={tc('add')} busy={tc('adding')} done={tc('added')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {c.variants.some(v => v.available <= 0) ? <p className="note" style={{ marginTop: 16 }}>{tc('out')}</p> : null}
          {!anyPrice ? (
            <p className="gated" style={{ marginTop: 18 }}>
              {tc('gated_line')}{' '}
              <Link href={{ pathname: '/sign-in', query: { next: here } }}>{tc('gated_link')}</Link>
            </p>
          ) : null}
        </div>
      </section>

      {/* ------------------------------------------- what has been studied (cited only) */}
      {showResearch ? (
        <section className="cp-sec" id="research">
          <div className="wrap">
            <div className="hd"><span className="no">{nResearch}</span><h2>{t('s2')}</h2></div>
            <div className="cp-body">{research.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ handling */}
      <section className="cp-sec" id="handling">
        <div className="wrap">
          <div className="hd"><span className="no">{nHandling}</span><h2>{t('s3')}</h2></div>
          <Reveal as="div" className="split wide">
            <div className="cp-body">
              {handling.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            </div>
            <div>
              <p className="note">{t('handling_note')}</p>
              {usesBaseline ? <p className="note" style={{ marginTop: 14 }}>{t('handling_baseline')}</p> : null}
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- verification */}
      <section className="cp-sec" id="verification">
        <div className="wrap">
          <div className="hd"><span className="no">{nVerification}</span><h2>{t('s4')}</h2></div>
          <Reveal as="div" className="split wide">
            <div className="cp-body">
              <p>{t('ver_coa')}</p>
              <p style={{ marginTop: 24 }}>
                <Link href="/standard" className="tlink">{t('ver_sample')} <Icon name="arrow" className="ar" /></Link>
              </p>
            </div>
            <dl className="dl">
              <div className="r"><dt>{t('ver_method')}</dt><dd>{settings.verification.method}</dd></div>
              <div className="r"><dt>{t('ver_threshold')}</dt><dd className="mono-n">{threshold}</dd></div>
            </dl>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------- related */}
      {nRelated ? (
        <section className="cp-sec" id="related">
          <div className="wrap">
            <div className="hd"><span className="no">{nRelated}</span><h2>{t('s5')}</h2></div>
            <p className="note" style={{ marginBottom: 22 }}>{t('related_lead', { pathway: pathwayName })}</p>
            <div className="plist">
              {c.related.map((r, i) => (
                <Link key={r.slug} href={`/compounds/${pathway}/${r.slug}`} className="prow">
                  <span className="no mono-n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="nm">{r.name}</span>
                  <span className="sm">{pick(locale, r.compound_class_en, r.compound_class_id)}</span>
                  <span className="ct"><span className="mono-n">{tc('lots_count', { count: r.lots })}</span><Icon name="arrow" className="ar" /></span>
                </Link>
              ))}
            </div>
            <div className="sp-24" />
            <Link href={`/compounds/${pathway}`} className="tlink">{t('all_in_pathway', { pathway: pathwayName })} <Icon name="arrow" className="ar" /></Link>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ commerce */}
      <section className="cp-sec" id="request">
        <div className="wrap">
          <div className="hd"><span className="no">{nCommerce}</span><h2>{t('s6')}</h2></div>
          <Reveal as="div" className="split wide">
            <div className="cp-body">
              <p>{t('commerce_lead')}</p>
              {!anyPrice ? <p>{t('commerce_gated')}</p> : null}
              <div className="acts" style={{ marginTop: 32 }}>
                <Link href="/request" className="btn btn-solid">{t('request_basket')}</Link>
                <Link href="/price-list" className="tlink">{tn('price_list')} <Icon name="arrow" className="ar" /></Link>
              </div>
            </div>
            <div>
              <p className="note">{tc('gated_line')}</p>
              <p style={{ marginTop: 14 }}>
                <Link href={{ pathname: '/sign-in', query: { next: here } }} className="tlink">{tc('sign_in')} <Icon name="arrow" className="ar" /></Link>
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------------- RUO */}
      <section className="cp-sec" id="ruo">
        <div className="wrap">
          <div className="hd"><span className="no">{nRuo}</span><h2>{t('s7')}</h2></div>
          <div className="ruo">{pick(locale, settings.ruo_notice.en, settings.ruo_notice.id)}</div>
        </div>
      </section>
    </>
  );
}
