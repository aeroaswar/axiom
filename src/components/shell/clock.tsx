'use client';
import { useEffect, useState } from 'react';

declare global { interface Window { __now?: string | number } }

/** The device clock, ticking every 30 s; `window.__now` pins it for tests. Never a typed time. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(window.__now ? new Date(window.__now) : new Date());
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function LiveClock() {
  const now = useNow();
  if (!now) return <span className="clock" />;
  const s = now.toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })
    .replace(',', '').replace(/(\d{2}):(\d{2})$/, '$1.$2');
  return <span className="clock" data-clock>{s}</span>;
}
