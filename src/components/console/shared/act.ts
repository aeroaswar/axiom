import 'server-only';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { getSession, isStaff, type Session } from '@/lib/auth';
import { pgMessage, withRls, type Tx } from '@/lib/db';
import type { ActionState } from './action-form';

/**
 * Every Console mutation runs through here: as the signed-in user, inside one transaction, with the
 * database as the boundary. A refusal — a check constraint, an owner-only policy, a guard trigger —
 * comes back as its own message rather than an error page, because the rule that produced it is the
 * thing the reader needs to read.
 */
export async function attempt(
  fn: (tx: Tx, session: Session) => Promise<void>,
  okKey = 'common.saved',
): Promise<ActionState> {
  const t = await getTranslations('console');
  const session = await getSession();
  if (!isStaff(session)) return { error: t('common.owner_only') };
  try {
    await withRls({ uid: session!.uid }, tx => fn(tx, session!));
  } catch (e) {
    return { error: t('common.refused', { message: pgMessage(e) }) };
  }
  // Every figure in the Console is derived, and several of them — availability, price, the
  // acknowledgement state — also render on the public site. One write can therefore change what a
  // list, a docked sheet, the bell and a public page each show, so the whole tree is revalidated
  // rather than guessed at segment by segment.
  revalidatePath('/', 'layout');
  return { ok: t(okKey) };
}

/** The staff session, or null. Pages guard through the Console layout; actions guard through attempt. */
export async function staffSession(): Promise<Session | null> {
  const session = await getSession();
  return isStaff(session) ? session : null;
}

export const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
export const int = (form: FormData, key: string, fallback = 0) => {
  const n = Number(String(form.get(key) ?? '').replace(/[^\d-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
};
export const bool = (form: FormData, key: string) => form.get(key) != null;
/** Rupiah entered by hand: `1.600.000`, `1600000`, `Rp 1 600 000` all mean the same integer. */
export const money = (form: FormData, key: string) => BigInt(String(form.get(key) ?? '0').replace(/[^\d]/g, '') || '0');
