'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState, type ReactNode } from 'react';
import type { PenLabel } from './pen-3d';

// The 3D pen is a brand asset, not a dependency of the page. It loads only after the browser is
// idle, only when the device is not asking for less motion, and only when WebGL is available.
// Until then, and for good under prefers-reduced-motion, the still image beneath it is the hero.
const Pen3D = dynamic(() => import('./pen-3d'), { ssr: false, loading: () => null });

function webglOk(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

export function PenHero({ label, children }: { label: PenLabel; children: ReactNode }) {
  const [on, setOn] = useState(false);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;
    let cancelled = false;
    const arm = () => { if (!cancelled && webglOk()) setOn(true); };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    let idle = 0;
    let timer = 0;
    if (typeof ric === 'function') idle = ric(arm, { timeout: 2000 });
    else timer = window.setTimeout(arm, 800);
    const off = (e: MediaQueryListEvent) => { if (e.matches) { setOn(false); setLive(false); } };
    media.addEventListener('change', off);
    return () => {
      cancelled = true;
      media.removeEventListener('change', off);
      const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
      if (idle && typeof cic === 'function') cic(idle);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className={`pen3d${live ? ' live' : ''}`} data-pen3d={on ? '1' : '0'}>
      <div className="pen3d-still">{children}</div>
      {on ? <Pen3D label={label} onReady={() => setLive(true)} /> : null}
    </div>
  );
}
