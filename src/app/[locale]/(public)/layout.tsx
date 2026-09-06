import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SiteNav } from '@/components/site/site-nav';
import { SiteFooter } from '@/components/site/site-footer';
import { getSettings } from '@/lib/settings';

export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('nav');
  const tc = await getTranslations('common');
  const settings = await getSettings();
  const links = [
    { href: '/compounds', label: t('compounds') },
    { href: '/price-list', label: t('price_list') },
    { href: '/standard', label: t('standard') },
    { href: '/process', label: t('process') },
    { href: '/faq', label: t('faq') },
  ];
  return (
    <div className="site">
      <div className="ribbon"><b>RUO</b> · {tc('ruo_short')}</div>
      <SiteNav links={links} labels={{ request: t('request'), account: t('account'), signIn: tc('sign_in'), menu: 'Menu', language: tc('language') }} />
      <main className="wrap" style={{ flex: 1 }}>{children}</main>
      <SiteFooter whatsapp={settings.whatsapp} />
    </div>
  );
}
