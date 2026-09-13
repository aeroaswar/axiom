import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { getSession } from './auth';
import { withRls } from './db';

const COOKIE = 'axiom_basket';

export type BasketItem = { variant_id: string; sku: string; qty: number; site_id: string | null; interval_days: number | null };
export type Basket = { cart_id: string | null; items: BasketItem[]; anon: boolean };

/** The anonymous basket key lives in a cookie; on sign-in the account basket absorbs it. */
export async function anonKey(create = false): Promise<string | null> {
  const jar = await cookies();
  let k = jar.get(COOKIE)?.value ?? null;
  if (!k && create) {
    k = randomBytes(18).toString('base64url');
    jar.set(COOKIE, k, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 90 });
  }
  return k;
}

export async function getBasket(): Promise<Basket> {
  const session = await getSession();
  const key = await anonKey(false);
  if (!session?.accountId && !key) return { cart_id: null, items: [], anon: true };
  return withRls({ uid: session?.uid ?? null }, async tx => {
    const [{ cart_for: cid }] = await tx<{ cart_for: string }[]>`select axiom.cart_for(${key}, ${session?.accountId ?? null})`;
    const items = await tx<BasketItem[]>`select variant_id, sku, qty, site_id, interval_days from axiom.cart_items_for(${cid}::uuid, ${key})`;
    return { cart_id: cid, items, anon: !session?.accountId };
  });
}

/** A line is one lot on one plan (one-time, or every N days). Adding the same lot on the same plan
 *  adds to the quantity; the same lot on another plan is a second line, because the two are
 *  priced differently. `plan` null is one-time. Used by the public Add control. */
export async function addBasketLine(sku: string, delta = 1, plan: number | null = null): Promise<number> {
  const basket = await getBasket();
  const same = basket.items.filter(i => i.sku === sku && (i.interval_days ?? null) === plan);
  const siteId = same.find(i => i.site_id)?.site_id ?? null;
  const qty = Math.max(same.reduce((a, i) => a + i.qty, 0) + delta, 0);
  if (same.length > 1) for (const i of same) await setBasketLine(sku, 0, i.site_id, plan);
  await setBasketLine(sku, qty, siteId, plan);
  return qty;
}

export async function setBasketLine(sku: string, qty: number, siteId: string | null = null, plan: number | null = null) {
  const session = await getSession();
  const key = await anonKey(true);
  return withRls({ uid: session?.uid ?? null }, async tx => {
    const [{ cart_for: cid }] = await tx<{ cart_for: string }[]>`select axiom.cart_for(${key}, ${session?.accountId ?? null})`;
    await tx`select axiom.cart_set(${cid}::uuid, ${key}, ${sku}, ${qty}, ${siteId}, ${plan})`;
    return cid;
  });
}

/** Move a line from one plan to another, keeping quantity and destination. */
export async function setBasketPlan(sku: string, qty: number, siteId: string | null, from: number | null, to: number | null) {
  if (from === to) return;
  await setBasketLine(sku, 0, siteId, from);
  await setBasketLine(sku, qty, siteId, to);
}

/** `interval_days` as a form posts it: '' or '0' is one-time; anything else must be a whole number. */
export function planOf(raw: FormDataEntryValue | null | undefined): number | null {
  const n = Number(String(raw ?? '').trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
