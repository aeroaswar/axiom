'use client';
import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

// Reveal is crawler-safe and no-JS-safe by construction: the server renders the content plainly and
// only the client adds the hidden-then-settle classes, so the HTML a crawler reads is the finished
// page. 700 ms, 65 ms stagger, 16 px of travel, and nothing at all under prefers-reduced-motion.

function useSettle(kind: 'reveal' | 'stagger') {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    el.classList.add(kind);
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).classList.add('in');
          io.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.02 },
    );
    const id = requestAnimationFrame(() => io.observe(el));
    return () => { cancelAnimationFrame(id); io.disconnect(); };
  }, [kind]);
  return ref;
}

type Props = { children: ReactNode; as?: ElementType; className?: string; id?: string; style?: React.CSSProperties };

export function Reveal({ children, as: As = 'div', className, id, style }: Props) {
  const ref = useSettle('reveal');
  return <As ref={ref} className={className} id={id} style={style}>{children}</As>;
}

/** Children settle 65 ms apart, delays from CSS nth-child so nothing needs cloning. */
export function Stagger({ children, as: As = 'div', className, id, style }: Props) {
  const ref = useSettle('stagger');
  return <As ref={ref} className={className} id={id} style={style}>{children}</As>;
}
