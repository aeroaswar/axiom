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

/** Add to what is already there, keeping the line's destination. Used by the public Add control. */
export async function addBasketLine(sku: string, delta = 1): Promise<number> {
  const basket = await getBasket();
  const line = basket.items.find(i => i.sku === sku);
  const qty = Math.max((line?.qty ?? 0) + delta, 0);
  await setBasketLine(sku, qty, line?.site_id ?? null);
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
