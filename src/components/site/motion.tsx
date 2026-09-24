'use client';
import { useLayoutEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * The site's motion layer, one client component in the public layout. Three behaviours, each
 * derived from the page rather than declared per element:
 *
 *  - the page settles in on every client-side navigation (a short lift and fade on `main`; never
 *    on the first paint, so the served HTML and its LCP are untouched);
 *  - a figure marked `data-count` counts up from zero the first time it scrolls into view, and
 *    lands on the number the server rendered;
 *  - a `.btn` leans toward a fine pointer while it hovers and returns when it leaves, its arrow
 *    nudging with it.
 *
 * Restrained by rule: eases out, never bounces, distances of a few pixels, and every behaviour is
 * inside gsap.matchMedia so a reduced-motion preference leaves the page static.
 */
export function MotionRoot() {
  const pathname = usePathname();
  const first = useRef(true);

  // the page settles in after a navigation
  useLayoutEffect(() => {
    if (first.current) { first.current = false; return; }
    const main = document.getElementById('main');
    if (!main || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tween = gsap.fromTo(main, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', clearProps: 'opacity,transform' });
    const id = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => { cancelAnimationFrame(id); tween.kill(); };
  }, [pathname]);

  // counters and magnetic buttons, rebuilt per page
  useLayoutEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const locale = document.documentElement.lang || undefined;
      const fmt = new Intl.NumberFormat(locale);
      document.querySelectorAll<HTMLElement>('[data-count]').forEach(el => {
        const n = Number(el.dataset.count);
        if (!Number.isFinite(n)) return;
        const state = { v: 0 };
        gsap.to(state, {
          v: n, duration: 1.2, ease: 'power2.out',
          onUpdate: () => { el.textContent = fmt.format(Math.round(state.v)); },
          onComplete: () => { el.textContent = fmt.format(n); },
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        });
      });
    });
    mm.add('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)', () => {
      const pull = 0.22;
      const radius = 28;
      const enter = (e: PointerEvent) => {
        const btn = (e.target as Element | null)?.closest?.('.btn') as HTMLElement | null;
        if (!btn || btn.dataset.magnet) return;
        btn.dataset.magnet = '1';
        const arrow = btn.querySelector<SVGElement>('svg');
        const x = gsap.quickTo(btn, 'x', { duration: 0.55, ease: 'power3.out' });
        const y = gsap.quickTo(btn, 'y', { duration: 0.55, ease: 'power3.out' });
        const move = (ev: PointerEvent) => {
          const r = btn.getBoundingClientRect();
          const dx = ev.clientX - (r.left + r.width / 2);
          const dy = ev.clientY - (r.top + r.height / 2);
          const k = Math.min(1, Math.hypot(dx, dy) / Math.max(r.width, r.height));
          x(Math.max(-radius, Math.min(radius, dx * pull * k)));
          y(Math.max(-radius, Math.min(radius, dy * pull * k)));
          if (arrow) gsap.to(arrow, { x: 3, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
        };
        const leave = () => {
          btn.removeEventListener('pointermove', move);
          btn.removeEventListener('pointerleave', leave);
          delete btn.dataset.magnet;
          gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform' });
          if (arrow) gsap.to(arrow, { x: 0, duration: 0.5, ease: 'power2.out', overwrite: 'auto', clearProps: 'transform' });
        };
        btn.addEventListener('pointermove', move);
        btn.addEventListener('pointerleave', leave);
      };
      document.addEventListener('pointerover', enter);
      return () => document.removeEventListener('pointerover', enter);
    });
    return () => mm.revert();
  }, [pathname]);

  return null;
}
