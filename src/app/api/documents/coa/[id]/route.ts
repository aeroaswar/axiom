import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { coaPdf } from '@/lib/documents/coa';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** A published certificate as a PDF: the same markup the page shows, printed headless. Public,
 *  because the policy already decides which certificates exist for an anonymous reader. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asked = req.nextUrl.searchParams.get('locale') ?? routing.defaultLocale;
  const locale = (routing.locales as readonly string[]).includes(asked) ? asked : routing.defaultLocale;
  try {
    const r = await coaPdf(locale, id);
    if (!r) return NextResponse.json({ error: 'no such certificate' }, { status: 404 });
    return new NextResponse(new Uint8Array(r.pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${r.filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
