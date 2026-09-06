import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { asService } from './db';

export type Role = 'client' | 'clinic' | 'ops' | 'owner';
export type Session = {
  uid: string;
  role: Role;
  accountId: string | null;
  name: string;
  locale: string;
  email: string | null;
};

const DEV = process.env.AUTH_MODE === 'dev';
const COOKIE = 'axiom_session';
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'axiom-dev-secret');

/** The signed-in user's id, from Supabase Auth in production or the dev cookie locally. */
async function currentUid(): Promise<string | null> {
  const jar = await cookies();
  if (DEV) {
    const raw = jar.get(COOKIE)?.value;
    if (!raw) return null;
    try { const { payload } = await jwtVerify(raw, secret()); return String(payload.sub); } catch { return null; }
  }
  const { createServerClient } = await import('@supabase/ssr');
  const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => jar.getAll(), setAll: () => {} },
  });
  const { data } = await client.auth.getUser();
  return data.user?.id ?? null;
}

export const getSession = cache(async (): Promise<Session | null> => {
  const uid = await currentUid();
  if (!uid) return null;
  const rows = await asService(tx => tx<{ id: string; role: Role; account_id: string | null; full_name: string; locale: string; email: string | null }[]>`
    select p.id, p.role, coalesce(p.account_id, (select account_id from public.account_members m where m.profile_id = p.id limit 1)) as account_id,
           p.full_name, p.locale, u.email
    from public.profiles p left join auth.users u on u.id = p.id where p.id = ${uid}`);
  const p = rows[0];
  if (!p) return null;
  return { uid: p.id, role: p.role, accountId: p.account_id, name: p.full_name, locale: p.locale, email: p.email };
});

export const isStaff = (s: Session | null) => !!s && (s.role === 'ops' || s.role === 'owner');

/** Dev-only sign-in: writes the signed cookie for a seeded user. Refuses outside AUTH_MODE=dev. */
export async function devSignIn(uid: string) {
  if (!DEV) throw new Error('dev sign-in is disabled');
  const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(uid).setIssuedAt().setExpirationTime('30d').sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(COOKIE);
  if (!DEV) {
    for (const c of jar.getAll()) if (c.name.startsWith('sb-')) jar.delete(c.name);
  }
}

export async function clientMeta() {
  const h = await headers();
  return { ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || null, ua: h.get('user-agent') || null };
}

export const authMode = () => (DEV ? 'dev' : 'supabase');
