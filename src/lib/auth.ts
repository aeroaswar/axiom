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

// The dev cookie path is a local convenience: it signs a session for any seeded user id with no
// credential at all. It must be closed by the build rather than by an environment variable, so that
// setting a flag on a deployed instance cannot open it.
//
// `NODE_ENV !== 'production'` looked like that build-time closure and is not one: the gate suite
// runs against `pnpm start`, which is a production build on purpose — gate 20 measures LCP, and a
// dev server would measure nothing. Keying on it closed the door in the one build the gates test,
// so no browser gate could sign in.
//
// `NEXT_PUBLIC_AUTH_MODE` is the real thing. Next inlines it into the bundle at build time, so an
// artifact built without it has no dev door at all and no environment variable can add one later.
// A deployment builds without it; local and CI builds set it and get the seeded sign-in.
//
// The flag alone still left one way in: a build made on purpose with it. So the door also requires
// NEXT_PUBLIC_SITE_URL to be local — likewise inlined at build — and a build for a real domain has
// it shut, flag or not. CI builds for http://127.0.0.1:3000 and `pnpm setup` for localhost, so
// every build that needs the seeded sign-in still gets it.
const PRODUCTION = process.env.NODE_ENV === 'production';
const DEV = process.env.NEXT_PUBLIC_AUTH_MODE === 'dev' && isLocalSite(process.env.NEXT_PUBLIC_SITE_URL);

/**
 * Whether a site URL names this machine. Fails closed: an unset or unparseable URL is not local.
 * That deliberately differs from `siteUrl()` in lib/site/seo.ts, which falls back to localhost so a
 * canonical link always renders — a production build that forgot the variable must not open the
 * dev door on that guess.
 */
function isLocalSite(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    return false;
  }
}
const COOKIE = 'axiom_session';
const FALLBACK_SECRET = 'axiom-dev-secret';

/**
 * The key the dev cookie is signed with. A published default may never sign a real session.
 *
 * This refuses in every production build, dev door or not. It once carried a `!DEV` term, which
 * waived the check in exactly the build where it matters: a production artifact built with the
 * dev door open would sign sessions with FALLBACK_SECRET, a constant published in this repository,
 * so anyone could forge a session for any user. CI (`ci-secret`) and `pnpm setup` both supply an
 * AUTH_SECRET other than this fallback, so the only build this now stops is the dangerous one.
 */
function secret() {
  const s = process.env.AUTH_SECRET;
  if (PRODUCTION && (!s || s === FALLBACK_SECRET)) {
    throw new Error('AUTH_SECRET is unset or still the published default; refusing to sign a session');
  }
  return new TextEncoder().encode(s || FALLBACK_SECRET);
}

/** The signed-in user's id, from Supabase Auth in production or the dev cookie locally. */
async function currentUid(): Promise<string | null> {
  const jar = await cookies();
  if (DEV) {
    const raw = jar.get(COOKIE)?.value;
    if (!raw) return null;
    try { const { payload } = await jwtVerify(raw, secret()); return String(payload.sub); } catch { return null; }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // No Auth configured means nobody is signed in, not a broken page: the public site has to serve
  // an anonymous visitor, and `/api/basket` is fetched on every one of its pages.
  if (!url || !key) return null;
  const { createServerClient } = await import('@supabase/ssr');
  const client = createServerClient(url, key, {
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

/** Dev-only sign-in: writes the signed cookie for a seeded user. Absent from a build without the flag. */
export async function devSignIn(uid: string) {
  if (!DEV) throw new Error('dev sign-in is disabled');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)) throw new Error('dev sign-in needs a user id');
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
