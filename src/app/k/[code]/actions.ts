'use server';
import { asService } from '@/lib/db';
import { getSettings } from '@/lib/settings';
import { siteUrl } from '@/lib/site/seo';

export type EditRequest = { sent?: boolean; noContact?: boolean; whatsapp?: string };

/**
 * "Add a compound", from a page anyone holding the code can open.
 *
 * The form takes no email field, and could not usefully have one: the address is read from the
 * account's own row, server-side, under `asService` — so the link can only ever go to the address
 * AXIOM already has, and the page neither accepts nor discloses one. `axiom.protocol_contact` is
 * revoked from anon and authenticated for the same reason; no browser session can reach it.
 *
 * `shouldCreateUser: false` is the load-bearing option. Supabase defaults it to true, and left
 * alone this page would mint an auth user for any address it was handed.
 *
 * The answer is the same whether or not an address was found, so the card cannot be used to work
 * out which accounts exist or who holds one. The one exception is an account with no address on
 * file at all — `axiom.submit_public_request` creates exactly those — where there is nothing to
 * send and saying so is more use than a silence that looks like success.
 */
export async function requestProtocolEdit(code: string): Promise<EditRequest> {
  if (!/^[0-9A-HJKMNP-TV-Z]{16}$/.test(code)) return { sent: true };

  const rows = await asService(tx => tx<{ account_id: string; email: string | null; locale: string }[]>`
    select * from axiom.protocol_contact(${code})`);
  const contact = rows[0];

  if (!contact) return { sent: true };            // no such card: answer as though there were
  if (!contact.email) {
    const settings = await getSettings();
    return { noContact: true, whatsapp: `https://wa.me/${settings.whatsapp.number.replace(/\D/g, '')}` };
  }

  const { supabaseServer } = await import('@/lib/supabase-server');
  const client = await supabaseServer();
  await client.auth.signInWithOtp({
    email: contact.email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent('/account/protocols')}`,
    },
  });
  return { sent: true };
}
