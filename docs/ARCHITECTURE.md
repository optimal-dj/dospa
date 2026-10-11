# DOSPA — Architecture (proposition Phase 0)

> Statut : **proposée, en attente de validation** par le porteur du projet.
> Les décisions ouvertes sont suivies dans [`DECISIONS.md`](./DECISIONS.md) (références `D-xxx`).
> Sources : [`specs/cahier-des-charges.pdf`](./specs/cahier-des-charges.pdf) et [`specs/brief-developpement.md`](./specs/brief-developpement.md).

## 1. Constat initial

Le dépôt est vide. Il n'y a donc aucune architecture existante à préserver. La stack proposée suit le §4 du brief :
TypeScript, Next.js, PostgreSQL, un ORM avec migrations, S3 et Docker Compose. Elle reste volontairement simple : **un seul
déploiement web** (UI et API REST), **un worker** pour les tâches longues et un **agent local** optionnel pour les pointeuses.

## 2. Vue d'ensemble

```
                    ┌──────────────────────────────── DOSPA (SaaS) ───────────────────────────────┐
 Navigateur ──TLS──▶│ apps/web (Next.js)                                                           │
 (fr/en/ar/so/aa)   │   • UI  /{locale}/...   (React Server Components + composants client)        │
                    │   • API /api/v1/...     (REST, Zod, OpenAPI)                                 │
                    │   • Auth, sessions, RBAC, contexte tenant                                    │
                    │        │                         │                                           │
                    │        ▼                         ▼                                           │
                    │   PostgreSQL ◀── pg-boss ──▶ apps/worker (exports, PDF, sync, alertes)       │
                    │   (RLS par tenant)               │                                           │
                    │                                  ▼                                           │
                    │                        Stockage S3 (documents, bulletins, exports)           │
                    └──────────────────────────────────▲───────────────────────────────────────────┘
                                                       │ HTTPS sortant uniquement
              Réseau du client : pointeuses ◀──LAN──▶ apps/device-agent (optionnel, file locale)
```

Chemin d'un événement de pointage (cahier §4.1) :
`Pointeuse → connecteur → événements bruts (immuables) → rapprochement salarié → moteur de présence → corrections validées → variables de paie → moteur de paie`.

## 3. Organisation du dépôt (monorepo pnpm)

```
apps/
  web/                Next.js (App Router) : pages localisées + route handlers API REST
  worker/             Consommateur pg-boss : exports, PDF, synchronisations, rappels CNSS
  device-agent/       Agent local Node.js (Phase 7) : collecte LAN, file SQLite, envoi HTTPS sortant
packages/
  db/                 Schéma Prisma, migrations versionnées, seed fictif, client « tenant-scopé »
  domain/             Types partagés, catalogue des permissions, schémas Zod, erreurs métier codées
  i18n/               messages/{fr,en,ar,so,aa}/{namespace}.json, configuration des locales, registre qualité, vérificateur
  attendance-engine/  Fonctions pures : affectation des pointages aux postes (y compris après minuit), anomalies, heures, heures sup.
  leave-engine/       Fonctions pures : acquisition et décompte des congés selon des règles versionnées
  payroll-engine/     Fonctions pures, déterministes : calcul du bulletin et journal de calcul explicatif
  connectors/         Contrat commun et adaptateurs : simulator, csv, zkteco, hikvision, dahua, boder
  config/             tsconfig, ESLint, règles de lint maison (textes en dur, CSS non logique)
docs/                 Documentation (PLAN, ARCHITECTURE, DECISIONS, SECURITY, …)
```

Les moteurs (`*-engine`) **n'importent ni la base de données ni React**. Ils reçoivent des entrées normalisées et retournent
des résultats avec leur trace. Cela permet de les tester unitairement, de reproduire un calcul et de les réutiliser dans le
worker.

## 4. Choix techniques

| Domaine | Choix proposé | Raison | Décision |
|---|---|---|---|
| Langage | TypeScript (mode strict) | Exigé par le brief | — |
| Front et API | Next.js (App Router), React | Exigé ; un seul déploiement UI + API | D-004 |
| UI | Tailwind CSS v4 (utilitaires logiques), composants Radix/shadcn | Radix gère `dir` (DirectionProvider) et l'accessibilité clavier | D-004 |
| i18n | `next-intl` (segment `/{locale}`, messages ICU, clés typées) | Routage par locale, ICU, pluriels, formatage | D-008, D-009 |
| Base de données | PostgreSQL 16+ | Exigé ; RLS, `timestamptz`, `numeric` | — |
| ORM / migrations | Prisma 7.x (migrations SQL versionnées) + SQL brut pour la RLS et les triggers | Maturité, migrations explicites | D-005 |
| Validation | Zod (partagée client/serveur) | Une seule source pour la validation et OpenAPI | — |
| OpenAPI | `@asteasolutions/zod-to-openapi` → `/api/v1/openapi.json` + page de documentation | Spécification générée depuis le code | — |
| Auth | Sessions en base (cookie opaque httpOnly), Argon2id, TOTP pour les comptes privilégiés | Révocation, MFA ; voir §7 | D-006 |
| Tâches de fond | `pg-boss` (file dans PostgreSQL) | Aucune infrastructure supplémentaire (pas de Redis) | — |
| Fichiers | API S3 (MinIO en local), URL présignées courtes après contrôle d'autorisation | Compatible S3 exigé | — |
| PDF | HTML → PDF via Chromium (Playwright) dans le worker | Rendu correct de l'arabe (mise en forme, RTL) et des scripts latins | D-027 |
| Exports | CSV (écriture maison, BOM UTF-8) et XLSX (librairie à figer en Phase 6) | — | — |
| Tests | Vitest (unitaires et intégration sur un vrai PostgreSQL), Playwright (E2E), axe-core (accessibilité de base) | — | — |
| Dev local | Docker Compose : postgres, minio, mailpit | — | D-029 |
| CI | GitHub Actions : lint, typecheck, i18n:check, tests, build, E2E | — | — |

Les versions exactes sont figées en Phase 1 (lockfile). Règle : version stable ; on évite une majeure sortie depuis moins de
trois mois si la précédente reste supportée (D-031).

## 5. Multi-tenant

- **Base partagée, colonne `tenant_id`** sur toute table métier (non nulle, indexée, incluse dans les contraintes d'unicité).
- **Le tenant vient toujours de la session côté serveur.** Un `tenantId` envoyé par le navigateur n'est jamais une preuve d'autorisation.
- **Défense en profondeur** : PostgreSQL Row-Level Security sur les tables métier. Chaque requête s'exécute dans une transaction
  qui fait `SET LOCAL app.tenant_id = …`. Le rôle applicatif n'a pas `BYPASSRLS`. Les tâches plateforme utilisent un rôle
  distinct et tracé.
- Le **périmètre organisationnel** (organisation, établissement, département, équipe, soi-même) est vérifié dans la couche
  d'autorisation, pas seulement par la RLS.
- Des tests d'intégration systématiques vérifient qu'un tenant B ne peut pas lire, modifier ni deviner les identifiants du tenant A (UUID v7, 404 uniforme).

## 6. Rôles et permissions

- Permissions de la forme `module:action` (par exemple `employees:read`, `payroll:approve`, `attendance:correct`). Elles sont
  déclarées dans `packages/domain` et vérifiées côté serveur par `authorize(ctx, permission, scope)`.
- Affectation `utilisateur → rôle → périmètre` (tenant, organisation, établissement, département, équipe ou soi-même).
- Rôles initiaux (union du brief et du cahier) : administrateur client, RH, gestionnaire de paie, approbateur de paie, manager,
  salarié, auditeur/comptable. Hors tenant : administrateur plateforme et support (accès temporaire, tracé, autorisé par le client, révocable).
- Séparation des tâches : celui qui prépare une paie ne peut pas l'approuver (configurable, activé par défaut, D-024).
- Masquer un bouton ne suffit pas : l'UI cache les actions non autorisées, mais l'API reste le point de contrôle.

## 7. Authentification et sessions

- Mots de passe hachés en Argon2id, avec une politique de longueur et une vérification de mots de passe courants.
- Session : jeton aléatoire opaque dans un cookie `HttpOnly; Secure; SameSite=Lax`. Seul son **hash** est stocké en base.
  Les sessions ont une expiration absolue et une expiration d'inactivité, et peuvent être révoquées (déconnexion, changement de mot de passe, action admin).
- MFA TOTP obligatoire pour les rôles administrateur client, gestionnaire de paie, approbateur et plateforme. Codes de secours hachés.
- Réinitialisation du mot de passe : jeton à usage unique, haché, de courte durée, et réponse identique que le compte existe ou non.
- Limitation de débit stockée en PostgreSQL (fonctionne sur plusieurs instances) pour la connexion, la réinitialisation, le MFA et les API sensibles.
- CSRF : cookie SameSite, vérification de `Origin`/`Host` sur toute mutation et jeton anti-CSRF pour les formulaires.
- Après connexion, l'utilisateur est redirigé vers sa langue préférée.

## 8. Internationalisation (socle, pas une couche ajoutée plus tard)

- Locales : `fr` (source et défaut), `en`, `ar` (RTL), `so`, `aa`. Les routes sont toujours préfixées (`/fr/...`).
- **Résolution de la langue** : segment d'URL > préférence du profil (utilisateur connecté) > cookie `NEXT_LOCALE` (visiteur)
  > langue par défaut du tenant > `fr`. La préférence utilisateur est stockée dans `user_preferences`, séparée des paramètres du
  tenant. La langue ne modifie jamais la devise, le pays, le fuseau horaire ni les règles de paie de l'organisation.
- **Sélecteur de langue** : élément accessible (label, `lang` sur chaque option, utilisable au clavier). Il conserve la route
  courante et les paramètres non sensibles.
- **Messages** : `packages/i18n/messages/{locale}/{namespace}.json` (common, navigation, auth, employees, attendance, leave,
  payroll, devices, settings, validation, errors, …). Syntaxe ICU MessageFormat (variables nommées, pluriels, `select`). Les
  clés sont typées à partir de `fr` et les phrases sont toujours complètes, sans concaténation.
- **Fallback** : une clé absente dans une locale est affichée en `fr` (D-009). Le manque est journalisé (avertissement visible
  en développement) et **aucune clé brute n'est jamais affichée**.
- **Vérificateur** (`pnpm i18n:check`, bloquant en CI) : clés manquantes ou en trop par locale, clés inutilisées (analyse
  statique des appels `t()` ; les clés dynamiques sont interdites hors tables déclarées), variables ICU incohérentes, JSON ou ICU invalide.
- **Lint** : interdiction des textes littéraux dans le JSX et des classes CSS physiques (`ml-*`, `pr-*`, `left-*`, `text-left`…)
  au profit des utilitaires logiques (`ms-*`, `pe-*`, `start-*`, `text-start`).
- **RTL** : `<html lang dir>` défini dans le layout `[locale]`. DirectionProvider Radix. Seules les icônes directionnelles sont
  inversées (`rtl:-scale-x-100`). Les contenus saisis par l'utilisateur (noms, matricules, e-mails, codes) passent par `<bdi>` ou `dir="auto"`.
- **Polices** : Noto Sans et Noto Sans Arabic auto-hébergées (pas de CDN). Le rendu est vérifié par des captures Playwright.
- **Formatage** : `Intl` avec une locale de formatage par langue (`fr-DJ`, `en-DJ`, `ar-DJ`, `so-DJ`). **L'afar n'a pas de
  données CLDR dans Node (constaté avec Node 22.23 / ICU 78.3 : `aa-DJ` retombe sur `en-US`)**. On utilise donc un formatage
  explicite configurable pour `aa` (D-011). Le choix des chiffres arabes ou latins pour `ar` est un paramètre (D-010).
- **Qualité** : registre `packages/i18n/quality.json` (statut par locale et namespace : `source`, `a_reviser`, `revise`,
  `valide`). Toute traduction produite sans relecteur compétent est `a_reviser`. Les libellés juridiques ou de paie traduits ne
  font jamais foi : la mention est affichée.
- **Documents** (bulletins, exports) : la langue est choisie explicitement et enregistrée dans les métadonnées de génération
  avec la locale et la version du modèle. Les montants sont stockés normalisés ; seul l'affichage est localisé.

## 9. Modèle de données (principes)

Entités minimales : celles du brief §6 et du cahier §6 (tenant, organisation, établissement, département, centre de coûts ;
utilisateur, rôle, permission, session, historique de connexion, journal d'audit, préférence linguistique ; salarié, contrat,
affectation, composante de rémunération, document et règle de conservation ; calendrier, jour férié, horaire, équipe, période
de paie ; pointeuse, connecteur, identifiant externe, synchronisation et curseur ; événement brut, résultat de présence,
anomalie, correction, approbation ; type d'absence, demande, solde, mouvement de droits ; cycle de paie et version, ligne,
rubrique, cotisation, retenue, bulletin ; paramètre réglementaire versionné ; déclaration préparée, export de paie, export
comptable, historique de génération).

Règles transverses :
- Identifiants UUID v7. Horodatages `timestamptz` en UTC. Fuseau de l'organisation stocké (`Africa/Djibouti` par défaut).
  Pour un pointage, on conserve aussi l'heure locale source et le fuseau interprété.
- **Montants** : entiers en unité mineure de la devise (`bigint`) + code devise. Le DJF a 0 décimale (ISO 4217). Les taux sont
  en `numeric(12,6)`. Aucun `float` dans les calculs (décimal arbitraire dans les moteurs).
- **Suppression** : `ON DELETE RESTRICT` pour les salariés, contrats, cycles et bulletins. On archive au lieu de supprimer.
  Aucune cascade sur un dossier salarié ou une paie clôturée.
- **Immutabilité** : les événements bruts sont protégés par un trigger qui refuse `UPDATE`/`DELETE`. Les lignes de paie et les
  bulletins d'un cycle `verrouillé` ou `clôturé` sont protégés par un trigger. Une correction crée une **nouvelle version** (rectification) liée à l'originale.
- **Audit** : table append-only (qui, quoi, quand, avant/après filtrés, IP, tenant). Écriture dans la même transaction que l'action sensible.

## 10. Paramètres réglementaires et moteur de paie

- `regulatory_parameter` : code, niveau (plateforme, pays, tenant, organisation, établissement, salarié), type (taux, montant,
  tranches, jours, date), valeur JSON validée par Zod, unité, assiette, plafond, part (employeur ou salarié), branche (CNSS),
  `effective_from`/`effective_to`, source et URL, **statut de validation** (`non_valide`, `valide_client`, …), validé par/le,
  auteur, version et clés de libellé traduisibles. Contrainte d'exclusion : pas de chevauchement de périodes pour un même code et un même niveau.
- Au calcul, le moteur reçoit un **instantané des paramètres en vigueur** pour la période. Le cycle conserve cet instantané et
  son empreinte (hash) : le calcul est reproductible, et un changement de taux ne recalcule jamais silencieusement une paie validée.
- Le moteur produit les lignes (gains, retenues, cotisations salariales et patronales, net, coût employeur) et un **journal de
  calcul** (règle, version, assiette, taux, résultat pour chaque rubrique). Une comparaison de deux simulations est disponible.
- Cycle : `brouillon → simulation → à_contrôler → approuvé → verrouillé → clôturé`. Ensuite, `rectifié` crée une version de
  régularisation tracée, sans modifier la version clôturée.
- Garde-fou production : tant qu'un barème (ITS, par exemple) est `non_valide`, son calcul automatique est **désactivé en
  production** et une bannière d'avertissement s'affiche. En démonstration ou en test, il fonctionne avec des valeurs marquées fictives.
- Aucun taux n'est écrit en dur dans le code métier. Les valeurs du profil « Djibouti — secteur privé » sont des données de
  seed marquées « à valider par un professionnel local » (voir `PAYROLL_DJIBOUTI.md`, Phase 5).

## 11. Pointeuses

- Contrat commun `DeviceConnector` : `testConnection()`, `getDeviceInfo()`, `fetchEvents(cursor, from, to)`,
  `normalizeEvent(raw)`, `healthCheck()`, plus une déclaration de capacités.
- L'événement normalisé contient : appareil, identifiant salarié externe, date/heure source, fuseau (connu ou inconnu), type
  si disponible, clé de dédoublonnage, charge brute (chiffrée AES-256-GCM), statut d'import et erreur.
- Idempotence : unicité `(tenant_id, device_id, dedupe_key)`. Synchronisations avec curseur, reprise après panne et files pg-boss.
- Compatibilité déclarée **par modèle, firmware, protocole et mode de connexion**, avec preuve d'essai. Jamais par marque.
- Adaptateurs : `simulator` (tests sans matériel), `csv` (import de secours), puis ZKTeco, Hikvision et Dahua selon le matériel
  disponible. **BODER : adaptateur abstrait uniquement** tant que le modèle, le firmware et la documentation ne sont pas fournis (D-018, D-019).
- Agent local : connexion HTTPS **sortante** uniquement, jeton d'agent haché côté serveur, file locale persistante. Aucune
  pointeuse exposée sur Internet. Aucun gabarit biométrique n'est importé.

## 12. Fichiers, PDF, exports

- Stockage S3 avec clés préfixées par tenant. Les documents sensibles sont chiffrés (SSE ; chiffrement applicatif à valider, D-020).
  Téléchargement par URL présignée de courte durée après contrôle d'autorisation. Aucune donnée sensible dans les URL ou les notifications.
- Chaque génération (bulletin, état, export) est journalisée : type, auteur, langue, locale, version du modèle, empreinte du fichier.
- Un fichier bancaire exporté ne marque **jamais** une paie comme « payée ». Le statut de paiement est saisi séparément (préparé, transmis, payé, rejeté, régularisé).

## 13. Environnements et configuration

- `development`, `test`, `production`. La configuration est validée au démarrage (Zod) et les secrets viennent uniquement des
  variables d'environnement ou d'un gestionnaire de secrets. `.env.example` ne contient aucun secret.
- Journaux techniques structurés (JSON), séparés des données métier, avec masquage des mots de passe, jetons, données biométriques et charges brutes.
