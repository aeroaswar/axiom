import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { CoaDocument } from '@/components/site/coa-document';
import { PrintButton } from '@/components/site/print-button';
import { coaDocument } from '@/lib/documents/coa';
import { getCoa } from '@/lib/site/catalogue';
import { alternates } from '@/lib/site/seo';

export const revalidate = 60;

type Params = Promise<{ locale: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, id } = await params;
  const coa = await getCoa(id);
  const t = await getTranslations({ locale, namespace: 'site.coas' });
  if (!coa) return { title: t('title') };
  return { title: `${t('doc_title')} · ${coa.product ?? ''} · ${coa.lot_code ?? ''}`, description: t('description'), alternates: alternates(locale, `/coas/${id}`) };
}

/** One certificate, on the sheet every AXIOM document prints on; the PDF is the same markup. */
export default async function CoaPage({ params }: { params: Params }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const coa = await getCoa(id);
  if (!coa) notFound();
  const t = await getTranslations('site.coas');
  const tn = await getTranslations('nav');
  const ts = await getTranslations('site.common');
  const d = await coaDocument(locale, coa);
  return (
    <>
      <section className="page-hero" style={{ paddingBottom: 30 }}>
        <div className="wrap">
          <div className="crumbs">
            <span><Link href="/">{ts('home')}</Link></span>
            <span><Link href="/coas">{tn('coas')}</Link></span>
            <span>{coa.lot_code ?? coa.id.slice(0, 8)}</span>
          </div>
          <span className="kicker">{t('kicker')}{coa.is_sample ? ` · ${t('sample')}` : ''}</span>
          <h1 style={{ marginTop: 14 }}>{coa.product ?? t('doc_title')}{coa.dose ? <span className="dim"> · {coa.dose}</span> : null}</h1>
          <div className="coa-acts no-print">
            <a className="btn btn-solid" href={`/api/documents/coa/${coa.id}?locale=${locale}`}>{t('pdf')}</a>
            <PrintButton label={t('print')} />
            {coa.slug ? <Link href={`/products/${coa.slug}`} className="tlink">{t('product_link')} <Icon name="arrow" className="ar" /></Link> : null}
            <Link href="/coas" className="tlink">{t('back')} <Icon name="arrow" className="ar" /></Link>
          </div>
        </div>
      </section>
      <section className="wrap coa-view">
        <div className="doc-wrap coa-frame"><CoaDocument d={d} /></div>
      </section>
    </>
  );
}
