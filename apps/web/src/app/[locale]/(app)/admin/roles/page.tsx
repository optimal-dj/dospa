import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { can, PERMISSION_MODULES, PRIVILEGED_ROLES, type RoleCode } from '@dospa/domain';
import { isLocale, type Locale } from '@dospa/i18n';
import { Forbidden } from '@/components/forbidden';
import { requireAuth } from '@/server/auth-context';
import { withContext } from '@/server/db';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return { title: t('admin.roles.title') };
}

export default async function RolesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale: Locale = isLocale(raw) ? raw : 'fr';
  const auth = await requireAuth(locale);
  if (!can(auth, 'roles:read')) return <Forbidden />;
  const t = await getTranslations();
  const roles = await withContext({ tenantId: auth.tenantId, userId: auth.userId }, (tx) =>
    tx.role.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        code: true,
        permissions: { select: { permissionCode: true } },
        _count: { select: { assignments: true } },
      },
    }),
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('admin.roles.title')}</h1>
      <p className="text-sm text-slate-600">{t('admin.roles.description')}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {roles.map((role) => {
          const code = role.code as RoleCode;
          const perms = new Set(role.permissions.map((p) => p.permissionCode));
          return (
            <article
              key={role.id}
              className="rounded-lg border border-slate-200 bg-white p-4"
              data-testid="role-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">{t(`admin.roles.names.${code}`)}</h2>
                {PRIVILEGED_ROLES.includes(code) ? (
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                    {t('admin.roles.mfaRequired')}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {t('admin.roles.summary', { permissions: perms.size, members: role._count.assignments })}
              </p>
              <ul className="mt-3 flex flex-wrap gap-1">
                {PERMISSION_MODULES.filter((m) => [...perms].some((p) => p.startsWith(`${m}:`))).map((m) => (
                  <li key={m} className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                    {t(`admin.modules.${m}`)}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}
