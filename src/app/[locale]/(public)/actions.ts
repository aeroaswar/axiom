'use server';
import { revalidatePath } from 'next/cache';
import { addBasketLine, planOf, setBasketLine, setBasketPlan } from '@/lib/basket';
import { getSaved, setSaved } from '@/components/account/saved';

// The public site's only writes: the basket. Every one of them is a form post to a server action,
// so the control is a real button, works without JavaScript, and the basket still lives in the
// database behind row-level security rather than in the page.

export type BasketResult = { ok: boolean; qty: number; at: number };

export async function addToBasketAction(_prev: BasketResult | null, form: FormData): Promise<BasketResult> {
  const sku = String(form.get('sku') ?? '');
  const delta = Number(form.get('delta') ?? 1);
  if (!sku) return { ok: false, qty: 0, at: Date.now() };
  const qty = await addBasketLine(sku, Number.isFinite(delta) ? delta : 1, planOf(form.get('interval_days')));
  return { ok: true, qty, at: Date.now() };
}

/** Quantity and destination on the request page. qty 0 removes the line. */
export async function setBasketLineAction(form: FormData): Promise<void> {
  const sku = String(form.get('sku') ?? '');
  const qty = Number(form.get('qty') ?? 0);
  const siteRaw = String(form.get('site_id') ?? '');
  if (!sku) return;
  await setBasketLine(sku, Number.isFinite(qty) ? Math.max(qty, 0) : 0, siteRaw || null, planOf(form.get('interval_days')));
  revalidatePath('/request');
}

/** The request page's quantity and destination controls, so the basket badge can follow along. */
export async function updateBasketLineAction(_prev: BasketResult | null, form: FormData): Promise<BasketResult> {
  const sku = String(form.get('sku') ?? '');
  const qty = Number(form.get('qty') ?? 0);
  const siteRaw = String(form.get('site_id') ?? '');
  if (!sku) return { ok: false, qty: 0, at: Date.now() };
  const next = Number.isFinite(qty) ? Math.max(qty, 0) : 0;
  const plan = planOf(form.get('interval_days'));
  // a plan change on the request page moves the line rather than writing a second one
  if (form.has('from_interval_days')) await setBasketPlan(sku, next, siteRaw || null, planOf(form.get('from_interval_days')), plan);
  else await setBasketLine(sku, next, siteRaw || null, plan);
  revalidatePath('/request');
  return { ok: true, qty: next, at: Date.now() };
}

/** The bookmark on a card. Cookie-backed, so it works signed out; the account's Saved page reads it. */
export async function toggleSavedAction(_prev: { saved: boolean } | null, form: FormData): Promise<{ saved: boolean }> {
  const sku = String(form.get('sku') ?? '').trim();
  if (!sku) return { saved: false };
  const list = await getSaved();
  const has = list.includes(sku);
  await setSaved(has ? list.filter(s => s !== sku) : [...list, sku]);
  revalidatePath('/', 'layout');
  return { saved: !has };
}
