import { NextResponse, type NextRequest } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import { withRls } from '@/lib/db';
import { quoteDocument, quoteFilename } from '@/lib/documents/quote';
import { documentPdf } from '@/lib/pdf';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The quotation on letterhead — the same template as the invoice, so the two are one system. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ number: string }> }) {
  const { number } = await ctx.params;
  const asked = req.nextUrl.searchParams.get('locale') ?? routing.defaultLocale;
  const locale = (routing.locales as readonly string[]).includes(asked) ? asked : routing.defaultLocale;
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });

  try {
    // Visibility is the database's, but a document is not a row. A quotation on letterhead exists
    // only once AXIOM has sent it: before that the lines are unpriced and `axiom.send_quote` has not
    // yet applied its three tests, and `quoteBody` would fall back to today's list price and print a
    // formal quotation for something nobody priced. Staff previewing their own draft is the one
    // caller allowed to see it early.
    const [allowed] = await withRls({ uid: session.uid }, tx => tx<{ n: number }[]>`
      select count(*)::int n from public.quotes
       where number = ${number} and (${isStaff(session)} or sent_at is not null)`);
    if (!allowed?.n) return new NextResponse(null, { status: 404 });

    const doc = await quoteDocument(locale, session.uid, number);
    if (!doc) return new NextResponse(null, { status: 404 });
    const pdf = await documentPdf(doc);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quoteFilename(number)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
