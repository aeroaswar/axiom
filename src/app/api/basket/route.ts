import { NextResponse } from 'next/server';
import { getBasket } from '@/lib/basket';
import { getSaved } from '@/components/account/saved';
import { getSession } from '@/lib/auth';
import { getRowsForSkus } from '@/lib/site/catalogue';
import { getPlanTiers } from '@/lib/settings';
import { planNet } from '@/lib/money';

export const dynamic = 'force-dynamic';

/** The basket as the badge and the mini basket read it. `?detail=1` joins each line to its lot
 *  (name, dose, kind) and prices it as the quote will: the list price the caller may see, less the
 *  plan's percentage. Nothing here is computed twice: `planNet` is the one arithmetic. */
export async function GET(req: Request) {
  const [basket, saved] = await Promise.all([getBasket(), getSaved()]);
  if (!new URL(req.url).searchParams.get('detail')) return NextResponse.json({ ...basket, saved }, { headers: { 'Cache-Control': 'no-store' } });
  const session = await getSession();
  const skus = [...new Set(basket.items.map(i => i.sku))];
  const [rows, tiers] = await Promise.all([getRowsForSkus(session?.uid ?? null, skus), getPlanTiers()]);
  const bySku = new Map(rows.map(r => [r.sku, r]));
  const lines = basket.items.flatMap(i => {
    const r = bySku.get(i.sku); if (!r) return [];
    const pctOff = r.kind === 'peptide' ? tiers.find(t => t.days === (i.interval_days ?? null))?.pct ?? 0 : 0;
    return [{ sku: i.sku, qty: i.qty, plan: i.interval_days ?? null, pct: pctOff, name: r.name, dose: r.dose, kind: r.kind, list: r.price_idr, net: r.price_idr === null ? null : planNet(r.price_idr, pctOff) }];
  });
  return NextResponse.json({ ...basket, saved, lines }, { headers: { 'Cache-Control': 'no-store' } });
}
