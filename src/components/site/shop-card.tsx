import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { idr } from '@/lib/money';
import { fromPrice, pick, soldOut, type Compound } from '@/lib/site/catalogue';
import { AddToBasket } from './add-to-basket';
import { SaveHeart } from './save-heart';
import { ProductImage } from './product-image';

/**
 * One compound, one card, in the shape the reference uses: the image with the bookmark over it,
 * the name and its class, "From" and the lowest price, one full-width Add. The image and the name
 * are the link to the product page; the bookmark and Add are real forms that sit above the link's
 * overlay. Add posts the first available size, quantity one, one-time; a plan is chosen on the
 * product page. Sold out when every lot of the compound has nothing available.
 */
export async function ShopCard({ c, locale, purity, ruo, index }: {
  c: Compound; locale: string; purity: string; ruo: string; index?: number;
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
      {peptide && !out ? <span className="tag">{t('plan_tag')}</span> : null}
      <Link href={`/products/${c.slug}`} className="img lk" aria-label={c.name}>
        <ProductImage slug={c.slug} name={c.name} dose={first?.dose} purity={purity} kind={c.kind} size="card" ruo={ruo} />
      </Link>
      <div className="body">
        <div className="row">
          <div>
            <h3 className="nm"><Link href={`/products/${c.slug}`} className="lk">{c.name}</Link></h3>
            <p className="cls">{cls}</p>
          </div>
          <span className="pr">
            {from === null ? <small>{t('view')}</small> : (
              <><small>{c.variants.length > 1 ? t('from', { price: '' }).trim() : ' '}</small><span className="mono-n">{idr(from)}</span></>
            )}
          </span>
        </div>
        <div className="add">
          {out || !first || first.price_idr === null ? (
            <button type="button" className="btn btn-sm" disabled>{out ? t('sold_out_btn') : t('view')}</button>
          ) : (
            <AddToBasket sku={first.sku} label={t('add')} busy={t('adding')} done={t('added')} />
          )}
        </div>
      </div>
    </article>
  );
}
