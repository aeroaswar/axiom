import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Messages, CORE } from '@/i18n/provider';
import { SiteNav } from '@/components/site/site-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { MotionRoot } from '@/components/site/motion';
import { getSettings } from '@/lib/settings';

export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('nav');
  const tc = await getTranslations('common');
  const ts = await getTranslations('site.common');
  const settings = await getSettings();
  // Four doors: the shop, the merch, the guide, the certificates. The standard, the process, the
  // FAQ and the price list live in the footer so the bar stays one line at every width.
  const links = [
    { href: '/products', label: t('shop') },
    { href: '/merch', label: t('merch') },
    { href: '/compounds', label: t('guide') },
    { href: '/coas', label: t('coas') },
    { href: '/contact', label: t('contact') },
  ];
  return (
    <Messages only={[...CORE, 'site']}>
    <div className="site">
      <a className="skip" href="#main">{ts('skip')}</a>
      <div className="ribbon"><b>RUO</b> · {tc('ruo_short')}</div>
      <SiteNav links={links} labels={{ request: t('request'), account: t('account'), signIn: tc('sign_in'), menu: 'Menu', language: tc('language'), search: t('search'), saved: t('saved') }} />
      <main id="main" className="site-main">{children}</main>
      <SiteFooter whatsapp={settings.whatsapp} />
      <MotionRoot />
    </div>
    </Messages>
  );
}
