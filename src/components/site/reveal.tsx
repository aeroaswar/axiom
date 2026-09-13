'use client';
import { useEffect, useRef, type ElementType, type ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Reveal is crawler-safe and no-JS-safe by construction: the server renders the content plainly and
// only the client, after hydration, sets the start state and lets ScrollTrigger settle it as it
// enters the viewport. 700 ms, 65 ms stagger, 16 px of travel, and nothing at all under
// prefers-reduced-motion: gsap.matchMedia reverts every tween the moment the preference flips.

function useSettle(kind: 'reveal' | 'stagger') {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const targets = kind === 'stagger' ? Array.from(el.children) : [el];
      if (!targets.length) return;
      gsap.from(targets, {
        opacity: 0,
        y: kind === 'stagger' ? 14 : 16,
        duration: 0.7,
        ease: 'power3.out',
        stagger: kind === 'stagger' ? 0.065 : 0,
        clearProps: 'opacity,transform',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      });
    });
    return () => mm.revert();
  }, [kind]);
  return ref;
}

type Props = { children: ReactNode; as?: ElementType; className?: string; id?: string; style?: React.CSSProperties };

export function Reveal({ children, as: As = 'div', className, id, style }: Props) {
  const ref = useSettle('reveal');
  return <As ref={ref} className={className} id={id} style={style}>{children}</As>;
}

/** Children settle 65 ms apart. */
export function Stagger({ children, as: As = 'div', className, id, style }: Props) {
  const ref = useSettle('stagger');
  return <As ref={ref} className={className} id={id} style={style}>{children}</As>;
}
