import 'server-only';
import { PRIVILEGED_ROLES, type Grant, type Permission, type RoleCode, type ScopeType } from '@dospa/domain';
import type { Tx } from '@dospa/db';

export interface TenantAccess {
  membershipId: string;
  roles: RoleCode[];
  grants: Grant[];
  privileged: boolean;
}

/** Charge rôles et permissions d'un membre. Contexte tenant (RLS) requis. */
export async function loadTenantAccess(
  tx: Tx,
  tenantId: string,
  userId: string,
): Promise<TenantAccess | null> {
  const membership = await tx.membership.findFirst({
    where: { tenantId, userId, status: 'active', tenant: { status: 'active' } },
    select: {
      id: true,
      assignments: {
        select: {
          scopeType: true,
          scopeId: true,
          role: { select: { code: true, permissions: { select: { permissionCode: true } } } },
        },
      },
    },
  });
  if (!membership) return null;
  const roles = [...new Set(membership.assignments.map((a) => a.role.code as RoleCode))];
  const grants: Grant[] = membership.assignments.flatMap((a) =>
    a.role.permissions.map((p) => ({
      permission: p.permissionCode as Permission,
      scopeType: a.scopeType as ScopeType,
      scopeId: a.scopeId,
    })),
  );
  return {
    membershipId: membership.id,
    roles,
    grants,
    privileged: roles.some((r) => (PRIVILEGED_ROLES as readonly string[]).includes(r)),
  };
}
