import { DEFAULT_ROLE_PERMISSIONS, ROLE_CODES, type RoleCode } from '@dospa/domain';
import type { PrismaClient } from './generated/prisma/client';

export async function syncPermissions(
  db: PrismaClient,
  perms: Array<{ code: string; module: string; action: string }>,
): Promise<void> {
  for (const p of perms) {
    await db.permission.upsert({ where: { code: p.code }, update: p, create: p });
  }
}

export interface SeedUser {
  email: string;
  name: string;
  roles: RoleCode[];
  passwordHash: string;
  mfaSecretEnc?: string | null;
  locale?: string;
}

/** Crée (ou complète) un tenant avec ses rôles système, une organisation et des utilisateurs. Idempotent. */
export async function seedTenant(
  db: PrismaClient,
  input: { slug: string; name: string; organizationName: string; users: SeedUser[]; isDemo?: boolean },
): Promise<{ tenantId: string; userIds: Record<string, string> }> {
  const tenant = await db.tenant.upsert({
    where: { slug: input.slug },
    update: {},
    create: { slug: input.slug, name: input.name, isDemo: input.isDemo ?? true },
  });
  const orgCount = await db.organization.count({ where: { tenantId: tenant.id } });
  if (orgCount === 0) {
    await db.organization.create({ data: { tenantId: tenant.id, name: input.organizationName } });
  }

  const roleIds = {} as Record<RoleCode, string>;
  for (const code of ROLE_CODES) {
    const role = await db.role.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code } },
      update: {},
      create: { tenantId: tenant.id, code, isSystem: true },
    });
    roleIds[code] = role.id;
    await db.rolePermission.createMany({
      data: DEFAULT_ROLE_PERMISSIONS[code].map((permissionCode) => ({
        tenantId: tenant.id,
        roleId: role.id,
        permissionCode,
      })),
      skipDuplicates: true,
    });
  }

  const userIds: Record<string, string> = {};
  for (const u of input.users) {
    // Comptes de démo : identifiants réalignés à chaque seed (mot de passe et secret TOTP issus du .env).
    const user = await db.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: u.passwordHash,
        mfaEnabled: Boolean(u.mfaSecretEnc),
        mfaSecretEnc: u.mfaSecretEnc ?? null,
      },
      create: {
        email: u.email,
        displayName: u.name,
        passwordHash: u.passwordHash,
        mfaEnabled: Boolean(u.mfaSecretEnc),
        mfaSecretEnc: u.mfaSecretEnc ?? null,
        preference: { create: { locale: u.locale ?? null } },
      },
    });
    userIds[u.email] = user.id;
    const membership = await db.membership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: {},
      create: { tenantId: tenant.id, userId: user.id },
    });
    for (const r of u.roles) {
      const exists = await db.roleAssignment.findFirst({
        where: { tenantId: tenant.id, membershipId: membership.id, roleId: roleIds[r] },
      });
      if (!exists) {
        await db.roleAssignment.create({
          data: { tenantId: tenant.id, membershipId: membership.id, roleId: roleIds[r], scopeType: 'tenant' },
        });
      }
    }
  }
  return { tenantId: tenant.id, userIds };
}
