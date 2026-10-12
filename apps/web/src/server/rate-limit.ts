import 'server-only';
import { sha256 } from '@dospa/security';
import type { Tx } from '@dospa/db';

export interface RateLimitRule {
  name: string;
  limit: number;
  windowSeconds: number;
}

export const RATE_LIMITS = {
  loginByIp: { name: 'login_ip', limit: 20, windowSeconds: 15 * 60 },
  loginByAccount: { name: 'login_account', limit: 5, windowSeconds: 15 * 60 },
  mfaBySession: { name: 'mfa_session', limit: 5, windowSeconds: 15 * 60 },
  resetByIp: { name: 'reset_ip', limit: 5, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Fenêtre fixe stockée en base (clé hachée, aucune donnée personnelle en clair).
 * Retourne true si la requête est autorisée. À appeler dans un contexte « auth ».
 */
export async function consumeRateLimit(tx: Tx, rule: RateLimitRule, subject: string): Promise<boolean> {
  const key = `${rule.name}:${sha256(subject.toLowerCase())}`;
  const rows = await tx.$queryRaw<Array<{ count: number }>>`
    INSERT INTO rate_limit_bucket (key, count, window_start) VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limit_bucket.window_start < now() - make_interval(secs => ${rule.windowSeconds}) THEN 1 ELSE rate_limit_bucket.count + 1 END,
      window_start = CASE WHEN rate_limit_bucket.window_start < now() - make_interval(secs => ${rule.windowSeconds}) THEN now() ELSE rate_limit_bucket.window_start END
    RETURNING count`;
  return (rows[0]?.count ?? 0) <= rule.limit;
}

export async function resetRateLimit(tx: Tx, rule: RateLimitRule, subject: string): Promise<void> {
  await tx.rateLimitBucket.deleteMany({ where: { key: `${rule.name}:${sha256(subject.toLowerCase())}` } });
}
