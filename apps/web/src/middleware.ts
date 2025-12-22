import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from './lib/session';

// Middleware to force language selection via query param
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Auth Guard
  const token = request.cookies.get('token')?.value;
  let user = null;

  if (token) {
    try {
      user = await verifySession(token);
    } catch (e) {
      // Invalid token
      user = null;
    }
  }

  const isDashboard = pathname.includes('/dashboard');
  const isLogin = pathname.includes('/login');

  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (isLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // 2. Handle ?lang=es override
  const lang = request.nextUrl.searchParams.get('lang');
  if (lang && ['en', 'es'].includes(lang)) {
    const response = NextResponse.redirect(new URL(pathname, request.url));
    response.cookies.set('NEXT_LOCALE', lang, { path: '/', maxAge: 31536000 });
    return response;
  }

  const intlMiddleware = createMiddleware(routing);
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|auth|r|_next|.*\\..*).*)']
};
