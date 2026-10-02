'use server';
import { attempt, str } from '../shared/act';
import type { ActionState } from '../shared/action-form';

/**
 * The one stage a person sets. Every other stage follows the record: an acknowledgement makes a
 * lead acknowledged, a sent quote makes it quoted, an accepted one makes it won, a lost one lost.
 * The function refuses a non-staff caller and writes the move to the activity log.
 */
export async function setStage(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async tx => {
    await tx`select axiom.set_lead_stage(${str(form, 'lead_id')}::uuid, ${str(form, 'stage')}::public.lead_stage, ${str(form, 'note') || null})`;
  }, 'leads.moved');
}
