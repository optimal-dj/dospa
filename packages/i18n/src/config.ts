/** Configuration des langues DOSPA. Voir docs/TRANSLATIONS.md. */
export const LOCALES = ['fr', 'en', 'ar', 'so', 'aa'] as const;
export type Locale = (typeof LOCALES)[number];

/** Langue source de rédaction et cible du fallback (DECISIONS D-009). */
export const SOURCE_LOCALE: Locale = 'fr';

/** Langue par défaut de la plateforme ; surchargeable par DEFAULT_LOCALE (D-008). */
export function platformDefaultLocale(): Locale {
  const fromEnv = typeof process !== 'undefined' ? process.env['DEFAULT_LOCALE'] : undefined;
  return isLocale(fromEnv) ? fromEnv : SOURCE_LOCALE;
}

export const NAMESPACES = [
  'common',
  'navigation',
  'auth',
  'dashboard',
  'settings',
  'admin',
  'validation',
  'errors',
] as const;
export type Namespace = (typeof NAMESPACES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function direction(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/** Nom de chaque langue dans sa propre langue (endonyme), affiché tel quel dans le sélecteur. */
export const LOCALE_ENDONYMS: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
  so: 'Soomaali',
  aa: 'Qafar af',
};
