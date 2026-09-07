import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPricesAsAt } from '@/lib/site/catalogue';
import { priceListDocument, priceListFilename } from '@/lib/documents/price-list';
import { documentPdf } from '@/lib/pdf';
import { routing } from '@/i18n/routing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** The price-list PDF: one template with the invoice, one catalogue with the page, one gate. */
export async function GET(req: NextRequest) {
  const asked = req.nextUrl.searchParams.get('locale') ?? routing.defaultLocale;
  const locale = (routing.locales as readonly string[]).includes(asked) ? asked : routing.defaultLocale;
  const session = await getSession();
  try {
    const [doc, asAt] = await Promise.all([priceListDocument(locale, session?.uid ?? null), getPricesAsAt()]);
    const pdf = await documentPdf(doc);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${priceListFilename(asAt)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
