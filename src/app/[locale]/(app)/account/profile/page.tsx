import { getLocale, getTranslations } from 'next-intl/server';
import { PageTitle } from '@/components/shell/shell-client';
import { Icon } from '@/components/shell/sprite';
import { idr } from '@/lib/money';
import { fmtLong, fmtShort } from '@/lib/domain/dates';
import { getDeliveryZones, pick } from '@/lib/site/catalogue';
import { rv } from '@/components/console/shared/reveal';
import { signOutAction } from '@/app/[locale]/(public)/sign-in/actions';
import { accountSession, accountProfile, acknowledgement } from '@/components/account/data';
import { AckForm, MeForm, SiteForm } from '@/components/account/client-forms';

export const dynamic = 'force-dynamic';

/**
 * The account, its people, its addresses, its acknowledgement and its invoices — the things a
 * clinic manager comes here to change. The acknowledgement is an explicit form, not a toggle: two
 * statements, a version and a timestamp, recorded through `axiom.acknowledge` against this member.
 */
export default async function ProfilePage() {
  const session = await accountSession();
  if (!session) return null;
  const t = await getTranslations('account.profile');
  const ta = await getTranslations('account.ack');
  const tc = await getTranslations('common');
  const ts = await getTranslations('states.ack');
  const locale = await getLocale();

  const [p, ack, zones] = await Promise.all([
    accountProfile(session.uid, session.accountId),
    acknowledgement(session.uid, session.accountId),
    getDeliveryZones(),
  ]);
  const zoneOptions = zones.map(z => ({ zone: z.zone, label: pick(locale, z.label_en, z.label_id), pending: z.per_three_idr === null }));
  const zoneLabel = (zone: string) => zoneOptions.find(z => z.zone === zone);

  const ackState = ack.state === 'current' ? ta('state_current', { date: fmtLong(ack.expires, locale) })
    : ack.state === 'expiring' ? ta('state_expiring', { date: fmtLong(ack.expires, locale) })
      : ack.state === 'lapsed' ? ta('state_lapsed', { date: fmtLong(ack.expires, locale) })
        : ta('state_none');

  return (
    <section className="screen on account">
      <PageTitle title={t('title')} />

      <div className="split">
        <section className="sec rv" style={rv(0)}>
          <div className="sec-h"><span className="kicker">{t('account')}</span></div>
          <div className="kv"><span className="k">{t('name')}</span><span className="v">{p.account?.name}</span></div>
          <div className="kv"><span className="k">{t('type')}</span><span className="v">{t(`type_${p.account?.type ?? 'individual'}` as 'type_individual')}</span></div>
          {p.account?.whatsapp ? <div className="kv"><span className="k">{t('whatsapp')}</span><span className="v tnum">{p.account.whatsapp}</span></div> : null}
          <div className="kv"><span className="k">{t('pricing')}</span><span className="v">{t('pricing_value')}</span></div>

          <div className="block">
            <div className="sec-h"><span className="kicker">{t('members')}</span></div>
            {p.members.map(m => (
              <div className="kv" key={m.profile_id}>
                <span className="k">{m.full_name}{m.profile_id === session.uid ? ` · ${t('you')}` : ''}</span>
                <span className="v">{m.is_primary ? t('primary') : t('member')}</span>
              </div>
            ))}
          </div>

          <div className="block">
            <div className="sec-h"><span className="kicker">{t('me')}</span></div>
            <MeForm name={p.me?.full_name ?? session.name} locale={p.me?.locale ?? locale} />
          </div>

          <div className="block">
            <form action={signOutAction}>
              <button type="submit" className="btn btn-sm"><Icon name="signout" />{t('sign_out')}</button>
            </form>
          </div>
        </section>

        <section className="sec rv" style={rv(1)}>
          <div className="sec-h" id="acknowledgement"><span className="kicker">{ta('title')}</span></div>
          <div className="kv"><span className="k">{ta('state')}</span>
            <span className="v" data-ack-state={ack.state}>
              <span className={`chip ${ack.state === 'current' ? 'quiet ok' : ack.state === 'lapsed' ? 'err' : 'warn'}`}>
                <span className="dot" />{ts(ack.state)}
              </span>
            </span>
          </div>
          {ack.expires ? (
            <div className="kv"><span className="k">{ta('valid_until')}</span><span className="v">{fmtLong(ack.expires, locale)}</span></div>
          ) : null}
          {ack.state === 'current' ? null : <p className="note" data-ack-line>{ackState}</p>}
          <div className="kv"><span className="k">{ta('age')}</span><span className="v">{ack.age_at ? fmtLong(ack.age_at, locale) : <span className="dim-2">{ta('not_recorded')}</span>}</span></div>
          <div className="kv"><span className="k">{ta('researcher')}</span><span className="v">{ack.researcher_at ? fmtLong(ack.researcher_at, locale) : <span className="dim-2">{ta('not_recorded')}</span>}</span></div>
          <div className="kv"><span className="k">{ta('version')}</span><span className="v tnum">{ack.version ?? ack.ack_version}</span></div>
          <p className="note" style={{ marginTop: 14 }}>{ta('note')}</p>

          <div className="block">
            <div className="sec-h"><span className="kicker">{ta('form_title')}</span></div>
            {/* Recording is the primary act only while it is missing; a renewal is housekeeping. */}
            <AckForm version={ack.ack_version} primary={ack.state !== 'current'} />
          </div>
        </section>
      </div>

      <section className="sec rv sites" style={rv(2)} id="sites">
        <div className="sec-h"><span className="kicker">{t('sites')}</span></div>
        {p.sites.map(s => {
          const z = zoneLabel(s.zone);
          return (
            <div className="siterow" key={s.id}>
              <div className="kv">
                <span className="k">
                  {s.name}{s.is_default ? ` · ${t('site_default')}` : ''}
                  {s.address ? <span className="sub">{s.address}</span> : null}
                </span>
                <span className="v">
                  {z?.label}{z?.pending ? <span className="dim-2"> · {t('rate_pending')}</span> : null}
                </span>
              </div>
              <SiteForm site={s} zones={zoneOptions} />
            </div>
          );
        })}
        <div className="block">
          <div className="sec-h"><span className="kicker">{t('add_site')}</span></div>
          <SiteForm zones={zoneOptions} />
        </div>
      </section>

      <section className="sec rv" style={rv(3)}>
        <div className="sec-h"><span className="kicker">{t('invoices')}</span></div>
        {p.invoices.length ? (
          <div className="rows">
            {p.invoices.map(i => (
              <div className="row rowa" key={i.id}>
                <span className="ic"><Icon name="file" /></span>
                <span className="bd">
                  <span className="t1">{i.number}</span>
                  <span className="t2">
                    {i.paid_at ? t('paid', { date: fmtShort(i.paid_at, locale) })
                      : t('issued', { date: fmtShort(i.issued_at, locale), due: fmtShort(i.due_at, locale) })}
                    {' · '}{t('order', { number: i.order_number })}
                  </span>
                </span>
                <span className="rt"><span className="amt">{idr(i.total_idr)}</span></span>
                <span className="act">
                  <a className="btn btn-sm" href={`/api/documents/invoice/${i.number}`} target="_blank" rel="noopener noreferrer">
                    <Icon name="download" />{t('pdf')}
                  </a>
                </span>
              </div>
            ))}
          </div>
        ) : <p className="empty">{t('invoices_empty')}</p>}
        <p className="note" style={{ marginTop: 16 }}>{tc('pen_included')}</p>
      </section>
    </section>
  );
}
