import { NextResponse } from 'next/server';
import { getBasket } from '@/lib/basket';
import { getSaved } from '@/components/account/saved';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [basket, saved] = await Promise.all([getBasket(), getSaved()]);
  return NextResponse.json({ ...basket, saved }, { headers: { 'Cache-Control': 'no-store' } });
}
