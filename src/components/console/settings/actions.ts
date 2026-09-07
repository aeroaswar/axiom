'use server';
import { attempt, bool, int, money, str } from '../shared/act';
import type { ActionState } from '../shared/action-form';
import type { Tx } from '@/lib/db';

// `tx.json` is the only correct way to write a jsonb column here: a pre-stringified value with a
// `::jsonb` cast is re-serialised by the driver and lands as a jsonb *string* holding JSON, which
// every reader — `axiom.prices_visible()` included — would then compare against and never match.
const put = (tx: Tx, key: string, value: unknown) => tx`
  insert into public.site_settings (key, value, updated_at) values (${key}, ${tx.json(value as never)}, now())
  on conflict (key) do update set value = excluded.value, updated_at = now()`;

export async function saveProfile(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async (tx, session) => {
    await tx`update public.profiles set full_name = ${str(form, 'full_name')}, locale = ${str(form, 'locale')} where id = ${session.uid}::uuid`;
  }, 'settings.profile.saved');
}

/**
 * The site's own settings. Price visibility decides whether an anonymous visitor sees a peptide
 * price at all, so saving revalidates the public site: the flag is read server-side, once.
 */
export async function saveSiteSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async tx => {
    await put(tx, 'price_visibility', str(form, 'price_visibility'));
    await put(tx, 'ppn_rate', Number(str(form, 'ppn_rate') || 0));
    await put(tx, 'delivery_in_dpp', bool(form, 'delivery_in_dpp'));
    await put(tx, 'payment_terms_days', int(form, 'payment_terms_days', 7));
    await put(tx, 'quote_valid_days', int(form, 'quote_valid_days', 7));
    await put(tx, 'paid_by_owner_only', bool(form, 'paid_by_owner_only'));
    await put(tx, 'gm_floor_pct', Number(str(form, 'gm_floor_pct') || 0));
    await put(tx, 'entity', {
      name: str(form, 'entity_name'), address: str(form, 'entity_address'),
      npwp: str(form, 'entity_npwp'), pkp: bool(form, 'entity_pkp'),
    });
    await put(tx, 'bank', {
      bank: str(form, 'bank_bank'), account_name: str(form, 'bank_account_name'), account_no: str(form, 'bank_account_no'),
    });
    await put(tx, 'whatsapp', { number: str(form, 'whatsapp_number'), display: str(form, 'whatsapp_display') });
    await put(tx, 'cutoff', { cold: str(form, 'cutoff_cold'), ambient: str(form, 'cutoff_ambient'), tz: str(form, 'cutoff_tz') });
  }, 'settings.site.saved');
}

/** A zone with no rate is rate pending, not free — leave the rate empty and the quote cannot be sent. */
export async function saveZones(_prev: ActionState, form: FormData): Promise<ActionState> {
  const zones = form.getAll('zone').map(String);
  return attempt(async tx => {
    for (const z of zones) {
      const rate = str(form, `per_three_${z}`);
      const cap = str(form, `cap_${z}`);
      await tx`
        update public.delivery_zones set
          per_three_idr = ${rate ? money(form, `per_three_${z}`).toString() : null}::bigint,
          cap_idr = ${cap ? money(form, `cap_${z}`).toString() : null}::bigint,
          eta_days = ${int(form, `eta_${z}`, 2)}
        where zone = ${z}::public.delivery_zone`;
    }
  }, 'settings.zones.saved');
}

export async function changeStaffRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  return attempt(async tx => {
    await tx`update public.profiles set role = ${str(form, 'role')}::public.user_role where id = ${str(form, 'profile_id')}::uuid`;
  }, 'settings.staff.saved');
}
