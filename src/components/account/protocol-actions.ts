'use server';
import { attempt, int, list, str, type Result } from './act';

/**
 * What an account may do to its own card. Authority is not decided here: `axiom.add_protocol_item`
 * and `axiom.end_protocol_item` accept a member of the owning account and refuse everyone else, so
 * these are the same functions the Console calls, reached by a different session.
 */

const WEEKDAYS: string[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export async function addOwnCompound(_prev: Result | null, form: FormData): Promise<Result> {
  const ends = str(form, 'ends_on');
  const byday = list(form, 'byday').filter(d => WEEKDAYS.includes(d));
  return attempt(async tx => {
    await tx`
      select axiom.add_protocol_item(
        ${str(form, 'protocol_id')}::uuid, ${str(form, 'variant_id')}::uuid, null,
        ${str(form, 'brief')}, ${str(form, 'amount') || null}, ${str(form, 'route') || null},
        ${str(form, 'freq') || 'weekly'}::public.recur_freq,
        ${Math.min(Math.max(int(form, 'every_n', 1) || 1, 1), 52)}, ${byday},
        ${str(form, 'at_time') || '08:00'}::time, ${str(form, 'starts_on') || null}::date,
        ${ends || null}::date, null, ${int(form, 'reminder_min', 30)})`;
  }, 'protocol_added');
}

export async function endOwnCompound(_prev: Result | null, form: FormData): Promise<Result> {
  return attempt(async tx => {
    await tx`select axiom.end_protocol_item(${str(form, 'item_id')}::uuid)`;
  }, 'protocol_ended');
}
