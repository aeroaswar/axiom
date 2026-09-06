import { redirect } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import { getSession, isStaff } from '@/lib/auth';
import { AppShell } from '@/components/shell/app-shell';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const locale = await getLocale();
  if (!session) redirect({ href: '/sign-in?next=/account', locale });
  if (isStaff(session)) redirect({ href: '/console', locale });
  return <AppShell surface="account" session={session!}>{children}</AppShell>;
}
