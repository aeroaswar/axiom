import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

/**
 * The client catalogue, scoped to one surface. Without this the whole merged catalogue — console,
 * commerce and account included — is serialised into every public page, which both bloats the
 * payload and prints the operator's vocabulary into the public HTML.
 */
export async function Messages({ only, children }: { only: readonly string[]; children: React.ReactNode }) {
  const all = (await getMessages()) as Record<string, unknown>;
  const scoped = Object.fromEntries(only.filter(k => k in all).map(k => [k, all[k]]));
  return <NextIntlClientProvider messages={scoped}>{children}</NextIntlClientProvider>;
}

/** What a client component on any surface may read. The app shell's own vocabulary (`shell`,
 *  `states`) is not public: the marketing pages never render an operator's words. */
export const CORE = ['common', 'nav', 'meta', 'auth'] as const;
export const APP = [...CORE, 'shell', 'states'] as const;
