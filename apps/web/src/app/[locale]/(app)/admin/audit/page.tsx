import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { can } from '@dospa/domain';
import { formatDateTime, isLocale, type Locale } from '@dospa/i18n';
import { EmptyState, Forbidden } from '@/components/forbidden';
import { requireAuth } from '@/server/auth-context';
import { withContext } from '@/server/db';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('admin.audit.title') };
}

const KNOWN_ACTIONS = new Set([
  'user.login',
  'user.logout',
  'user.mfa_enabled',
  'user.password_reset',
  'user.sessions_revoked',
]);

export default async function AuditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale: Locale = isLocale(raw) ? raw : 'fr';
  const auth = await requireAuth(locale);
  if (!can(auth, 'audit:read')) return <Forbidden />;
  const t = await getTranslations();
  const { entries, actors } = await withContext(
    { tenantId: auth.tenantId, userId: auth.userId },
    async (tx) => {
      const entries = await tx.auditLog.findMany({
        where: { tenantId: auth.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      const ids = [...new Set(entries.map((e) => e.actorUserId).filter((v): v is string => Boolean(v)))];
      const users = await tx.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, displayName: true },
      });
      return { entries, actors: new Map(users.map((u) => [u.id, u.displayName])) };
    },
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('admin.audit.title')}</h1>
      {entries.length === 0 ? (
        <EmptyState messageKey="admin.audit.empty" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2 text-start">
                  {t('admin.audit.columns.date')}
                </th>
                <th scope="col" className="px-3 py-2 text-start">
                  {t('admin.audit.columns.actor')}
                </th>
                <th scope="col" className="px-3 py-2 text-start">
                  {t('admin.audit.columns.action')}
                </th>
                <th scope="col" className="px-3 py-2 text-start">
                  {t('admin.audit.columns.ip')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} data-testid="audit-row">
                  <td className="whitespace-nowrap px-3 py-2">
                    {formatDateTime(e.createdAt, locale, auth.tenant.timezone)}
                  </td>
                  <td className="px-3 py-2">
                    <bdi>{(e.actorUserId && actors.get(e.actorUserId)) ?? t('admin.audit.system')}</bdi>
                  </td>
                  <td className="px-3 py-2">
                    {KNOWN_ACTIONS.has(e.action) ? (
                      t(`admin.audit.actions.${e.action.replace('.', '_')}`)
                    ) : (
                      <code dir="ltr">{e.action}</code>
                    )}
                  </td>
                  <td className="px-3 py-2" dir="ltr">
                    <span className="block text-start">{e.ipAddress ?? '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
