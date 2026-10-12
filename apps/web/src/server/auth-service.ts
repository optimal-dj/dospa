import 'server-only';
import { loginSchema, passwordResetRequestSchema, passwordResetSchema, totpCodeSchema } from '@dospa/domain';
import type { Locale } from '@dospa/i18n/config';
import {
  decrypt,
  encrypt,
  generateRecoveryCodes,
  generateToken,
  generateTotpSecret,
  hashPassword,
  sha256,
  totpUri,
  verifyAgainstDummy,
  verifyPassword,
  verifyTotp,
} from '@dospa/security';
import type { Tx } from '@dospa/db';
import { audit } from './audit';
import { withAuthContext, withContext } from './db';
import { serverEnv } from './env';
import { loadTenantAccess } from './grants';
import { sendMail } from './mail';
import { consumeRateLimit, RATE_LIMITS, resetRateLimit } from './rate-limit';
import type { RequestMeta } from './request-meta';
import { createSession, revokeSession, revokeUserSessions, type SessionRecord } from './session';

export type AuthErrorCode =
  | 'errors.validation'
  | 'errors.invalid_credentials'
  | 'errors.rate_limited'
  | 'errors.account_disabled'
  | 'errors.no_tenant_access'
  | 'errors.mfa_invalid'
  | 'errors.reset_token_invalid'
  | 'errors.unauthenticated';

export type AuthResult<T> = { ok: true; value: T } | { ok: false; code: AuthErrorCode };

export type NextStep = 'app' | 'mfa' | 'mfa_setup';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function fail(code: AuthErrorCode): { ok: false; code: AuthErrorCode } {
  return { ok: false, code };
}

async function logLogin(
  tx: Tx,
  outcome:
    'success' | 'invalid_credentials' | 'locked' | 'rate_limited' | 'mfa_failed' | 'mfa_success' | 'disabled',
  meta: RequestMeta,
  userId: string | null,
  tenantId: string | null,
): Promise<void> {
  await tx.loginHistory.create({
    data: { outcome, userId, tenantId, ipAddress: meta.ip, userAgent: meta.userAgent },
  });
}

/** Étape MFA à franchir pour une session donnée. */
export function nextStepFor(input: {
  mfaEnabled: boolean;
  privileged: boolean;
  mfaVerifiedAt: Date | null;
}): NextStep {
  if (input.mfaEnabled) return input.mfaVerifiedAt ? 'app' : 'mfa';
  return input.privileged ? 'mfa_setup' : 'app';
}

export async function login(
  raw: unknown,
  meta: RequestMeta,
): Promise<AuthResult<{ token: string; next: NextStep; locale: Locale | null }>> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return fail('errors.validation');
  const email = parsed.data.email.toLowerCase();

  const step1 = await withAuthContext(async (tx) => {
    const ipOk = await consumeRateLimit(tx, RATE_LIMITS.loginByIp, meta.ip ?? 'unknown');
    const accountOk = await consumeRateLimit(tx, RATE_LIMITS.loginByAccount, email);
    const user = await tx.user.findUnique({
      where: { email },
      // Le statut du tenant est vérifié ensuite dans le contexte tenant (RLS sur "tenant").
      include: {
        memberships: { where: { status: 'active' }, orderBy: { createdAt: 'asc' } },
        preference: true,
      },
    });
    if (!ipOk || !accountOk) {
      await logLogin(tx, accountOk ? 'rate_limited' : 'locked', meta, user?.id ?? null, null);
      return fail('errors.rate_limited');
    }
    if (!user) {
      await verifyAgainstDummy(parsed.data.password);
      await logLogin(tx, 'invalid_credentials', meta, null, null);
      return fail('errors.invalid_credentials');
    }
    if (!(await verifyPassword(user.passwordHash, parsed.data.password))) {
      await logLogin(tx, 'invalid_credentials', meta, user.id, null);
      return fail('errors.invalid_credentials');
    }
    if (user.status !== 'active') {
      await logLogin(tx, 'disabled', meta, user.id, null);
      return fail('errors.account_disabled');
    }
    const membership = user.memberships[0];
    if (!membership) {
      await logLogin(tx, 'invalid_credentials', meta, user.id, null);
      return fail('errors.no_tenant_access');
    }
    await resetRateLimit(tx, RATE_LIMITS.loginByAccount, email);
    return { ok: true as const, value: { user, tenantId: membership.tenantId } };
  });
  if (!step1.ok) return step1;
  const { user, tenantId } = step1.value;

  const access = await withContext({ tenantId, userId: user.id }, (tx) =>
    loadTenantAccess(tx, tenantId, user.id),
  );
  if (!access) return fail('errors.no_tenant_access');

  const next = nextStepFor({
    mfaEnabled: user.mfaEnabled,
    privileged: access.privileged,
    mfaVerifiedAt: null,
  });
  const { token } = await withAuthContext(async (tx) => {
    const created = await createSession(tx, {
      userId: user.id,
      tenantId,
      mfaVerified: false,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    await logLogin(tx, 'success', meta, user.id, tenantId);
    return created;
  });
  await withContext({ tenantId, userId: user.id }, (tx) =>
    audit(tx, {
      tenantId,
      actorUserId: user.id,
      action: 'user.login',
      entityType: 'user',
      entityId: user.id,
      ip: meta.ip,
    }),
  );
  return { ok: true, value: { token, next, locale: (user.preference?.locale as Locale | null) ?? null } };
}

/** Vérifie un code TOTP ou un code de secours, puis renouvelle la session (anti-fixation). */
export async function verifyMfa(
  session: SessionRecord,
  rawCode: unknown,
  meta: RequestMeta,
): Promise<AuthResult<{ token: string }>> {
  const parsed = totpCodeSchema.safeParse(rawCode);
  if (!parsed.success) return fail('errors.mfa_invalid');
  const code = parsed.data;
  return withAuthContext(async (tx) => {
    if (!(await consumeRateLimit(tx, RATE_LIMITS.mfaBySession, session.id))) {
      await logLogin(tx, 'rate_limited', meta, session.userId, session.tenantId);
      return fail('errors.rate_limited');
    }
    const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } });
    if (!user.mfaEnabled || !user.mfaSecretEnc) return fail('errors.mfa_invalid');
    let valid = verifyTotp(decrypt(user.mfaSecretEnc, serverEnv().APP_ENCRYPTION_KEY), code);
    if (!valid) {
      const recoveryHash = sha256(code.toLowerCase());
      if (user.mfaRecoveryHashes.includes(recoveryHash)) {
        valid = true;
        await tx.user.update({
          where: { id: user.id },
          data: { mfaRecoveryHashes: user.mfaRecoveryHashes.filter((h) => h !== recoveryHash) },
        });
      }
    }
    if (!valid) {
      await logLogin(tx, 'mfa_failed', meta, user.id, session.tenantId);
      return fail('errors.mfa_invalid');
    }
    await revokeSession(tx, session.id, 'rotated');
    const { token } = await createSession(tx, {
      userId: user.id,
      tenantId: session.tenantId,
      mfaVerified: true,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    await logLogin(tx, 'mfa_success', meta, user.id, session.tenantId);
    return { ok: true as const, value: { token } };
  });
}

/** Génère un secret TOTP en attente de confirmation (mfa_enabled reste false). */
export async function startMfaSetup(
  session: SessionRecord,
): Promise<AuthResult<{ uri: string; secret: string }>> {
  return withAuthContext(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } });
    if (user.mfaEnabled) return fail('errors.mfa_invalid');
    const secret = user.mfaSecretEnc
      ? decrypt(user.mfaSecretEnc, serverEnv().APP_ENCRYPTION_KEY)
      : generateTotpSecret();
    if (!user.mfaSecretEnc) {
      await tx.user.update({
        where: { id: user.id },
        data: { mfaSecretEnc: encrypt(secret, serverEnv().APP_ENCRYPTION_KEY) },
      });
    }
    return { ok: true as const, value: { uri: totpUri(secret, user.email), secret } };
  });
}

export async function confirmMfaSetup(
  session: SessionRecord,
  rawCode: unknown,
  meta: RequestMeta,
): Promise<AuthResult<{ token: string; recoveryCodes: string[] }>> {
  const parsed = totpCodeSchema.safeParse(rawCode);
  if (!parsed.success) return fail('errors.mfa_invalid');
  const result = await withAuthContext(async (tx) => {
    if (!(await consumeRateLimit(tx, RATE_LIMITS.mfaBySession, session.id)))
      return fail('errors.rate_limited');
    const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } });
    if (user.mfaEnabled || !user.mfaSecretEnc) return fail('errors.mfa_invalid');
    if (!verifyTotp(decrypt(user.mfaSecretEnc, serverEnv().APP_ENCRYPTION_KEY), parsed.data)) {
      await logLogin(tx, 'mfa_failed', meta, user.id, session.tenantId);
      return fail('errors.mfa_invalid');
    }
    const recoveryCodes = generateRecoveryCodes();
    await tx.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true, mfaRecoveryHashes: recoveryCodes.map((c) => sha256(c)) },
    });
    await revokeSession(tx, session.id, 'rotated');
    const { token } = await createSession(tx, {
      userId: user.id,
      tenantId: session.tenantId,
      mfaVerified: true,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    await logLogin(tx, 'mfa_success', meta, user.id, session.tenantId);
    return { ok: true as const, value: { token, recoveryCodes } };
  });
  if (result.ok && session.tenantId) {
    const tenantId = session.tenantId;
    await withContext({ tenantId, userId: session.userId }, (tx) =>
      audit(tx, {
        tenantId,
        actorUserId: session.userId,
        action: 'user.mfa_enabled',
        entityType: 'user',
        entityId: session.userId,
        ip: meta.ip,
      }),
    );
  }
  return result;
}

export async function logout(session: SessionRecord, meta: RequestMeta): Promise<void> {
  await withAuthContext((tx) => revokeSession(tx, session.id, 'logout'));
  if (session.tenantId) {
    const tenantId = session.tenantId;
    await withContext({ tenantId, userId: session.userId }, (tx) =>
      audit(tx, {
        tenantId,
        actorUserId: session.userId,
        action: 'user.logout',
        entityType: 'user',
        entityId: session.userId,
        ip: meta.ip,
      }),
    );
  }
}

/** Réponse identique que le compte existe ou non (pas d'énumération). */
export async function requestPasswordReset(
  raw: unknown,
  locale: Locale,
  meta: RequestMeta,
): Promise<AuthResult<null>> {
  const parsed = passwordResetRequestSchema.safeParse(raw);
  if (!parsed.success) return fail('errors.validation');
  const email = parsed.data.email.toLowerCase();
  const token = generateToken();
  const target = await withAuthContext(async (tx) => {
    if (!(await consumeRateLimit(tx, RATE_LIMITS.resetByIp, meta.ip ?? 'unknown')))
      return 'rate_limited' as const;
    const user = await tx.user.findUnique({ where: { email } });
    if (!user || user.status !== 'active') return null;
    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    return user.email;
  });
  if (target === 'rate_limited') return fail('errors.rate_limited');
  if (target) {
    const link = `${serverEnv().APP_URL}/${locale}/reset-password?token=${encodeURIComponent(token)}`;
    // Les e-mails transactionnels seront traduits en Phase 2 (modèles par langue) ; lien localisé dès maintenant.
    await sendMail({ to: target, subject: 'DOSPA — reset password', text: link });
  }
  return { ok: true, value: null };
}

export async function resetPassword(raw: unknown, meta: RequestMeta): Promise<AuthResult<null>> {
  const parsed = passwordResetSchema.safeParse(raw);
  if (!parsed.success) return fail('errors.validation');
  const passwordHash = await hashPassword(parsed.data.password);
  const result = await withAuthContext(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({
      where: { tokenHash: sha256(parsed.data.token) },
    });
    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) return null;
    const used = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (used.count !== 1) return null;
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    await revokeUserSessions(tx, record.userId, 'password_reset');
    const memberships = await tx.membership.findMany({
      where: { userId: record.userId },
      select: { tenantId: true },
    });
    return { userId: record.userId, tenantIds: memberships.map((m) => m.tenantId) };
  });
  if (!result) return fail('errors.reset_token_invalid');
  for (const tenantId of result.tenantIds) {
    await withContext({ tenantId, userId: result.userId }, (tx) =>
      audit(tx, {
        tenantId,
        actorUserId: result.userId,
        action: 'user.password_reset',
        entityType: 'user',
        entityId: result.userId,
        ip: meta.ip,
      }),
    );
  }
  return { ok: true, value: null };
}

/** Préférence de langue de l'utilisateur ; n'affecte jamais les paramètres du tenant. */
export async function saveLocalePreference(userId: string, locale: Locale): Promise<void> {
  await withContext({ userId }, (tx) =>
    tx.userPreference.upsert({ where: { userId }, update: { locale }, create: { userId, locale } }),
  );
}
