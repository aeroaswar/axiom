'use server';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { attempt, bool, int, str } from '../shared/act';
import type { ActionState } from '../shared/action-form';

/**
 * Stock moves, it is never set. Every change appends to `stock_movements`; the balance is the sum.
 * A movement that would take on hand below zero is refused by a check constraint on the derived
 * balance, and that refusal is what the reader sees — the rule is in the database, not in this file.
 */
export async function recordMovement(_prev: ActionState, form: FormData): Promise<ActionState> {
  const variantId = str(form, 'variant_id');
  const delta = int(form, 'delta');
  const reason = str(form, 'reason');
  const ref = str(form, 'ref');
  return attempt(async tx => {
    await tx`select axiom.move_stock(${variantId}::uuid, ${delta}::int, ${reason}::public.move_reason, ${ref || null})`;
  }, 'catalogue.movement.recorded');
}

export async function saveVariant(_prev: ActionState, form: FormData): Promise<ActionState> {
  const variantId = str(form, 'variant_id');
  return attempt(async tx => {
    await tx`
      update public.product_variants set
        dose = ${str(form, 'dose')},
        content = ${str(form, 'content')},
        is_cold_chain = ${bool(form, 'is_cold_chain')},
        low_stock_threshold = ${int(form, 'low_stock_threshold', 3)},
        is_active = ${bool(form, 'is_active')}
      where id = ${variantId}::uuid`;
  });
}

export async function createProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  const slug = str(form, 'slug').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const result = await attempt(async tx => {
    await tx`
      insert into public.products (pathway_id, kind, slug, name, is_published)
      values (${int(form, 'pathway_id')}, ${str(form, 'kind')}::public.product_kind, ${slug}, ${str(form, 'name')}, false)`;
  });
  if (result?.ok) redirect({ href: `/console/content/${slug}`, locale: await getLocale() });
  return result;
}

export async function createVariant(_prev: ActionState, form: FormData): Promise<ActionState> {
  const sku = str(form, 'sku').toLowerCase().replace(/[^a-z0-9-]/g, '');
  const result = await attempt(async tx => {
    const rows = await tx<{ id: string }[]>`
      insert into public.product_variants (product_id, sku, dose, content, price_idr)
      values (${str(form, 'product_id')}::uuid, ${sku}, ${str(form, 'dose')}, ${str(form, 'content')}, 0)
      returning id`;
    // A lot with no cost row never reaches the margin book. Only the owner may write one, so this is
    // attempted and not required: an ops-created lot is completed by the owner in the price list.
    try { await tx.savepoint(sp => sp`select axiom.set_cost(${rows[0].id}::uuid, 0, 0, true)`); } catch { /* owner-only */ }
  });
  if (result?.ok) redirect({ href: `/console/catalogue/${sku}`, locale: await getLocale() });
  return result;
}
