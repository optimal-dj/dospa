import 'server-only';
import { createPrismaClient, withDbContext, type DbContext, type Tx } from '@dospa/db';
import { serverEnv } from './env';

const globalForDb = globalThis as unknown as { dospaDb?: ReturnType<typeof createPrismaClient> };

/** Client connecté avec le rôle restreint dospa_app (RLS active). */
export function db(): ReturnType<typeof createPrismaClient> {
  globalForDb.dospaDb ??= createPrismaClient(serverEnv().DATABASE_URL);
  return globalForDb.dospaDb;
}

export function withContext<T>(ctx: DbContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withDbContext(db(), ctx, fn);
}

export function withAuthContext<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withDbContext(db(), { auth: true }, fn);
}
