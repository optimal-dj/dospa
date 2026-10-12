/**
 * Active la connexion du rôle applicatif avec le mot de passe de DATABASE_URL.
 * Les migrations créent le rôle (NOLOGIN) ; le secret reste hors du dépôt.
 */
import pg from 'pg';
import { loadDbEnv } from '../src/env';

const env = loadDbEnv();
const appUrl = new URL(env.DATABASE_URL);
const appUser = decodeURIComponent(appUrl.username);
const appPassword = decodeURIComponent(appUrl.password);
const database = appUrl.pathname.slice(1);

if (appUser !== 'dospa_app') {
  throw new Error(`DATABASE_URL must use the dospa_app role (got "${appUser}")`);
}
if (!appPassword) throw new Error('DATABASE_URL must contain a password');

const client = new pg.Client({ connectionString: env.DATABASE_OWNER_URL });
await client.connect();
try {
  await client.query(`ALTER ROLE dospa_app LOGIN PASSWORD ${client.escapeLiteral(appPassword)}`);
  await client.query(`GRANT CONNECT ON DATABASE ${client.escapeIdentifier(database)} TO dospa_app`);
  console.log('dospa_app role ready');
} finally {
  await client.end();
}
