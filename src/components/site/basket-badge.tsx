'use client';
import { useEffect, useState } from 'react';

export const BASKET_EVENT = 'axiom:basket';
/** Fired after a line is added, with `{ sku, plan }` in `detail`; the mini basket opens on it. */
export const ADDED_EVENT = 'axiom:added';

/** Line count of the basket, read from the cookie-backed cart via the API. */
export function BasketBadge() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const load = () => fetch('/api/basket', { cache: 'no-store' }).then(r => r.json()).then(d => setN(d.items?.reduce((a: number, i: { qty: number }) => a + i.qty, 0) ?? 0)).catch(() => setN(0));
    load();
    window.addEventListener(BASKET_EVENT, load);
    return () => window.removeEventListener(BASKET_EVENT, load);
  }, []);
  return <span className="tnum" data-basket-count>{n ?? ''}</span>;
}
