import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { idr } from '@/lib/money';
import { fromPrice, pick, soldOut, type Compound } from '@/lib/site/catalogue';

/**
 * One compound, one card: its lots as size chips, the lowest visible price, a plan tag on a
 * research compound, "sold out" only when every lot is. The whole card is the link, so the hover
 * is a promise the click keeps. Photography slots at /public/products/<slug>.jpg when it exists;
 * until then a tinted tile with the pathway's mark, never a fake product shot.
 */
export async function ShopCard({ c, locale, image, index }: { c: Compound; locale: string; image?: boolean; index?: number }) {
  const t = await getTranslations('site.shop');
  const from = fromPrice(c);
  const out = soldOut(c);
  const cls = pick(locale, c.compound_class_en, c.compound_class_id);
  const icon = c.kind === 'peptide' ? 'flask' : c.kind === 'device' ? 'sun' : 'shirt';
  return (
    <Link
      href={`/products/${c.slug}`}
      className={`pcard shop${out ? ' out' : ''}`}
      data-kind={c.kind}
      data-compound={c.slug}
      data-priced={from !== null ? '1' : '0'}
      style={index !== undefined ? ({ ['--i' as string]: index } as React.CSSProperties) : undefined}
    >
      {image ? <span className="img" aria-hidden="true"><Icon name={icon} /></span> : null}
      {out ? <span className="tag out">{t('sold_out')}</span> : c.kind === 'peptide' ? <span className="tag">{t('plan_tag')}</span> : null}
      <span className="no mono-n">{c.pathway.no} · {pick(locale, c.pathway.name_en, c.pathway.name_id)}</span>
      <span className="nm">{c.name}</span>
      {cls ? <span className="cls">{cls}</span> : null}
      <span className="doses" aria-label={t('sizes', { count: c.variants.length })}>
        {c.variants.map(v => <span key={v.sku} className="dose">{v.dose}</span>)}
      </span>
      <span className="pr">
        {from === null ? <small>{t('view')}</small> : (
          <>{c.variants.length > 1 ? <small>{t('from', { price: '' }).trim()}</small> : null}<span className="mono-n">{idr(from)}</span></>
        )}
      </span>
      <span className="go" aria-hidden="true"><Icon name="arrow" /></span>
    </Link>
  );
}
