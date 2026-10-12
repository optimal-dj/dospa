/** Variables d'environnement des tests (héritées du globalSetup via process.env du runner). */
import { config } from 'dotenv';

config({ path: new URL('../.env', import.meta.url), quiet: true });
function toTestDb(url: string | undefined): string {
  const u = new URL(url ?? '');
  u.pathname = '/dospa_test';
  return u.toString();
}
process.env['DATABASE_OWNER_URL'] =
  process.env['TEST_DATABASE_OWNER_URL'] ?? toTestDb(process.env['DATABASE_OWNER_URL']);
process.env['DATABASE_URL'] = process.env['TEST_DATABASE_URL'] ?? toTestDb(process.env['DATABASE_URL']);
process.env['APP_ENV'] = 'test';
process.env['APP_URL'] ??= 'http://localhost:3000';
process.env['APP_ENCRYPTION_KEY'] = Buffer.alloc(32, 1).toString('base64');
process.env['MAIL_TRANSPORT'] = 'log';
