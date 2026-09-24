import { NextResponse, type NextRequest } from 'next/server';
import { qrSvg } from '@/lib/protocol/qr';
import { cardUrl } from '@/lib/protocol/card';

export const runtime = 'nodejs';

/**
 * The square itself. Deliberately no database read: the symbol is a pure function of the code, and
 * a lookup here would turn this route into an oracle telling anyone which codes exist. The card
 * page is the only place a code's existence is observable, and it 404s for unknown, draft and
 * withdrawn alike.
 *
 * Immutable, because a card's code never changes — that is the whole point of it.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  if (!/^[0-9A-HJKMNP-TV-Z]{16}$/.test(code)) return new NextResponse(null, { status: 404 });
  return new NextResponse(qrSvg(cardUrl(code), code), {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': `inline; filename="axiom-${code}.svg"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
