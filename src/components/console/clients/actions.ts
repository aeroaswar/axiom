'use server';
import { getLocale } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { attempt, int, str } from '../shared/act';
import type { ActionState } from '../shared/action-form';

export async function saveAccount(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, 'account_id');
  const manager = str(form, 'manager_id');
  const cadence = str(form, 'agreed_cadence_days');
  return attempt(async tx => {
    await tx`
      update public.accounts set
        name = ${str(form, 'name')},
        type = ${str(form, 'type')}::public.account_type,
        account_manager_id = ${manager || null}::uuid,
        whatsapp = ${str(form, 'whatsapp') || null},
        email = ${str(form, 'email') || null},
        agreed_cadence_days = ${cadence ? int(form, 'agreed_cadence_days') : null},
        notes = ${str(form, 'notes') || null}
      where id = ${id}::uuid`;
  }, 'clients.edit.saved');
}

/** A new account is an account and its first destination; a quote cannot be sent without one. */
export async function createAccount(_prev: ActionState, form: FormData): Promise<ActionState> {
  let created = '';
  const result = await attempt(async tx => {
    const rows = await tx<{ id: string }[]>`
      insert into public.accounts (name, type, whatsapp, email, notes)
      values (${str(form, 'name')}, ${str(form, 'type')}::public.account_type,
              ${str(form, 'whatsapp') || null}, ${str(form, 'email') || null}, ${str(form, 'notes') || null})
      returning id`;
    created = rows[0].id;
    await tx`
      insert into public.account_sites (account_id, name, address, zone, is_default, sort)
      values (${created}::uuid, ${str(form, 'site_name') || str(form, 'name')}, ${str(form, 'address') || null},
              ${str(form, 'zone') || 'jabodetabek'}::public.delivery_zone, true, 1)`;
  }, 'clients.new_form.submit');
  if (result?.ok) redirect({ href: `/console/clients/${created}`, locale: await getLocale() });
  return result;
}

export async function addSite(_prev: ActionState, form: FormData): Promise<ActionState> {
  const accountId = str(form, 'account_id');
  return attempt(async tx => {
    await tx`
      insert into public.account_sites (account_id, name, address, zone, sort)
      values (${accountId}::uuid, ${str(form, 'name')}, ${str(form, 'address') || null},
              ${str(form, 'zone')}::public.delivery_zone,
              coalesce((select max(sort) + 1 from public.account_sites where account_id = ${accountId}::uuid), 1))`;
  }, 'clients.sites.saved');
}

export async function deleteSite(_prev: ActionState, form: FormData): Promise<ActionState> {
  const siteId = str(form, 'site_id');
  return attempt(async tx => {
    await tx`delete from public.account_sites where id = ${siteId}::uuid`;
  }, 'clients.sites.deleted');
}

/** Only the owner changes a role; a trigger refuses anyone else, and its refusal is what is shown. */
export async function changeMemberRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  const profileId = str(form, 'profile_id');
  return attempt(async tx => {
    await tx`update public.profiles set role = ${str(form, 'role')}::public.user_role where id = ${profileId}::uuid`;
  }, 'clients.members.role_changed');
}

/**
 * The step a request from the public site could not complete without: a person signs in and
 * belongs to no account, so they see none of what they asked for and cannot acknowledge for it.
 * Linking them is the owner's act — the function refuses anyone else, and refuses a person who
 * already belongs somewhere, so a mis-pick cannot hand one client's orders to another.
 */
export async function linkMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  const profileId = str(form, 'profile_id');
  const accountId = str(form, 'account_id');
  return attempt(async tx => {
    await tx`select axiom.link_member(${profileId}::uuid, ${accountId}::uuid, ${str(form, 'is_primary') === 'on'})`;
  }, 'clients.members.linked');
}

export async function unlinkMember(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async tx => {
    await tx`select axiom.unlink_member(${str(form, 'profile_id')}::uuid)`;
  }, 'clients.members.unlinked');
}
