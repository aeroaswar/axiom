import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPricesFor } from '@/lib/site/catalogue';

export const dynamic = 'force-dynamic';

// Live prices for the signed-in caller. The gate is not here: the query runs under the caller's own
// role and public.v_catalogue returns null for a peptide price unless the site is open or that
// account's acknowledgement is current. An anonymous request gets nothing at all.
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ prices: {} }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const skus = (req.nextUrl.searchParams.get('skus') ?? '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 400);
  if (!skus.length) return NextResponse.json({ prices: {} }, { headers: { 'Cache-Control': 'no-store' } });
  const prices = await getPricesFor(session.uid, skus);
  return NextResponse.json({ prices, currency: 'IDR' }, { headers: { 'Cache-Control': 'no-store' } });
}
