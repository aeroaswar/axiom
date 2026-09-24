'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { idr } from '@/lib/money';
import { useNow } from '@/components/shell/clock';
import { dispatchEta, leftLabel, type CutoffSetting } from '@/lib/domain/cutoff';

/**
 * The three motions the dashboard and the pipeline own: a figure that climbs to itself once, the
 * twelve readings behind it drawn as a line, and the one thing on the screen that is genuinely
 * live — the countdown to the dispatch cut-off, read from the device clock every thirty seconds.
 *
 * Each renders the finished value first, so the server's HTML is already correct and a reader with
 * reduced motion, or no JavaScript at all, sees the same number.
 */
const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function CountUp({ value, format, children }: { value: number; format: 'idr' | 'pct'; children: React.ReactNode }) {
  const [shown, setShown] = useState<number | null>(null);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || reduced() || !value) return;
    done.current = true;
    let raf = 0, t0: number | null = null;
    const step = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min(1, (ts - t0) / 950);
      const e = 1 - Math.pow(1 - p, 3);
      setShown(value * e);
      if (p < 1) raf = requestAnimationFrame(step); else setShown(null);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  if (shown === null) return <>{children}</>;
  return format === 'idr'
    ? <>{idr(Math.round(shown))}</>
    : <>{Math.round(shown)}<span className="u">%</span></>;
}

/** The last twelve readings as a 1.2 px line; only the final point is bronze. */
export function Spark({ points, label }: { points: number[]; label: string }) {
  if (points.length < 2 || points.every(p => p === points[0])) return null;
  const lo = Math.min(...points), hi = Math.max(...points), n = points.length;
  const xy = points.map((v, i) => [(i / (n - 1)) * 100, 20 - ((v - lo) / (hi - lo || 1)) * 18] as const);
  return (
    <span className="spark" role="img" aria-label={label}>
      <svg viewBox="0 0 100 22" preserveAspectRatio="none">
        <polyline pathLength="1" points={xy.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} />
      </svg>
      <i style={{ top: `${((xy[n - 1][1] / 22) * 100).toFixed(1)}%` }} />
    </span>
  );
}

/**
 * The cut-off, live. One rule (`dispatchEta`) and one label (`leftLabel`), read here from the
 * device clock so the minutes actually fall; `window.__now` pins it for a test. Until the clock
 * mounts, the server's own reading stands, so nothing flashes and nothing is wrong on first paint.
 */
export function CutoffNote({ cold, cutoff, variant, className, fallback }: {
  cold: boolean; cutoff: CutoffSetting; variant: 'pipe' | 'next'; className?: string; fallback: string;
}) {
  const now = useNow();
  const t = useTranslations('commerce');
  if (!now) return <span className={className}>{fallback}</span>;
  const e = dispatchEta({ cold, cutoff, ref: now });
  const l = leftLabel(e.minsLeft);
  const left = t(`cutoff.${l.key}`, l.params);
  const text = variant === 'pipe'
    ? (e.late ? t('pipe.cutoff_passed', { cut: e.cutLabel }) : t('pipe.cutoff', { cut: e.cutLabel, left }))
    : (e.late ? t('next.o_pack_late', { cut: e.cutLabel }) : t('next.o_pack_today', { cut: e.cutLabel, left }));
  const tone = e.late ? ' tone-err' : e.state === 'warn' ? ' tone-warn' : '';
  return <span className={`${className ?? ''}${tone}`} data-cutoff={e.late ? 'closed' : e.state}>{text}</span>;
}
