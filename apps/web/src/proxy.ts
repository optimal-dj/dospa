import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Routage /{locale}/… : détection (cookie DOSPA_LOCALE, puis Accept-Language), redirection de `/`.
export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
