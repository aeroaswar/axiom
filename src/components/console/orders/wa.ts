/** The WhatsApp deep link. The number is the account's own where it has one, else AXIOM's. */
export function waLink(text: string, number?: string | null) {
  const to = (number ?? '').replace(/[^\d]/g, '');
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

/** Any message that names a peptide line carries the notice, verbatim, exactly as a document does. */
export const withRuo = (text: string, peptide: boolean, ruo: string) => (peptide ? `${text}\n\n${ruo}` : text);
