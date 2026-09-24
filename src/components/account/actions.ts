'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from '@/i18n/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { clientMeta } from '@/lib/auth';
import { getBasket, planOf, setBasketLine, setBasketPlan } from '@/lib/basket';
import { attempt, bool, int, str } from './act';
import { accountSession, orderLinesForReorder, quoteLinesForRequest } from './data';
import { getSaved, setSaved } from './saved';
import type { ActionState } from '@/components/console/shared/action-form';

/**
 * What the account may do: accept a sent quote, say it has transferred, cancel before dispatch,
 * ask for a quote from its basket or from a past order, record its acknowledgement, keep its own
 * profile and its delivery addresses. Every one of them is a database function or a policy-guarded
 * write; none of them prices anything, and none of them is a payment.
 */

// ------------------------------------------------------------------ the spine

export async function acceptQuoteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const number = str(form, 'number');
  const locale = await getLocale();
  const res = await attempt<string | null>(async (tx, s) => {
    const [q] = await tx<{ id: string }[]>`select id::text as id from public.quotes where account_id = ${s.accountId}::uuid and number = ${number}`;
    if (!q) return null;
    const [{ accept_quote: oid }] = await tx<{ accept_quote: string }[]>`select axiom.accept_quote(${q.id}::uuid)`;
    const [o] = await tx<{ number: string }[]>`select number from public.orders where id = ${oid}::uuid`;
    return o?.number ?? null;
  }, 'accepted');
  if (res.error) return res;
  if (res.value) redirect({ href: `/account/orders/${res.value}`, locale });
  return res;
}

export async function reportTransferAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const number = str(form, 'number');
  const ref = str(form, 'ref');
  return attempt(async (tx, s) => {
    const [o] = await tx<{ id: string }[]>`select id::text as id from public.orders where account_id = ${s.accountId}::uuid and number = ${number}`;
    if (!o) throw new Error('order not found');
    await tx`select axiom.report_transfer(${o.id}::uuid, ${ref || null})`;
  }, 'transfer_reported');
}

export async function cancelOrderAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const number = str(form, 'number');
  const reason = str(form, 'reason');
  return attempt(async (tx, s) => {
    const [o] = await tx<{ id: string }[]>`select id::text as id from public.orders where account_id = ${s.accountId}::uuid and number = ${number}`;
    if (!o) throw new Error('order not found');
    await tx`select axiom.cancel_order(${o.id}::uuid, ${reason || null})`;
  }, 'cancelled');
}

/** The basket becomes a `requested` quote — a real record the Console sees the same moment. */
export async function requestQuoteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const note = str(form, 'note');
  const locale = await getLocale();
  const basket = await getBasket();
  const lines = basket.items.map(i => ({ sku: i.sku, qty: i.qty, site_id: i.site_id, interval_days: i.interval_days }));
  if (!lines.length) return { error: (await getTranslations('account.action'))('empty') };
  const res = await attempt<string | null>(async (tx, s) => {
    const [{ request_quote: id }] = await tx<{ request_quote: string }[]>`
      select axiom.request_quote(${s.accountId}::uuid, ${tx.json(lines)}, ${note || null})`;
    const [q] = await tx<{ number: string }[]>`select number from public.quotes where id = ${id}::uuid`;
    return q?.number ?? null;
  }, 'requested');
  if (res.error) return res;
  for (const l of lines) await setBasketLine(l.sku, 0, l.site_id, l.interval_days);
  revalidatePath('/', 'layout');
  if (res.value) redirect({ href: `/account/quotes/${res.value}`, locale });
  return res;
}

/** A reorder is a quote request: the same lots to the same destinations, priced at today's list. */
export async function reorderAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const number = str(form, 'number');
  const locale = await getLocale();
  const session = await accountSession();
  const t = await getTranslations('account.action');
  if (!session) return { error: t('signed_out') };
  const lines = await orderLinesForReorder(session.uid, session.accountId, number);
  if (!lines.length) return { error: t('empty') };
  const res = await attempt<string | null>(async (tx, s) => {
    const [{ request_quote: id }] = await tx<{ request_quote: string }[]>`
      select axiom.request_quote(${s.accountId}::uuid, ${tx.json(lines)}, ${null})`;
    const [q] = await tx<{ number: string }[]>`select number from public.quotes where id = ${id}::uuid`;
    return q?.number ?? null;
  }, 'requested');
  if (res.error) return res;
  if (res.value) redirect({ href: `/account/quotes/${res.value}`, locale });
  return res;
}

/** An expired or lost quote is closed; asking for the same lines again starts a fresh request. */
export async function requoteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const number = str(form, 'number');
  const locale = await getLocale();
  const session = await accountSession();
  const t = await getTranslations('account.action');
  if (!session) return { error: t('signed_out') };
  const lines = await quoteLinesForRequest(session.uid, session.accountId, number);
  if (!lines.length) return { error: t('empty') };
  const res = await attempt<string | null>(async (tx, s) => {
    const [{ request_quote: id }] = await tx<{ request_quote: string }[]>`
      select axiom.request_quote(${s.accountId}::uuid, ${tx.json(lines)}, ${null})`;
    const [q] = await tx<{ number: string }[]>`select number from public.quotes where id = ${id}::uuid`;
    return q?.number ?? null;
  }, 'requested');
  if (res.error) return res;
  if (res.value) redirect({ href: `/account/quotes/${res.value}`, locale });
  return res;
}

// ------------------------------------------------------------------ the basket

export type BasketResult = { ok: boolean; qty: number; at: number };

export async function addToBasketAction(_prev: BasketResult | null, form: FormData): Promise<BasketResult> {
  const sku = str(form, 'sku');
  if (!sku) return { ok: false, qty: 0, at: Date.now() };
  const qty = Math.max(int(form, 'qty', 1), 1);
  const site = str(form, 'site_id');
  await setBasketLine(sku, qty, site || null, planOf(form.get('interval_days')));
  revalidatePath('/', 'layout');
  return { ok: true, qty, at: Date.now() };
}

export async function setBasketLineAction(_prev: BasketResult | null, form: FormData): Promise<BasketResult> {
  const sku = str(form, 'sku');
  if (!sku) return { ok: false, qty: 0, at: Date.now() };
  const qty = Math.max(int(form, 'qty', 0), 0);
  const site = str(form, 'site_id');
  const plan = planOf(form.get('interval_days'));
  if (form.has('from_interval_days')) await setBasketPlan(sku, qty, site || null, planOf(form.get('from_interval_days')), plan);
  else await setBasketLine(sku, qty, site || null, plan);
  revalidatePath('/', 'layout');
  return { ok: true, qty, at: Date.now() };
}

/** Moving a line to another destination: the old row goes, the new one carries the quantity. */
export async function moveBasketLineAction(_prev: BasketResult | null, form: FormData): Promise<BasketResult> {
  const sku = str(form, 'sku');
  if (!sku) return { ok: false, qty: 0, at: Date.now() };
  const qty = Math.max(int(form, 'qty', 0), 0);
  const from = str(form, 'from_site_id');
  const to = str(form, 'site_id');
  const plan = planOf(form.get('interval_days'));
  if (from === to) return { ok: true, qty, at: Date.now() };
  await setBasketLine(sku, 0, from || null, plan);
  await setBasketLine(sku, qty, to || null, plan);
  revalidatePath('/', 'layout');
  return { ok: true, qty, at: Date.now() };
}

// ------------------------------------------------------------------ saved

export async function toggleSavedAction(_prev: { saved: boolean } | null, form: FormData): Promise<{ saved: boolean }> {
  const sku = str(form, 'sku');
  const list = await getSaved();
  const has = list.includes(sku);
  await setSaved(has ? list.filter(s => s !== sku) : [...list, sku]);
  revalidatePath('/', 'layout');
  return { saved: !has };
}

// ------------------------------------------------------------------ the account

/** 18+ and qualified researcher, each recorded as its own timestamped row against this member. */
export async function acknowledgeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const age = bool(form, 'age_18');
  const researcher = bool(form, 'qualified_researcher');
  const { ip, ua } = await clientMeta();
  if (!age || !researcher) return { error: (await getTranslations('account.action'))('ack_both') };
  return attempt(async tx => {
    const [v] = await tx<{ value: string }[]>`select value #>> '{}' as value from public.site_settings where key = 'ack_version'`;
    const version = v?.value ?? '';
    await tx`select axiom.acknowledge('age_18', ${version}, ${ip}, ${ua})`;
    await tx`select axiom.acknowledge('qualified_researcher', ${version}, ${ip}, ${ua})`;
  }, 'acknowledged');
}

/** Name and language. The language is one control: it is saved, and the page follows it at once. */
export async function saveMeAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const name = str(form, 'full_name');
  const locale = str(form, 'locale') === 'en' ? 'en' : 'id';
  const was = await getLocale();
  const res = await attempt(async (tx, s) => {
    await tx`update public.profiles set full_name = ${name}, locale = ${locale} where id = ${s.uid}::uuid`;
  }, 'saved');
  if (!res.error && locale !== was) redirect({ href: '/account/profile', locale });
  return res;
}

export async function saveSiteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, 'id');
  const name = str(form, 'name');
  const address = str(form, 'address');
  const zone = ['jabodetabek', 'jawa', 'luar_jawa', 'other'].includes(str(form, 'zone')) ? str(form, 'zone') : 'jabodetabek';
  const isDefault = bool(form, 'is_default');
  if (!name) return { error: (await getTranslations('account.action'))('site_name') };
  return attempt(async (tx, s) => {
    if (isDefault) await tx`update public.account_sites set is_default = false where account_id = ${s.accountId}::uuid`;
    if (id) {
      await tx`update public.account_sites set name = ${name}, address = ${address || null}, zone = ${zone}::public.delivery_zone, is_default = ${isDefault}
               where id = ${id}::uuid and account_id = ${s.accountId}::uuid`;
    } else {
      await tx`insert into public.account_sites (account_id, name, address, zone, is_default, sort)
               values (${s.accountId}::uuid, ${name}, ${address || null}, ${zone}::public.delivery_zone, ${isDefault},
                       coalesce((select max(sort) + 1 from public.account_sites where account_id = ${s.accountId}::uuid), 1))`;
    }
  }, 'saved');
}

export async function removeSiteAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, 'id');
  return attempt(async (tx, s) => {
    await tx`delete from public.account_sites where id = ${id}::uuid and account_id = ${s.accountId}::uuid`;
  }, 'removed');
}

// ------------------------------------------------------------------ delivery plans

/** Skip, pause, resume, cancel or re-interval one plan. Each is one database function; the plan
 *  must belong to the account, which the function checks before the frame opens. */
export async function planAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, 'id');
  const op = str(form, 'op');
  const days = int(form, 'interval_days', 0);
  const okKey = op === 'skip' ? 'skipped' : op === 'pause' ? 'paused' : op === 'resume' ? 'resumed' : op === 'cancel' ? 'plan_cancelled' : 'interval_changed';
  return attempt(async tx => {
    if (op === 'skip') await tx`select axiom.subscription_skip(${id}::uuid)`;
    else if (op === 'pause') await tx`select axiom.subscription_pause(${id}::uuid)`;
    else if (op === 'resume') await tx`select axiom.subscription_resume(${id}::uuid)`;
    else if (op === 'cancel') await tx`select axiom.subscription_cancel(${id}::uuid)`;
    else if (op === 'interval') await tx`select axiom.subscription_set_interval(${id}::uuid, ${days})`;
    else throw new Error('unknown plan action');
  }, okKey);
}
