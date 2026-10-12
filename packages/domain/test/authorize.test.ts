import { describe, expect, it } from 'vitest';
import {
  authorize,
  can,
  DEFAULT_ROLE_PERMISSIONS,
  DomainError,
  PERMISSIONS,
  PRIVILEGED_ROLES,
  ROLE_CODES,
  type AuthContext,
  type Grant,
  type RoleCode,
} from '../src/index';

function ctxFor(
  role: RoleCode,
  scopeType: Grant['scopeType'] = 'tenant',
  scopeId: string | null = null,
): AuthContext {
  return {
    userId: 'u1',
    tenantId: 't1',
    grants: DEFAULT_ROLE_PERMISSIONS[role].map((permission) => ({ permission, scopeType, scopeId })),
  };
}

describe('permissions catalogue', () => {
  it('only references known permissions in default roles', () => {
    for (const role of ROLE_CODES) {
      for (const p of DEFAULT_ROLE_PERMISSIONS[role]) expect(PERMISSIONS).toContain(p);
    }
  });

  it('gives every permission to the tenant administrator', () => {
    expect(new Set(DEFAULT_ROLE_PERMISSIONS.tenant_admin)).toEqual(new Set(PERMISSIONS));
  });

  it('requires MFA for admin, HR and payroll roles', () => {
    expect([...PRIVILEGED_ROLES].sort()).toEqual([
      'hr',
      'payroll_approver',
      'payroll_manager',
      'tenant_admin',
    ]);
  });
});

describe('can / authorize', () => {
  it('denies administration permissions to an employee', () => {
    const ctx = ctxFor('employee');
    expect(can(ctx, 'users:manage')).toBe(false);
    expect(can(ctx, 'audit:read')).toBe(false);
    expect(() => authorize(ctx, 'users:manage')).toThrow(DomainError);
  });

  it('separates payroll preparation from payroll approval', () => {
    expect(can(ctxFor('payroll_manager'), 'payroll:approve')).toBe(false);
    expect(can(ctxFor('payroll_approver'), 'payroll:approve')).toBe(true);
  });

  it('keeps the auditor read-only', () => {
    const writes = DEFAULT_ROLE_PERMISSIONS.auditor.filter(
      (p) => !/:(read|read_self|read_team|export)/.test(p),
    );
    expect(writes).toEqual([]);
  });

  it('throws a translatable error code', () => {
    try {
      authorize(ctxFor('employee'), 'roles:manage');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe('errors.forbidden');
      expect((e as DomainError).status).toBe(403);
    }
  });

  it('limits a scoped grant to resources under that scope', () => {
    const ctx: AuthContext = {
      userId: 'u1',
      tenantId: 't1',
      grants: [{ permission: 'employees:read', scopeType: 'department', scopeId: 'd1' }],
    };
    expect(can(ctx, 'employees:read', { ancestors: [{ type: 'department', id: 'd1' }] })).toBe(true);
    expect(can(ctx, 'employees:read', { ancestors: [{ type: 'department', id: 'd2' }] })).toBe(false);
    expect(can(ctx, 'employees:read')).toBe(false);
  });

  it('limits a self grant to resources owned by the user', () => {
    const ctx: AuthContext = {
      userId: 'u1',
      tenantId: 't1',
      grants: [{ permission: 'employees:read_self', scopeType: 'self', scopeId: null }],
    };
    expect(can(ctx, 'employees:read_self', { ownerUserId: 'u1' })).toBe(true);
    expect(can(ctx, 'employees:read_self', { ownerUserId: 'u2' })).toBe(false);
    expect(can(ctx, 'employees:read_self')).toBe(false);
  });
});
