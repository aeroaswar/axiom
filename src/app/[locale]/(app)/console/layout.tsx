import { redirect } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import { getSession, isStaff } from '@/lib/auth';
import { AppShell } from '@/components/shell/app-shell';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };

// Server-side role routing: a non-staff session never renders a Console page.
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const locale = await getLocale();
  if (!session) redirect({ href: '/sign-in?next=/console', locale });
  if (!isStaff(session)) redirect({ href: '/account', locale });
  return <AppShell surface="console" session={session!}>{children}</AppShell>;
}
