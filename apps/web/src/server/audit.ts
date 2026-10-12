import 'server-only';
import type { Tx } from '@dospa/db';

export interface AuditEntry {
  tenantId: string;
  actorUserId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

/** Journal d'audit append-only (trigger forbid_mutation). Ne jamais y mettre de secret. */
export async function audit(tx: Tx, e: AuditEntry): Promise<void> {
  await tx.auditLog.create({
    data: {
      tenantId: e.tenantId,
      actorUserId: e.actorUserId,
      action: e.action,
      entityType: e.entityType ?? null,
      entityId: e.entityId ?? null,
      metadata: (e.metadata ?? {}) as object,
      ipAddress: e.ip ?? null,
    },
  });
}
