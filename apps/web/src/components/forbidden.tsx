import { getTranslations } from 'next-intl/server';

export async function Forbidden() {
  const t = await getTranslations();
  return (
    <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-6" data-testid="forbidden">
      <h1 className="text-lg font-semibold text-amber-900">{t('common.forbidden.title')}</h1>
      <p className="mt-1 text-sm text-amber-800">{t('common.forbidden.description')}</p>
    </div>
  );
}

export async function EmptyState({ messageKey }: { messageKey: string }) {
  const t = await getTranslations();
  return (
    <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
      {t(messageKey)}
    </p>
  );
}
