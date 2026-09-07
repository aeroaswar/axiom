'use server';
import { attempt, bool, money, str } from '../shared/act';
import type { ActionState } from '../shared/action-form';

/**
 * The selling price is set here and nowhere else, per lot, never derived from cost. The database
 * refuses anyone but the owner and writes the audit row itself: who, when, from, to. Revalidating
 * the root layout is what makes the public price list and every product page follow.
 */
export async function setPrice(_prev: ActionState, form: FormData): Promise<ActionState> {
  const variantId = str(form, 'variant_id');
  const price = money(form, 'price').toString();
  return attempt(async tx => {
    await tx`select axiom.set_price(${variantId}::uuid, ${price}::bigint)`;
  }, 'pricing.sheet.price_set');
}

/** Supplier cost and the pen. Base price is their sum and is never entered by hand. */
export async function setCost(_prev: ActionState, form: FormData): Promise<ActionState> {
  const variantId = str(form, 'variant_id');
  const supplier = money(form, 'supplier').toString();
  const pen = money(form, 'pen').toString();
  return attempt(async tx => {
    await tx`select axiom.set_cost(${variantId}::uuid, ${supplier}::bigint, ${pen}::bigint, ${bool(form, 'assumed')})`;
  }, 'pricing.sheet.cost_saved');
}
