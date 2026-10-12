/** Fabriques de données de test (fictives) dans dospa_test, via le rôle propriétaire. */
import { randomBytes } from 'node:crypto';
import { createPrismaClient } from '../packages/db/src/index';
import { seedTenant, syncPermissions, type SeedUser } from '../packages/db/src/seed-helpers';
import { PERMISSIONS, splitPermission } from '../packages/domain/src/index';

export const ownerDb = () => createPrismaClient(process.env['DATABASE_OWNER_URL']!);
export const appDb = () => createPrismaClient(process.env['DATABASE_URL']!);

export function uniq(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString('hex')}`;
}

export async function makeTenant(
  db: ReturnType<typeof ownerDb>,
  users: Array<Omit<SeedUser, 'email'> & { key: string }>,
): Promise<{
  tenantId: string;
  slug: string;
  emails: Record<string, string>;
  userIds: Record<string, string>;
}> {
  await syncPermissions(
    db,
    PERMISSIONS.map((code) => ({ code, ...splitPermission(code) })),
  );
  const slug = uniq('t');
  const emails = Object.fromEntries(users.map((u) => [u.key, `${u.key}.${slug}@test.example`]));
  const res = await seedTenant(db, {
    slug,
    name: `Tenant ${slug}`,
    organizationName: `Org ${slug}`,
    users: users.map((u) => ({ ...u, email: emails[u.key]! })),
  });
  const userIds = Object.fromEntries(Object.entries(emails).map(([k, e]) => [k, res.userIds[e]!]));
  return { tenantId: res.tenantId, slug, emails, userIds };
}
