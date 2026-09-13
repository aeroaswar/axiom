import { getTranslations } from 'next-intl/server';
import { Icon } from '@/components/shell/sprite';

/**
 * The four stages of the quote-first flow — request, quote, pay, dispatch — with the stage the
 * reader is on. It sits on the basket (stage one) and on the confirmation (stage two), so a buyer
 * who expected a checkout sees, before and after submitting, that a priced quote comes next and
 * nothing is charged until they accept it.
 */
export async function FlowStrip({ at }: { at: 1 | 2 | 3 | 4 }) {
  const t = await getTranslations('site.flow');
  const steps = [1, 2, 3, 4] as const;
  return (
    <ol className="flow" aria-label={t('label')}>
      {steps.map(n => {
        const cls = n < at ? 'done' : n === at ? 'now' : '';
        return (
          <li key={n} className={cls} aria-current={n === at ? 'step' : undefined}>
            <span className="n">{n < at ? <Icon name="check" /> : n}</span>
            <span className="t">{t(`s${n}_t`)}</span>
            <span className="s">{t(`s${n}_b`)}</span>
          </li>
        );
      })}
    </ol>
  );
}
