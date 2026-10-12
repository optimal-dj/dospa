import { config as loadEnv } from 'dotenv';
import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import createNextIntlPlugin from 'next-intl/plugin';

// Variables partagées du monorepo (.env à la racine) ; les variables déjà définies priment.
loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@dospa/domain', '@dospa/i18n', '@dospa/db', '@dospa/security'],
  serverExternalPackages: ['@node-rs/argon2', '@prisma/client', 'pg'],
  typedRoutes: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(config);
