'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// The field is a brand asset, not a dependency of the page. It is loaded only after the browser is
// idle (so it never competes with first paint or with LCP), only when the device is not asking for
// less motion, and only when WebGL is actually available. Until then — and for good, under
// prefers-reduced-motion — the static bronze fallback is what the visitor sees.
const HeroField = dynamic(() => import('./hero-field'), { ssr: false, loading: () => null });

function webglOk(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch { return false; }
}

export function HeroMount() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    let cancelled = false;
    const arm = () => { if (!cancelled && webglOk()) setOn(true); };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    let idle = 0;
    let timer = 0;
    if (typeof ric === 'function') idle = ric(arm, { timeout: 2500 });
    else timer = window.setTimeout(arm, 1000);
    const off = () => setOn(false);
    media.addEventListener('change', e => { if (e.matches) off(); });
    return () => {
      cancelled = true;
      const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (idle && typeof cic === 'function') cic(idle);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <div className="hero-fallback" aria-hidden="true" />
      {on ? <HeroField /> : null}
    </>
  );
}
