import { generateSync } from 'otplib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { encrypt, generateTotpSecret, hashPassword, sha256 } from '@dospa/security';
import { makeTenant, ownerDb, uniq } from '../../../test/fixtures';
import {
  confirmMfaSetup,
  login,
  logout,
  nextStepFor,
  requestPasswordReset,
  resetPassword,
  startMfaSetup,
  verifyMfa,
} from '../src/server/auth-service';
import { withAuthContext } from '../src/server/db';
import { resolveSession, revokeUserSessions } from '../src/server/session';

const owner = ownerDb();
const PASSWORD = 'Demo-password-2026!';
const meta = { ip: uniq('ip'), userAgent: 'vitest' };
const secret = generateTotpSecret();
let t: Awaited<ReturnType<typeof makeTenant>>;

beforeAll(async () => {
  const passwordHash = await hashPassword(PASSWORD);
  t = await makeTenant(owner, [
    {
      key: 'admin',
      name: 'Admin',
      roles: ['tenant_admin'],
      passwordHash,
      mfaSecretEnc: encrypt(secret, process.env['APP_ENCRYPTION_KEY']!),
    },
    { key: 'hr', name: 'HR', roles: ['hr'], passwordHash },
    { key: 'emp', name: 'Employee', roles: ['employee'], passwordHash, locale: 'ar' },
    { key: 'lock', name: 'Lock', roles: ['employee'], passwordHash },
    { key: 'reset', name: 'Reset', roles: ['employee'], passwordHash },
  ]);
});

afterAll(async () => {
  await owner.$disconnect();
});

const session = (token: string) => withAuthContext((tx) => resolveSession(tx, token));

describe('login', () => {
  it('signs in an employee without MFA and binds the session to the tenant', async () => {
    const res = await login({ email: t.emails['emp'], password: PASSWORD }, meta);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.next).toBe('app');
    expect(res.value.locale).toBe('ar');
    const s = await session(res.value.token);
    expect(s?.tenantId).toBe(t.tenantId);
    const stored = await owner.session.findUniqueOrThrow({ where: { id: s!.id } });
    expect(stored.tokenHash).toBe(sha256(res.value.token));
    expect(stored.tokenHash).not.toBe(res.value.token);
  });

  it('rejects a wrong password and an unknown account with the same error', async () => {
    const wrong = await login({ email: t.emails['emp'], password: 'not-the-password' }, meta);
    const unknown = await login(
      { email: `${uniq('nobody')}@test.example`, password: 'whatever-password' },
      meta,
    );
    expect(wrong).toEqual({ ok: false, code: 'errors.invalid_credentials' });
    expect(unknown).toEqual({ ok: false, code: 'errors.invalid_credentials' });
  });

  it('validates input with translatable codes', async () => {
    expect(await login({ email: 'not-an-email', password: '' }, meta)).toEqual({
      ok: false,
      code: 'errors.validation',
    });
  });

  it('locks an account after 5 failed attempts, even with the right password', async () => {
    for (let i = 0; i < 5; i++)
      await login({ email: t.emails['lock'], password: 'bad-password-123' }, { ...meta, ip: uniq('ip') });
    const res = await login({ email: t.emails['lock'], password: PASSWORD }, { ...meta, ip: uniq('ip') });
    expect(res).toEqual({ ok: false, code: 'errors.rate_limited' });
    const history = await owner.loginHistory.findMany({ where: { userId: t.userIds['lock'] } });
    expect(history.some((h) => h.outcome === 'locked')).toBe(true);
  });

  it('writes login history and an audit entry', async () => {
    const audit = await owner.auditLog.findMany({ where: { tenantId: t.tenantId, action: 'user.login' } });
    expect(audit.length).toBeGreaterThan(0);
  });
});

describe('MFA', () => {
  it('computes the next step from MFA state and role', () => {
    expect(nextStepFor({ mfaEnabled: false, privileged: false, mfaVerifiedAt: null })).toBe('app');
    expect(nextStepFor({ mfaEnabled: false, privileged: true, mfaVerifiedAt: null })).toBe('mfa_setup');
    expect(nextStepFor({ mfaEnabled: true, privileged: true, mfaVerifiedAt: null })).toBe('mfa');
    expect(nextStepFor({ mfaEnabled: true, privileged: true, mfaVerifiedAt: new Date() })).toBe('app');
  });

  it('requires the TOTP code for an admin and rotates the session after success', async () => {
    const res = await login({ email: t.emails['admin'], password: PASSWORD }, meta);
    if (!res.ok) throw new Error(res.code);
    expect(res.value.next).toBe('mfa');
    const s1 = (await session(res.value.token))!;
    expect(s1.mfaVerifiedAt).toBeNull();

    expect(await verifyMfa(s1, '000000', meta)).toEqual({ ok: false, code: 'errors.mfa_invalid' });
    const ok = await verifyMfa(s1, generateSync({ secret }), meta);
    if (!ok.ok) throw new Error(ok.code);
    expect(await session(res.value.token)).toBeNull();
    const s2 = await session(ok.value.token);
    expect(s2?.mfaVerifiedAt).toBeInstanceOf(Date);
  });

  it('forces MFA enrolment for HR and issues single-use recovery codes', async () => {
    const res = await login({ email: t.emails['hr'], password: PASSWORD }, meta);
    if (!res.ok) throw new Error(res.code);
    expect(res.value.next).toBe('mfa_setup');
    const s = (await session(res.value.token))!;
    const setup = await startMfaSetup(s);
    if (!setup.ok) throw new Error(setup.code);
    const done = await confirmMfaSetup(s, generateSync({ secret: setup.value.secret }), meta);
    if (!done.ok) throw new Error(done.code);
    expect(done.value.recoveryCodes).toHaveLength(8);

    const again = await login({ email: t.emails['hr'], password: PASSWORD }, meta);
    if (!again.ok) throw new Error(again.code);
    expect(again.value.next).toBe('mfa');
    const s3 = (await session(again.value.token))!;
    const code = done.value.recoveryCodes[0]!;
    expect((await verifyMfa(s3, code, meta)).ok).toBe(true);
    const s4 = (await session(
      ((await login({ email: t.emails['hr'], password: PASSWORD }, meta)) as { value: { token: string } })
        .value.token,
    ))!;
    expect(await verifyMfa(s4, code, meta)).toEqual({ ok: false, code: 'errors.mfa_invalid' });
  });
});

describe('sessions', () => {
  it('logout revokes the session', async () => {
    const res = await login({ email: t.emails['emp'], password: PASSWORD }, meta);
    if (!res.ok) throw new Error(res.code);
    const s = (await session(res.value.token))!;
    await logout(s, meta);
    expect(await session(res.value.token)).toBeNull();
  });

  it('revoking all sessions of a user invalidates every token', async () => {
    const r1 = await login({ email: t.emails['emp'], password: PASSWORD }, meta);
    const r2 = await login({ email: t.emails['emp'], password: PASSWORD }, meta);
    if (!r1.ok || !r2.ok) throw new Error('login failed');
    await withAuthContext((tx) => revokeUserSessions(tx, t.userIds['emp']!, 'test'));
    expect(await session(r1.value.token)).toBeNull();
    expect(await session(r2.value.token)).toBeNull();
  });

  it('expires idle sessions', async () => {
    const res = await login({ email: t.emails['emp'], password: PASSWORD }, meta);
    if (!res.ok) throw new Error(res.code);
    await owner.session.update({
      where: { tokenHash: sha256(res.value.token) },
      data: { lastSeenAt: new Date(Date.now() - 31 * 60_000) },
    });
    expect(await session(res.value.token)).toBeNull();
  });

  it('ignores garbage tokens', async () => {
    expect(await session('nope')).toBeNull();
    expect(await session(undefined as unknown as string)).toBeNull();
  });
});

describe('password reset', () => {
  it('answers identically for unknown accounts and resets with a single-use token', async () => {
    expect(await requestPasswordReset({ email: 'ghost@test.example' }, 'fr', meta)).toEqual({
      ok: true,
      value: null,
    });
    const active = await login({ email: t.emails['reset'], password: PASSWORD }, meta);
    if (!active.ok) throw new Error(active.code);

    // Le jeton n'est stocké que haché : on en insère un connu pour le test.
    const token = uniq('known-reset-token-for-tests');
    await owner.passwordResetToken.create({
      data: {
        userId: t.userIds['reset']!,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    const newPassword = 'Another-password-2026';
    expect(await resetPassword({ token, password: newPassword, confirm: 'mismatch-password' }, meta)).toEqual(
      { ok: false, code: 'errors.validation' },
    );
    expect(await resetPassword({ token, password: newPassword, confirm: newPassword }, meta)).toEqual({
      ok: true,
      value: null,
    });
    expect(await resetPassword({ token, password: newPassword, confirm: newPassword }, meta)).toEqual({
      ok: false,
      code: 'errors.reset_token_invalid',
    });
    expect(await session(active.value.token)).toBeNull();
    expect((await login({ email: t.emails['reset'], password: newPassword }, meta)).ok).toBe(true);
  });
});
