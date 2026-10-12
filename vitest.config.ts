import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
      '@/': fileURLToPath(new URL('./apps/web/src/', import.meta.url)),
    },
  },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'apps/*/test/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/env.ts'],
    // Les tests d'intégration partagent la base dospa_test : exécution séquentielle des fichiers.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
