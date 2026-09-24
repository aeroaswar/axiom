import 'server-only';
import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';
import { getSession } from './auth';
import { withRls } from './db';

const COOKIE = 'axiom_basket';

export type BasketItem = { variant_id: string; sku: string; qty: number; site_id: string | null };
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
    const items = await tx<BasketItem[]>`select variant_id, sku, qty, site_id from axiom.cart_items_for(${cid}::uuid, ${key})`;
    return { cart_id: cid, items, anon: !session?.accountId };
  });
}

/** Add to what is already there, keeping the line's destination. Used by the public Add control.
 *  `cart_items`' unique index is (cart_id, variant_id, site_id) and Postgres treats NULL site_ids
 *  as distinct, so the same lot can end up on several rows. Sum them, clear them, write one. */
export async function addBasketLine(sku: string, delta = 1): Promise<number> {
  const basket = await getBasket();
  const same = basket.items.filter(i => i.sku === sku);
  const siteId = same.find(i => i.site_id)?.site_id ?? null;
  const qty = Math.max(same.reduce((a, i) => a + i.qty, 0) + delta, 0);
  if (same.length > 1) for (const i of same) await setBasketLine(sku, 0, i.site_id);
  await setBasketLine(sku, qty, siteId);
  return qty;
}

export async function setBasketLine(sku: string, qty: number, siteId: string | null = null) {
  const session = await getSession();
  const key = await anonKey(true);
  return withRls({ uid: session?.uid ?? null }, async tx => {
    const [{ cart_for: cid }] = await tx<{ cart_for: string }[]>`select axiom.cart_for(${key}, ${session?.accountId ?? null})`;
    await tx`select axiom.cart_set(${cid}::uuid, ${key}, ${sku}, ${qty}, ${siteId})`;
    return cid;
  });
}
