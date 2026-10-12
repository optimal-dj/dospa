/**
 * Formatage localisé pour l'affichage uniquement : les valeurs métier ne sont jamais modifiées.
 * - Montants : entiers en unité mineure (bigint) + code devise ISO 4217.
 * - Afar (aa) : aucune donnée CLDR dans ICU (D-011) → conventions numériques de fr-DJ, dates numériques.
 * - Arabe : chiffres latins par défaut (D-010), paramétrable via `arabicDigits`.
 */
import type { Locale } from './config';

export interface FormatOptions {
  arabicDigits?: 'latn' | 'arab';
}

const INTL_LOCALE: Record<Locale, string> = {
  fr: 'fr-DJ',
  en: 'en-DJ',
  ar: 'ar-DJ',
  so: 'so-DJ',
  aa: 'fr-DJ',
};

export function intlLocale(locale: Locale, opts: FormatOptions = {}): string {
  if (locale === 'ar') return `ar-DJ-u-nu-${opts.arabicDigits ?? 'latn'}`;
  return INTL_LOCALE[locale];
}

function minorDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

/** Convertit un montant en unité mineure en chaîne décimale exacte (sans passer par un float). */
export function minorToDecimalString(amountMinor: bigint, currency: string): string {
  const digits = minorDigits(currency);
  const negative = amountMinor < 0n;
  const abs = (negative ? -amountMinor : amountMinor).toString().padStart(digits + 1, '0');
  const intPart = abs.slice(0, abs.length - digits) || '0';
  const frac = digits > 0 ? `.${abs.slice(-digits)}` : '';
  return `${negative ? '-' : ''}${intPart}${frac}`;
}

export function formatMoney(
  amountMinor: bigint,
  currency: string,
  locale: Locale,
  opts: FormatOptions = {},
): string {
  const nf = new Intl.NumberFormat(intlLocale(locale, opts), { style: 'currency', currency });
  // Intl accepte une chaîne décimale exacte (pas d'arrondi flottant).
  return nf.format(minorToDecimalString(amountMinor, currency) as unknown as number);
}

export function formatNumber(
  value: number | bigint,
  locale: Locale,
  opts: FormatOptions & Intl.NumberFormatOptions = {},
): string {
  const { arabicDigits, ...nfOpts } = opts;
  return new Intl.NumberFormat(intlLocale(locale, { arabicDigits }), nfOpts).format(value);
}

export function formatPercent(ratio: number, locale: Locale, opts: FormatOptions = {}): string {
  return new Intl.NumberFormat(intlLocale(locale, opts), {
    style: 'percent',
    maximumFractionDigits: 2,
  }).format(ratio);
}

export function formatDate(date: Date, locale: Locale, timeZone: string, opts: FormatOptions = {}): string {
  const style: Intl.DateTimeFormatOptions =
    locale === 'aa' ? { day: '2-digit', month: '2-digit', year: 'numeric' } : { dateStyle: 'long' };
  return new Intl.DateTimeFormat(intlLocale(locale, opts), { ...style, timeZone }).format(date);
}

export function formatDateTime(
  date: Date,
  locale: Locale,
  timeZone: string,
  opts: FormatOptions = {},
): string {
  const style: Intl.DateTimeFormatOptions =
    locale === 'aa'
      ? {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }
      : { dateStyle: 'medium', timeStyle: 'short' };
  return new Intl.DateTimeFormat(intlLocale(locale, opts), { ...style, timeZone }).format(date);
}
