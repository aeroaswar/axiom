import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['postgres', 'playwright'],
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      { source: '/:surface(console|account|request|sign-in)/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/:surface(console|account|request|sign-in)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/:locale(en|id)/:surface(console|account|request|sign-in)/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/:locale(en|id)/:surface(console|account|request|sign-in)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default withNextIntl(nextConfig);
