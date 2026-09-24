import qrcode from 'qrcode-generator';

// The QR is a pointer and nothing else: it carries the card's URL, and the card behind that URL is
// what changes. A square printed with the first consignment is still the right square on the fifth.
//
// `qrcode-generator` is here for one reason the alternatives do not offer — it hands back the raw
// module matrix, so the symbol is drawn as our own markup in `var(--ink)` rather than as an opaque
// string of someone else's SVG. It is MIT, has no runtime dependencies, and ships its own types.

/** Error correction Q recovers 25%. A vial label gets scuffed; L would not survive it. */
const LEVEL = 'Q';
/** The quiet zone is four modules on every side and is part of the specification, not padding. */
const QUIET = 4;

export function qrModules(text: string): boolean[][] {
  const qr = qrcode(0, LEVEL);       // 0 = pick the smallest version that fits
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => qr.isDark(r, c)));
}

/**
 * One `<path>` for the whole symbol rather than a rect per module: a 29×29 code is ~420 dark
 * modules, and 420 elements is a slow, heavy DOM and a heavy PDF. `shape-rendering="crispEdges"`
 * stops the renderer antialiasing module boundaries into grey, which is what makes a small printed
 * code fail to scan. The fill is `currentColor`, so the square inherits the ink around it and no
 * hex literal enters a component (gate 12).
 */
export function qrPath(modules: boolean[][]): string {
  const out: string[] = [];
  for (let r = 0; r < modules.length; r++) {
    for (let c = 0; c < modules.length; c++) {
      if (modules[r][c]) out.push(`M${c + QUIET} ${r + QUIET}h1v1h-1z`);
    }
  }
  return out.join('');
}

export const qrViewBox = (modules: boolean[][]) => `0 0 ${modules.length + QUIET * 2} ${modules.length + QUIET * 2}`;

/** The standalone document, for the `image/svg+xml` route. The card page renders its own JSX. */
export function qrSvg(text: string, label?: string): string {
  const modules = qrModules(text);
  const title = label ? `<title>${label.replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]!))}</title>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${qrViewBox(modules)}" width="512" height="512" ` +
    `shape-rendering="crispEdges" role="img">${title}` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    `<path d="${qrPath(modules)}" fill="#000000"/></svg>`;
}
