'use client';
import { useEffect, useState } from 'react';

// Static public pages render as anon, so every peptide price is absent from the HTML and the page
// shows the gated line. When a session exists — and only then — this store asks the server for the
// prices that session may see, in one batched call, and swaps them in. Anonymous visitors never
// cause a request to /api/prices, and the database is still the thing deciding what is visible.

const cache = new Map<string, number | null>();
const queue = new Set<string>();
const subs = new Set<() => void>();
let flushTimer: number | null = null;
let session: Promise<boolean> | null = null;

const notify = () => { for (const s of subs) s(); };

function signedIn(): Promise<boolean> {
  if (!session) {
    session = fetch('/api/basket', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((d: { anon?: boolean } | null) => !!d && d.anon === false)
      .catch(() => false);
  }
  return session;
}

async function flush() {
  flushTimer = null;
  const skus = [...queue];
  queue.clear();
  if (!skus.length) return;
  if (!(await signedIn())) {
    for (const s of skus) cache.set(s, null);
    notify();
    return;
  }
  for (let i = 0; i < skus.length; i += 120) {
    const chunk = skus.slice(i, i + 120);
    try {
      const r = await fetch(`/api/prices?skus=${encodeURIComponent(chunk.join(','))}`, { cache: 'no-store' });
      const d = r.ok ? ((await r.json()) as { prices?: Record<string, number | null> }) : null;
      for (const s of chunk) cache.set(s, d?.prices?.[s] ?? null);
    } catch {
      for (const s of chunk) cache.set(s, null);
    }
  }
  notify();
}

function want(skus: string[]) {
  let added = false;
  for (const s of skus) if (!cache.has(s) && !queue.has(s)) { queue.add(s); added = true; }
  if (added && flushTimer === null) flushTimer = window.setTimeout(flush, 30);
}

const subscribe = (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn); }; };

/** The prices this session may see, for the skus asked for. Missing or gated reads as null. */
export function usePrices(skus: string[]): Record<string, number | null> {
  const key = skus.join(',');
  const [, setTick] = useState(0);
  useEffect(() => {
    want(key ? key.split(',') : []);
    return subscribe(() => setTick(t => t + 1));
  }, [key]);
  const out: Record<string, number | null> = {};
  for (const s of skus) out[s] = cache.get(s) ?? null;
  return out;
}
