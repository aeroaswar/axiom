'use server';
import { redirect } from 'next/navigation';
import { devSignIn, signOut } from '@/lib/auth';

/** A destination is ours only when it is a single-slash path. `//evil.example` and `/\evil.example`
 *  are protocol-relative URLs that resolve to another host, so they are refused. */
function safeNext(value: unknown, fallback = '/account'): string {
  const next = String(value ?? '');
  return /^\/(?![/\\])/.test(next) ? next : fallback;
}

export async function devSignInAction(form: FormData) {
  const uid = String(form.get('uid') || '');
  const next = safeNext(form.get('next'));
  await devSignIn(uid);
  redirect(next);
}

export async function magicLinkAction(form: FormData) {
  const email = String(form.get('email') || '');
  const next = safeNext(form.get('next'));
  const { supabaseServer } = await import('@/lib/supabase-server');
  const client = await supabaseServer();
  await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` } });
  redirect(`/sign-in?sent=1&next=${encodeURIComponent(next)}`);
}

export async function signOutAction() {
  await signOut();
  redirect('/');
}
