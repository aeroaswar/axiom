'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';

export type Tile = { key: string; label: string; count: number; value: string; note: React.ReactNode; tone: '' | 'warn' | 'err' };

/**
 * The five stages, in reading order. On the dashboard each tile opens the list at that stage; on the
 * list itself each tile filters it in place — the same rows, shown or hidden, so the list keeps its
 * scroll and the sheet docked beside it stays put. The counts come from the same call that built the
 * rows, so a tile can never disagree with what is under it.
 */
export function PipeStrip({ tiles, mode, mini }: { tiles: Tile[]; mode: 'filter' | 'link'; mini?: boolean }) {
  const params = useSearchParams();
  const fromUrl = params.get('filter') ?? '';
  const [stage, setStage] = useState(fromUrl);
  useEffect(() => { setStage(fromUrl); }, [fromUrl]);

  useEffect(() => {
    if (mode !== 'filter') return;
    const root = document.querySelector<HTMLElement>('[data-scope="orders"]');
    if (!root) return;
    const view = root.dataset.view ?? 'open';
    let shown = 0;
    root.querySelectorAll<HTMLElement>('[data-tags]').forEach(el => {
      const tags = ` ${el.dataset.tags ?? ''} `;
      const closed = tags.includes(' closed ');
      const hit = (view === 'closed' ? closed : !closed) && (!stage || tags.includes(` ${stage} `));
      el.hidden = !hit;
      if (hit) shown++;
    });
    const none = root.querySelector<HTMLElement>('[data-none]');
    if (none) none.hidden = shown > 0;
  }, [stage, mode]);

  const body = (t: Tile) => (
    <>
      <span className="lab">{t.label}</span>
      <span className="n">{t.count}<span className="u">{t.value}</span></span>
      {t.note}
    </>
  );

  return (
    <div className={`pipe${mini ? ' mini' : ''}`} data-pipe role="group">
      {tiles.map(t => mode === 'link' ? (
        <Link key={t.key} className="st" href={`/console/orders?filter=${t.key}`}>{body(t)}</Link>
      ) : (
        <button key={t.key} type="button" className={`st${stage === t.key ? ' on' : ''}`}
          aria-pressed={stage === t.key} data-stage={t.key}
          onClick={() => setStage(s => (s === t.key ? '' : t.key))}>
          {body(t)}
        </button>
      ))}
    </div>
  );
}

/** All open and recent, or what is closed. Two readings of one list, never two lists. */
export function ViewToggle({ open, closed, hint }: { open: string; closed: string; hint: string }) {
  const [view, setView] = useState<'open' | 'closed'>('open');
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('[data-scope="orders"]');
    if (!root) return;
    root.dataset.view = view;
    // The strip owns row visibility; nudge it by re-running its own pass.
    root.querySelectorAll<HTMLElement>('[data-tags]').forEach(el => {
      const tags = ` ${el.dataset.tags ?? ''} `;
      const isClosed = tags.includes(' closed ');
      const stage = root.querySelector<HTMLElement>('.pipe .st.on')?.dataset.stage ?? '';
      el.hidden = !((view === 'closed' ? isClosed : !isClosed) && (!stage || tags.includes(` ${stage} `)));
    });
    const none = root.querySelector<HTMLElement>('[data-none]');
    if (none) none.hidden = root.querySelectorAll<HTMLElement>('[data-tags]:not([hidden])').length > 0;
  }, [view]);
  return (
    <div className="pipe-foot">
      <button type="button" className={view === 'open' ? 'on' : ''} onClick={() => setView('open')}>{open}</button>
      <button type="button" className={view === 'closed' ? 'on' : ''} onClick={() => setView('closed')}>{closed}</button>
      <span className="sp" style={{ flex: 1 }} />
      <span className="desktop-only">{hint}</span>
    </div>
  );
}
