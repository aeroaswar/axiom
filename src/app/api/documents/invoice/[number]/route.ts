import { NextResponse, type NextRequest } from 'next/server';
import { getSession, isStaff } from '@/lib/auth';
import { withRls } from '@/lib/db';
import { invoiceDocument, invoiceFilename } from '@/lib/documents/invoice';
import { documentPdf } from '@/lib/pdf';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * The invoice PDF: the same template as the preview, printed headless. Access is the database's —
 * the query runs as the caller, so an account member gets its own invoice and nobody else's.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ number: string }> }) {
  const { number } = await ctx.params;
  const asked = req.nextUrl.searchParams.get('locale') ?? routing.defaultLocale;
  const locale = (routing.locales as readonly string[]).includes(asked) ? asked : routing.defaultLocale;
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });

  try {
    // The read is RLS-scoped; a caller who cannot see the row gets nothing to render.
    const [allowed] = await withRls({ uid: session.uid }, tx => tx<{ n: number }[]>`
      select count(*)::int n from public.invoices where number = ${number}`);
    if (!allowed?.n) return new NextResponse(null, { status: 404 });

    const doc = await invoiceDocument(locale, session.uid, number);
    if (!doc) return new NextResponse(null, { status: 404 });
    const pdf = await documentPdf(doc);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${isStaff(session) ? 'attachment' : 'inline'}; filename="${invoiceFilename(number)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
