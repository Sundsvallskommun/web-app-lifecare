import i18nConfig from './app/i18nConfig';
import { NextRequest } from 'next/server';
import { i18nRouter } from 'next-i18n-router';

export function proxy(req: NextRequest) {
  return i18nRouter(req, i18nConfig);
}

export const config = {
  matcher: '/((?!api|napi|static|.*\\..*|_next).*)',
};
