import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['postgres', 'playwright'],
  // the document renderer reads its stylesheet from the source tree at request time; a serverless
  // bundle only carries what the tracer is told about
  outputFileTracingIncludes: { '/**': ['./src/styles/app.css', './src/app/globals.css'] },
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    // Content security policy: the only third parties the build loads are Google Fonts (the two
    // brand faces). Everything else is same-origin, so the policy can be tight. `unsafe-inline`
    // on style-src is required by the framework's inlined critical CSS; script-src carries
    // 'unsafe-inline' only because Next's bootstrap script is inline and unhashed in this version.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"),
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'" + (process.env.NODE_ENV === 'production' ? '' : ' ws: wss:'),
      'upgrade-insecure-requests',
    ].join('; ');
    const secure = [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    ];
    return [
      { source: '/:path*', headers: secure },
      { source: '/:surface(console|account|request|sign-in)/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/:surface(console|account|request|sign-in)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/:locale(en|id)/:surface(console|account|request|sign-in)/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/:locale(en|id)/:surface(console|account|request|sign-in)', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ];
  },
};

export default withNextIntl(nextConfig);
