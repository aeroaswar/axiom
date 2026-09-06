import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intl = createMiddleware(routing);

// Locale routing for every page; a cheap session-cookie check for the two authenticated
// surfaces. Role enforcement happens server-side in the (console) and (account) layouts, which
// resolve the profile and redirect a mismatched role before any page renders, and at the
// database through RLS. The middleware never trusts anything but the presence of a session.
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const bare = pathname.replace(/^\/(en|id)(?=\/|$)/, '');
  const authed = /^\/(console|account)(\/|$)/.test(bare);
  if (authed) {
    const hasSession =
      req.cookies.has('axiom_session') ||
      Array.from(req.cookies.getAll()).some(c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = `${pathname.startsWith('/en') ? '/en' : ''}/sign-in`;
      url.searchParams.set('next', bare);
      return NextResponse.redirect(url);
    }
  }
  return intl(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
