import { NextResponse, type NextRequest } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { cardByCode, icsFor } from '@/lib/protocol/card';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * The calendar. One route, two jobs, one body — a second route would be a second body that drifts.
 *
 * Subscribed (the default): Apple and Google poll this URL, which is the whole reason a compound
 * added in three months' time reaches a phone without anyone re-scanning anything. The body is a
 * pure function of the card — DTSTAMP comes from the row's updated_at, never the clock — so an
 * unchanged card serialises identically and a poll costs a 304 rather than the whole file.
 *
 * `?download=1`: the same bytes as an attachment, for a one-off import. It still carries the
 * RRULE, so the recurrence imports too; what it does not do is keep up with later edits.
 *
 * The literal `.ics` in the path is load-bearing. iOS and several desktop clients sniff the
 * extension when subscribing, and a path containing a dot also falls outside the middleware
 * matcher, so next-intl never tries to give this a locale prefix.
 *
 * `Cache-Control: public` is deliberate on a URL that resolves per-client data: the code is in the
 * path and therefore in the cache key, so a cached copy is only ever served back to someone who
 * already presented that code. Without it, no shared cache would ever spare the origin a poll.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const card = await cardByCode(code);
  if (!card) return new NextResponse(null, { status: 404 });

  const stamp = new Date(card.updated_at);
  const etag = `W/"${card.seq}-${stamp.getTime()}"`;
  const download = req.nextUrl.searchParams.get('download') === '1';

  if (!download && req.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'public, max-age=3600' } });
  }

  const locale = (routing.locales as readonly string[]).includes(card.locale) ? card.locale : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'protocol' });
  const body = icsFor(card, code, {
    calendar: t('calendar.name'),
    amount: t('item.amount'),
    route: t('item.route'),
  });

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="axiom-${card.number}.ics"`,
      'Cache-Control': download ? 'no-store' : 'public, max-age=3600, stale-while-revalidate=86400',
      ETag: etag,
      'Last-Modified': stamp.toUTCString(),
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
