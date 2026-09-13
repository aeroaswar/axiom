'use client';
import { useEffect, useState } from 'react';

export const SAVED_EVENT = 'axiom:saved';

// One fetch of the saved list per page, shared by every heart and the nav badge, refreshed when a
// heart toggles. The list is a cookie, so the statically rendered page cannot know it; the browser
// asks once and every control settles from the same answer.
let cache: Promise<string[]> | null = null;
const load = () => (cache ??= fetch('/api/basket', { cache: 'no-store' }).then(r => r.json()).then(d => (Array.isArray(d.saved) ? d.saved as string[] : [])).catch(() => []));

export function useSavedList(): string[] | null {
  const [list, setList] = useState<string[] | null>(null);
  useEffect(() => {
    let live = true;
    const refresh = () => { cache = null; load().then(l => { if (live) setList(l); }); };
    load().then(l => { if (live) setList(l); });
    window.addEventListener(SAVED_EVENT, refresh);
    return () => { live = false; window.removeEventListener(SAVED_EVENT, refresh); };
  }, []);
  return list;
}

/** How many compounds are saved; refreshed when a heart toggles. */
export function SavedBadge() {
  const list = useSavedList();
  return <span className="cnt" data-saved-count>{list?.length ? list.length : ''}</span>;
}
