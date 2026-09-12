import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { HeroMount } from '@/components/site/hero-mount';
import { Reveal, Stagger } from '@/components/site/reveal';
import { JsonLd } from '@/components/site/json-ld';
import { ShopCard } from '@/components/site/shop-card';
import { ProductImage } from '@/components/site/product-image';
import { PenHero } from '@/components/site/pen-hero';
import { getCatalogue, getCoas, getCounts, getPathways, groupCompounds, pick } from '@/lib/site/catalogue';
import { alternates, organizationLd } from '@/lib/site/seo';
import { getPlanTiers, getSettings } from '@/lib/settings';
import { pct } from '@/lib/money';
import { fmtLong } from '@/lib/domain/dates';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site.home' });
  return { title: t('title'), description: t('description'), alternates: alternates(locale, '/') };
}

/**
 * The storefront's front door: the hero, the catalogue (the `#catalog` anchor the nav and the
 * outside world point at), the plan, the standard with the certificate library, the merch, and the
 * one call to action. Every figure on the page is derived — counts, tiers, the newest certificate —
 * so the page can never claim what the database does not hold.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('site.home');
  const tc = await getTranslations('common');
  const tn = await getTranslations('nav');
  const [counts, pathways, settings, tiers, rows, coas] = await Promise.all([getCounts(), getPathways(), getSettings(), getPlanTiers(), getCatalogue(), getCoas()]);
  const research = pathways.filter(p => p.kind === 'peptide');
  const threshold = `≥ ${settings.verification.purity_threshold_pct}%`;
  const method = settings.verification.method;
  // Eight compounds across the pathways: the first of each research pathway, then the next ones.
  const compounds = groupCompounds(rows.filter(r => r.kind === 'peptide'));
  const featured: typeof compounds = [];
  for (const p of research) { const c = compounds.find(x => x.pathway.slug === p.slug && !featured.includes(x)); if (c) featured.push(c); }
  for (const c of compounds) { if (featured.length >= 8) break; if (!featured.includes(c)) featured.push(c); }
  featured.length = Math.min(featured.length, 8);
  const merch = groupCompounds(rows.filter(r => r.kind === 'apparel'));
  const latestCoa = coas.find(c => !c.is_sample) ?? coas[0] ?? null;
  const certified = new Set(coas.filter(c => !c.is_sample && c.slug).map(c => c.slug as string));
  const ppn = Number(settings.ppn_rate);
  const [t1, t2, t3] = tiers;
  const ruoShort = tc('ruo_short');

  return (
    <>
      <JsonLd data={organizationLd(locale, { name: 'AXIOM', description: tc('boilerplate'), whatsapp: settings.whatsapp.number })} />
      <HeroMount />

      {/* ------------------------------------------------------------- hero */}
      <section className="hero split-hero">
        <div className="wrap hero-grid">
          <div>
            <span className="kicker">{t('kicker')}</span>
            <h1>
              <span className="l">{t('hero_l1')}</span>
              <span className="l">{t('hero_l2')} <em>{t('hero_em')}</em></span>
            </h1>
            <p className="lead">{t('lead')}</p>
            <div className="hero-cta">
              <Link href="/products" className="btn btn-solid">{t('cta_shop')} <Icon name="arrow" /></Link>
              <Link href="/coas" className="btn">{t('cta_coas')}</Link>
            </div>
            <div className="badges">
              <span className="badge"><Icon name="check" />{t('badge_purity', { threshold })}</span>
              <span className="badge"><Icon name="flask" />{t('badge_tested', { method })}</span>
              <span className="badge"><Icon name="truck" />{t('badge_cold')}</span>
            </div>
          </div>
          <div className="hero-vials">
            {featured[0] ? (
              <PenHero label={{ name: featured[0].name, qty: featured[0].variants[0]?.dose ?? undefined, wordmark: 'AXIOM', ruo: ruoShort, purity: threshold }}>
                <ProductImage slug={featured[0].slug} name={featured[0].name} dose={featured[0].variants[0]?.dose} purity={threshold} ruo={ruoShort} size="hero" priority />
              </PenHero>
            ) : null}
            <div className="hero-flank">
              {featured[1] ? <Link href={`/products/${featured[1].slug}`} className="flank" aria-label={featured[1].name}><ProductImage slug={featured[1].slug} name={featured[1].name} dose={featured[1].variants[0]?.dose} purity={threshold} ruo={ruoShort} size="card" /></Link> : null}
              {featured[2] ? <Link href={`/products/${featured[2].slug}`} className="flank" aria-label={featured[2].name}><ProductImage slug={featured[2].slug} name={featured[2].name} dose={featured[2].variants[0]?.dose} purity={threshold} ruo={ruoShort} size="card" /></Link> : null}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- feature strip */}
      <section className="wrap" style={{ paddingBottom: 8 }}>
        <Stagger className="feats">
          <div className="feat"><Icon name="truck" /><h3>{t('feat_1_t')}</h3><p>{t('feat_1_b')}</p></div>
          <div className="feat"><Icon name="receipt" /><h3>{t('feat_2_t')}</h3><p>{t('feat_2_b')}</p></div>
          <div className="feat"><Icon name="flask" /><h3>{t('feat_3_t', { method })}</h3><p>{t('feat_3_b', { threshold })}</p></div>
        </Stagger>
      </section>

      {/* ---------------------------------------------------------- featured */}
      <section className="band" id="catalog" style={{ borderTop: 'none' }}>
        <div className="wrap" style={{ paddingTop: 72 }}>
          <Reveal as="div" className="chead">
            <h2>{t('featured_title')} <em>{t('featured_em')}</em></h2>
            <p className="lead">{t('featured_sub')} {tc('compounds', { count: counts.compounds })} · {tc('lots', { count: counts.lots })}.</p>
          </Reveal>
          <div className="sp-44" />
          <Stagger className="pgrid cards">
            {featured.map(c => <ShopCard key={c.slug} c={c} locale={locale} purity={threshold} ruo={ruoShort} tiers={tiers} ppn={ppn} certified={certified.has(c.slug)} />)}
          </Stagger>
          <div className="sp-44" />
          <div className="acts" style={{ justifyContent: 'center' }}>
            <Link href="/products" className="btn btn-solid">{t('featured_all')}</Link>
            <Link href="/price-list" className="tlink">{tn('price_list')} <Icon name="arrow" className="ar" /></Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- subscribe & save */}
      {tiers.length ? (
        <section className="band" id="subscribe">
          <div className="wrap">
            <Reveal as="div" className="shead duo">
              <span className="no">02</span>
              <div>
                <span className="kicker k">{t('sub_kicker')}</span>
                <h2>{t('sub_title')}</h2>
                <p>{t('sub_body')}</p>
              </div>
            </Reveal>
            <Stagger className="plan-steps">
              <div>
                <span className="no">01</span>
                <h3>{t('sub_1_t')}</h3>
                <p>{t('sub_1_b')}</p>
              </div>
              <div>
                <span className="no">02</span>
                <h3>{t('sub_2_t')}</h3>
                <p>{t('sub_2_b', { d1: t1?.days ?? 0, d2: t2?.days ?? 0, d3: t3?.days ?? 0, p1: t1?.pct ?? 0, p2: t2?.pct ?? 0, p3: t3?.pct ?? 0 })}</p>
                <div className="tiers">
                  {tiers.map(x => <span key={x.days} className="mono-n">{tc('every_days', { days: x.days })}<b>{pct(x.pct, 0)}</b></span>)}
                </div>
              </div>
              <div>
                <span className="no">03</span>
                <h3>{t('sub_3_t')}</h3>
                <p>{t('sub_3_b')}</p>
              </div>
            </Stagger>
            <div className="sp-44" />
            <Link href="/products?kind=peptide" className="tlink">{t('sub_cta')} <Icon name="arrow" className="ar" /></Link>
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- the standard */}
      <section className="band" id="standard">
        <div className="wrap">
          <Reveal as="div" className="shead duo">
            <span className="no">02</span>
            <div>
              <span className="kicker k">{t('std_kicker')}</span>
              <h2>{t('std_title')}</h2>
              <p>{t('std_body')}</p>
            </div>
          </Reveal>
          <Stagger className="stmts">
            <div className="stmt">
              <span className="idx">01</span>
              <div><h3>{t('std_purity_t', { method })}</h3><p>{t('std_purity_b', { method, threshold })}</p></div>
              <div className="fig mono-n">{threshold}<small>{t('meta_purity')}</small></div>
            </div>
            <div className="stmt">
              <span className="idx">02</span>
              <div><h3>{t('std_coa_t')}</h3><p>{t('std_coa_b')}</p></div>
              <div className="fig mono-n">{coas.length}<small>{tn('coas')}</small></div>
            </div>
            <div className="stmt">
              <span className="idx">03</span>
              <div><h3>{t('std_cold_t')}</h3><p>{t('std_cold_b')}</p></div>
            </div>
          </Stagger>
          <div className="sp-44" />
          <Reveal as="div" className="split">
            <div>
              <span className="kicker">{t('coa_kicker')}</span>
              <h3 style={{ fontSize: 'clamp(22px,2.6vw,32px)', marginTop: 14 }}>{t('coa_title')}</h3>
              <p className="lead" style={{ marginTop: 14 }}>{t('coa_body')}</p>
              <div className="acts" style={{ marginTop: 26 }}>
                <Link href="/coas" className="btn">{t('coa_link')}</Link>
                <Link href="/how-to-read-a-coa" className="tlink">{t('coa_read')} <Icon name="arrow" className="ar" /></Link>
              </div>
            </div>
            {latestCoa ? (
              <Link href={`/coas/${latestCoa.id}`} className="notice" style={{ display: 'block' }}>
                <dl className="dl">
                  <div className="r"><dt>{tn('coas')}</dt><dd>{latestCoa.product}{latestCoa.dose ? ` · ${latestCoa.dose}` : ''}</dd></div>
                  <div className="r"><dt>{t('meta_lots')}</dt><dd className="mono-n">{latestCoa.lot_code}</dd></div>
                  <div className="r"><dt>{t('meta_purity')}</dt><dd className="mono-n">{latestCoa.purity_pct === null ? '—' : pct(latestCoa.purity_pct, 2)}</dd></div>
                  <div className="r"><dt>{method}</dt><dd>{latestCoa.issued_at ? fmtLong(new Date(latestCoa.issued_at), locale) : '—'}</dd></div>
                </dl>
                <span className="tlink" style={{ marginTop: 18 }}>{t('coa_link')} <Icon name="arrow" className="ar" /></span>
              </Link>
            ) : null}
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------------- merch */}
      {merch.length ? (
        <section className="band" id="merch">
          <div className="wrap">
            <Reveal as="div" className="merch-band">
              <div>
                <span className="kicker">{t('merch_kicker')}</span>
                <h2 style={{ fontSize: 'clamp(26px,3.2vw,40px)', marginTop: 14 }}>{t('merch_title')}</h2>
                <p className="lead" style={{ marginTop: 16 }}>{t('merch_body')}</p>
                <div className="sp-24" />
                <Link href="/merch" className="tlink">{t('merch_link')} <Icon name="arrow" className="ar" /></Link>
              </div>
              <div className="strip">
                {merch.slice(0, 5).map(c => (
                  <Link key={c.slug} href={`/products/${c.slug}`}><Icon name="shirt" />{c.name}</Link>
                ))}
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------------------- next */}
      <section className="band" id="next">
        <div className="wrap">
          <Reveal as="div" className="shead">
            <span className="no">03</span>
            <div>
              <span className="kicker k">{t('cta_kicker')}</span>
              <div className="cta-band"><h2>{t('cta_title')}</h2></div>
              <p>{t('cta_body')}</p>
              <div className="acts" style={{ marginTop: 38 }}>
                <Link href="/products" className="btn btn-solid">{t('cta_shop_btn')}</Link>
                <Link href="/request" className="tlink">{t('cta_request_btn')} <Icon name="arrow" className="ar" /></Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
