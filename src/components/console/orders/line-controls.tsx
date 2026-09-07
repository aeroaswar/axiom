'use client';

/**
 * A select that commits the moment it changes. The quote is a real record from its first line, so
 * every change here is a call to `axiom.save_quote_draft` rather than a working copy that could
 * disagree with what Send would price.
 *
 * `form` names the form it belongs to by id, because a stepper, a destination select and a line's
 * own text cannot nest inside one another and stay valid markup.
 */
export function SubmitOnChange({ id, form, name, value, options, ariaLabel, className, children }: {
  id: string; form?: string; name: string; value: string; ariaLabel: string; className?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  children?: React.ReactNode;
}) {
  return (
    <>
      {children}
      <select id={id} form={form} name={name} defaultValue={value} aria-label={ariaLabel} className={className}
        onChange={e => e.currentTarget.form?.requestSubmit()}>
        {options.map(o => <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>)}
      </select>
    </>
  );
}
