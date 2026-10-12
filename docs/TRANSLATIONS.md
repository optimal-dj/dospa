# Traductions — DOSPA

## Langues

| Code | Langue   | Direction | Formatage                                                           | Statut    |
| ---- | -------- | --------- | ------------------------------------------------------------------- | --------- |
| `fr` | Français | LTR       | `fr-DJ`                                                             | source    |
| `en` | Anglais  | LTR       | `en-DJ`                                                             | à réviser |
| `ar` | Arabe    | **RTL**   | `ar-DJ-u-nu-latn` (chiffres latins, D-010)                          | à réviser |
| `so` | Somali   | LTR       | `so-DJ`                                                             | à réviser |
| `aa` | Afar     | LTR       | conventions `fr-DJ`, dates numériques (D-011 : pas de données CLDR) | à réviser |

Les traductions `en`, `ar`, `so`, `aa` de la Phase 1 sont des **premiers jets non relus par des locuteurs natifs**.
L'afar en particulier doit être relu intégralement avant toute mise en production.

## Organisation

- `packages/i18n/messages/{locale}/{namespace}.json` — namespaces : `common`, `navigation`, `auth`, `dashboard`,
  `settings`, `admin`, `validation`, `errors`.
- `packages/i18n/quality.json` — statut par langue et namespace : `source`, `a_reviser`, `revise`, `valide`.
- Format ICU MessageFormat : variables nommées (`{name}`), pluriels (`{count, plural, …}`), balises (`<b>…</b>`).
- Interdit dans les messages : `{x, number}`, `{x, date}`, `{x, time}`. Les montants, dates et nombres sont formatés par
  `@dospa/i18n/format` puis passés comme texte.

## Règles

1. Rédiger d'abord en français, puis ajouter la clé dans les 5 langues (sinon `pnpm i18n:check` échoue).
2. Phrases complètes, jamais de concaténation de fragments.
3. Utiliser des clés complètes dans le code : `t('auth.login.title')`. Les clés dynamiques s'écrivent
   ``t(`admin.roles.names.${code}`)`` : le préfixe compte comme utilisé.
4. Clé manquante à l'exécution : affichage du texte français (fallback) et journalisation ; jamais de clé brute.
5. Après relecture native, passer le namespace concerné à `revise` puis `valide` dans `quality.json`.

## Vérification (`pnpm i18n:check`)

JSON valide, syntaxe ICU, clés manquantes ou en trop par langue, variables incohérentes, arguments de formatage
interdits, clés utilisées dans le code mais absentes, clés inutilisées, registre qualité complet.

## Relire une langue

Exporter le namespace (fichier JSON), le faire relire, réimporter, lancer `pnpm i18n:check`, puis mettre à jour
`quality.json`. Un écran de relecture intégré est prévu en Phase 8.
