# DOSPA

SaaS de gestion RH, présence et paie, d'abord destiné aux entreprises de Djibouti. Langues : français, anglais, arabe, somali, afar.

**État : Phase 1 (socle : multilingue, RTL arabe, authentification, MFA, clients isolés, rôles). Les modules métier arrivent aux phases suivantes.**

- Plan : [docs/PLAN.md](docs/PLAN.md)
- Architecture : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Décisions ouvertes : [docs/DECISIONS.md](docs/DECISIONS.md)
- Guide agents et développeurs : [AGENTS.md](AGENTS.md)
- Sécurité : [docs/SECURITY.md](docs/SECURITY.md)
- Traductions : [docs/TRANSLATIONS.md](docs/TRANSLATIONS.md)
- Spécifications : [docs/specs/](docs/specs/)

## Démarrage local

Prérequis : Node 22 LTS (`.nvmrc`), pnpm 10 (Corepack), PostgreSQL 17 (`docker compose up -d postgres` ou installation locale).

```bash
cp .env.example .env   # mots de passe locaux, APP_ENCRYPTION_KEY (openssl rand -base64 32), SEED_DEMO_PASSWORD
pnpm install
pnpm db:generate
pnpm db:migrate        # migrations versionnées + RLS + rôle applicatif dospa_app
pnpm db:seed           # 2 clients fictifs : alpha-demo, beta-demo
pnpm dev               # http://localhost:3000 → /fr/login
```

Comptes de démonstration (fictifs, mot de passe = `SEED_DEMO_PASSWORD`) : `admin@alpha.example`, `rh@alpha.example`,
`paie@alpha.example`, `approbateur@alpha.example` (MFA obligatoire ; URI TOTP affichée par `pnpm db:seed`),
`manager@alpha.example`, `salarie@alpha.example`, `auditeur@alpha.example`, `admin@beta.example` (autre client).

## Vérifications

```bash
pnpm lint && pnpm format:check && pnpm typecheck && pnpm i18n:check
pnpm test              # Vitest sur PostgreSQL réel (base dospa_test)
pnpm build && pnpm test:e2e   # Playwright ; CHROME_PATH=… pour utiliser un Chrome local
```

## Dépannage

- `permission denied` / lignes invisibles : l'application se connecte avec `dospa_app` (RLS, sans contournement) ; les migrations utilisent `DATABASE_OWNER_URL`.
- Code MFA refusé : vérifier l'heure système (TOTP, fenêtre de 30 s).
- Docker Hub en 429 : voir D-029 (miroir d'images) ou utiliser un PostgreSQL local.

> Les paramètres de paie (CNSS, ITS, congés, heures supplémentaires) doivent être confirmés par un expert-comptable ou les
> organismes compétents à Djibouti avant toute mise en production.
