import 'server-only';
import { generateToken, sha256 } from '@dospa/security';
import type { Tx } from '@dospa/db';
import { serverEnv } from './env';

export const SESSION_COOKIE = 'dospa_session';
const TOUCH_INTERVAL_MS = 60_000;

export interface SessionRecord {
  id: string;
  userId: string;
  tenantId: string | null;
  mfaVerifiedAt: Date | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
}

/** Crée une session ; seule l'empreinte du jeton est stockée. Contexte « auth » requis. */
export async function createSession(
  tx: Tx,
  input: {
    userId: string;
    tenantId: string | null;
    mfaVerified: boolean;
    ip: string | null;
    userAgent: string | null;
  },
): Promise<{ token: string; session: SessionRecord }> {
  const token = generateToken();
  const now = new Date();
  const session = await tx.session.create({
    data: {
      tokenHash: sha256(token),
      userId: input.userId,
      tenantId: input.tenantId,
      mfaVerifiedAt: input.mfaVerified ? now : null,
      expiresAt: new Date(now.getTime() + serverEnv().SESSION_ABSOLUTE_HOURS * 3_600_000),
      ipAddress: input.ip,
      userAgent: input.userAgent,
    },
  });
  return { token, session };
}

/** Résout un jeton en session valide (non révoquée, non expirée, non inactive). Contexte « auth » requis. */
export async function resolveSession(tx: Tx, token: string | undefined): Promise<SessionRecord | null> {
  if (!token || token.length > 128) return null;
  const session = await tx.session.findUnique({ where: { tokenHash: sha256(token) } });
  if (!session || session.revokedAt) return null;
  const now = Date.now();
  const idleLimit = session.lastSeenAt.getTime() + serverEnv().SESSION_IDLE_MINUTES * 60_000;
  if (session.expiresAt.getTime() <= now || idleLimit <= now) {
    await tx.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), revokedReason: 'expired' },
    });
    return null;
  }
  if (now - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await tx.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  }
  return session;
}

export async function revokeSession(tx: Tx, sessionId: string, reason: string): Promise<void> {
  await tx.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
}

export async function revokeUserSessions(
  tx: Tx,
  userId: string,
  reason: string,
  exceptSessionId?: string,
): Promise<number> {
  const res = await tx.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date(), revokedReason: reason },
  });
  return res.count;
}
