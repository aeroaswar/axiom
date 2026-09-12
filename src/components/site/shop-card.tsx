import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { idr } from '@/lib/money';
import { fromPrice, pick, soldOut, type Compound } from '@/lib/site/catalogue';
import { QuickAdd } from './quick-add';
import { SaveHeart } from './save-heart';
import { ProductImage } from './product-image';

/**
 * One compound, one card, in the shape the reference uses: the image with the bookmark over it,
 * the name and its class, "From" and the lowest price with its tax treatment, one full-width Add.
 * The image and the name are the link to the product page; the bookmark and Add are real forms
 * that sit above the link's overlay. Add opens the card's chooser (size, one-time or a plan) where
 * there is a choice to make, and posts straight away where there is none. The certificate mark
 * appears only where a certificate for the compound is published. Sold out when every lot of the
 * compound has nothing available.
 */
export async function ShopCard({ c, locale, purity, ruo, index, tiers = [], ppn, certified = false }: {
  c: Compound; locale: string; purity: string; ruo: string; index?: number;
  tiers?: { days: number; pct: number }[]; ppn: number; certified?: boolean;
}) {
  const t = await getTranslations('site.shop');
  const from = fromPrice(c);
  const out = soldOut(c);
  const cls = pick(locale, c.compound_class_en, c.compound_class_id) || pick(locale, c.pathway.name_en, c.pathway.name_id);
  const first = c.variants.find(v => v.available > 0 && v.price_idr !== null) ?? c.variants[0];
  const peptide = c.kind === 'peptide';
  return (
    <article
      className={`pcard shop2${out ? ' out' : ''}`}
      data-kind={c.kind} data-compound={c.slug} data-priced={from !== null ? '1' : '0'}
      style={index !== undefined ? ({ ['--i' as string]: index } as React.CSSProperties) : undefined}
    >
      {first ? <SaveHeart sku={first.sku} /> : null}
      {peptide && !out && tiers.length ? <span className="tag">{t('plan_tag')}</span> : null}
      <Link href={`/products/${c.slug}`} className="img lk" aria-label={c.name}>
        <ProductImage slug={c.slug} name={c.name} dose={first?.dose} purity={purity} kind={c.kind} size="card" ruo={ruo} />
      </Link>
      <div className="body">
        <div className="row">
          <div>
            <h3 className="nm"><Link href={`/products/${c.slug}`} className="lk">{c.name}</Link></h3>
            <p className="cls">{cls}</p>
            {certified ? <span className="coa-mark"><Icon name="check" /> {t('certified')}</span> : null}
          </div>
          <span className="pr">
            {from === null ? <small>{t('view')}</small> : (
              <>
                <small>{c.variants.length > 1 ? t('from', { price: '' }).trim() : ' '}</small>
                <span className="mono-n">{idr(from)}</span>
                <small className="tax">{t('tax_note')}</small>
              </>
            )}
          </span>
        </div>
        <div className="add">
          {out || !first || first.price_idr === null ? (
            <button type="button" className="btn btn-sm" disabled>{out ? t('sold_out_btn') : t('view')}</button>
          ) : (
            <QuickAdd
              kind={c.kind} initialSku={first.sku} ppn={ppn} tiers={peptide ? tiers : []}
              variants={c.variants.map(v => ({ sku: v.sku, dose: v.dose, price_idr: v.price_idr, available: v.available }))}
            />
          )}
        </div>
      </div>
    </article>
  );
}
