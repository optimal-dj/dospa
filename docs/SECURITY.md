# Sécurité — DOSPA (brouillon Phase 1)

## Isolation des clients (tenants)

- Le tenant provient uniquement de la session côté serveur (`session.tenant_id`), jamais du navigateur.
- Toutes les requêtes passent par `withDbContext()` qui positionne `app.tenant_id` / `app.user_id` dans la transaction.
- PostgreSQL Row-Level Security sur toutes les tables du tenant ; l'application se connecte avec `dospa_app`
  (`NOSUPERUSER`, `NOBYPASSRLS`). Les migrations utilisent le rôle propriétaire.
- Contexte « auth » (`app.context = 'auth'`) réservé au module d'authentification (connexion, sessions, réinitialisation).
- Tests : `packages/db/test/rls.test.ts`.

## Authentification

- Mots de passe : Argon2id (m=19 MiB, t=2, p=1), 12 caractères minimum.
- Sessions : jeton opaque aléatoire (256 bits) en cookie `HttpOnly`, `SameSite=Lax`, `Secure` en HTTPS ;
  seule l'empreinte SHA-256 est stockée. Expiration absolue (12 h) et d'inactivité (30 min), configurables.
- Révocation : déconnexion, « fermer les autres sessions », révocation par un administrateur, réinitialisation du mot de passe.
- MFA TOTP obligatoire pour les rôles `tenant_admin`, `hr`, `payroll_manager`, `payroll_approver` ; 8 codes de secours
  à usage unique (hachés). Secret TOTP chiffré AES-256-GCM (`APP_ENCRYPTION_KEY`). La session est renouvelée après le MFA.
- Limitation de débit (en base, clés hachées) : 20 connexions / 15 min / IP, 5 / 15 min / compte (verrouillage),
  5 codes MFA / 15 min / session, 5 demandes de réinitialisation / h / IP.
- Pas d'énumération de comptes : même erreur et temps de vérification comparable pour un compte inconnu.
- Jetons de réinitialisation : 1 h, usage unique, hachés.

## Autorisation

- Permissions `module:action` (`packages/domain/src/permissions.ts`) attribuées par rôle, avec périmètre
  (tenant, organisation, établissement, département, équipe, soi-même).
- Chaque page ou action sensible vérifie `can()` / `authorize()` côté serveur ; masquer un lien ne suffit pas.

## Protection web

- CSRF : Server Actions Next.js (vérification de l'origine) + cookie `SameSite=Lax`. Les futures routes `/api/v1`
  vérifieront l'en-tête `Origin` ou un jeton d'API.
- XSS : rendu React échappé, aucun `dangerouslySetInnerHTML`. En-têtes : `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`. CSP stricte à ajouter avant production (D-033).
- Injection SQL : Prisma paramétré ; SQL brut uniquement via requêtes balisées (`$queryRaw\`…\``).
- Validation Zod de toutes les entrées.

## Journalisation

- `audit_log` et `login_history` sont append-only (trigger qui refuse UPDATE/DELETE, y compris pour le propriétaire).
- Aucun secret (mot de passe, jeton, code) n'est journalisé. Le transport e-mail `log` (développement) est refusé en production.
- Adresse IP issue de `X-Forwarded-For` : à n'activer que derrière un reverse proxy de confiance.

## À faire avant production

CSP, HSTS, rotation de `APP_ENCRYPTION_KEY`, sauvegardes chiffrées et test de restauration, politique de rétention,
analyse de dépendances en CI, test d'intrusion.
