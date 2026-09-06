'use server';
import { redirect } from 'next/navigation';
import { devSignIn, signOut } from '@/lib/auth';

export async function devSignInAction(form: FormData) {
  const uid = String(form.get('uid') || '');
  const next = String(form.get('next') || '/account');
  await devSignIn(uid);
  redirect(next.startsWith('/') ? next : '/account');
}

export async function magicLinkAction(form: FormData) {
  const email = String(form.get('email') || '');
  const next = String(form.get('next') || '/account');
  const { supabaseServer } = await import('@/lib/supabase-server');
  const client = await supabaseServer();
  await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}` } });
  redirect(`/sign-in?sent=1&next=${encodeURIComponent(next)}`);
}

export async function signOutAction() {
  await signOut();
  redirect('/');
}
