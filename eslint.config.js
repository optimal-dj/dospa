import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Règles DOSPA : CSS physique interdite (RTL) et textes visibles en dur interdits (i18n).
const PHYSICAL_CLASS = String.raw`(?:^|[\s"'\`])-?(?:ml|mr|pl|pr|left|right|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|text-left|text-right|float-left|float-right|scroll-ml|scroll-mr)(?:-|\b)`;

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      '**/generated/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['apps/web/src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=/${PHYSICAL_CLASS}/]`,
          message:
            'Utiliser les utilitaires CSS logiques (ms-/me-/ps-/pe-/start-/end-/text-start) — voir AGENTS.md §4.',
        },
        {
          selector: `TemplateElement[value.raw=/${PHYSICAL_CLASS}/]`,
          message:
            'Utiliser les utilitaires CSS logiques (ms-/me-/ps-/pe-/start-/end-/text-start) — voir AGENTS.md §4.',
        },
        {
          selector: 'JSXText[value=/\\p{L}{2,}/u]',
          message: 'Texte visible en dur interdit : utiliser une clé de traduction (AGENTS.md §3).',
        },
        {
          selector:
            'JSXAttribute[name.name=/^(aria-label|title|placeholder|alt)$/] > Literal[value=/\\p{L}{2,}/u]',
          message: 'Attribut visible en dur interdit : utiliser une clé de traduction (AGENTS.md §3).',
        },
      ],
    },
  },
);
