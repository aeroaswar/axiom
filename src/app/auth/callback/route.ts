import { NextResponse, type NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

// Supabase Auth magic-link callback. Exchanges the code for a session cookie; the profile row is
// created on first sign-in with the client role and no account, and the owner links and promotes
// it from the Console.

/** A destination inside this site. `//host` and `/\host` are absolute URLs to a browser, so the
 *  link in a sign-in email must never be able to carry the visitor off-site after authenticating. */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/')) return '/account';
  if (/^\/[\\/]/.test(next)) return '/account';
  return next;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = safeNext(url.searchParams.get('next'));
  if (code) {
    const client = await supabaseServer();
    const { data } = await client.auth.exchangeCodeForSession(code);
    if (data.user) {
      const { asService } = await import('@/lib/db');
      await asService(tx => tx`insert into public.profiles (id, role, full_name, locale) values (${data.user!.id}, 'client', ${data.user!.email ?? ''}, 'id') on conflict (id) do nothing`);
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
