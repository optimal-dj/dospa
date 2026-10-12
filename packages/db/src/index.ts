import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from './generated/prisma/client';

export { Prisma, PrismaClient };
export * from './generated/prisma/enums';
export type * from './generated/prisma/models';

export type Tx = Prisma.TransactionClient;

export interface DbContext {
  tenantId?: string | null;
  userId?: string | null;
  /** Réservé au module d'authentification : élargit l'accès aux tables d'identité. */
  auth?: boolean;
}

export function createPrismaClient(connectionString: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/**
 * Exécute fn dans une transaction où le contexte RLS (tenant, utilisateur) est posé.
 * Toute requête métier doit passer par ici : sans tenant, les politiques RLS ne renvoient aucune ligne.
 */
export async function withDbContext<T>(
  db: PrismaClient,
  ctx: DbContext,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT
      set_config('app.tenant_id', ${ctx.tenantId ?? ''}, true),
      set_config('app.user_id', ${ctx.userId ?? ''}, true),
      set_config('app.context', ${ctx.auth ? 'auth' : ''}, true)`;
    return fn(tx);
  });
}
