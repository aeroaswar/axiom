'use client';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Icon, Wordmark } from '@/components/shell/sprite';
import { BasketBadge } from './basket-badge';
import { SavedBadge } from './saved-badge';

/** Wordmark, the doors, and the icon cluster: search, saved, basket, account. One line at 1024 px. */
export function SiteNav({ links, labels }: {
  links: { href: string; label: string }[];
  labels: { request: string; account: string; signIn: string; menu: string; language: string; search: string; saved: string };
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > last && y > 120);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);
  const other = locale === 'id' ? 'en' : 'id';
  return (
    <nav className={`site-nav${hidden ? ' nav-hidden' : ''}`} aria-label="Site">
      <div className="wrap nav-in">
        <Link href="/" className="brand" aria-label="AXIOM">
          <Wordmark />
        </Link>
        <div className={`nav-links${open ? ' open' : ''}`} id="site-links">
          {links.map(l => (
            <Link key={l.href} href={l.href} className={pathname === l.href || pathname.startsWith(l.href + '/') ? 'on' : ''}>{l.label}</Link>
          ))}
          <Link href="/account" className="nav-account-m">{labels.account}</Link>
          <Link href={pathname} locale={other} className="lang" aria-label={labels.language} hrefLang={other}>{other.toUpperCase()}</Link>
        </div>
        <div className="nav-right">
          <Link href="/products#shop-q" className="nav-ic" aria-label={labels.search} title={labels.search}><Icon name="search" /></Link>
          <Link href={{ pathname: '/products', query: { saved: '1' } }} className="nav-ic" aria-label={labels.saved} title={labels.saved}><Icon name="bookmark" /><SavedBadge /></Link>
          <Link href="/request" className="nav-ic" aria-label={labels.request} title={labels.request}><Icon name="basket" /><span className="cnt"><BasketBadge /></span></Link>
          <Link href="/account" className="btn btn-sm nav-account">{labels.account}</Link>
          <button className="nav-toggle" aria-label={labels.menu} aria-expanded={open} aria-controls="site-links" onClick={() => setOpen(o => !o)}>
            <Icon name={open ? 'x' : 'menu'} />
          </button>
        </div>
      </div>
    </nav>
  );
}
