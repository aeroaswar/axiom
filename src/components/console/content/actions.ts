'use server';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { lintFields } from '@/lib/copy-lint';
import { attempt, str } from '../shared/act';
import type { ActionState } from '../shared/action-form';

/** The fields the copy lint reads, and the label each one carries in a refusal. */
const LINTED = ['identity_en', 'identity_id', 'research_en', 'research_id', 'handling_en', 'handling_id'] as const;

/**
 * Saving runs the copy lint first — the same rule the CI gate runs over the catalogues. A finding is
 * a refusal, not a warning: nothing is written, and the reader is told which field and which word.
 */
export async function saveContent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const t = await getTranslations('console.content');
  const fields = Object.fromEntries(LINTED.map(f => [f, str(form, f)]));
  const findings = lintFields({ ...fields, name: str(form, 'name') });
  if (findings.length) {
    return {
      error: t('editor.lint_title'),
      errors: findings.map(f => t(`editor.lint.${f.code}`, { field: t(`editor.${f.field}`), detail: f.detail })),
    };
  }
  const slug = str(form, 'slug');
  const synonyms = str(form, 'synonyms').split(',').map(s => s.trim()).filter(Boolean);
  const result = await attempt(async tx => {
    await tx`
      update public.products set
        name = ${str(form, 'name')},
        synonyms = ${synonyms},
        compound_class_en = ${str(form, 'compound_class_en') || null},
        compound_class_id = ${str(form, 'compound_class_id') || null},
        molecular_class_en = ${str(form, 'molecular_class_en') || null},
        molecular_class_id = ${str(form, 'molecular_class_id') || null},
        cas_no = ${str(form, 'cas_no') || null},
        identity_en = ${fields.identity_en || null},
        identity_id = ${fields.identity_id || null},
        research_en = ${fields.research_en || null},
        research_id = ${fields.research_id || null},
        handling_en = ${fields.handling_en || null},
        handling_id = ${fields.handling_id || null}
      where slug = ${slug}`;
  }, 'content.editor.saved');
  if (result?.ok) revalidatePath('/', 'layout');
  return result;
}

export async function addReference(_prev: ActionState, form: FormData): Promise<ActionState> {
  const t = await getTranslations('console.content');
  const pubmed = str(form, 'pubmed_id');
  const doi = str(form, 'doi');
  if (!pubmed && !doi) return { error: t('references.need_one') };
  const productId = str(form, 'product_id');
  const result = await attempt(async tx => {
    await tx`
      insert into public.product_references (product_id, claim_key, citation, pubmed_id, doi, url)
      values (${productId}::uuid, ${str(form, 'claim_key')}, ${str(form, 'citation')},
              ${pubmed || null}, ${doi || null}, ${str(form, 'url') || null})`;
  }, 'content.references.added');
  if (result?.ok) revalidatePath('/', 'layout');
  return result;
}

export async function deleteReference(_prev: ActionState, form: FormData): Promise<ActionState> {
  const result = await attempt(async tx => {
    await tx`delete from public.product_references where id = ${str(form, 'reference_id')}::uuid`;
  }, 'content.references.deleted');
  if (result?.ok) revalidatePath('/', 'layout');
  return result;
}

/**
 * Publishing is refused while research text stands with no reference behind it, because the public
 * page would not render that section either — a page that claims and does not cite is the liability
 * this build exists to make impossible.
 */
export async function setPublished(_prev: ActionState, form: FormData): Promise<ActionState> {
  const t = await getTranslations('console.content');
  const slug = str(form, 'slug');
  const publish = str(form, 'publish') === '1';
  if (publish) {
    const guard = await attempt(async tx => {
      const rows = await tx<{ blocked: boolean }[]>`
        select (coalesce(p.research_en, '') <> '' or coalesce(p.research_id, '') <> '')
               and axiom.reference_count(p.id) = 0 as blocked
        from public.products p where p.slug = ${slug}`;
      if (rows[0]?.blocked) throw new Error(t('publish.refused'));
    });
    if (guard?.error) return { error: t('publish.refused') };
  }
  const result = await attempt(async tx => {
    await tx`
      update public.products
      set is_published = ${publish}, published_at = ${publish ? new Date() : null}
      where slug = ${slug}`;
  }, publish ? 'content.publish.done' : 'content.publish.undone');
  if (result?.ok) revalidatePath('/', 'layout');
  return result;
}
