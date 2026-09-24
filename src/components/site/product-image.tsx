import manifest from '../../../public/products/manifest.json';
import { Vial } from './vial';

// The product image, in the order the catalogue offers one: a studio photograph when the slug has
// been photographed (square, built by scripts/merch/build.py), else the rendered pen for a research
// lot (1672x940, built by scripts/pens/build.py), else the tile the row draws for itself. Both
// builds list their slugs in one manifest, so a serverless build never reads the directory.
const WIDTHS = [400, 800, 1280] as const;
const rendered = new Set<string>(manifest.slugs);
const photographed = new Set<string>((manifest as { photos?: string[] }).photos ?? []);

export function renderedSlugs(): Set<string> { return rendered; }
export function photographedSlugs(): Set<string> { return photographed; }

export function penSrc(slug: string, width: (typeof WIDTHS)[number] = 800): string { return `/products/${slug}-${width}.webp`; }

export function ProductImage({ slug, name, dose, purity, ruo, kind = 'peptide', size = 'card', priority = false }: {
  slug: string; name: string; dose?: string | null; purity: string; ruo: string;
  kind?: 'peptide' | 'device' | 'apparel'; size?: 'hero' | 'card' | 'thumb'; priority?: boolean;
}) {
  const sizeHint = size === 'hero' ? '(max-width: 960px) 92vw, 640px' : size === 'thumb' ? '160px' : '(max-width: 680px) 92vw, 320px';
  if (photographedSlugs().has(slug)) {
    return (
      <img
        className={`shot shot-${size}`}
        src={penSrc(slug, size === 'thumb' ? 400 : 800)}
        srcSet={WIDTHS.map(w => `${penSrc(slug, w)} ${w}w`).join(', ')}
        sizes={sizeHint}
        alt={name}
        width={1280} height={1280}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        draggable={false}
      />
    );
  }
  if (kind === 'peptide' && renderedSlugs().has(slug)) {
    return (
      <img
        className={`pen pen-${size}`}
        src={penSrc(slug, size === 'thumb' ? 400 : 800)}
        srcSet={WIDTHS.map(w => `${penSrc(slug, w)} ${w}w`).join(', ')}
        sizes={sizeHint}
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
