import { NextResponse } from 'next/server';
import { getBasket } from '@/lib/basket';

export const dynamic = 'force-dynamic';

export async function GET() {
  const basket = await getBasket();
  return NextResponse.json(basket, { headers: { 'Cache-Control': 'no-store' } });
}
