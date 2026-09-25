import type { CSSProperties } from 'react';

/**
 * The screen reveal: entering blocks rise 14 px and settle, 65 ms apart. `.rv` and the keyframes
 * live in app.css; this only carries the stagger index. Because each list lives in its own layout,
 * opening a sheet beside it does not re-render the list, so the reveal is never replayed.
 */
export const rv = (index: number) => ({ '--i': index } as CSSProperties);
