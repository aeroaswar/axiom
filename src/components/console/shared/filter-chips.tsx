'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export type Chip = { value: string; label: string; tone?: 'warn' | 'err' | 'ok' };

/**
 * The chip row above a list. Filtering is a view of the rows already on the page, exactly as the
 * mockup does it: every row carries `data-tags`, a chip names one tag, and a group heading carries
 * the union of its members' tags so a heading with nothing left under it goes too. No round trip,
 * so the list keeps its scroll position and the sheet docked beside it stays put.
 *
 * The empty state is the list's own `[data-none]` element; this only shows and hides it.
 */
export function FilterChips({ scope, chips }: { scope: string; chips: Chip[] }) {
  const params = useSearchParams();
  const fromUrl = params.get('filter') ?? '';
  const [active, setActive] = useState(fromUrl);
  useEffect(() => { setActive(fromUrl); }, [fromUrl]);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(`[data-scope="${scope}"]`);
    if (!root) return;
    let shown = 0;
    root.querySelectorAll<HTMLElement>('[data-tags]').forEach(el => {
      const hit = !active || ` ${el.dataset.tags ?? ''} `.includes(` ${active} `);
      el.hidden = !hit;
      if (hit && el.dataset.group === undefined) shown++;
    });
    const none = root.querySelector<HTMLElement>('[data-none]');
    if (none) none.hidden = shown > 0;
  }, [active, scope]);

  return (
    <div className="hrow" style={{ marginBottom: 18 }} role="group">
      {chips.map(c => (
        <button key={c.value} type="button" aria-pressed={active === c.value}
          className={`chip${active === c.value ? ' on' : ''}${c.tone ? ' ' + c.tone : ''}`}
          onClick={() => setActive(a => (a === c.value ? '' : c.value))}>
          {c.tone ? <span className="dot" /> : null}{c.label}
        </button>
      ))}
    </div>
  );
}
