import { NextResponse, type NextRequest } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import { withRls } from '@/lib/db';
import { protocolDocument, protocolFilename } from '@/lib/documents/protocol';
import { documentHtml, documentPdf } from '@/lib/pdf';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * The printable card. Unlike the web card, this is not open to whoever holds the code: it is a
 * letterheaded sheet carrying a client's name, so it needs a session. Staff print any card; a
 * member prints its own, and the check is the `protocols_read` policy rather than a rule restated
 * here — a caller who cannot see the row gets nothing to render.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });

  try {
    const [allowed] = await withRls({ uid: session.uid }, tx => tx<{ n: number }[]>`
      select count(*)::int n from public.protocols where code = ${code} and state = 'issued'`);
    if (!allowed?.n) return new NextResponse(null, { status: 404 });

    const doc = await protocolDocument(code);
    if (!doc) return new NextResponse(null, { status: 404 });

    // `?html=1` is the same markup Chromium prints, under the same authorisation: it is how the
    // gate proves the printed sheet and the preview come from one template rather than two.
    if (req.nextUrl.searchParams.get('html') === '1') {
      return new NextResponse(await documentHtml(doc), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' },
      });
    }

    const pdf = await documentPdf(doc);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${isStaff(session) ? 'attachment' : 'inline'}; filename="${protocolFilename(doc.number)}"`,
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
