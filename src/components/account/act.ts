import 'server-only';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { pgRefusal, withRls, type Tx } from '@/lib/db';
import { accountSession, type AccountSession } from './data';
import type { ActionState } from '@/components/console/shared/action-form';

/**
 * Every Account mutation runs through here: as the signed-in member, inside one transaction, with
 * the database as the boundary. A refusal — an expired quote, an order past dispatch, a peptide
 * line on a lapsed acknowledgement — comes back as the rule's own sentence rather than an error
 * page, because that sentence is the thing the reader needs to read.
 *
 * The Console's `attempt` is the same shape for staff; this one differs only in who it lets in.
 */
export type Result<T = void> = { ok?: string; error?: string; errors?: string[]; value?: T };

export async function attempt<T = void>(
  fn: (tx: Tx, session: AccountSession) => Promise<T>,
  okKey = 'ok',
): Promise<Result<T>> {
  const t = await getTranslations('account.action');
  const session = await accountSession();
  if (!session) return { error: t('signed_out') };
  let value: T;
  try {
    value = await withRls({ uid: session.uid }, tx => fn(tx, session));
  } catch (e) {
    const refusal = pgRefusal(e);
    return { error: refusal ? t('refused', { message: refusal }) : t('failed') };
  }
  // A single write moves a quote to an order, issues an invoice, changes the bell count and empties
  // the basket the public site shares. Revalidating the tree is cheaper than guessing which.
  revalidatePath('/', 'layout');
  return { ok: t(okKey), value };
}

export const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
export const bool = (form: FormData, key: string) => form.get(key) != null;
export const int = (form: FormData, key: string, fallback = 0) => {
  const n = Number(String(form.get(key) ?? '').replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};
