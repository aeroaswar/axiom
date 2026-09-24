import { getLocale, getTranslations } from 'next-intl/server';
import { fmtShort, fmtStamp } from '@/lib/domain/dates';
import { leftLabel, type CutoffSetting } from '@/lib/domain/cutoff';
import type { NextAction } from '@/lib/domain/next-action';
import type { PipeRow } from '@/lib/queries/pipeline';
import { CutoffNote } from '../motion';

/**
 * One record has one next action, and one place turns it into words. The list's Next column, the
 * sheet's Next line and the sheet's primary button all call `next()` here, so they cannot disagree
 * about what a record is waiting for; the only thing that varies is where the sentence is set.
 */
export async function labels() {
  const t = await getTranslations('commerce');
  const tc = await getTranslations('common');
  const ts = await getTranslations('states');
  const locale = await getLocale();

  const short = (d: Date | string | null | undefined) => fmtShort(d, locale);
  const stamp = (d: Date | string | null | undefined) => fmtStamp(d, locale);

  const next = (na: NextAction, extra?: Record<string, string | number>) => {
    const params: Record<string, string | number> = { ...na.params, date: na.at ? short(na.at) : '', ...extra };
    if (na.key === 'o_pack_today') {
      const l = leftLabel(Number(na.params.mins ?? 0));
      params.left = t(`cutoff.${l.key}`, l.params);
    }
    return t(`next.${na.key}`, params);
  };

  return { t, tc, ts, locale, short, stamp, next };
}

export type Labels = Awaited<ReturnType<typeof labels>>;

/** The Next cell. A packing order is the one live thing here, so it reads the device clock. */
export function NextCell({ row, cutoff, text, className }: {
  row: Pick<PipeRow, 'next' | 'cold'>; cutoff: CutoffSetting; text: string; className: string;
}) {
  if (row.next.key === 'o_pack_today' || row.next.key === 'o_pack_late') {
    return <CutoffNote cold={row.cold} cutoff={cutoff} variant="next" className={className} fallback={text} />;
  }
  const tone = row.next.tone ? ` tone-${row.next.tone}` : '';
  return <span className={`${className}${tone}`}>{text}</span>;
}
