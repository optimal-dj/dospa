'use client';

import { Suspense, useId, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { LOCALE_ENDONYMS, LOCALES, isLocale } from '@dospa/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';
import { saveLocaleAction } from '@/server/actions/auth';

/** Sélecteur de langue accessible : conserve la page et les paramètres de requête. */
export function LanguageSwitcher() {
  return (
    <Suspense fallback={null}>
      <LanguageSelect />
    </Suspense>
  );
}

function LanguageSelect() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const id = useId();

  function onChange(next: string) {
    if (!isLocale(next) || next === locale) return;
    const query = Object.fromEntries(searchParams.entries());
    startTransition(async () => {
      await saveLocaleAction(next);
      router.replace({ pathname, query }, { locale: next });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-slate-600">
        {t('common.language')}
      </label>
      <select
        id={id}
        value={locale}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        data-testid="language-switcher"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={l} dir={l === 'ar' ? 'rtl' : 'ltr'}>
            {LOCALE_ENDONYMS[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
