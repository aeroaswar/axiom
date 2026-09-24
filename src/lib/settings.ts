import 'server-only';
import { asAnon } from './db';

export type Settings = {
  price_visibility: 'open' | 'acknowledged';
  revalidate_seconds: number;
  ppn_rate: number;
  payment_terms_days: number;
  quote_valid_days: number;
  gm_floor_pct: number;
  whatsapp: { number: string; display: string };
  cutoff: { cold: string; ambient: string; tz: string };
  ack_version: string;
  entity: { name: string; address: string; npwp: string; pkp: boolean };
  bank: { bank: string; account_name: string; account_no: string };
  handling_baseline: { en: string; id: string };
  ruo_notice: { en: string; id: string };
  verification: { method: string; purity_threshold_pct: number };
  subscribe_tiers: Record<string, number>;
  renewal_lead_days: number;
};

export type PlanTier = { days: number; pct: number };

/** The delivery plans on offer, from `site_settings.subscribe_tiers` through `axiom.plan_intervals()`.
 *  Nothing else may name an interval or a percentage: a component receives these as props. */
export async function getPlanTiers(): Promise<PlanTier[]> {
  const rows = await asAnon(tx => tx<{ interval_days: number; discount_pct: string }[]>`select interval_days, discount_pct from axiom.plan_intervals()`);
  return rows.map(r => ({ days: Number(r.interval_days), pct: Number(r.discount_pct) })).filter(t => t.days > 0 && t.pct > 0);
}

/** Public settings (bank and entity are read by signed-in callers and staff only through RLS). */
export async function getSettings(): Promise<Settings> {
  const rows = await asAnon(tx => tx<{ key: string; value: unknown }[]>`select key, value from public.site_settings`);
  return Object.fromEntries(rows.map(r => [r.key, r.value])) as Settings;
}

/** The stated ISR window. Next needs a literal, so pages export `revalidate = 60`; the gate suite
 *  checks that literal against site_settings.revalidate_seconds. */
export const REVALIDATE_SECONDS = 60;
