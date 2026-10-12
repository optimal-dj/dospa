import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { loadMessages } from '@dospa/i18n/messages';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const { messages, missing } = await loadMessages(locale);
  if (missing.length > 0 && process.env['NODE_ENV'] !== 'production') {
    console.warn(`[i18n] ${locale}: ${missing.length} missing key(s), falling back to fr`);
  }
  return {
    locale,
    messages,
    timeZone: 'Africa/Djibouti',
    onError(error) {
      console.error('[i18n]', error.code, error.originalMessage);
    },
    // Jamais de clé brute à l'écran : en dernier recours, texte neutre.
    getMessageFallback() {
      return '…';
    },
  };
});
