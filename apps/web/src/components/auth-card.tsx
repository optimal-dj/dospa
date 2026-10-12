import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from './language-switcher';

export async function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const t = await getTranslations();
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-10">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <span className="text-xl font-bold text-brand-900">{t('common.appName')}</span>
        <LanguageSwitcher />
      </div>
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        <div className="mt-6">{children}</div>
      </section>
      <p className="mt-6 max-w-md text-center text-xs text-slate-500">{t('common.demoNotice')}</p>
    </main>
  );
}
