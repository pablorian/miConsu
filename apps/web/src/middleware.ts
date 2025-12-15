import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

// Middleware to force language selection via query param
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Handle ?lang=es override
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
