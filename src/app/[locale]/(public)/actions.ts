'use server';
import { revalidatePath } from 'next/cache';
import { addBasketLine, setBasketLine } from '@/lib/basket';

// The public site's only writes: the basket. Every one of them is a form post to a server action,
// so the control is a real button, works without JavaScript, and the basket still lives in the
// database behind row-level security rather than in the page.

export type BasketResult = { ok: boolean; qty: number; at: number };

export async function addToBasketAction(_prev: BasketResult | null, form: FormData): Promise<BasketResult> {
  const sku = String(form.get('sku') ?? '');
  const delta = Number(form.get('delta') ?? 1);
  if (!sku) return { ok: false, qty: 0, at: Date.now() };
  const qty = await addBasketLine(sku, Number.isFinite(delta) ? delta : 1);
  return { ok: true, qty, at: Date.now() };
}

/** Quantity and destination on the request page. qty 0 removes the line. */
export async function setBasketLineAction(form: FormData): Promise<void> {
  const sku = String(form.get('sku') ?? '');
  const qty = Number(form.get('qty') ?? 0);
  const siteRaw = String(form.get('site_id') ?? '');
  if (!sku) return;
  await setBasketLine(sku, Number.isFinite(qty) ? Math.max(qty, 0) : 0, siteRaw || null);
  revalidatePath('/request');
}

/** The request page's quantity and destination controls, so the basket badge can follow along. */
export async function updateBasketLineAction(_prev: BasketResult | null, form: FormData): Promise<BasketResult> {
  const sku = String(form.get('sku') ?? '');
  const qty = Number(form.get('qty') ?? 0);
  const siteRaw = String(form.get('site_id') ?? '');
  if (!sku) return { ok: false, qty: 0, at: Date.now() };
  const next = Number.isFinite(qty) ? Math.max(qty, 0) : 0;
  await setBasketLine(sku, next, siteRaw || null);
  revalidatePath('/request');
  return { ok: true, qty: next, at: Date.now() };
}
