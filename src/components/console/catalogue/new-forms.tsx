import { getLocale, getTranslations } from 'next-intl/server';
import { ActionForm } from '../shared/action-form';
import { createProduct, createVariant } from './actions';
import type { PathwayOption, ProductOption } from './data';

/**
 * A product is the compound or the item; a variant is the lot that carries a price and a shelf.
 * Two forms, in that order, because a variant cannot exist before its product does.
 */
export async function NewForms({ pathways, products }: { pathways: PathwayOption[]; products: ProductOption[] }) {
  const t = await getTranslations('console.catalogue');
  const locale = await getLocale();
  const name = (p: PathwayOption) => `${p.no} · ${locale === 'en' ? p.name_en : p.name_id}`;

  return (
    <>
      <div className="sec-h"><span className="kicker">{t('product_form.title')}</span></div>
      <ActionForm action={createProduct} submit={t('product_form.submit')} tone="accent">
        <div className="fgrid">
          <div className="field">
            <label htmlFor="pathway_id">{t('product_form.pathway')}</label>
            <select id="pathway_id" name="pathway_id" defaultValue={String(pathways[0]?.id ?? '')}>
              {pathways.map(p => <option key={p.id} value={p.id}>{name(p)}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="kind">{t('product_form.kind')}</label>
            <select id="kind" name="kind" defaultValue="peptide">
              <option value="peptide">{t('product_form.kinds.peptide')}</option>
              <option value="device">{t('product_form.kinds.device')}</option>
              <option value="apparel">{t('product_form.kinds.apparel')}</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="name">{t('product_form.name')}</label>
            <input id="name" name="name" required autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="slug">{t('product_form.slug')}</label>
            <input id="slug" name="slug" required autoComplete="off" />
          </div>
        </div>
      </ActionForm>
      <p className="note" style={{ marginTop: 10 }}>{t('product_form.note')}</p>

      <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('variant_form.title')}</span></div>
      <ActionForm action={createVariant} submit={t('variant_form.submit')}>
        <div className="fgrid">
          <div className="field wide">
            <label htmlFor="product_id">{t('variant_form.product')}</label>
            <select id="product_id" name="product_id" defaultValue={products[0]?.id ?? ''}>
              {products.map(p => <option key={p.id} value={p.id}>{p.pathway_no} · {p.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sku">{t('variant_form.sku')}</label>
            <input id="sku" name="sku" required autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="vdose">{t('variant_form.dose')}</label>
            <input id="vdose" name="dose" required autoComplete="off" />
          </div>
          <div className="field wide">
            <label htmlFor="vcontent">{t('variant_form.content')}</label>
            <input id="vcontent" name="content" required autoComplete="off" />
          </div>
        </div>
      </ActionForm>
      <p className="note" style={{ marginTop: 10 }}>{t('variant_form.note')}</p>
    </>
  );
}
