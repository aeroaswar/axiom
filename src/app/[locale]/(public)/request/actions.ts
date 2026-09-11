'use server';
import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { getSession } from '@/lib/auth';
import { anonKey, getBasket, setBasketLine } from '@/lib/basket';
import { requestQuote, submitPublicRequest, type Line } from '@/lib/site/request';
import { pgMessage } from '@/lib/db';

// The public site's contribution to the commercial flow is the `requested` state and nothing
// further: it can raise a request, never a price and never an order.

async function basketLines(): Promise<Line[]> {
  const basket = await getBasket();
  return basket.items.map(i => ({ sku: i.sku, qty: i.qty, site_id: i.site_id, interval_days: i.interval_days }));
}

async function emptyBasket(lines: Line[]) {
  for (const l of lines) await setBasketLine(l.sku, 0, l.site_id, l.interval_days ?? null);
}

export type RequestState = { error: string | null };

const localeOf = (form: FormData) => {
  const l = String(form.get('locale') ?? '');
  return (routing.locales as readonly string[]).includes(l) ? l : routing.defaultLocale;
};

/** Signed in: straight to axiom.request_quote, then the confirmation with its number. */
export async function submitSignedInRequest(_prev: RequestState | null, form: FormData): Promise<RequestState> {
  const session = await getSession();
  if (!session?.accountId) return { error: 'no-account' };
  const lines = await basketLines();
  if (!lines.length) return { error: 'empty' };
  let number = '';
  try {
    number = await requestQuote(session.uid, session.accountId, lines, String(form.get('note') ?? '') || null);
    await emptyBasket(lines);
  } catch (e) {
    return { error: pgMessage(e) };
  }
  redirect({ href: { pathname: '/request/sent', query: { quote: number } }, locale: localeOf(form) });
  return { error: null };
}

/** Signed out: the same basket plus who is asking, through axiom.submit_public_request. */
export async function submitPublicLead(_prev: RequestState | null, form: FormData): Promise<RequestState> {
  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const whatsapp = String(form.get('whatsapp') ?? '').trim();
  if (!name) return { error: 'name' };
  if (!email && !whatsapp) return { error: 'contact' };
  // The declaration is required when a research compound is on the request; the database is the
  // one that knows the kinds, so it decides and its refusal is shown.
  const ack = form.get('ack') != null;
  const lines = await basketLines();
  if (!lines.length) return { error: 'empty' };
  const key = await anonKey(false);
  try {
    await submitPublicRequest(
      { name, clinic: String(form.get('clinic') ?? '').trim() || null, role: String(form.get('role') ?? '').trim() || null, email: email || null, whatsapp: whatsapp || null, ack },
      lines,
      String(form.get('locale') ?? 'id'),
      key,
    );
  } catch (e) {
    return { error: pgMessage(e) };
  }
  redirect({ href: { pathname: '/request/sent', query: { received: '1' } }, locale: localeOf(form) });
  return { error: null };
}
