import { getTranslations } from 'next-intl/server';
import { idr } from '@/lib/money';
import type { CutoffSetting } from '@/lib/domain/cutoff';
import type { Note, Pipeline } from '@/lib/queries/pipeline';
import { CutoffNote } from '../motion';
import type { Tile } from './pipe-strip';
import { labels } from './labels';

/**
 * The five tiles, built once from the pipeline the list is built from. The dashboard's mini strip
 * and the list's own strip call this, so a count on one screen cannot disagree with the other.
 * The packing tile is the only live one: it counts down to the cut-off from the device clock.
 */
export async function stageTiles(pipeline: Pipeline, cutoff: CutoffSetting): Promise<Tile[]> {
  const t = await getTranslations('commerce.orders');
  const tp = await getTranslations('commerce.pipe');
  const L = await labels();

  const noteNode = (stage: string, n: Note) => {
    if (stage === 'packing' && (n.key === 'cutoff' || n.key === 'cutoff_passed')) {
      const fallback = n.key === 'cutoff_passed'
        ? tp('cutoff_passed', { cut: String(n.params.cut) })
        : tp('cutoff', { cut: String(n.params.cut), left: L.t(`cutoff.${n.params.leftKey}`, n.params) });
      return <CutoffNote cold={n.params.cold === 1} cutoff={cutoff} variant="pipe" className="sub" fallback={fallback} />;
    }
    const params: Record<string, string | number> = { ...n.params };
    if (n.key === 'next_est') params.date = L.short(String(n.params.date));
    if (n.key === 'next_reorder') {
      const d = Number(n.params.d ?? 0);
      params.label = d < 0 ? tp('overdue_by', { d: -d }) : tp('due_in', { d });
    }
    return <span className={`sub${n.tone ? ` ${n.tone}` : ''}`}>{tp(n.key, params)}</span>;
  };

  return pipeline.stages.map(s => ({
    key: s.key,
    label: t(`stage_${s.key}`),
    count: s.n,
    value: BigInt(s.value) > 0n ? idr(s.value) : '',
    note: noteNode(s.key, s.note),
    tone: s.note.tone,
  }));
}
