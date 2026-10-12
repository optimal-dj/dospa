import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { can, type RoleCode } from '@dospa/domain';
import { isLocale, type Locale } from '@dospa/i18n';
import { EmptyState, Forbidden } from '@/components/forbidden';
import { requireAuth } from '@/server/auth-context';
import { withContext } from '@/server/db';
import { revokeMemberSessionsAction } from '@/server/actions/sessions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('admin.users.title') };
}

export default async function UsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale: Locale = isLocale(raw) ? raw : 'fr';
  const auth = await requireAuth(locale);
  if (!can(auth, 'users:read')) return <Forbidden />;
  const t = await getTranslations();
  const canManage = can(auth, 'users:manage');
  const members = await withContext({ tenantId: auth.tenantId, userId: auth.userId }, (tx) =>
    tx.membership.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        status: true,
        user: { select: { id: true, displayName: true, email: true, mfaEnabled: true } },
        assignments: { select: { role: { select: { code: true } } } },
      },
    }),
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('admin.users.title')}</h1>
      {members.length === 0 ? (
        <EmptyState messageKey="admin.users.empty" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-start text-xs uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2 text-start">
                  {t('admin.users.columns.name')}
                </th>
                <th scope="col" className="px-3 py-2 text-start">
                  {t('admin.users.columns.email')}
                </th>
                <th scope="col" className="px-3 py-2 text-start">
                  {t('admin.users.columns.roles')}
                </th>
                <th scope="col" className="px-3 py-2 text-start">
                  {t('admin.users.columns.mfa')}
                </th>
                <th scope="col" className="px-3 py-2 text-start">
                  {t('admin.users.columns.status')}
                </th>
                {canManage ? (
                  <th scope="col" className="px-3 py-2 text-start">
                    {t('common.actions')}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => (
                <tr key={m.id} data-testid="user-row">
                  <td className="px-3 py-2">
                    <bdi>{m.user.displayName}</bdi>
                  </td>
                  <td className="px-3 py-2" dir="ltr">
                    <span className="block text-start">{m.user.email}</span>
                  </td>
                  <td className="px-3 py-2">
                    {m.assignments.map((a) => t(`admin.roles.names.${a.role.code as RoleCode}`)).join(' · ')}
                  </td>
                  <td className="px-3 py-2">{m.user.mfaEnabled ? t('common.yes') : t('common.no')}</td>
                  <td className="px-3 py-2">{t(`admin.users.status.${m.status}`)}</td>
                  {canManage ? (
                    <td className="px-3 py-2">
                      <form action={revokeMemberSessionsAction}>
                        <input type="hidden" name="userId" value={m.user.id} />
                        <button type="submit" className="text-red-700 underline">
                          {t('admin.users.revokeSessions')}
                        </button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
