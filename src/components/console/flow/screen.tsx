import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Icon } from '@/components/shell/sprite';
import { rv } from '../shared/reveal';

/**
 * The whole system on one screen, read top to bottom: what happens, who does it, what it triggers
 * and where it can branch. This is the page a new operator is pointed at first, so every figure in
 * it — the validity window, the payment terms, the two cut-offs — is the setting the rules actually
 * use rather than a number written into the prose.
 */
export async function FlowMap({ quoteDays, payDays, cold, ambient }: {
  quoteDays: number; payDays: number; cold: string; ambient: string;
}) {
  const t = await getTranslations('commerce.flow');
  const dot = (s: string) => s.replace(':', '.');

  const steps = [
    { k: 's1', who: 'who_account', sys: false, params: {} },
    { k: 's2', who: 'who_console', sys: false, params: { days: quoteDays } },
    { k: 's3', who: 'who_both', sys: false, params: {} },
    { k: 's4', who: 'who_system', sys: true, params: { days: payDays } },
    { k: 's5', who: 'who_console', sys: false, params: {} },
    { k: 's6', who: 'who_console', sys: false, params: { cold: dot(cold), ambient: dot(ambient) } },
    { k: 's7', who: 'who_console', sys: false, params: {} },
    { k: 's8', who: 'who_console', sys: false, params: {} },
  ] as const;

  const where = [
    ['w1', 'w1_v'], ['w2', 'w2_v'], ['w3', 'w3_v'], ['w4', 'w4_v'],
  ] as const;

  return (
    <section className="screen on">
      <div className="rv" style={rv(0)}>
        <p className="eyebrow" style={{ marginBottom: 10 }}>{t('kicker')}</p>
        <h2 className="ib-title">{t('heading')}</h2>
        <p className="note" style={{ marginTop: 10, maxWidth: '68ch' }}>{t('lead')}</p>
      </div>

      <div className="split" style={{ marginTop: 26, alignItems: 'start' }}>
        <div className="flow rv" style={rv(1)}>
          {steps.map(s => (
            <div className={`f${s.sys ? ' sys' : ''}`} key={s.k}>
              <span className="t1">{t(s.k)}</span>
              <span className="who">{t(s.who)}</span>
              <span className="t2">{t(`${s.k}_t`, s.params)}</span>
              <span className="br">{t(`${s.k}_b`, s.params)}</span>
            </div>
          ))}
        </div>

        <div className="rv" style={rv(2)}>
          <div className="sec-h"><span className="kicker">{t('where')}</span></div>
          {where.map(([k, v]) => (
            <div className="kv" key={k}><span className="k">{t(k)}</span><span className="v">{t(v)}</span></div>
          ))}
          <div className="hrow" style={{ marginTop: 20 }}>
            <Link className="btn btn-sm btn-accent" href="/console/orders">
              <Icon name="receipt" />{t('open_pipeline')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
