import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { formatDate, formatMoney, formatNumber, isLocale, type Locale } from '@dospa/i18n';
import { requireAuth } from '@/server/auth-context';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('dashboard.title') };
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale: Locale = isLocale(raw) ? raw : 'fr';
  const auth = await requireAuth(locale);
  const t = await getTranslations();
  const sampleDate = new Date('2026-07-01T08:30:00Z');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('dashboard.title')}</h1>
        <p className="mt-1 text-slate-600">
          {t.rich('dashboard.welcome', {
            name: auth.user.displayName,
            b: (chunks) => <bdi className="font-medium">{chunks}</bdi>,
          })}
        </p>
      </div>
      <div role="note" className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        {t('dashboard.phaseNotice')}
      </div>
      <section aria-labelledby="formats" className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 id="formats" className="font-semibold">
          {t('dashboard.formats.title')}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{t('dashboard.formats.description')}</p>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-500">{t('dashboard.formats.money')}</dt>
            <dd data-testid="sample-money">{formatMoney(15_000_000n, auth.tenant.currency, locale)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{t('dashboard.formats.date')}</dt>
            <dd data-testid="sample-date">{formatDate(sampleDate, locale, auth.tenant.timezone)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{t('dashboard.formats.number')}</dt>
            <dd data-testid="sample-number">{formatNumber(1234567.89, locale)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">{t('dashboard.formats.timezone')}</dt>
            <dd dir="ltr" className="text-start">
              {auth.tenant.timezone}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
