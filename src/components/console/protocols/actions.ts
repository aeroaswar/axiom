'use server';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { attempt, int, list, str } from '../shared/act';
import type { ActionState } from '../shared/action-form';

/**
 * Every mutation is one `axiom.*` call. Nothing here writes a column: the three protocol tables
 * carry no write policy and no write grant, so a direct UPDATE from this layer is refused by the
 * database rather than quietly succeeding. That is what keeps `protocol_events` honest.
 *
 * The dosing fields below are per-client operational data and reach the database as parameters.
 * No amount, frequency or route is written down in this file — decision 12.
 */

const WEEKDAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

/** The recurrence, read off the form once, so the add and edit paths cannot drift apart. */
function recurrence(form: FormData) {
  const ends = str(form, 'ends_on');
  const count = str(form, 'occurrences');
  return {
    lot: str(form, 'lot_id') || null,
    brief: str(form, 'brief'),
    amount: str(form, 'amount') || null,
    route: str(form, 'route') || null,
    freq: str(form, 'freq') || 'weekly',
    everyN: Math.min(Math.max(int(form, 'every_n', 1) || 1, 1), 52),
    byday: list(form, 'byday').filter(d => WEEKDAYS.includes(d)),
    at: str(form, 'at_time') || '08:00',
    starts: str(form, 'starts_on') || null,
    // UNTIL and COUNT are mutually exclusive in a recurrence rule and the column refuses the pair,
    // so an end date wins and the count is dropped rather than the save being refused.
    ends: ends || null,
    count: ends ? null : (count ? int(form, 'occurrences') : null),
    reminder: int(form, 'reminder_min', 30),
  };
}

export async function issueProtocol(_prev: ActionState, form: FormData): Promise<ActionState> {
  let created = '';
  const result = await attempt(async tx => {
    const rows = await tx<{ id: string }[]>`
      select axiom.issue_protocol(
        ${str(form, 'account_id')}::uuid, ${str(form, 'title')}, ${str(form, 'subject_label') || null},
        ${str(form, 'locale') || 'id'}, ${str(form, 'starts_on') || null}::date) as id`;
    created = rows[0].id;
  }, 'protocols.new_form.submit');
  if (result?.ok) redirect({ href: `/console/protocols/${created}`, locale: await getLocale() });
  return result;
}

export async function addProtocolItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  const r = recurrence(form);
  return attempt(async tx => {
    await tx`
      select axiom.add_protocol_item(
        ${str(form, 'protocol_id')}::uuid, ${str(form, 'variant_id')}::uuid, ${r.lot}::uuid,
        ${r.brief}, ${r.amount}, ${r.route}, ${r.freq}::public.recur_freq, ${r.everyN}, ${r.byday},
        ${r.at}::time, ${r.starts}::date, ${r.ends}::date, ${r.count}, ${r.reminder})`;
  }, 'protocols.item.added');
}

export async function updateProtocolItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  const r = recurrence(form);
  return attempt(async tx => {
    await tx`
      select axiom.update_protocol_item(
        ${str(form, 'item_id')}::uuid, ${r.lot}::uuid, ${r.brief}, ${r.amount}, ${r.route},
        ${r.freq}::public.recur_freq, ${r.everyN}, ${r.byday}, ${r.at}::time,
        ${r.starts}::date, ${r.ends}::date, ${r.count}, ${r.reminder})`;
  }, 'protocols.item.saved');
}

export async function endProtocolItem(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async tx => {
    await tx`select axiom.end_protocol_item(${str(form, 'item_id')}::uuid)`;
  }, 'protocols.item.ended_msg');
}

export async function revokeProtocol(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async tx => {
    await tx`select axiom.revoke_protocol(${str(form, 'protocol_id')}::uuid)`;
  }, 'protocols.revoked');
}
