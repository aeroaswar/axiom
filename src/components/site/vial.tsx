import { Icon } from '@/components/shell/sprite';

/**
 * The product image AXIOM does not yet have a photograph for: a vial built from the tokens, with
 * the label the real vial carries (the compound, the dose, the purity threshold, the research-use
 * line, the wordmark). Everything on it is data; nothing is decoration for its own sake. A device
 * or apparel item gets the same tile with its mark instead of a vial. When `public/products/<slug>.jpg`
 * exists the page shows the photograph and this component is not rendered.
 */
export function Vial({ name, dose, purity, kind = 'peptide', size = 'card', ruo }: {
  name: string; dose?: string | null; purity?: string | null; kind?: 'peptide' | 'device' | 'apparel'; size?: 'hero' | 'card' | 'thumb'; ruo?: string;
}) {
  if (kind !== 'peptide') {
    return (
      <span className={`vial-tile ${size}`} aria-hidden="true">
        <Icon name={kind === 'device' ? 'sun' : 'shirt'} />
      </span>
    );
  }
  return (
    <span className={`vial ${size}`} aria-hidden="true">
      <span className="v-cap" />
      <span className="v-collar" />
      <span className="v-body">
        <span className="v-glass" />
        <span className="v-label">
          <span className="v-name">{name}</span>
          {dose ? <span className="v-dose">{dose}</span> : null}
          {purity ? <span className="v-pur">{purity}</span> : null}
          {ruo ? <span className="v-ruo">{ruo}</span> : null}
          <span className="v-wm">AXIOM</span>
        </span>
      </span>
      <span className="v-shadow" />
    </span>
  );
}
