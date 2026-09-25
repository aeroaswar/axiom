import 'server-only';
import { cookies } from 'next/headers';

/**
 * Saved compounds. There is no `saved_items` table yet, so the list lives in a cookie written by a
 * server action: it survives a reload and a new tab on this browser, and it is honest about being
 * a browser-level convenience rather than account state. A table is its durable home.
 */
const COOKIE = 'axiom_saved';
const MAX = 120;

export async function getSaved(): Promise<string[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === 'string' && /^[a-z0-9_-]{1,40}$/i.test(s)).slice(0, MAX);
  } catch { return []; }
}

export async function setSaved(skus: string[]) {
  const jar = await cookies();
  const value = [...new Set(skus)].slice(0, MAX);
  jar.set(COOKIE, JSON.stringify(value), { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
  return value;
}
