import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

// Migrations run with the owner role; the application connects with the restricted role (DATABASE_URL).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env['DATABASE_OWNER_URL'] ?? '' },
});
