'use client';
import { useEffect, useRef, useState } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { Icon } from './sprite';

export type NavItem = { href: string; icon: string; label: string; exact?: boolean; center?: boolean };

function isActive(pathname: string, href: string, exact?: boolean) {
  const path = href.split('?')[0];
  return exact ? pathname === path : pathname === path || pathname.startsWith(path + '/');
}

export function RailNav({ groups, items }: { groups: string[]; items: NavItem[][] }) {
  const pathname = usePathname();
  return (
    <div>
      {items.map((group, gi) => (
        <div key={gi}>
          <div className="grp">{groups[gi]}</div>
          {group.map(it => (
            <Link key={it.href} href={it.href} className={isActive(pathname, it.href, it.exact) && !it.href.includes('?') ? 'on' : ''}>
              <Icon name={it.icon} />
              {it.label}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Instagram-style tab bar: five icon-only tabs, one bronze line that slides, centre action opens a sheet route. */
export function TabBar({ tabs }: { tabs: NavItem[] }) {
  const pathname = usePathname();
  const activeIndex = tabs.findIndex(t => !t.center && isActive(pathname, t.href, t.exact));
  const centerOpen = tabs.some(t => t.center && isActive(pathname, t.href));
  return (
    <nav className="tabbar" aria-label="Primary">
      <span className="tab-ind" style={{ left: `${Math.max(activeIndex, 0) * 20}%`, opacity: activeIndex < 0 || centerOpen ? 0 : 1 }} />
      {tabs.map(t => {
        const on = !t.center && isActive(pathname, t.href, t.exact);
        return (
          <Link key={t.href} href={t.href} className={`tab${on ? ' on' : ''}`} aria-label={t.label} aria-current={on ? 'page' : undefined} scroll={false}>
            <Icon name={t.icon} className="ic-o" />
            <Icon name={`${t.icon}-f`} className="ic-f" />
          </Link>
        );
      })}
    </nav>
  );
}

export function TopBarActions({ surface, badge, primaryHref, primaryLabel, searchPlaceholder, notificationsLabel }: {
  surface: 'console' | 'account'; badge: number; primaryHref: string; primaryLabel: string; searchPlaceholder: string; notificationsLabel: string;
}) {
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) {
        if (e.key === 'Escape') { setSearching(false); (e.target as HTMLElement).blur(); }
        return;
      }
      if (e.key === '/') { e.preventDefault(); setSearching(true); setTimeout(() => input.current?.focus(), 0); }
      else if (e.key === 'n' && surface === 'console') { router.push(primaryHref); }
      else if (e.key === 'Escape') {
        // Escape closes the search only. An open sheet closes itself (it owns its own handler and
        // its own route), and Escape on a plain list must not navigate anywhere.
        setSearching(false);
      }
      else if (/^[1-5]$/.test(e.key)) {
        // Whichever navigation is actually on screen: the rail above 1024 px, the tab bar below.
        // Both are in the DOM at every width, so pick the visible one rather than the first match.
        const nav = document.querySelector<HTMLElement>('.tabbar');
        const visible = nav && nav.offsetParent !== null
          ? nav.querySelectorAll<HTMLAnchorElement>('.tab')
          : document.querySelectorAll<HTMLAnchorElement>('.rail a[href]');
        const el = visible[Number(e.key) - 1]; if (el) el.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, primaryHref, surface]);
  useEffect(() => {
    const el = document.querySelector('[data-topbar]');
    el?.classList.toggle('searching', searching);
  }, [searching]);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/${surface}/search?q=${encodeURIComponent(q)}`);
    setSearching(false);
  };
  return (
    <>
      <form className="search" onSubmit={submit} role="search">
        <Icon name="search" style={{ fontSize: 15, color: 'var(--muted)' }} />
        <input ref={input} type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={searchPlaceholder} autoComplete="off" aria-label={searchPlaceholder}
          onKeyDown={e => { if (e.key === 'Escape') setSearching(false); }} />
      </form>
      <Link href={primaryHref} className="btn btn-sm btn-primary primary desktop-only"><Icon name="plus" /><span>{primaryLabel}</span></Link>
      <button className="iconbtn" aria-label={searchPlaceholder} onClick={() => { setSearching(s => !s); setTimeout(() => input.current?.focus(), 0); }}><Icon name="search" /></button>
      <Link href={`/${surface}/notifications`} className="iconbtn" aria-label={notificationsLabel} scroll={false}>
        <Icon name="bell" />
        {badge > 0 && <span className="badge" style={{ background: 'var(--accent)' }}>{badge}</span>}
      </Link>
    </>
  );
}

export function RuoBar({ short, full, readMore, hide }: { short: string; full: string; readMore: string; hide: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`ruo-bar${open ? ' open' : ''}`}>
      <b>RUO</b>
      <span className="long">{short}</span>
      <span className="sp" />
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? hide : readMore}</button>
      <span className="full">{full}</span>
    </div>
  );
}

/** Sets the top bar title from a page. */
export function PageTitle({ title }: { title: string }) {
  useEffect(() => {
    const el = document.getElementById('app-title');
    if (el) el.textContent = title;
    document.title = `${title} · AXIOM`;
  }, [title]);
  return null;
}
