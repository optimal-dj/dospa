import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <main id="main" className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">{t('common.notFound.title')}</h1>
      <p className="mt-2 text-slate-600">{t('common.notFound.description')}</p>
      <Link href="/dashboard" className="mt-6 inline-block text-brand-700 underline">
        {t('common.backHome')}
      </Link>
    </main>
  );
}
