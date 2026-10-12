import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import {
  authorize,
  can,
  type AuthContext,
  type Permission,
  type ResourceScope,
  type RoleCode,
} from '@dospa/domain';
import type { Locale } from '@dospa/i18n/config';
import { redirect } from '@/i18n/navigation';
import { withAuthContext, withContext } from './db';
import { loadTenantAccess } from './grants';
import { nextStepFor, type NextStep } from './auth-service';
import { resolveSession, SESSION_COOKIE, type SessionRecord } from './session';

export interface CurrentAuth extends AuthContext {
  session: SessionRecord;
  user: { id: string; email: string; displayName: string; mfaEnabled: boolean };
  tenant: { id: string; name: string; currency: string; timezone: string; countryCode: string };
  roles: RoleCode[];
  next: NextStep;
}

/** Session courante, résolue une fois par requête. Le tenant vient uniquement de la session. */
export const getAuth = cache(async (): Promise<CurrentAuth | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const resolved = await withAuthContext(async (tx) => {
    const session = await resolveSession(tx, token);
    if (!session || !session.tenantId) return null;
    const user = await tx.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, displayName: true, mfaEnabled: true, status: true },
    });
    if (!user || user.status !== 'active') return null;
    return { session, user, tenantId: session.tenantId };
  });
  if (!resolved) return null;
  const { session, user, tenantId } = resolved;
  const loaded = await withContext({ tenantId, userId: user.id }, async (tx) => {
    const access = await loadTenantAccess(tx, tenantId, user.id);
    const tenant = await tx.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, currency: true, timezone: true, countryCode: true },
    });
    return access && tenant ? { access, tenant } : null;
  });
  if (!loaded) return null;
  return {
    userId: user.id,
    tenantId,
    grants: loaded.access.grants,
    roles: loaded.access.roles,
    session,
    user: { id: user.id, email: user.email, displayName: user.displayName, mfaEnabled: user.mfaEnabled },
    tenant: loaded.tenant,
    next: nextStepFor({
      mfaEnabled: user.mfaEnabled,
      privileged: loaded.access.privileged,
      mfaVerifiedAt: session.mfaVerifiedAt,
    }),
  };
});

/** Page protégée : session complète (MFA compris), sinon redirection. */
export async function requireAuth(locale: Locale): Promise<CurrentAuth> {
  const auth = await getAuth();
  if (!auth) return redirect({ href: '/login', locale });
  if (auth.next === 'mfa') return redirect({ href: '/mfa', locale });
  if (auth.next === 'mfa_setup') return redirect({ href: '/mfa/setup', locale });
  return auth;
}

/** Page protégée par une permission : 403 rendu par la page appelante si refus. */
export async function requirePermission(
  locale: Locale,
  permission: Permission,
  resource?: ResourceScope,
): Promise<CurrentAuth> {
  const auth = await requireAuth(locale);
  authorize(auth, permission, resource);
  return auth;
}

export { can };
