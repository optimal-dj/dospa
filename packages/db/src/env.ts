import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

let loaded = false;

export function loadDbEnv(): { DATABASE_URL: string; DATABASE_OWNER_URL: string } {
  if (!loaded) {
    config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
    loaded = true;
  }
  const DATABASE_URL = process.env['DATABASE_URL'];
  const DATABASE_OWNER_URL = process.env['DATABASE_OWNER_URL'];
  if (!DATABASE_URL || !DATABASE_OWNER_URL) {
    throw new Error('DATABASE_URL and DATABASE_OWNER_URL must be set (see .env.example)');
  }
  return { DATABASE_URL, DATABASE_OWNER_URL };
}
