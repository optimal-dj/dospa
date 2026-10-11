# AGENTS.md — DOSPA

Guide pour tout agent ou développeur qui travaille dans ce dépôt. À lire avant toute modification.

## Contexte
DOSPA est un SaaS multi-tenant de RH, présence et paie, d'abord destiné à Djibouti. Spécifications :
`docs/specs/cahier-des-charges.pdf`, `docs/specs/brief-developpement.md`. Architecture : `docs/ARCHITECTURE.md`.
Plan : `docs/PLAN.md`. Décisions ouvertes : `docs/DECISIONS.md`.

## Commandes
> Disponibles à partir de la Phase 1 (le dépôt ne contient encore que la documentation).

| Commande | Rôle |
|---|---|
| `pnpm install` | Installer les dépendances (Node 22 LTS, pnpm via Corepack) |
| `docker compose up -d` | PostgreSQL, MinIO, Mailpit en local |
| `pnpm db:migrate` / `pnpm db:seed` | Migrations et données fictives |
| `pnpm dev` | Web + worker en développement |
| `pnpm lint` | ESLint (inclut : textes en dur interdits, CSS physique interdite) |
| `pnpm typecheck` | TypeScript strict sur tout le monorepo |
| `pnpm i18n:check` | Clés manquantes ou inutilisées, variables ICU, syntaxe des 5 langues |
| `pnpm test` | Tests unitaires et d'intégration (Vitest, PostgreSQL réel) |
| `pnpm test:e2e` | Playwright (5 langues, RTL, parcours principaux) |
| `pnpm build` | Build de production |

## Architecture (résumé)
- `apps/web` : Next.js (UI `/{locale}/…` + API REST `/api/v1/…`). `apps/worker` : tâches pg-boss. `apps/device-agent` : agent local.
- `packages/db` (Prisma + SQL RLS/triggers), `domain` (permissions, schémas Zod), `i18n`, `*-engine` (fonctions pures), `connectors`.
- Les moteurs n'importent jamais la base de données ni React.

## Règles non négociables
1. **Tenant** : il vient toujours de la session côté serveur. Toute requête métier passe par le client tenant-scopé (RLS active). Ne jamais faire confiance à un `tenantId` envoyé par le client.
2. **Autorisation** : chaque route ou action sensible appelle `authorize(ctx, 'module:action', scope)`. Masquer un bouton ne suffit pas.
3. **i18n** : aucun texte visible en dur dans les composants, erreurs ou notifications. Clés dans `packages/i18n/messages/{fr,en,ar,so,aa}/`. Phrases complètes en ICU, variables nommées, pas de concaténation. Toute nouvelle clé est ajoutée dans les 5 langues ; les traductions non relues sont marquées `a_reviser` dans `packages/i18n/quality.json`.
4. **RTL** : uniquement des utilitaires CSS logiques (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`). `<bdi>` ou `dir="auto"` pour les contenus utilisateur. N'inverser que les icônes directionnelles.
5. **Argent** : entiers en unité mineure + devise ; taux en décimal ; jamais de `float`. Le formatage localisé sert uniquement à l'affichage.
6. **Paie** : aucun taux, seuil ou barème en dur dans le code métier. Tout passe par des paramètres réglementaires versionnés (date d'effet, source, statut de validation). Ne jamais présenter une valeur comme validée juridiquement. Une paie verrouillée ou clôturée n'est jamais modifiée : on rectifie par une nouvelle version.
7. **Pointages** : les événements bruts sont immuables. Les corrections sont stockées à part (motif, auteur, date, approbation). Aucun gabarit biométrique stocké. Ne jamais déclarer une compatibilité sans essai sur le modèle réel.
8. **Secrets et données** : aucun secret, mot de passe ou donnée personnelle réelle dans le dépôt, les logs ou les fixtures. Données de démo fictives et identifiées comme telles.
9. **Suppression** : pas de cascade sur un salarié ou une paie ; archiver. Ne supprimer aucun fichier ou donnée existant sans expliquer l'impact et obtenir une confirmation.
10. **Incertitude** : ne rien inventer (taux légaux, protocoles matériels). Ajouter une entrée dans `docs/DECISIONS.md` avec une valeur provisoire clairement marquée.

## Conventions
- TypeScript strict, ESM. Noms de code en anglais ; documentation en français.
- Validation Zod à la frontière (API, formulaires, configuration). Erreurs métier par code (`errors.*`), traduites côté UI.
- Migrations versionnées uniquement (jamais `db push` hors prototype local). Toute table métier a `tenant_id`, une politique RLS et des index.
- Commits : messages courts à l'impératif (`feat(payroll): …`, `fix(i18n): …`). Une PR par lot testable.

## Critères de fin de tâche
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm i18n:check`, `pnpm test`, `pnpm build` passent (et `pnpm test:e2e` si l'UI est touchée).
- [ ] Tests ajoutés pour le comportement modifié (pas d'assertions vides ni de mocks qui contournent le comportement essentiel).
- [ ] Textes dans les 5 langues ; registre qualité à jour.
- [ ] Isolation tenant et permissions testées pour toute nouvelle route.
- [ ] Documentation (`docs/…`, `DECISIONS.md`) à jour.
- [ ] Compte rendu avec les commandes exécutées et les résultats réels. Ne jamais affirmer qu'un test passe sans l'avoir lancé.
