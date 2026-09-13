'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { idr } from '@/lib/money';
import { ADDED_EVENT } from './basket-badge';

type Line = { sku: string; qty: number; plan: number | null; pct: number; name: string; dose: string; kind: string; list: number | null; net: number | null };

/**
 * Opens after every Add, from a card or the purchase box: the lines as the basket holds them, the
 * running goods total priced as the quote will be, and the way to the basket. It reads the basket
 * back from the server (`/api/basket?detail=1`), so what it shows is what was written, never what
 * the click assumed. Closes on its buttons, the overlay, Escape, a navigation, or after a while.
 */
export function MiniBasket() {
  const t = useTranslations('site.mini');
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const box = useRef<HTMLElement | null>(null);
  const close = useCallback(() => { setOpen(false); if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    const onAdded = (e: Event) => {
      const d = (e as CustomEvent<{ sku: string; plan: number | null }>).detail;
      setLast(d ? `${d.sku}|${d.plan ?? ''}` : null);
      fetch('/api/basket?detail=1', { cache: 'no-store' }).then(r => r.json()).then(j => {
        setLines(Array.isArray(j.lines) ? j.lines : []); setOpen(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { const el = box.current; if (el && !el.matches(':hover') && !el.contains(document.activeElement)) setOpen(false); }, 6500);
      }).catch(() => {});
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener(ADDED_EVENT, onAdded);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener(ADDED_EVENT, onAdded); window.removeEventListener('keydown', onKey); };
  }, [close]);
  if (!open) return null;
  const units = lines.reduce((a, l) => a + l.qty, 0);
  const goods = lines.reduce((a, l) => a + (l.net ?? 0) * l.qty, 0);
  return (
    <>
      <div className="mini-ov" onClick={close} />
      <aside className="mini on" role="dialog" aria-label={t('label')} ref={box}>
        <div className="mini-h">
          <span className="kicker">{t('title', { count: units })}</span>
          <button type="button" className="mini-x" aria-label={t('close')} onClick={close}><Icon name="x" /></button>
        </div>
        <div className="mini-lines">
          {lines.length ? lines.slice().reverse().map(l => (
            <div className={`mini-line${last === `${l.sku}|${l.plan ?? ''}` ? ' new' : ''}`} key={`${l.sku}|${l.plan ?? ''}`}>
              <div>
                <div className="nm">{l.name}</div>
                <div className="sub">{l.dose} · {l.plan ? t('every', { days: l.plan, pct: l.pct }) : t('once')}</div>
              </div>
              <div className="amt">{l.qty} × {l.net === null ? '—' : idr(l.net)}</div>
            </div>
          )) : <p className="note">{t('empty')}</p>}
        </div>
        <div className="mini-foot">
          <div className="kv"><span className="k">{t('goods')}</span><span className="v">{idr(goods)}</span></div>
          <p className="note">{t('note')}</p>
          <div className="acts">
            <Link href="/request" className="btn btn-solid" onClick={close}>{t('view')} <Icon name="arrow" /></Link>
            <button type="button" className="btn" onClick={close}>{t('keep')}</button>
          </div>
        </div>
      </aside>
    </>
  );
}
