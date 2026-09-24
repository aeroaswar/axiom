'use client';
import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/shell/sprite';
import { recordSent } from './actions';

/**
 * The page counter is measured, never assumed: the preview is read at true A4 proportions, so the
 * count on screen is the count the printed document will have whatever the viewport is doing.
 */
export function PageCount() {
  const [pages, setPages] = useState(1);
  const t = useTranslations('commerce.invoices');
  useEffect(() => {
    const measure = () => {
      const doc = document.querySelector<HTMLElement>('.inv-doc');
      if (!doc) return;
      const w = doc.getBoundingClientRect().width || 794;
      const n = Math.max(1, Math.ceil(doc.scrollHeight / (w * (1123 / 794)) - 0.02));
      setPages(n);
    };
    measure();
    const ro = new ResizeObserver(measure);
    const doc = document.querySelector('.inv-doc');
    if (doc) ro.observe(doc);
    return () => ro.disconnect();
  }, []);
  return <span data-pages={pages}>{t('pages', { n: pages })}</span>;
}

/**
 * Print asks the browser for the document alone; the app shell is dropped by the print stylesheet.
 * Send records that the document went out and then hands it to WhatsApp, which is where this market
 * closes. Neither changes the invoice's state — only Mark paid does.
 */
export function PrintButton() {
  const t = useTranslations('commerce.invoices');
  return (
    <button type="button" className="btn btn-sm" onClick={() => window.print()}>
      <Icon name="print" />{t('print')}
    </button>
  );
}

export function SendButton({ invoiceId, message, whatsapp }: { invoiceId: string; message: string; whatsapp: string | null }) {
  const t = useTranslations('commerce.invoices');
  const [pending, start] = useTransition();
  const open = () => start(async () => {
    const form = new FormData();
    form.set('invoice_id', invoiceId);
    form.set('via', 'whatsapp');
    await recordSent(null, form);
    window.open(`https://wa.me/${(whatsapp ?? '').replace(/[^\d]/g, '')}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  });
  return (
    <button type="button" className="btn btn-sm" onClick={open} disabled={pending} data-send-invoice>
      <Icon name="share" />{t('send')}
    </button>
  );
}
