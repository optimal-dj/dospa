/**
 * Données de démonstration FICTIVES (aucune personne réelle). Développement et test uniquement.
 * Exécuté avec le rôle propriétaire (hors RLS) : opération de plateforme.
 */
import { PERMISSIONS, ROLE_CODES, splitPermission, type RoleCode } from '@dospa/domain';
import { encrypt, generateTotpSecret, hashPassword, totpUri } from '@dospa/security';
import { loadDbEnv } from '../src/env';
import { createPrismaClient } from '../src/index';
import { seedTenant, syncPermissions } from '../src/seed-helpers';

if (process.env['APP_ENV'] === 'production') throw new Error('Demo seed is forbidden in production');
const password = process.env['SEED_DEMO_PASSWORD'];
const encKey = process.env['APP_ENCRYPTION_KEY'];
if (!password || password.length < 12)
  throw new Error('SEED_DEMO_PASSWORD (>= 12 chars) must be set in .env');
if (!encKey) throw new Error('APP_ENCRYPTION_KEY must be set in .env');

const env = loadDbEnv();
const db = createPrismaClient(env.DATABASE_OWNER_URL);

const passwordHash = await hashPassword(password);
await syncPermissions(
  db,
  PERMISSIONS.map((code) => ({ code, ...splitPermission(code) })),
);

// Secret TOTP stable entre deux seeds (sinon les comptes existants gardent l’ancien secret).
const mfaSecret = process.env['SEED_DEMO_TOTP_SECRET'] || generateTotpSecret();
const alphaUsers: Array<{ email: string; name: string; roles: RoleCode[]; mfa?: boolean; locale?: string }> =
  [
    { email: 'admin@alpha.example', name: 'Amina Fictive (admin)', roles: ['tenant_admin'], mfa: true },
    { email: 'rh@alpha.example', name: 'Hodan Exemple', roles: ['hr'], mfa: true, locale: 'so' },
    { email: 'paie@alpha.example', name: 'Omar Démo', roles: ['payroll_manager'], mfa: true },
    { email: 'approbateur@alpha.example', name: 'Kadra Test', roles: ['payroll_approver'], mfa: true },
    { email: 'manager@alpha.example', name: 'علي التجريبي', roles: ['manager'], locale: 'ar' },
    { email: 'salarie@alpha.example', name: 'Fatouma Fictive', roles: ['employee'], locale: 'aa' },
    { email: 'auditeur@alpha.example', name: 'Auditor Sample', roles: ['auditor'], locale: 'en' },
  ];

await seedTenant(db, {
  slug: 'alpha-demo',
  name: 'Alpha Services SARL (fictif)',
  organizationName: 'Alpha Services — Siège (fictif)',
  users: alphaUsers.map((u) => ({
    ...u,
    passwordHash,
    mfaSecretEnc: u.mfa ? encrypt(mfaSecret, encKey) : null,
  })),
});
await seedTenant(db, {
  slug: 'beta-demo',
  name: 'Beta Logistique SA (fictif)',
  organizationName: 'Beta Logistique — Port (fictif)',
  users: [
    {
      email: 'admin@beta.example',
      name: 'Ayan Fictive (admin)',
      roles: ['tenant_admin'],
      passwordHash,
      mfaSecretEnc: encrypt(mfaSecret, encKey),
    },
  ],
});

console.log('Seed OK — tenants: alpha-demo, beta-demo; roles:', ROLE_CODES.join(', '));
console.log('Demo password: value of SEED_DEMO_PASSWORD in .env');
console.log('Demo TOTP (privileged demo accounts, local only):', totpUri(mfaSecret, 'demo@dospa.local'));
await db.$disconnect();
