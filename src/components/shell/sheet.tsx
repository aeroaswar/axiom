'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { Icon } from './sprite';

/**
 * The sheet: a bottom sheet on a phone (swipe-down, scrim tap and Escape dismiss it), a panel docked
 * to the right edge at 1024 px and above with the list still in view. One component, both surfaces.
 * `backHref` is where closing goes; the list page that opened the sheet.
 */
export function Sheet({ kicker, title, children, footer, backHref, closeLabel = 'Close' }: {
  kicker?: string; title: string; children: React.ReactNode; footer?: React.ReactNode; backHref: string; closeLabel?: string;
}) {
  const router = useRouter();
  const start = useRef<number | null>(null);
  const close = () => router.push(backHref, { scroll: false });
  useEffect(() => {
    const app = document.querySelector('.app');
    app?.classList.add('panel');
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => { app?.classList.remove('panel'); window.removeEventListener('keydown', onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backHref]);
  return (
    <>
      <div className="scrim on" onClick={close} aria-hidden="true" />
      <aside className="sheet on" role="dialog" aria-modal="true" aria-label={title}
        onTouchStart={e => { start.current = e.touches[0].clientY; }}
        onTouchEnd={e => { if (start.current !== null && e.changedTouches[0].clientY - start.current > 80) close(); start.current = null; }}>
        <div className="grab" />
        <div className="sh-h">
          <div className="sh-t">
            <span className="kicker">{kicker}</span>
            <span className="ttl">{title}</span>
          </div>
          <span className="sp" />
          <button className="iconbtn" onClick={close} aria-label={closeLabel}><Icon name="x" /></button>
        </div>
        <div className="sh-b">{children}</div>
        {footer ? <div className="sh-f">{footer}</div> : null}
      </aside>
    </>
  );
}
