import fs from 'node:fs';
import path from 'node:path';
import { Vial } from './vial';

// The product image: the rendered pen when the catalogue holds one for the slug (built by
// scripts/pens/build.py into public/products), otherwise the tile the row draws for itself.
// The set of rendered slugs is read once per server process.
const DIR = path.join(process.cwd(), 'public', 'products');
const WIDTHS = [400, 800, 1280] as const;
let rendered: Set<string> | null = null;

export function renderedSlugs(): Set<string> {
  if (rendered) return rendered;
  try {
    rendered = new Set(fs.readdirSync(DIR).filter(f => f.endsWith(`-${WIDTHS[0]}.webp`)).map(f => f.replace(/-\d+\.webp$/, '')));
  } catch { rendered = new Set(); }
  return rendered;
}

export function penSrc(slug: string, width: (typeof WIDTHS)[number] = 800): string { return `/products/${slug}-${width}.webp`; }

export function ProductImage({ slug, name, dose, purity, ruo, kind = 'peptide', size = 'card', priority = false }: {
  slug: string; name: string; dose?: string | null; purity: string; ruo: string;
  kind?: 'peptide' | 'device' | 'apparel'; size?: 'hero' | 'card' | 'thumb'; priority?: boolean;
}) {
  if (kind === 'peptide' && renderedSlugs().has(slug)) {
    const sizes = size === 'hero' ? '(max-width: 960px) 92vw, 640px' : size === 'thumb' ? '160px' : '(max-width: 680px) 92vw, 320px';
    return (
      <img
        className={`pen pen-${size}`}
        src={penSrc(slug, size === 'thumb' ? 400 : 800)}
        srcSet={WIDTHS.map(w => `${penSrc(slug, w)} ${w}w`).join(', ')}
        sizes={sizes}
        alt={dose ? `${name} · ${dose}` : name}
        width={1672} height={940}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        draggable={false}
      />
    );
  }
  return <Vial name={name} dose={dose} purity={purity} kind={kind} size={size} ruo={ruo} />;
}
