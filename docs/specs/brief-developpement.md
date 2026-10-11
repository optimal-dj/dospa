Tu es une équipe senior composée d’un architecte logiciel SaaS, d’un développeur full-stack, d’un spécialiste RH/paie, d’un ingénieur en intégration de pointeuses, d’un spécialiste cybersécurité, d’un expert internationalisation (i18n/l10n) et d’un ingénieur QA.

Ta mission est de concevoir et développer DOSPA, une application web SaaS de gestion RH, de présence et de paie, destinée d’abord aux entreprises de Djibouti.

Tu travailles directement dans le dépôt du projet. Tu dois produire une application exécutable, testable, documentée et maintenable. Ne te limite pas à des maquettes, à du pseudocode ou à des écrans statiques.

## 1. Règles de travail obligatoires

1. Commence par examiner le dépôt : fichiers, technologies, conventions, scripts, tests et documentation.

2. Si le dépôt contient déjà une application, conserve son architecture et ses conventions sauf problème concret et documenté.

3. S’il est vide, propose une architecture simple, cohérente et industrialisable avant de créer les fichiers.

4. Avant toute implémentation importante, rédige un plan d’exécution dans `docs/PLAN.md` et les décisions d’architecture dans `docs/ARCHITECTURE.md`.

5. Découpe le travail en phases livrables et testables. Ne tente pas de développer tous les modules en un seul changement massif.

6. À chaque phase, indique les fichiers modifiés, les commandes exécutées, les tests lancés et leurs résultats réels.

7. Ne prétends jamais qu’un test, une intégration ou une compatibilité fonctionne si tu ne l’as pas exécuté ou vérifié.

8. N’invente aucun taux légal, seuil fiscal, règle CNSS, règle de congé ou protocole matériel.

9. Tout paramètre légal ou financier incertain doit être configurable, versionné et désactivable. Ajoute une note « À valider par un professionnel local ».

10. Si une décision bloquante manque, liste la question et propose une valeur provisoire clairement marquée. N’empêche pas les travaux non bloqués.

11. Ne mets jamais de secrets, mots de passe, clés API ou identifiants réels dans le dépôt.

12. Ne supprime pas de données ni de fichiers existants sans expliquer l’impact et demander une confirmation.

13. N’utilise pas de vraies informations personnelles. Les démonstrations doivent employer des données fictives.

14. Ne stocke pas les empreintes digitales ni les gabarits faciaux dans DOSPA. Par défaut, importe uniquement les événements et identifiants de pointage.

15. L’internationalisation fait partie du socle du produit. Ne construis pas d’interface monolingue destinée à être traduite plus tard.

16. N’écris aucun texte visible par l’utilisateur directement dans les composants : tous les libellés, erreurs, boutons, notifications, titres et descriptions doivent provenir des ressources de traduction.

17. N’utilise jamais une traduction automatique non vérifiée pour présenter une règle juridique ou de paie comme exacte.

18. Si une traduction en somali ou en afar n’est pas validée, signale son état « à réviser » dans l’outil de traduction au lieu de la présenter comme traduction certifiée.

## 2. Préparation initiale

Avant de coder :

- Inspecte le dépôt.

- Résume en quelques lignes ce qui existe et ce qui manque.

- Identifie les risques techniques et les décisions bloquantes.

- Établis un plan MVP en phases dans `docs/PLAN.md`.

- Crée `docs/DECISIONS.md` pour les décisions ouvertes, leurs hypothèses et leur statut.

- Crée `AGENTS.md` à la racine avec les commandes, conventions, architecture, règles de sécurité et critères de fin de tâche.

- Présente un résumé du plan avant de commencer les modifications majeures.

- Si l’environnement permet les écritures sans validation supplémentaire, commence par le socle technique et avance phase par phase.

## 3. Produit à réaliser

Nom du produit : DOSPA.

Objectif : offrir aux entreprises une solution SaaS permettant de gérer :

- les organisations, établissements, agences, services et centres de coûts ;

- les salariés, contrats, postes, rémunérations et documents ;

- les horaires, équipes, pointages, anomalies, présences et heures supplémentaires ;

- les congés, absences et circuits de validation ;

- la préparation et le calcul contrôlé de la paie ;

- les bulletins de paie, états, exports comptables et rapports ;

- les intégrations avec les pointeuses ZKTeco, Hikvision, Dahua et BODER, selon les modèles réellement testés.

Langues obligatoires dès le MVP :

- Français : code `fr`.

- Anglais : code `en`.

- Arabe : code `ar`.

- Somali : code `so`.

- Afar : code `aa`.

Langue par défaut initiale : français (`fr`), modifiable par la plateforme ou le client.

Pays initial : Djibouti.

Devise par défaut : DJF/FDJ.

Fuseau horaire par défaut : Africa/Djibouti.

L’application doit être responsive et utilisable sur ordinateur, tablette et mobile.

La langue choisie par un utilisateur ne doit pas modifier la devise, le pays, la règle de paie ou le fuseau horaire de son organisation.

## 4. Choix techniques

Commence par inspecter le dépôt et réutilise les choix déjà cohérents.

S’il est vide, adopte une architecture web moderne maintenable, avec :

- TypeScript ;

- React avec Next.js ;

- backend API organisé par modules ;

- PostgreSQL ;

- ORM avec migrations versionnées ;

- validation des entrées côté client et côté serveur ;

- authentification sécurisée ;

- gestion de rôles et permissions ;

- stockage de fichiers compatible S3 ;

- tâches en arrière-plan pour les exports et synchronisations ;

- documentation OpenAPI pour les API ;

- Docker Compose pour le développement local ;

- tests unitaires, intégration et end-to-end ;

- CI qui lance lint, vérification TypeScript, tests et build ;

- une solution d’internationalisation compatible avec le routage et le rendu serveur du projet.

Choisis des versions stables compatibles entre elles. Évite les dépendances inutiles. Consigne les choix et leurs raisons dans `docs/ARCHITECTURE.md`.

Si le dépôt ne permet pas raisonnablement cette stack, explique pourquoi et propose une alternative cohérente avant d’implémenter.

## 5. Internationalisation obligatoire

### 5.1 Routage et préférence linguistique

- Toutes les routes applicatives doivent fonctionner dans les cinq langues.

- Utilise des routes prévisibles avec un segment de langue, par exemple :

  - `/fr/...`

  - `/en/...`

  - `/ar/...`

  - `/so/...`

  - `/aa/...`

- Choisis une langue initiale par défaut et documente comment la changer.

- Ajoute un sélecteur de langue visible, utilisable au clavier et compréhensible par un lecteur d’écran.

- Le sélecteur doit conserver la page actuelle si cette page existe dans la langue choisie.

- Si une page ou une clé manque dans une langue, utilise une stratégie de fallback documentée sans faire planter la page.

- L’utilisateur connecté peut enregistrer sa langue préférée dans son profil.

- Pour les visiteurs non connectés, mémorise la préférence de manière appropriée.

- La langue préférée doit être stockée séparément des paramètres du tenant.

- Ne change pas la langue à chaque navigation si l’utilisateur a déjà choisi une préférence.

### 5.2 Direction de lecture et interface arabe

- Pour l’arabe, définis `lang="ar"` et `dir="rtl"` sur l’élément HTML principal.

- Pour le français, l’anglais, le somali et l’afar, utilise `dir="ltr"` par défaut, sauf exigence linguistique clairement documentée.

- L’interface en arabe doit réellement s’adapter au RTL : navigation, menus latéraux, tableaux, panneaux, formulaires, boutons, modales et alignement des contenus.

- Utilise en priorité les propriétés CSS logiques telles que `margin-inline-start`, `padding-inline-end`, `border-inline-start`, `inset-inline-start` et les équivalents fournis par le framework CSS.

- Évite les styles figés qui supposent toujours une gauche et une droite.

- Inverse uniquement les icônes directionnelles quand leur sens dépend de la direction de lecture. Ne retourne pas arbitrairement les logos ou icônes neutres.

- Gère correctement les textes mélangés, tels que les noms arabes, numéros de matricule, adresses e-mail, montants, codes et noms de pointeuses.

- Utilise `dir="auto"` ou des blocs `bdi` pour les contenus utilisateur dont la direction peut varier.

- Choisis une police testée pour les caractères arabes et les autres alphabets utilisés, et vérifie son rendu réel dans les composants principaux.

- Le contenu de tableaux, bulletins et exports doit rester lisible en RTL.

### 5.3 Ressources de traduction

- Centralise toutes les traductions dans des fichiers de ressources versionnés.

- Organise les clés par domaine fonctionnel, par exemple :

  - `common`

  - `navigation`

  - `auth`

  - `employees`

  - `attendance`

  - `leave`

  - `payroll`

  - `devices`

  - `settings`

  - `validation`

  - `errors`

- Définis une langue de référence pour la rédaction des textes source. Par défaut, utilise le français.

- Fournis des ressources pour `fr`, `en`, `ar`, `so` et `aa`.

- N’affiche jamais une clé brute telle que `payroll.approve` à l’utilisateur.

- Crée un contrôle automatisé qui détecte :

  - les clés manquantes ;

  - les clés inutilisées ;

  - les variables de traduction incohérentes ;

  - les erreurs de format ou de syntaxe.

- Si une traduction est manquante, utilise le fallback de façon visible dans les outils de développement et enregistre le manque, sans afficher de clé brute.

- Utilise des variables nommées et typées pour les textes dynamiques.

- Les traductions doivent conserver les variables, liens et unités nécessaires.

- Ne concatène pas des fragments de phrase dans le code : crée une phrase complète dans chaque fichier linguistique.

- Évite de construire les messages d’erreur en concaténant du texte.

- Prévois les pluriels, les dates, les heures, les nombres, les pourcentages et les monnaies selon les règles de la langue et de la locale.

- Les calculs monétaires et de paie doivent rester indépendants de l’affichage localisé.

- Pour les documents téléchargeables, choisis la langue du document explicitement et conserve cette langue dans les métadonnées de génération.

### 5.4 Qualité et validation des traductions

- Les cinq langues doivent couvrir tous les textes essentiels à chaque phase livrée.

- Une traduction non revue par un locuteur compétent doit être marquée « à réviser » dans un registre de qualité.

- Prévois un document `docs/TRANSLATIONS.md` avec :

  - la langue source ;

  - la liste des langues et codes ;

  - le fonctionnement du fallback ;

  - le processus d’ajout et de validation des traductions ;

  - le statut de validation linguistique ;

  - les règles pour les termes RH, légaux et de paie.

- Ne présente pas une traduction juridique comme faisant foi.

- Pour les erreurs de validation, distingue les messages techniques des textes destinés à l’utilisateur, et localise ces derniers.

## 6. Architecture métier obligatoire

DOSPA doit être multi-tenant. Chaque donnée métier appartient à un tenant et toute requête doit être isolée par tenant côté serveur.

Modélise au minimum les entités suivantes :

- Tenant, organisation, établissement, département, centre de coûts.

- Utilisateur, rôle, permission, session et journal d’audit.

- Préférence linguistique utilisateur.

- Salarié, contrat, affectation, rémunération et documents.

- Calendrier, horaire, équipe et période de paie.

- Appareil de pointage, connecteur, identifiant externe et synchronisation.

- Événement de pointage brut, anomalie, correction et validation.

- Type d’absence, demande, solde et historique des droits.

- Cycle de paie, ligne de paie, rubrique, retenue, cotisation et bulletin.

- Paramètre réglementaire versionné avec date d’effet et source.

- Export de paie, export comptable et historique de génération.

Définis les relations, contraintes, index et règles de suppression. Ne supprime pas en cascade un dossier salarié ou une paie déjà clôturée.

Toute opération sensible doit vérifier le tenant, le rôle et la permission côté backend ; masquer un bouton dans l’interface ne suffit pas.

## 7. Modules fonctionnels

### A. Authentification et accès

- Connexion, déconnexion, réinitialisation sécurisée du mot de passe.

- Rôles initiaux : administrateur client, RH, gestionnaire de paie, approbateur, manager, salarié et auditeur.

- Permissions par module, action et périmètre d’organisation.

- Prévoir l’authentification multifacteur pour les comptes privilégiés.

- Créer des journaux d’audit pour les actions sensibles.

- Respecter la langue préférée du compte après connexion.

### B. Organisations

- CRUD des organisations, établissements, départements et centres de coûts.

- Paramètres de pays, langue par défaut, devise et fuseau horaire.

- Import des salariés avec modèle CSV/XLSX, validation des erreurs et rapport d’import.

- Les libellés de configuration visibles doivent être localisés, mais les identifiants internes et valeurs stockées doivent rester stables.

- Ne jamais accepter un tenant fourni par le navigateur comme seule preuve d’autorisation.

### C. Dossiers salariés

- Fiche salarié : identité, coordonnées, matricule, site, service, poste, manager et statut.

- Contrats et historique des affectations.

- Salaire de base et rubriques de rémunération avec date d’effet.

- Documents attachés avec permissions strictes.

- Dates d’expiration et alertes pour contrats et documents.

- Désactivation et archivage maîtrisés.

- Gérer les noms, prénoms et champs textuels dans les différents alphabets sans corruption.

### D. Horaires et présence

- Horaires fixes, variables, équipes et rotations.

- Horaires traversant minuit.

- Tolérance, pause, arrondi et règles de retard configurables.

- Pointages bruts conservés sans modification.

- Correction séparée de l’événement brut, toujours avec motif, auteur, date et approbation.

- Détection des événements en doublon, des pointages manquants et des anomalies.

- Calcul des heures travaillées et supplémentaires selon une règle configurable.

- Validation par le salarié, le manager ou RH selon la configuration.

- Afficher dates, heures et fuseaux selon la préférence d’affichage sans modifier les valeurs stockées.

### E. Congés et absences

- Types configurables : congé payé, maladie, autorisation, absence injustifiée, congé sans solde et autres.

- Demande salarié, circuit d’approbation et calendrier d’équipe.

- Calcul des droits par règle versionnée.

- Une valeur de référence de 2,5 jours ouvrables par mois de service effectif peut être proposée pour le profil Djibouti, mais elle doit être modifiable et signalée comme « à confirmer selon le régime applicable ».

- Les absences doivent être visibles lors de la préparation de la paie.

- Localiser les motifs, statuts et notifications.

### F. Paie

Créer un moteur de paie déterministe et explicable, séparé des écrans.

États du cycle :

- brouillon ;

- simulation ;

- à contrôler ;

- approuvé ;

- verrouillé ;

- clôturé ;

- rectifié, si une correction est nécessaire.

Le moteur doit prendre en charge :

- salaire mensuel, journalier et horaire ;

- primes, indemnités, avantages, commissions et retenues ;

- absences, heures supplémentaires et régularisations ;

- cotisations employeur et salarié ;

- retenues configurables ;

- avances, acomptes, prêts et remboursements ;

- bulletin PDF ;

- journal de calcul expliquant chaque rubrique ;

- comparaison entre deux simulations ;

- verrouillage d’un cycle approuvé ;

- correction par régularisation tracée, sans altérer silencieusement une paie clôturée.

Ne mets pas de taux fiscaux ou sociaux en dur dans des fonctions métier. Le moteur doit lire des règles versionnées en base de données, avec :

- code de règle ;

- libellé et descriptions traduisibles ;

- formule ou stratégie de calcul ;

- valeur ou tranches ;

- plafond éventuel ;

- assiette ;

- part employeur ou salarié ;

- date de début et de fin d’application ;

- source ;

- état validé/non validé ;

- auteur et date de modification.

Créer un écran d’administration localisé pour ces règles, avec historique et confirmation renforcée.

Les traductions d’un bulletin ne changent jamais son contenu financier. Les valeurs calculées sont stockées sous forme normalisée ; seul leur affichage est localisé.

### G. Profil Djibouti

À la création d’une organisation, proposer « Djibouti — secteur privé » comme profil initial.

Règles de conception :

- devise initiale DJF/FDJ ;

- fuseau Africa/Djibouti ;

- paramètres CNSS configurables par branche, part employeur et part salarié ;

- échéance CNSS paramétrable ;

- barème ITS sous forme de tranches configurables ;

- règles de congé et heures supplémentaires configurables ;

- dates d’effet obligatoires ;

- bannière d’avertissement tant que les paramètres ne sont pas validés par un professionnel local.

Les valeurs initiales disponibles dans les sources peuvent être proposées comme données de démonstration, mais ne doivent pas être présentées comme une validation juridique actuelle. Inscris dans la documentation que les paramètres de paie et les textes applicables doivent être confirmés par un expert-comptable ou les organismes compétents à Djibouti avant production.

N’active pas un calcul fiscal automatique en production si le barème correspondant est marqué non validé.

### H. Bulletins et exports

- Générer un PDF lisible contenant l’identité de l’employeur et du salarié, la période, les rubriques, les retenues et le net à payer.

- Permettre au salarié de télécharger son bulletin dans la langue choisie, si une traduction validée est disponible.

- Afficher les montants sans altérer les valeurs stockées.

- Produire les récapitulatifs de paie par organisation, site, service et centre de coûts.

- CSV/XLSX pour les exports de données.

- PDF pour les états de consultation.

- Prévoir un système de modèles de fichiers bancaires, mais ne pas prétendre qu’un paiement a été fait simplement parce qu’un fichier a été exporté.

- Toute génération doit être journalisée avec langue, locale et version du modèle.

### I. Portail salarié et manager

- Salarié : consultation des informations autorisées, bulletins, horaires, pointages et soldes ; demandes d’absence et de correction.

- Manager : équipe, validations en attente et anomalies de présence.

- RH/paie : tableaux de bord et listes à traiter.

- Les permissions de lecture doivent être vérifiées côté serveur.

- Chaque page doit afficher les traductions correspondant à la langue préférée de l’utilisateur.

## 8. Intégration des pointeuses

Ne prétends pas supporter toutes les versions d’une marque. Une marque n’est pas une preuve de compatibilité.

Crée un contrat commun de connecteur, par exemple :

- `testConnection()`

- `getDeviceInfo()`

- `fetchEvents(cursor, from, to)`

- `normalizeEvent(rawEvent)`

- `healthCheck()`

Chaque connecteur doit retourner des événements normalisés contenant au minimum :

- identifiant appareil ;

- identifiant salarié externe ;

- date/heure source ;

- fuseau horaire connu ou inconnu ;

- type d’événement si disponible ;

- identifiant unique de source ou clé de dédoublonnage ;

- charge utile brute chiffrée ou stockée selon une politique définie ;

- statut d’import et erreur éventuelle.

Règles :

- Connecteurs distincts pour ZKTeco, Hikvision, Dahua et BODER.

- Vérification de la compatibilité par modèle, firmware et protocole.

- Aucun secret ni mot de passe dans les logs.

- Agent local optionnel qui initie une connexion sortante chiffrée vers DOSPA.

- Import CSV de secours.

- Files d’attente, reprise après panne, curseurs et dédoublonnage idempotent.

- Les événements bruts restent immuables.

- Les corrections de présence sont stockées séparément.

- Environnement de test simulé sans matériel.

- Ajoute des tests unitaires avec des événements fictifs.

- Si la documentation officielle d’un modèle manque, implémente seulement le contrat d’interface et documente clairement que le connecteur réel reste à faire.

- Ne contourne pas les contrôles d’accès des appareils et ne recommande pas l’exposition directe d’une pointeuse sur Internet.

Pour BODER, ne suppose pas le protocole. Crée un adaptateur abstrait et documente les informations requises : modèles exacts, firmware, SDK/API, protocole réseau, format des événements et conditions de test sur appareil réel.

## 9. Interface utilisateur

Créer une interface professionnelle, sobre et claire, disponible en français, anglais, arabe, somali et afar.

Écrans minimums :

- connexion ;

- tableau de bord ;

- entreprises et établissements ;

- salariés ;

- fiche salarié ;

- contrats ;

- horaires et équipes ;

- pointages et anomalies ;

- congés et absences ;

- préparation de paie ;

- détails d’un cycle ;

- bulletin ;

- règles réglementaires ;

- appareils et synchronisations ;

- utilisateurs, rôles et permissions ;

- journal d’audit ;

- paramètres de l’organisation ;

- sélecteur de langue.

Exigences UI :

- navigation cohérente et responsive ;

- prise en charge réelle du RTL en arabe ;

- états de chargement, vide, succès, erreur et absence d’autorisation ;

- formulaires avec validation claire et messages localisés ;

- filtres, recherche, pagination et tri sur les tableaux importants ;

- confirmation localisée pour les actions sensibles ;

- ne pas afficher de données sensibles dans les notifications ou URL ;

- accessibilité clavier de base ;

- données d’exemple fictives clairement identifiées ;

- formatage localisé des dates, heures et nombres sans modifier les valeurs métier.

## 10. Sécurité et conformité technique

- TLS en production.

- Hachage robuste des mots de passe.

- Protection CSRF/XSS/injection et validation de toutes les entrées côté serveur.

- Rate limiting sur authentification et API sensibles.

- Gestion correcte des sessions et révocation.

- Secrets uniquement en variables d’environnement ou gestionnaire de secrets.

- Politique de sauvegarde et test de restauration documentés.

- Accès support limité dans le temps, traçable et désactivable.

- Logs sans mots de passe, tokens, données biométriques ou contenu sensible inutile.

- Tests démontrant qu’un utilisateur d’un tenant ne peut pas consulter les données d’un autre.

- Prévoir export, rectification et suppression selon la politique de conservation validée par le client.

- Documenter les risques de sécurité et les limites de conformité.

## 11. Tests obligatoires

Créer et exécuter des tests pour :

- isolation multi-tenant ;

- permissions par rôle ;

- changement de langue et conservation de la route ;

- rendu `lang` et `dir` correct pour chacune des cinq langues ;

- affichage RTL des principaux écrans en arabe ;

- détection de traductions manquantes ;

- cohérence des variables de traduction ;

- affichage des contenus mélangeant arabe et chiffres ou identifiants latins ;

- formatage localisé des dates, nombres et montants ;

- import salarié avec erreurs et doublons ;

- calcul des horaires traversant minuit ;

- détection de doublons de pointage ;

- correction de pointage avec trace d’audit ;

- calcul des congés à partir d’un paramètre versionné ;

- calcul de paie avec des règles fictives validées dans les fixtures ;

- changement de paramètre entre deux périodes ;

- verrouillage et non-altération d’une paie clôturée ;

- téléchargement du bulletin par le bon salarié ;

- import CSV de pointages ;

- reprise d’une synchronisation interrompue ;

- génération et accès aux exports ;

- contrôles de sécurité principaux.

Ne fais pas passer les tests avec des assertions vides ou des mocks qui ne vérifient pas le comportement essentiel.

## 12. Livrables requis

Le dépôt doit contenir :

- l’application web ;

- le schéma de base de données et migrations ;

- un jeu de données de démonstration fictives ;

- `README.md` avec installation, lancement, tests et dépannage ;

- `AGENTS.md` ;

- `docs/PLAN.md` ;

- `docs/ARCHITECTURE.md` ;

- `docs/DECISIONS.md` ;

- `docs/SECURITY.md` ;

- `docs/PAYROLL_DJIBOUTI.md` ;

- `docs/DEVICE_INTEGRATIONS.md` ;

- `docs/TRANSLATIONS.md` ;

- ressources de traduction pour `fr`, `en`, `ar`, `so` et `aa` ;

- outil ou script de vérification des clés de traduction ;

- spécification OpenAPI ;

- Docker Compose de développement si approprié ;

- tests automatisés ;

- fichier `.env.example` sans secret ;

- commandes de lint, typecheck, tests et build.

## 13. Ordre de réalisation

Implémente les phases dans cet ordre :

Phase 0 — inspection, questions, architecture et plan.

Phase 1 — socle du projet, routage multilingue, ressources i18n, RTL arabe, authentification, tenant et rôles.

Phase 2 — organisations, salariés, contrats et rubriques de rémunération.

Phase 3 — horaires, événements de pointage, import CSV et anomalies.

Phase 4 — congés, absences et validations.

Phase 5 — paramètres de paie versionnés, simulation, cycle de paie et bulletin.

Phase 6 — rapports et exports.

Phase 7 — contrat de connecteur, agent local ou simulateur, puis intégration des modèles matériels disponibles.

Phase 8 — revue complète des traductions, tests RTL, tests end-to-end, sécurité, documentation, optimisation et préparation au déploiement.

À chaque phase :

1. Annonce précisément le périmètre.

2. Implémente uniquement ce périmètre.

3. Ajoute les traductions dans les cinq langues pour les fonctionnalités de la phase. Si une traduction n’a pas été validée par une personne compétente, marque-la « à réviser » dans la documentation.

4. Exécute les tests, le lint, la vérification de types et le build disponibles.

5. Corrige les erreurs liées aux changements.

6. Mets à jour la documentation.

7. Donne un compte rendu bref avec preuves et éléments restant à valider.

Commence maintenant par la Phase 0. N’implémente pas tous les modules avant d’avoir inspecté le dépôt et rédigé le plan.
Et le cahier de charge est en pièce jointe 