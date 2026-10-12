import { defineRouting } from 'next-intl/routing';
import { LOCALES, SOURCE_LOCALE } from '@dospa/i18n/config';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: SOURCE_LOCALE,
  localePrefix: 'always',
  localeCookie: { name: 'DOSPA_LOCALE', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 },
});
