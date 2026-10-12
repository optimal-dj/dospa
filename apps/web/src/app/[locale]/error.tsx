'use client';

import { useTranslations } from 'next-intl';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations();
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">{t('common.error.title')}</h1>
      <p className="mt-2 text-slate-600">{t('common.error.description')}</p>
      <button type="button" onClick={reset} className="mt-6 rounded-md bg-brand-600 px-4 py-2 text-white">
        {t('common.error.retry')}
      </button>
    </main>
  );
}
