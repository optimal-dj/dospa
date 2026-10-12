import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withDbContext } from '../src/index';
import { appDb, makeTenant, ownerDb } from '../../../test/fixtures';

const owner = ownerDb();
const app = appDb();
let a: Awaited<ReturnType<typeof makeTenant>>;
let b: Awaited<ReturnType<typeof makeTenant>>;

beforeAll(async () => {
  a = await makeTenant(owner, [
    { key: 'admin', name: 'A Admin', roles: ['tenant_admin'], passwordHash: 'x' },
  ]);
  b = await makeTenant(owner, [
    { key: 'admin', name: 'B Admin', roles: ['tenant_admin'], passwordHash: 'x' },
  ]);
  await owner.auditLog.create({ data: { tenantId: b.tenantId, action: 'test.event' } });
});

afterAll(async () => {
  await owner.$disconnect();
  await app.$disconnect();
});

const ctxA = () => ({ tenantId: a.tenantId, userId: a.userIds['admin']! });

describe('PostgreSQL row-level security (application role)', () => {
  it('connects as a role that cannot bypass RLS', async () => {
    const rows = await app.$queryRaw<Array<{ rolbypassrls: boolean; rolsuper: boolean }>>`
      SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user`;
    expect(rows[0]).toEqual({ rolbypassrls: false, rolsuper: false });
  });

  it('returns nothing without a tenant context', async () => {
    const orgs = await withDbContext(app, {}, (tx) => tx.organization.findMany());
    const roles = await withDbContext(app, {}, (tx) => tx.role.findMany());
    expect(orgs).toEqual([]);
    expect(roles).toEqual([]);
  });

  it('only exposes rows of the current tenant, even without a WHERE clause', async () => {
    await withDbContext(app, ctxA(), async (tx) => {
      const orgs = await tx.organization.findMany();
      expect(orgs.length).toBeGreaterThan(0);
      expect(orgs.every((o) => o.tenantId === a.tenantId)).toBe(true);
      const roles = await tx.role.findMany();
      expect(roles.every((r) => r.tenantId === a.tenantId)).toBe(true);
      const audit = await tx.auditLog.findMany();
      expect(audit.every((e) => e.tenantId === a.tenantId)).toBe(true);
      const tenants = await tx.tenant.findMany();
      expect(tenants.map((t) => t.id)).toEqual([a.tenantId]);
    });
  });

  it('cannot read another tenant by id', async () => {
    const found = await withDbContext(app, ctxA(), (tx) =>
      tx.organization.findMany({ where: { tenantId: b.tenantId } }),
    );
    expect(found).toEqual([]);
    const users = await withDbContext(app, ctxA(), (tx) =>
      tx.user.findMany({ where: { id: b.userIds['admin'] } }),
    );
    expect(users).toEqual([]);
  });

  it('refuses to write rows for another tenant', async () => {
    await expect(
      withDbContext(app, ctxA(), (tx) =>
        tx.organization.create({ data: { tenantId: b.tenantId, name: 'intrusion' } }),
      ),
    ).rejects.toThrow();
    await expect(
      withDbContext(app, ctxA(), (tx) =>
        tx.auditLog.create({ data: { tenantId: b.tenantId, action: 'forged' } }),
      ),
    ).rejects.toThrow();
  });

  it('cannot update or delete another tenant rows (silently filtered)', async () => {
    const res = await withDbContext(app, ctxA(), (tx) =>
      tx.organization.updateMany({ where: { tenantId: b.tenantId }, data: { name: 'hacked' } }),
    );
    expect(res.count).toBe(0);
  });

  it('keeps the audit log append-only, even for the owner role', async () => {
    const entry = await owner.auditLog.findFirstOrThrow({ where: { tenantId: b.tenantId } });
    await expect(
      owner.auditLog.update({ where: { id: entry.id }, data: { action: 'changed' } }),
    ).rejects.toThrow(/append-only/);
    await expect(owner.auditLog.delete({ where: { id: entry.id } })).rejects.toThrow(/append-only/);
  });

  it('denies the application role write access to the permission catalogue', async () => {
    await expect(
      withDbContext(app, ctxA(), (tx) =>
        tx.permission.create({ data: { code: 'x:y', module: 'x', action: 'y' } }),
      ),
    ).rejects.toThrow();
  });

  it('hides password reset tokens and rate-limit buckets outside the auth context', async () => {
    const tokens = await withDbContext(app, ctxA(), (tx) => tx.passwordResetToken.findMany());
    const buckets = await withDbContext(app, ctxA(), (tx) => tx.rateLimitBucket.findMany());
    expect(tokens).toEqual([]);
    expect(buckets).toEqual([]);
  });
});
