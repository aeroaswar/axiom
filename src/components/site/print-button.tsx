'use client';

/** Prints the page. The document's print stylesheet hides everything but the sheet. */
export function PrintButton({ label }: { label: string }) {
  return <button type="button" className="btn" onClick={() => window.print()}>{label}</button>;
}
