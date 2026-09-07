import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Wordmark } from '@/components/shell/sprite';

export async function SiteFooter({ whatsapp }: { whatsapp: { number: string; display: string } }) {
  const t = await getTranslations('nav');
  const tc = await getTranslations('common');
  const year = new Date().getFullYear();
  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="cols">
          <div>
            <Wordmark />
            <p style={{ marginTop: 18, maxWidth: '52ch' }}>{tc('boilerplate')}</p>
            <p style={{ marginTop: 14 }}><a href={`https://wa.me/${whatsapp.number}`} className="tlink">{tc('whatsapp')} · {whatsapp.display}</a></p>
          </div>
          <div>
            <h4>{t('compounds')}</h4>
            <ul>
              <li><Link href="/compounds">{t('compounds')}</Link></li>
              <li><Link href="/price-list">{t('price_list')}</Link></li>
              <li><Link href="/request">{t('request')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t('standard')}</h4>
            <ul>
              <li><Link href="/standard">{t('standard')}</Link></li>
              <li><Link href="/how-to-read-a-coa">{t('coa')}</Link></li>
              <li><Link href="/process">{t('process')}</Link></li>
              <li><Link href="/faq">{t('faq')}</Link></li>
            </ul>
          </div>
          <div>
            <h4>{t('legal')}</h4>
            <ul>
              <li><Link href="/terms">{t('terms')}</Link></li>
              <li><Link href="/privacy">{t('privacy')}</Link></li>
              <li><Link href="/contact">{t('contact')}</Link></li>
              <li><Link href="/account">{t('account')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="ruo" style={{ marginTop: 34 }}><b>RUO</b> · {tc('ruo_full')}</div>
        <div className="legal">
          <span>© {year} AXIOM · Jakarta</span>
          <span>{tc('documented')}</span>
        </div>
      </div>
    </footer>
  );
}
