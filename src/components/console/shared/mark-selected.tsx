'use client';
import { useEffect } from 'react';
import { usePathname } from '@/i18n/navigation';

/**
 * Master-detail: while a sheet is docked, the row it belongs to stays marked in the list beside it.
 * Rows publish their own route as `data-href`; this only compares it to the current one.
 */
export function MarkSelected() {
  const pathname = usePathname();
  useEffect(() => {
    document.querySelectorAll('[data-href]').forEach(el => {
      el.classList.toggle('sel', (el as HTMLElement).dataset.href === pathname);
    });
  }, [pathname]);
  return null;
}
