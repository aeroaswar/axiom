'use client';
import { useState } from 'react';
import { Icon } from '@/components/shell/sprite';

/** Copies one value (a lot code, a reference) to the clipboard and says so for a moment. With a
 *  `className` it is a labelled button; without one, the icon-only control the certificate cards use. */
export function CopyButton({ value, label, done, className }: { value: string; label: string; done: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button" className={className ?? 'copy'} aria-label={ok ? done : label} title={ok ? done : label}
      onClick={() => { navigator.clipboard?.writeText(value).then(() => { setOk(true); setTimeout(() => setOk(false), 1600); }).catch(() => {}); }}
    >
      <Icon name={ok ? 'check' : 'share'} />{className ? <> {ok ? done : label}</> : null}
    </button>
  );
}
