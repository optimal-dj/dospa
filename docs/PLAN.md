# DOSPA — Plan d'exécution MVP

> Statut : **Phase 0 terminée, en attente de validation** avant la Phase 1.
> Références : [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`DECISIONS.md`](./DECISIONS.md), [cahier des charges](./specs/cahier-des-charges.pdf), [brief](./specs/brief-developpement.md).

## Constat (Phase 0)

- **Existant** : dépôt vide. Aucune application, aucun outillage, aucune convention à préserver.
- **Manque** : tout. L'application, la base, l'i18n, les tests, la CI et la documentation sont à créer.
- **Environnement de dev vérifié** : Docker 29 et Docker Compose présents. Node.js absent (installé localement en 22.23.3 LTS).
  Docker Hub renvoie 429 (limite de débit) → images via un miroir (D-029).
- **Constat i18n** : avec Node 22.23 (ICU 78.3, CLDR 48), `fr-DJ`, `en-DJ`, `ar-DJ` et `so-DJ` sont pris en charge par `Intl`.
  **`aa` (afar) ne l'est pas** et retombe sur `en-US`. Un formatage explicite est donc nécessaire (D-011). `ar-DJ` utilise par
  défaut les chiffres arabes-indiens (D-010).

## Principes de livraison

Chaque phase est livrée en **une ou plusieurs PR** testables. Pour chaque phase :

1. annonce du périmètre ;
2. implémentation de ce périmètre uniquement ;
3. traductions dans les 5 langues (ar/so/aa marquées « à réviser » tant qu'elles ne sont pas relues) ;
4. lint, typecheck, `i18n:check`, tests et build exécutés, avec les résultats réels dans le compte rendu ;
5. mise à jour de la documentation ;
6. compte rendu bref : fichiers, commandes, résultats, éléments à valider.

## Phases

### Phase 0 — Inspection, questions, architecture, plan ✅

Livrables : `docs/PLAN.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `AGENTS.md`, `README.md` (squelette), `docs/specs/`.

### Phase 1 — Socle, i18n, RTL, authentification, tenant, rôles

- Monorepo pnpm, TypeScript strict, ESLint (règles : textes en dur interdits, CSS physique interdite), Prettier, Vitest, Playwright, CI GitHub Actions.
- Docker Compose (postgres, minio, mailpit), `.env.example`, configuration validée par Zod.
- `packages/db` : tables tenant, organisation, user, user_preferences, role, permission, role_assignment, session, login_history,
  audit_log, rate_limit ; RLS et rôle applicatif ; seed fictif (2 tenants).
- `packages/i18n` : 5 locales, namespaces `common`, `navigation`, `auth`, `errors`, `validation`, `settings` ; registre qualité ;
  `pnpm i18n:check` (manquantes, inutilisées, variables, syntaxe).
- `apps/web` : routage `/{locale}`, `lang`/`dir`, sélecteur de langue accessible conservant la route, polices Noto, layout
  responsive (barre latérale qui bascule en RTL), états chargement / vide / erreur / non autorisé.
- Auth : connexion, déconnexion, réinitialisation, MFA TOTP pour les rôles privilégiés, révocation des sessions, limitation de
  débit, CSRF, journal d'audit, langue préférée appliquée après connexion.
- RBAC : catalogue des permissions, 7 rôles tenant, `authorize()` côté serveur, pages utilisateurs, rôles et journal d'audit (lecture).
- OpenAPI : génération + page de documentation.
- **Tests** : isolation multi-tenant, permissions par rôle, changement de langue avec conservation de la route, `lang`/`dir` pour
  les 5 langues, captures RTL, détection des traductions manquantes, cohérence des variables, contenu mixte arabe/latin, formatage
  localisé, sécurité de base (rate limit, CSRF, session révoquée).

### Phase 2 — Organisations, salariés, contrats, rémunération

- CRUD organisations, établissements, départements, centres de coûts ; paramètres pays, langue par défaut, devise, fuseau.
- Dossier salarié (identité multi-alphabet, matricule, affectations, manager, statut), contrats et historique, composantes de
  rémunération avec date d'effet, documents (S3, permissions, expiration, alertes), archivage contrôlé.
- Import CSV/XLSX des salariés : modèle téléchargeable, validation ligne par ligne, détection des doublons, rapport d'import.
- **Tests** : import avec erreurs et doublons, isolation, permissions sur les documents, intégrité des noms en arabe, somali et afar.

### Phase 3 — Horaires, pointages, import CSV, anomalies

- Calendriers, jours fériés (paramétrables, sans liste légale supposée), horaires fixes et variables, équipes, rotations, postes traversant minuit.
- Règles de tolérance, pause, arrondi et retard. Heures sup. configurables (D-016).
- Événements bruts immuables, rapprochement par identifiant externe, import CSV de pointages, détection des doublons, pointages manquants et anomalies.
- Corrections séparées (motif, auteur, date, approbation) et circuit de validation salarié / manager / RH.
- **Tests** : horaires traversant minuit, doublons, correction avec trace d'audit, import CSV de pointages, immutabilité des bruts.

### Phase 4 — Congés, absences, validations

- Types d'absence configurables, demandes, circuit d'approbation paramétrable, calendrier d'équipe, soldes et historique des droits.
- Règle d'acquisition versionnée (valeur proposée : 2,5 j ouvrables par mois, D-015), justificatifs à accès restreint.
- **Tests** : calcul des droits à partir d'un paramètre versionné, changement de paramètre entre deux périodes, permissions d'approbation.

### Phase 5 — Paramètres de paie, simulation, cycle, bulletin

- Paramètres réglementaires versionnés + écran d'administration (historique, confirmation renforcée, bannière « non validé »).
- Profil « Djibouti — secteur privé » (valeurs de démonstration marquées, D-013/D-014), `docs/PAYROLL_DJIBOUTI.md`.
- `payroll-engine` : salaires mensuels, journaliers et horaires ; primes, indemnités, retenues, absences, heures sup.,
  régularisations, cotisations par branche, ITS par tranches, avances, prêts et remboursements ; journal de calcul ; comparaison de simulations.
- Cycle : états, séparation des tâches, verrouillage, clôture, rectification tracée ; bulletin PDF localisé.
- **Tests** : calcul sur règles fictives validées en fixtures, changement de taux entre périodes, non-altération d'une paie
  clôturée, téléchargement du bulletin par le bon salarié uniquement, garde-fou ITS non validé.

### Phase 6 — Rapports et exports

- Tableaux de bord (effectifs, présences, heures sup., masse salariale, charges, congés, échéances CNSS).
- Récapitulatifs par organisation, site, service, centre de coûts ; exports CSV, XLSX et PDF ; export comptable paramétrable ;
  modèles de fichiers bancaires (générique) ; statuts de paiement distincts de l'export ; journalisation des générations.
- **Tests** : génération et contrôle d'accès des exports, rapprochement avec le cycle.

### Phase 7 — Connecteurs pointeuses

- Contrat `DeviceConnector`, simulateur, gestion des synchronisations (curseurs, reprise, idempotence), santé des appareils dans l'UI.
- Agent local (connexion sortante, file locale). Connecteurs ZKTeco / Hikvision / Dahua **sur les modèles réellement disponibles** (D-018). BODER : adaptateur abstrait (D-019).
- `docs/DEVICE_INTEGRATIONS.md` avec une matrice de compatibilité (modèle, firmware, protocole, essai documenté).
- **Tests** : événements fictifs, reprise après interruption, dédoublonnage.

### Phase 8 — Durcissement

- Revue complète des traductions, tests RTL et E2E de bout en bout, revue sécurité (`docs/SECURITY.md`), sauvegarde et test de restauration, performance, préparation au déploiement.

## Risques principaux

| Risque                            | Impact                      | Mitigation                                                                                                             |
| --------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Règles ITS et CNSS non confirmées | Paie fausse en production   | Paramètres versionnés, statut de validation, garde-fou production, validation par un expert-comptable avant activation |
| Pas de matériel de test           | Connecteurs non prouvés     | Simulateur + CSV ; compatibilité déclarée seulement après essai documenté                                              |
| Traductions ar/so/aa non relues   | Ambiguïtés RH et juridiques | Registre qualité « à réviser », mention « ne fait pas foi », relecteurs natifs (D-012)                                 |
| Absence de CLDR pour l'afar       | Formatage incorrect         | Formatage explicite configurable, tests dédiés (D-011)                                                                 |
| Étendue fonctionnelle très large  | Dérive du calendrier        | Livraison par phases, MVP selon le cahier §8, fonctions « version suivante » repoussées                                |
| Fuite de données entre tenants    | Critique                    | Tenant issu de la session, RLS, tests d'isolation obligatoires en CI                                                   |
| Altération d'une paie clôturée    | Critique (légal)            | Triggers d'immutabilité, rectification versionnée, audit                                                               |

## Hors périmètre MVP (cahier §8)

Recrutement et formation, comptabilité générale complète, exécution des virements, transmission directe CNSS ou impôts sans API
autorisée, gestion biométrique centralisée, garantie de compatibilité universelle par marque, application mobile native (le web responsive est dans le périmètre).
