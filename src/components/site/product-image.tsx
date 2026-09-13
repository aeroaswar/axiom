import manifest from '../../../public/products/manifest.json';
import { Vial } from './vial';

// The product image: the rendered pen when the catalogue holds one for the slug (built by
// scripts/pens/build.py into public/products, listed in its manifest so a serverless build needs
// no directory read), otherwise the tile the row draws for itself.
const WIDTHS = [400, 800, 1280] as const;
const rendered = new Set<string>(manifest.slugs);

export function renderedSlugs(): Set<string> { return rendered; }

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
