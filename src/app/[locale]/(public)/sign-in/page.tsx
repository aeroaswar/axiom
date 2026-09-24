import { getTranslations, setRequestLocale } from 'next-intl/server';
import { authMode } from '@/lib/auth';
import { asService } from '@/lib/db';
import { devSignInAction, magicLinkAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function SignIn({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ next?: string; sent?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next = '/account', sent } = await searchParams;
  const t = await getTranslations('auth');
  const dev = authMode() === 'dev';
  const users = dev
    ? await asService(tx => tx<{ id: string; full_name: string; role: string; email: string; account: string | null }[]>`
        select p.id, p.full_name, p.role, u.email, a.name as account from public.profiles p join auth.users u on u.id = p.id
        left join public.accounts a on a.id = coalesce(p.account_id, (select account_id from public.account_members m where m.profile_id = p.id limit 1))
        order by p.role desc, p.full_name`)
    : [];
  return (
    <section className="sec" style={{ maxWidth: 560 }}>
      <span className="kicker">{dev ? t('dev_title') : t('title')}</span>
      <h1 style={{ fontSize: 40, marginTop: 14 }}>{t('title')}</h1>
      <p className="lead" style={{ marginTop: 18 }}>{dev ? t('dev_lead') : t('lead')}</p>
      {dev ? (
        <div className="grid" style={{ marginTop: 34, gridTemplateColumns: '1fr' }}>
          {users.map(u => (
            <form key={u.id} action={devSignInAction} className="cell" style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 20px' }}>
              <input type="hidden" name="uid" value={u.id} />
              <input type="hidden" name="next" value={next} />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--ink)' }}>{u.full_name}</div>
                <div className="note">{u.email}{u.account ? ` · ${u.account}` : ''}</div>
              </div>
              <span className="chip quiet">{u.role}</span>
              <button className="btn btn-sm" type="submit">{t('title')}</button>
            </form>
          ))}
        </div>
      ) : (
        <form action={magicLinkAction} style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <input type="hidden" name="next" value={next} />
          <div className="field"><label htmlFor="email">{t('email')}</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
          {sent ? <p className="note">{t('sent')}</p> : <button className="btn btn-solid" type="submit">{t('magic_link')}</button>}
        </form>
      )}
    </section>
  );
}
