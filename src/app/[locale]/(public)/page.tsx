import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { HeroMount } from '@/components/site/hero-mount';
import { Reveal, Stagger } from '@/components/site/reveal';
import { JsonLd } from '@/components/site/json-ld';
import { ShopCard } from '@/components/site/shop-card';
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
  const merch = groupCompounds(rows.filter(r => r.kind === 'apparel'));
  const latestCoa = coas.find(c => !c.is_sample) ?? coas[0] ?? null;
  const [t1, t2, t3] = tiers;

  return (
    <>
      <JsonLd data={organizationLd(locale, { name: 'AXIOM', description: tc('boilerplate'), whatsapp: settings.whatsapp.number })} />
      <HeroMount />

      {/* ------------------------------------------------------------- hero */}
      <section className="hero">
        <div className="wrap hero-in">
          <span className="kicker">{t('kicker')}</span>
          <h1>{tc('tagline')}</h1>
          <p className="lead">{t('lead')}</p>
          <div className="hero-cta">
            <Link href="/products" className="btn btn-solid">{t('cta_shop')}</Link>
            <Link href="/compounds" className="tlink">{t('cta_guide')} <Icon name="arrow" className="ar" /></Link>
          </div>
        </div>
        <div className="hero-meta">
          <div className="wrap">
            <div className="m"><div className="k">{t('meta_compounds')}</div><div className="v mono-n">{counts.compounds}</div></div>
            <div className="m"><div className="k">{t('meta_lots')}</div><div className="v mono-n">{counts.lots}</div></div>
            <div className="m"><div className="k">{t('meta_pathways')}</div><div className="v mono-n">{counts.pathways}</div></div>
            <div className="m"><div className="k">{t('meta_purity')}</div><div className="v mono-n">{threshold}</div></div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- catalog */}
      <section className="band" id="catalog">
        <div className="wrap">
          <Reveal as="div" className="shead duo">
            <span className="no">01</span>
            <div>
              <span className="kicker k">{t('cat_kicker')}</span>
              <h2>{t('cat_title')}</h2>
              <p>{t('cat_body')}</p>
            </div>
          </Reveal>
          <Stagger className="cat-chips">
            <Link href="/products" className="chip on">{t('cat_all')}</Link>
            {research.map(p => (
              <Link key={p.slug} href={{ pathname: '/products', query: { pathway: p.slug } }} className="chip">
                <span className="mono-n" style={{ marginRight: 8, opacity: .6 }}>{p.no}</span>{pick(locale, p.name_en, p.name_id)}
              </Link>
            ))}
          </Stagger>
          <span className="tag">{t('cat_featured')}</span>
          <div className="sp-24" />
          <Stagger className="pgrid">
            {featured.map(c => <ShopCard key={c.slug} c={c} locale={locale} />)}
          </Stagger>
          <div className="sp-44" />
          <div className="acts">
            <Link href="/products" className="btn btn-solid">{t('cat_open')}</Link>
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
            <span className="no">03</span>
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
            <span className="no">04</span>
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
