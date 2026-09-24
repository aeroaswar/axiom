'use client';
import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

/** What every Console server action hands back: one line of confirmation, or the refusal in full. */
export type ActionState = { ok?: string; error?: string; errors?: string[] } | null;
export type ServerAction = (prev: ActionState, form: FormData) => Promise<ActionState>;

function Submit({ label, tone }: { label: string; tone?: 'accent' | 'danger' }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className={`btn btn-sm${tone === 'accent' ? ' btn-accent' : ''}`}>
      {label}
    </button>
  );
}

/**
 * A form whose result is stated where it happened. A database refusal is rendered verbatim — the
 * rule lives in Postgres, so its own message is the honest thing to show — never swallowed and
 * never replaced by a blank card.
 */
export function ActionForm({ action, submit, tone, children, className, resetOnSuccess }: {
  action: ServerAction; submit: string; tone?: 'accent' | 'danger';
  children?: React.ReactNode; className?: string; resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (resetOnSuccess && state?.ok) form.current?.reset(); }, [state, resetOnSuccess]);
  return (
    <form ref={form} action={formAction} className={className}>
      {children}
      {state?.errors?.length ? (
        <div className="refusal err">
          <ul>{state.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
        </div>
      ) : null}
      <div className="formfoot">
        <Submit label={submit} tone={tone} />
        {state?.error ? <span className="msg err" role="status">{state.error}</span>
          : state?.ok ? <span className="msg ok" role="status">{state.ok}</span> : null}
      </div>
    </form>
  );
}

/** A single action with no fields of its own — publish, unpublish, remove. */
export function ActionButton({ action, submit, tone, hidden, className }: {
  action: ServerAction; submit: string; tone?: 'accent' | 'danger';
  hidden?: Record<string, string>; className?: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, null);
  return (
    <form action={formAction} className={className} style={{ display: 'contents' }}>
      {Object.entries(hidden ?? {}).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Submit label={submit} tone={tone} />
      {state?.error ? <span className="msg err" role="status">{state.error}</span>
        : state?.ok ? <span className="msg ok" role="status">{state.ok}</span> : null}
    </form>
  );
}
