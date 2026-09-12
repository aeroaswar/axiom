'use client';
import { useState } from 'react';
import { Icon } from '@/components/shell/sprite';

/** Copies one value (a lot code) to the clipboard and says so for a moment. */
export function CopyButton({ value, label, done }: { value: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button" className="copy" aria-label={ok ? done : label} title={ok ? done : label}
      onClick={() => { navigator.clipboard?.writeText(value).then(() => { setOk(true); setTimeout(() => setOk(false), 1600); }).catch(() => {}); }}
    >
      <Icon name={ok ? 'check' : 'share'} />
    </button>
  );
}
