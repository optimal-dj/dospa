import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { formatDateTime, isLocale, type Locale } from '@dospa/i18n';
import { LanguageSwitcher } from '@/components/language-switcher';
import { requireAuth } from '@/server/auth-context';
import { withContext } from '@/server/db';
import { revokeOtherSessionsAction, revokeOwnSessionAction } from '@/server/actions/sessions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('settings.account.title') };
}

export default async function AccountPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale: Locale = isLocale(raw) ? raw : 'fr';
  const auth = await requireAuth(locale);
  const t = await getTranslations();
  const sessions = await withContext({ userId: auth.userId, tenantId: auth.tenantId }, (tx) =>
    tx.session.findMany({
      where: { userId: auth.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
      take: 20,
    }),
  );
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t('settings.account.title')}</h1>

      <section aria-labelledby="lang" className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 id="lang" className="font-semibold">
          {t('settings.language.title')}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{t('settings.language.description')}</p>
        <div className="mt-3">
          <LanguageSwitcher />
        </div>
      </section>

      <section aria-labelledby="security" className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 id="security" className="font-semibold">
          {t('settings.security.title')}
        </h2>
        <p className="mt-1 text-sm" data-testid="mfa-status">
          {auth.user.mfaEnabled ? t('settings.security.mfaEnabled') : t('settings.security.mfaDisabled')}
        </p>
      </section>

      <section aria-labelledby="sessions" className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="sessions" className="font-semibold">
            {t('settings.sessions.title')}
          </h2>
          <form action={revokeOtherSessionsAction}>
            <button type="submit" className="rounded-md border border-slate-300 px-3 py-1 text-sm">
              {t('settings.sessions.revokeOthers')}
            </button>
          </form>
        </div>
        <ul className="mt-3 divide-y divide-slate-100">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              data-testid="session-row"
            >
              <div>
                <p dir="auto" className="text-start">
                  {s.userAgent ?? t('settings.sessions.unknownDevice')}
                </p>
                <p className="text-xs text-slate-500">
                  {t('settings.sessions.lastSeen', {
                    date: formatDateTime(s.lastSeenAt, locale, auth.tenant.timezone),
                  })}
                </p>
              </div>
              {s.id === auth.session.id ? (
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                  {t('settings.sessions.current')}
                </span>
              ) : (
                <form action={revokeOwnSessionAction}>
                  <input type="hidden" name="sessionId" value={s.id} />
                  <button type="submit" className="text-sm text-red-700 underline">
                    {t('settings.sessions.revoke')}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
