'use server';
import { attempt, money, str } from '../shared/act';
import type { ActionState } from '../shared/action-form';

/**
 * An issued invoice is frozen: the database refuses any change to its lines, its money or its
 * identity, and a change after issue is a credit note. What is left editable is what the freeze does
 * not cover — the notes it carries, the transfer that matched it, and the record that it went out.
 */

export async function saveInvoiceNotes(_: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, 'invoice_id');
  const notes = str(form, 'notes');
  return attempt(tx => tx`update public.invoices set notes = ${notes || null} where id = ${id}::uuid`.then(() => undefined));
}

/** Marking paid is the same call the order sheet makes: it is the only door into packing. */
export async function markInvoicePaid(_: ActionState, form: FormData): Promise<ActionState> {
  const orderId = str(form, 'order_id');
  const ref = str(form, 'reference');
  return attempt(tx => tx`select axiom.mark_paid(${orderId}::uuid, ${ref})`.then(() => undefined));
}

export async function issueCreditNote(_: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, 'invoice_id');
  const amount = money(form, 'amount');
  const description = str(form, 'description');
  return attempt(tx => tx`select axiom.issue_credit_note(${id}::uuid, ${amount}, ${description})`.then(() => undefined));
}

/**
 * Sending a document never changes an invoice's state. It only notes that it went out, so the
 * history can answer "was this ever sent, and how" without the answer being a state machine hop.
 */
export async function recordSent(_: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, 'invoice_id');
  const via = str(form, 'via') || 'whatsapp';
  return attempt(async tx => {
    await tx`update public.invoices set sent_at = now(), sent_via = ${via} where id = ${id}::uuid`;
    await tx`insert into public.invoice_events (invoice_id, actor_id, actor_label, kind, ref)
             select ${id}::uuid, auth.uid(), coalesce(nullif(p.full_name, ''), 'AXIOM'), 'sent', ${via}
             from public.profiles p where p.id = auth.uid()`;
  });
}
