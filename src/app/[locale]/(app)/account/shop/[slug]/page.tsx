import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Sheet } from '@/components/shell/sheet';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { idr } from '@/lib/money';
import { getCompound, pick } from '@/lib/site/catalogue';
import { getSettings } from '@/lib/settings';
import { accountSession } from '@/components/account/data';
import { getSaved } from '@/components/account/saved';
import { AddToBasket, SaveToggle } from '@/components/account/client-forms';
import { RuoNote, WaLink } from '@/components/account/ui';

export const dynamic = 'force-dynamic';

/**
 * The product sheet: one compound, its lots as dose rows, each with its own price, availability
 * and Add. A lot with nothing available is not priced into a promise — it says so and offers the
 * one thing that helps, which is asking to be told when it is back.
 */
export default async function ProductSheet({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.shop');
  const tc = await getTranslations('common');
  const locale = await getLocale();

  const [c, settings, saved] = await Promise.all([getCompound(slug, session.uid), getSettings(), getSaved()]);
  if (!c) notFound();

  const lots = c.variants.slice().sort((a, b) => a.sort - b.sort);
  const first = lots[0];
  const peptide = c.kind === 'peptide';
  const handling = pick(locale, c.handling_en, c.handling_id) || pick(locale, settings.handling_baseline.en, settings.handling_baseline.id);
  const cls = pick(locale, c.compound_class_en, c.compound_class_id);
  const mol = pick(locale, c.molecular_class_en, c.molecular_class_id);

  const footer = (
    <>
      {first ? <SaveToggle sku={first.sku} saved={saved.includes(first.sku)} /> : null}
      {first && first.price_idr === null
        ? <Link className="btn btn-sm btn-primary" href="/account/profile#acknowledgement">{t('gate_link')}</Link>
        : first && first.available > 0
          ? <AddToBasket sku={first.sku} label={t('add')} done={t('added')} solid />
          : <WaLink number={settings.whatsapp.number} label={t('notify')} text={t('notify_wa', { name: c.name })} solid />}
    </>
  );

  return (
    <Sheet backHref="/account/shop" closeLabel={tc('close')} title={c.name}
      kicker={t('sheet_kicker', { no: c.pathway.no, pathway: pick(locale, c.pathway.name_en, c.pathway.name_id) })}
      footer={footer}>

      <div className="doselist">
        {lots.map(v => (
          <div className="doserow" key={v.sku}>
            <span className="d">
              <b>{v.dose}</b>
              <span className="sub">{v.content}</span>
            </span>
            <span className="a">
              {v.available <= 0 ? <span className="chip err"><span className="dot" />{t('out')}</span>
                : v.available <= 3 ? <span className="chip warn"><span className="dot" />{t('left', { count: v.available })}</span>
                  : <span className="dim-2">{t('available_many')}</span>}
            </span>
            <span className="p">{v.price_idr === null ? <span className="dim-2">{t('gated')}</span> : idr(v.price_idr)}</span>
            <span className="c">
              {v.price_idr !== null && v.available > 0 ? <AddToBasket sku={v.sku} label={t('add')} done={t('added')} /> : null}
            </span>
          </div>
        ))}
      </div>

      {lots.some(v => v.available <= 0) ? <p className="note" style={{ marginTop: 12 }}>{t('notify_note')}</p> : null}

      <div className="block">
        {cls ? <div className="kv"><span className="k">{t('compound_class')}</span><span className="v">{cls}</span></div> : null}
        {mol ? <div className="kv"><span className="k">{t('molecular_class')}</span><span className="v">{mol}</span></div> : null}
        {c.cas_no ? <div className="kv"><span className="k">{t('cas')}</span><span className="v tnum">{c.cas_no}</span></div> : null}
        {c.synonyms.length ? <div className="kv"><span className="k">{t('synonyms')}</span><span className="v">{c.synonyms.join(' · ')}</span></div> : null}
        {peptide ? (
          <div className="kv">
            <span className="k">{t('verification')}</span>
            <span className="v">{t('verification_value', { method: settings.verification.method, pct: settings.verification.purity_threshold_pct })}</span>
          </div>
        ) : null}
        {handling ? <div className="kv"><span className="k">{t('handling')}</span><span className="v">{handling}</span></div> : null}
        {lots.some(v => v.is_cold_chain) ? <div className="kv"><span className="k">{t('cold_chain')}</span><span className="v" /></div> : null}
      </div>

      <p style={{ marginTop: 18 }}>
        <Link className="tlink" href={`/compounds/${c.pathway.slug}/${c.slug}`}>{t('open_guide')} <Icon name="arrow" /></Link>
      </p>

      {peptide ? <RuoNote /> : null}
    </Sheet>
  );
}
