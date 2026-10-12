import type { Permission } from './permissions';
import { DomainError } from './errors';

export type ScopeType = 'tenant' | 'organization' | 'establishment' | 'department' | 'team' | 'self';

export interface Grant {
  permission: Permission;
  scopeType: ScopeType;
  scopeId: string | null;
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  grants: readonly Grant[];
}

/** Ressource ciblée : ses périmètres englobants (organisation, établissement…) et son propriétaire éventuel. */
export interface ResourceScope {
  ancestors?: ReadonlyArray<{ type: Exclude<ScopeType, 'tenant' | 'self'>; id: string }>;
  ownerUserId?: string | null;
}

export function can(ctx: AuthContext, permission: Permission, resource?: ResourceScope): boolean {
  return ctx.grants.some((g) => {
    if (g.permission !== permission) return false;
    switch (g.scopeType) {
      case 'tenant':
        return true;
      case 'self':
        return resource?.ownerUserId != null && resource.ownerUserId === ctx.userId;
      default:
        return (resource?.ancestors ?? []).some((a) => a.type === g.scopeType && a.id === g.scopeId);
    }
  });
}

/** Vérification côté serveur ; lève errors.forbidden si refusé. */
export function authorize(ctx: AuthContext, permission: Permission, resource?: ResourceScope): void {
  if (!can(ctx, permission, resource)) {
    throw new DomainError('errors.forbidden', 403);
  }
}
