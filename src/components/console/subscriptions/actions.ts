'use server';
import { attempt, str } from '../shared/act';
import type { ActionState } from '../shared/action-form';

/** AXIOM raises the next period's quote from a plan: one `requested` quote, priced and sent from
 *  Orders & quotes like any other. The function refuses a second while one is open. */
export async function raiseRenewal(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, 'id');
  return attempt(async tx => { await tx`select axiom.raise_renewal(${id}::uuid)`; }, 'subscriptions.raised');
}
