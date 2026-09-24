import { SPRITE } from './sprite-svg';

/** The wordmark and icon sprite, rendered once per document. */
export function Sprite() {
  return <div aria-hidden="true" dangerouslySetInnerHTML={{ __html: SPRITE }} />;
}

export function Icon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={`ic-sv${className ? ' ' + className : ''}`} style={style} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}

export function Wordmark({ className, label = 'AXIOM' }: { className?: string; label?: string }) {
  return (
    <svg className={`wm-sv${className ? ' ' + className : ''}`} viewBox="0 0 582 70" role="img" aria-label={label}>
      <use href="#wm" />
    </svg>
  );
}
