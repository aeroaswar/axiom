import { getLocale, getTranslations } from 'next-intl/server';
import { idr } from '@/lib/money';
import type { Settings } from '@/lib/settings';
import { ActionButton, ActionForm } from '../shared/action-form';
import { addReference, deleteReference, saveContent, setPublished } from './actions';
import type { Lot, ProductContent, Reference } from './data';

/**
 * The compound guide, edited beside the page it produces. Research text renders in the preview only
 * when a reference stands behind it, exactly as the public page decides — so what is on the left is
 * what a clinic will read, and nothing is discovered after publishing.
 */
export async function ContentEditor({ p, references, lots, settings }: {
  p: ProductContent; references: Reference[]; lots: Lot[]; settings: Settings;
}) {
  const t = await getTranslations('console.content');
  const tc = await getTranslations('console.common');
  const locale = await getLocale();
  const df = new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const en = locale === 'en';

  const identity = en ? p.identity_en : p.identity_id;
  const research = en ? p.research_en : p.research_id;
  const handling = (en ? p.handling_en : p.handling_id) || (en ? settings.handling_baseline?.en : settings.handling_baseline?.id);
  const ownHandling = Boolean(en ? p.handling_en : p.handling_id);
  const compoundClass = en ? p.compound_class_en : p.compound_class_id;
  const molecular = en ? p.molecular_class_en : p.molecular_class_id;
  const blocked = Boolean((p.research_en || p.research_id) && references.length === 0);

  return (
    <>
      <span data-wide hidden />

      {/* publish ------------------------------------------------------------------- */}
      <div className="kv">
        <span className="k">{t('cols.state')}</span>
        <span className="v">
          {p.is_published
            ? t('publish.state_published', { date: p.published_at ? df.format(new Date(p.published_at)) : '' })
            : t('publish.state_unpublished')}
        </span>
      </div>
      <div className="formfoot" style={{ margin: '12px 0 4px' }}>
        <ActionButton action={setPublished} hidden={{ slug: p.slug, publish: p.is_published ? '0' : '1' }}
          submit={p.is_published ? t('publish.unpublish') : t('publish.publish')} tone={p.is_published ? undefined : 'accent'} />
      </div>
      {blocked ? <div className="refusal">{t('publish.refused')}</div> : null}

      {/* the record ---------------------------------------------------------------- */}
      <div className="sec-h" style={{ marginTop: 20 }}><span className="kicker">{t('editor.kicker')}</span></div>
      <ActionForm action={saveContent} submit={t('editor.submit')}>
        <input type="hidden" name="slug" value={p.slug} />
        <div className="fgrid">
          <div className="field">
            <label htmlFor="name">{t('editor.name')}</label>
            <input id="name" name="name" defaultValue={p.name} required />
          </div>
          <div className="field">
            <label htmlFor="cas_no">{t('editor.cas')}</label>
            <input id="cas_no" name="cas_no" defaultValue={p.cas_no ?? ''} autoComplete="off" />
            <span className="hint">{t('editor.cas_warning')}</span>
          </div>
          <div className="field wide">
            <label htmlFor="synonyms">{t('editor.synonyms')}</label>
            <input id="synonyms" name="synonyms" defaultValue={(p.synonyms ?? []).join(', ')} autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="compound_class_en">{t('editor.compound_class_en')}</label>
            <input id="compound_class_en" name="compound_class_en" defaultValue={p.compound_class_en ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="compound_class_id">{t('editor.compound_class_id')}</label>
            <input id="compound_class_id" name="compound_class_id" defaultValue={p.compound_class_id ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="molecular_class_en">{t('editor.molecular_class_en')}</label>
            <input id="molecular_class_en" name="molecular_class_en" defaultValue={p.molecular_class_en ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="molecular_class_id">{t('editor.molecular_class_id')}</label>
            <input id="molecular_class_id" name="molecular_class_id" defaultValue={p.molecular_class_id ?? ''} />
          </div>
          <div className="field wide">
            <label htmlFor="identity_en">{t('editor.identity_en')}</label>
            <textarea id="identity_en" name="identity_en" rows={4} defaultValue={p.identity_en ?? ''} />
          </div>
          <div className="field wide">
            <label htmlFor="identity_id">{t('editor.identity_id')}</label>
            <textarea id="identity_id" name="identity_id" rows={4} defaultValue={p.identity_id ?? ''} />
          </div>
          <div className="field wide">
            <label htmlFor="research_en">{t('editor.research_en')}</label>
            <textarea id="research_en" name="research_en" rows={6} defaultValue={p.research_en ?? ''} />
            <span className="hint">{t('editor.research_note')}</span>
          </div>
          <div className="field wide">
            <label htmlFor="research_id">{t('editor.research_id')}</label>
            <textarea id="research_id" name="research_id" rows={6} defaultValue={p.research_id ?? ''} />
          </div>
          <div className="field wide">
            <label htmlFor="handling_en">{t('editor.handling_en')}</label>
            <textarea id="handling_en" name="handling_en" rows={4} defaultValue={p.handling_en ?? ''} />
            <span className="hint">{t('editor.handling_note')}</span>
          </div>
          <div className="field wide">
            <label htmlFor="handling_id">{t('editor.handling_id')}</label>
            <textarea id="handling_id" name="handling_id" rows={4} defaultValue={p.handling_id ?? ''} />
          </div>
        </div>
      </ActionForm>

      {/* references ---------------------------------------------------------------- */}
      <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('references.title')}</span></div>
      {references.length ? (
        <div className="rows">
          {references.map(r => (
            <div className="row" key={r.id}>
              <span className="bd">
                <span className="t1">{r.citation}</span>
                <span className="t2">{r.claim_key} · {r.pubmed_id ? `PMID ${r.pubmed_id}` : `DOI ${r.doi}`}</span>
              </span>
              <span className="rt"><ActionButton action={deleteReference} submit={tc('delete')} hidden={{ reference_id: r.id }} /></span>
            </div>
          ))}
        </div>
      ) : <p className="empty">{t('references.empty')}</p>}
      <ActionForm action={addReference} submit={t('references.add')} resetOnSuccess>
        <input type="hidden" name="product_id" value={p.id} />
        <div className="fgrid">
          <div className="field">
            <label htmlFor="claim_key">{t('references.claim_key')}</label>
            <input id="claim_key" name="claim_key" required autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="pubmed_id">{t('references.pubmed')}</label>
            <input id="pubmed_id" name="pubmed_id" inputMode="numeric" autoComplete="off" />
          </div>
          <div className="field wide">
            <label htmlFor="citation">{t('references.citation')}</label>
            <input id="citation" name="citation" required autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="doi">{t('references.doi')}</label>
            <input id="doi" name="doi" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="url">{t('references.url')}</label>
            <input id="url" name="url" type="url" autoComplete="off" />
          </div>
        </div>
      </ActionForm>
      <p className="note">{t('references.need_one')}</p>

      {/* preview ------------------------------------------------------------------- */}
      <div className="sec-h" style={{ marginTop: 24 }}><span className="kicker">{t('preview.title')}</span></div>
      <div className="prev">
        <h4>{p.name}</h4>
        <div className="meta">
          {compoundClass ? <span><b>{t('preview.class')}</b> {compoundClass}</span> : null}
          {molecular ? <span><b>{t('preview.molecular')}</b> {molecular}</span> : null}
          {p.cas_no ? <span><b>{t('preview.cas')}</b> {p.cas_no}</span> : null}
          {p.synonyms?.length ? <span><b>{t('preview.synonyms')}</b> {p.synonyms.join(', ')}</span> : null}
        </div>

        <div className="sec-t">{t('preview.identity')}</div>
        {identity ? <p>{identity}</p> : <p className="dim-2">—</p>}

        <div className="sec-t">{t('preview.lots')}</div>
        <div className="rows">
          {lots.map(l => (
            <div className="row" key={l.sku}>
              <span className="bd"><span className="t1">{l.dose}</span><span className="t2">{l.content}</span></span>
              <span className="rt"><span className="amt">{idr(l.price_idr)}</span></span>
            </div>
          ))}
        </div>

        <div className="sec-t">{t('preview.research')}</div>
        {references.length && research ? <p>{research}</p> : <p className="dim-2">{t('preview.research_hidden')}</p>}

        <div className="sec-t">{t('preview.handling')}{ownHandling ? '' : ` · ${t('preview.baseline')}`}</div>
        <p>{handling}</p>

        <div className="sec-t">{t('preview.verification')}</div>
        <p>{t('preview.verification_text', { method: settings.verification?.method ?? '', pct: settings.verification?.purity_threshold_pct ?? '' })}</p>

        {p.kind === 'peptide' ? <div className="ruo" style={{ marginTop: 18 }}>{t('preview.ruo')}</div> : null}
      </div>
    </>
  );
}
