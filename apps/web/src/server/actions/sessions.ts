'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authorize } from '@dospa/domain';
import { getAuth } from '../auth-context';
import { audit } from '../audit';
import { withAuthContext, withContext } from '../db';
import { requestMeta } from '../request-meta';
import { revokeSession, revokeUserSessions } from '../session';

const idSchema = z.uuid();

/** Révoque une de ses propres sessions. */
export async function revokeOwnSessionAction(formData: FormData): Promise<void> {
  const auth = await getAuth();
  const id = idSchema.safeParse(formData.get('sessionId'));
  if (!auth || auth.next !== 'app' || !id.success) return;
  await withAuthContext(async (tx) => {
    const target = await tx.session.findFirst({ where: { id: id.data, userId: auth.userId } });
    if (target) await revokeSession(tx, target.id, 'user_revoked');
  });
  revalidatePath('/[locale]/account', 'page');
}

export async function revokeOtherSessionsAction(): Promise<void> {
  const auth = await getAuth();
  if (!auth || auth.next !== 'app') return;
  await withAuthContext((tx) => revokeUserSessions(tx, auth.userId, 'user_revoked_others', auth.session.id));
  revalidatePath('/[locale]/account', 'page');
}

/** Administrateur : révoque toutes les sessions d'un membre de SON tenant. */
export async function revokeMemberSessionsAction(formData: FormData): Promise<void> {
  const auth = await getAuth();
  const id = idSchema.safeParse(formData.get('userId'));
  if (!auth || auth.next !== 'app' || !id.success) return;
  authorize(auth, 'users:manage');
  const member = await withContext({ tenantId: auth.tenantId, userId: auth.userId }, (tx) =>
    tx.membership.findFirst({ where: { tenantId: auth.tenantId, userId: id.data } }),
  );
  if (!member) return;
  const meta = await requestMeta();
  await withAuthContext((tx) => revokeUserSessions(tx, id.data, 'admin_revoked'));
  await withContext({ tenantId: auth.tenantId, userId: auth.userId }, (tx) =>
    audit(tx, {
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      action: 'user.sessions_revoked',
      entityType: 'user',
      entityId: id.data,
      ip: meta.ip,
    }),
  );
  revalidatePath('/[locale]/admin/users', 'page');
}
