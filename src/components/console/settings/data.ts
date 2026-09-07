import 'server-only';
import { withRls } from '@/lib/db';

export type SettingRow = { key: string; value: unknown };
export type ZoneRow = { zone: string; label_en: string; label_id: string; per_three_idr: string | null; cap_idr: string | null; eta_days: number };
export type StaffRow = { id: string; full_name: string; role: string; email: string | null };

/** Read as the signed-in user: the entity and bank rows are not readable anonymously. */
export async function settingsFor(uid: string) {
  return withRls({ uid }, async tx => {
    const rows = await tx<SettingRow[]>`select key, value from public.site_settings order by key`;
    const map = Object.fromEntries(rows.map(r => [r.key, r.value])) as Record<string, unknown>;
    const zones = await tx<ZoneRow[]>`
      select zone::text as zone, label_en, label_id, per_three_idr, cap_idr, eta_days
      from public.delivery_zones order by zone`;
    const staff = await tx<StaffRow[]>`
      select p.id, p.full_name, p.role::text as role, u.email
      from public.profiles p left join auth.users u on u.id = p.id
      where p.role in ('ops','owner') order by p.role desc, p.full_name`;
    return { map, zones, staff };
  });
}

export const text = (v: unknown, fallback = '') => (typeof v === 'string' ? v : v == null ? fallback : String(v));
export const numberOf = (v: unknown, fallback = 0) => (v == null || v === '' ? fallback : Number(v));
export const boolOf = (v: unknown) => v === true || v === 'true';
export const objOf = (v: unknown) => (v && typeof v === 'object' ? v as Record<string, unknown> : {});
