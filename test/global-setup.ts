/**
 * Prépare la base de test (dospa_test) : migrations + rôle applicatif.
 * Utilise TEST_DATABASE_OWNER_URL / TEST_DATABASE_URL (défaut : .env avec la base remplacée par dospa_test).
 */
import { execSync } from 'node:child_process';
import { config } from 'dotenv';

function toTestDb(url: string | undefined): string {
  if (!url) throw new Error('DATABASE_URL / DATABASE_OWNER_URL must be set (see .env.example)');
  const u = new URL(url);
  u.pathname = '/dospa_test';
  return u.toString();
}

export default function setup(): void {
  config({ path: new URL('../.env', import.meta.url), quiet: true });
  const owner = process.env['TEST_DATABASE_OWNER_URL'] ?? toTestDb(process.env['DATABASE_OWNER_URL']);
  const app = process.env['TEST_DATABASE_URL'] ?? toTestDb(process.env['DATABASE_URL']);
  process.env['DATABASE_OWNER_URL'] = owner;
  process.env['DATABASE_URL'] = app;
  process.env['APP_ENV'] = 'test';
  process.env['APP_URL'] ??= 'http://localhost:3000';
  process.env['APP_ENCRYPTION_KEY'] ??= Buffer.alloc(32, 1).toString('base64');
  process.env['MAIL_TRANSPORT'] = 'log';
  execSync('pnpm --filter @dospa/db migrate:deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_OWNER_URL: owner, DATABASE_URL: app },
  });
}
