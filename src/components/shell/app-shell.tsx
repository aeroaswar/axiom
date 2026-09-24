import { getTranslations } from 'next-intl/server';
import type { Session } from '@/lib/auth';
import { withRls } from '@/lib/db';
import { Wordmark } from './sprite';
import { RailNav, TabBar, TopBarActions, RuoBar, type NavItem } from './shell-client';
import { LiveClock } from './clock';

export type Surface = 'console' | 'account';

/** Rail + top bar on desktop, tab bar on phone, never both. One event feed drives the badge. */
export async function AppShell({ surface, session, children }: { surface: Surface; session: Session; children: React.ReactNode }) {
  const t = await getTranslations('shell');
  const tc = await getTranslations('common');
  const owner = session.role === 'owner';

  const [{ n: openCount }] = await withRls({ uid: session.uid }, tx => tx<{ n: number }[]>`select count(*)::int n from axiom.events()`);

  const console: NavItem[][] = [
    [
      { href: '/console', icon: 'house', label: t('dashboard'), exact: true },
      { href: '/console/orders', icon: 'receipt', label: t('orders') },
      { href: '/console/catalogue', icon: 'flask', label: t('catalogue') },
      ...(owner ? [{ href: '/console/pricing', icon: 'tag', label: t('pricing') }] : []),
      { href: '/console/invoices', icon: 'file', label: t('invoices') },
    ],
    [
      { href: '/console/clients', icon: 'users', label: t('clients') },
      { href: '/console/leads', icon: 'funnel', label: t('leads') },
      { href: '/console/clients?filter=attention', icon: 'warn', label: t('ack_due') },
      { href: '/console/content', icon: 'pen', label: t('content') },
    ],
    [
      { href: '/console/flow', icon: 'flow', label: t('flow') },
      { href: '/console/settings', icon: 'user', label: t('settings_page') },
    ],
  ];
  const account: NavItem[][] = [
    [
      { href: '/account/shop', icon: 'squares', label: t('shop_tab') },
      { href: '/account/saved', icon: 'bookmark', label: t('saved') },
    ],
    [{ href: '/account', icon: 'receipt', label: t('orders'), exact: true }],
    [{ href: '/account/profile', icon: 'user', label: t('profile') }],
  ];
  const groups = surface === 'console' ? [t('operate'), t('relationships'), t('settings')] : [t('shop'), t('activity'), t('account')];
  const items = surface === 'console' ? console : account;

  const tabs = surface === 'console'
    ? [
        { href: '/console', icon: 'house', label: t('dashboard'), exact: true },
        { href: '/console/orders', icon: 'receipt', label: t('orders') },
        { href: '/console/orders/new', icon: 'plus', label: t('new_quote'), center: true },
        { href: '/console/clients', icon: 'users', label: t('clients') },
        { href: '/console/more', icon: 'squares', label: t('more') },
      ]
    : [
        { href: '/account/shop', icon: 'squares', label: t('shop_tab') },
        { href: '/account', icon: 'receipt', label: t('orders'), exact: true },
        { href: '/account/reorder', icon: 'reorder', label: t('reorder'), center: true },
        { href: '/account/saved', icon: 'bookmark', label: t('saved') },
        { href: '/account/profile', icon: 'user', label: t('profile') },
      ];

  const roleLabel = t(session.role);
  return (
    <div className="app-root" data-surface={surface} data-role={session.role} style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <div className="app-glow" />
      <div className="app">
        <nav className="rail" aria-label="Primary">
          <div className="brand">
            <Wordmark className="wm-rail" />
            <span className="sub">{surface === 'console' ? t('console') : t('account')}</span>
          </div>
          <RailNav groups={groups} items={items} />
          <div className="foot">
            <div className="eyebrow">{t('signed_in')}</div>
            <div className="who">{session.name} · {roleLabel}</div>
          </div>
        </nav>
        <div className="main">
          <header className="topbar" data-topbar>
            <Wordmark className="mwm" />
            <span className="ttl" data-title id="app-title" />
            <span className="sp" />
            <LiveClock />
            <TopBarActions surface={surface} badge={openCount} primaryHref={surface === 'console' ? '/console/orders/new' : '/account/reorder'} primaryLabel={surface === 'console' ? t('new_quote') : t('reorder')} searchPlaceholder={t('search_placeholder')} notificationsLabel={t('notifications')} />
          </header>
          <div className="scroll" data-scroll>
            {children}
          </div>
          <RuoBar short={tc('ruo_short')} full={tc('ruo_full')} readMore={tc('read_full')} hide={tc('hide')} />
          <TabBar tabs={tabs} />
        </div>
      </div>
    </div>
  );
}
