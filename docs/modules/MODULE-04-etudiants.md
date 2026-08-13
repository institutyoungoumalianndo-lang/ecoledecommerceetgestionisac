# Module 4 — Gestion complète des étudiants

**Statut** : ✅ **Terminé — validé le 2026-07-26**
**Dépend de** : Module 0 (validé), Module 1 (validé), Module 2 (validé — filières, niveaux, classes, années universitaires).
**Source** : Chapitre 4 du cahier des charges (reçu le 2026-07-26), intitulé par vous "Module 3". Voir §0 ci-dessous pour la note de numérotation.

---

## 0. Note de numérotation

Votre Chapitre 4 est titré "MODULE 3 – Gestion complète des étudiants". Dans `ROADMAP.md`, l'emplacement "Module 3" avait déjà été retenu pour les "Référentiels pédagogiques", puis **fusionné dans le Module 2** (validé) — l'emplacement "Étudiants" y est donc le **Module 4**. Je conserve la numérotation `ROADMAP.md` (pas de renumérotation en cascade des modules suivants) et j'appelle ce module **"Module 4 — Étudiants"** dans toute la documentation technique. Dites-moi si vous préférez que je renumérote tout à l'inverse.

---

## 1. Analyse fonctionnelle

### 1.1 Objectif et rôle central

Ce module est le **référentiel principal** de l'ERP : tous les modules futurs (inscriptions/paiements, notes/bulletins, bibliothèque, communication, cartes et attestations...) référenceront les étudiants créés ici. Conséquence directe sur la conception : clés étrangères stables (UUID, déjà la convention du projet), aucune suppression physique, et une **fiche étudiant** (§4.7) conçue comme point d'agrégation extensible — les sections qui dépendent de modules pas encore construits (paiements, notes, sanctions, présences, communications) seront affichées comme **onglets présents mais vides**, avec un message "Disponible à partir du Module X", plutôt que d'être omises ou bricolées en avance.

### 1.2 Périmètre couvert par ce module

- Fiche d'identité complète de l'étudiant (état civil, coordonnées, situation familiale).
- Informations académiques de rattachement (filière/niveau/classe/année) et historique de scolarité.
- Parents/tuteurs (plusieurs par étudiant, contact officiel désigné).
- Documents administratifs (upload, consultation, remplacement).
- Recherche instantanée et tableau des étudiants (tri, filtres, pagination, export, impression, colonnes personnalisables).
- Changement de classe/filière/niveau en cours d'usage, avec historique.
- Archivage / restauration (jamais de suppression définitive).
- Import Excel/CSV avec détection de doublons et validation avant import ; export Excel/PDF/CSV.
- Contrôle de doublons à la création.
- Sécurité (permissions dédiées).

### 1.3 Hors périmètre de ce module (dépendances futures, onglets "à venir" dans la fiche)

| Donnée listée en §4.7 | Module qui la produira réellement |
|---|---|
| Paiements | Module 7 — Finances |
| Notes, Moyennes, Bulletins | Module 6 — Évaluation |
| Sanctions | Non planifié à date dans `ROADMAP.md` — à clarifier (discipline scolaire), backlog |
| Présences | Non planifié à date dans `ROADMAP.md` — à clarifier (assiduité), backlog |
| Communications envoyées | Module 12 — Communication |
| Carte étudiant (génération) | Module 9 — Documents officiels |

### 1.4 Logique héritée du projet Python (à conserver)

D'après `RAPPORT_ANALYSE_ISAC_ERP.md` et le code existant (`etudiant_service.py`, `etudiant_repository.py`, `matricule_service.py`) :
- **Format du matricule** : `{2 initiales filière}-{compteur global}-ISAC-{2 derniers chiffres de l'année de début}`, ex. `GC-134-ISAC-26`. Compteur **global, jamais réinitialisé**, généré de façon atomique (verrou transactionnel) pour éviter les doublons en saisie simultanée depuis deux postes du LAN.
- Le matricule n'est **jamais recalculé** après la création, même si la filière change ensuite.
- Aucune suppression physique d'un étudiant — seul un flag actif/inactif existait (remplacé ici par un archivage plus riche, §1.7).
- Historique de scolarité stocké par année (`historique_scolarite` : étudiant, classe, année, décision de fin d'année, moyenne annuelle, mention) — je reprends ce principe sous une forme enrichie (§2.6).

### 1.5 Nouveautés par rapport à l'existant (demandées par votre Chapitre 4)

- Champs supplémentaires : nationalité, adresse structurée (quartier/commune/ville/préfecture/pays), téléphone secondaire, situation familiale, photo obligatoire.
- Génération de matricule **configurable** (§1.6), alors qu'elle était figée dans le code Python.
- Parents/tuteurs multiples et structurés (au lieu de deux champs texte "nom_pere"/"nom_mere").
- Documents administratifs attachés et gérés (n'existait pas).
- Recherche multi-critères instantanée, tableau avec colonnes personnalisables, export Excel/PDF (le Python ne faisait qu'un export basique).
- Import en masse avec détection de doublons (n'existait pas).
- Permissions granulaires dédiées (le Python n'avait pas de RBAC).

### 1.6 Génération du matricule — proposition de configuration

Le cahier des charges demande une génération "automatique configurable". Je propose un **gabarit textuel** avec variables, réglable dans un nouvel écran de paramètres, plutôt que de figer le format legacy en dur :

- Variables disponibles : `{FILIERE}` (2 initiales du code filière), `{COMPTEUR}` (numéro de séquence), `{SIGLE}` (sigle de l'établissement, `EstablishmentSettings.acronym`, Module 2), `{AA}` (2 derniers chiffres de l'année universitaire de l'inscription), `{AAAA}` (4 chiffres).
- Gabarit par défaut (= comportement actuel) : `{FILIERE}-{COMPTEUR}-{SIGLE}-{AA}`.
- Politique de réinitialisation du compteur : **jamais** (comportement actuel, compteur global) ou **annuelle** (repart de 1 à chaque nouvelle année universitaire) — configurable.
- Nombre de chiffres du compteur (zéro-padding), configurable (0 = pas de padding, comportement actuel).
- Aperçu en direct du prochain matricule dans l'écran de paramètres.

*(Point à valider par vous — §6.)*

### 1.7 Archivage vs suppression logique

Le projet a déjà deux conventions proches (`deleted_at` pour les utilisateurs au Module 1, `is_active` pour les référentiels du Module 2). Pour les étudiants, votre cahier des charges introduit une notion distincte : **archivage réversible** (§4.10), différente d'une simple désactivation. Je propose un champ dédié `archived_at` / `archived_reason` / `archived_by`, avec écran de restauration — un étudiant archivé disparaît des listes/recherches par défaut mais reste totalement intact et restaurable.

### 1.8 Doublons — alerte, pas blocage strict

Le cahier des charges (§4.12) demande une **alerte**, pas nécessairement un blocage. Le matricule est généré par le système (jamais de conflit possible). Pour téléphone/email, un blocage strict en base serait incorrect (une fratrie peut légitimement partager le téléphone d'un parent) : je propose une vérification applicative avant enregistrement qui **avertit** l'utilisateur (liste des étudiants existants proches par matricule/téléphone/email/nom+date de naissance) et lui demande une confirmation explicite pour continuer, tracée dans le journal d'audit.

### 1.9 Export PDF — portée proposée pour ce module

Le futur moteur de documents centralisé (Module 9) n'existe pas encore. Pour ce module, "export PDF" du tableau des étudiants s'appuiera sur l'impression navigateur déjà utilisée au Module 1 (impression → "Enregistrer en PDF"), sans construire un second pipeline PDF qui serait redondant avec le Module 9. L'export Excel (.xlsx réel, nouvelle capacité) et CSV restent des exports fichier classiques.

### 1.10 Performance à grande échelle

Les tableaux des Modules 1 et 2 chargent toutes les lignes côté client (adapté à des référentiels de quelques dizaines/centaines de lignes). Le cahier des charges exige de bonnes performances avec "plusieurs milliers d'étudiants" (§4.14) : le tableau des étudiants utilisera une **pagination et une recherche côté serveur** (nouvel endpoint tRPC dédié), avec index PostgreSQL sur nom/prénom/matricule/téléphone/email, plutôt que le `DataTable` 100% client existant.

---

## 2. Conception de la base de données (validée et implémentée)

### 2.1 Schéma proposé

```
students
├── id, matricule (unique, généré, jamais modifié)
├── last_name, first_name, gender (M | F)
├── birth_date, birth_place, nationality
├── photo_path
├── address, neighborhood, commune, city, prefecture, country
├── phone_primary, phone_secondary, email
├── marital_status (CELIBATAIRE | MARIE | AUTRE)
├── archived_at, archived_reason, archived_by → users.id (nullable)
└── created_at / updated_at

guardians (parents/tuteurs — indépendants pour permettre le partage entre fratries)
├── id, last_name, first_name, profession, employer
├── phone_primary, phone_secondary, whatsapp, email, address
└── created_at / updated_at

student_guardians (liaison étudiant ↔ responsable, plusieurs par étudiant)
├── id, student_id → students.id, guardian_id → guardians.id
├── relationship (PERE | MERE | TUTEUR_LEGAL | FRERE | SOEUR | ONCLE | TANTE | GRAND_PARENT | AUTRE)
├── relationship_other (texte libre, si AUTRE)
├── is_primary_contact (un seul par étudiant — index unique partiel)
├── UNIQUE(student_id, guardian_id)
└── created_at / updated_at

student_documents
├── id, student_id → students.id
├── type (ACTE_NAISSANCE | DIPLOME | RELEVE | PHOTO | CARTE_IDENTITE_PASSEPORT | CERTIFICAT_MEDICAL | AUTRE)
├── label (texte libre, surtout pour AUTRE)
├── file_path, file_name, mime_type, file_size_bytes
├── uploaded_at, uploaded_by → users.id (nullable)
└── updated_at (mis à jour à chaque remplacement)

student_enrollments (inscription annuelle = historique académique, jamais supprimé)
├── id, student_id → students.id, academic_year_id → academic_years.id
├── class_id → classes.id, filiere_id → filieres.id, level_id → levels.id (dénormalisés depuis la classe, pour requêtes/historique rapides)
├── status (NOUVEAU | ANCIEN | REDOUBLANT | TRANSFERT | REPRISE)
├── decision (EN_COURS | ADMIS | REDOUBLANT | AJOURNE | ABANDON — par défaut EN_COURS)
├── annual_average (decimal, nullable — alimenté manuellement tant que le Module 6 n'existe pas)
├── mention (texte, nullable)
├── enrollment_date
├── UNIQUE(student_id, academic_year_id)
└── created_at / updated_at

student_number_sequences (compteur atomique de matricule)
├── id, scope_key (texte : "GLOBAL" ou id de l'année universitaire si réinitialisation annuelle)
├── last_number
├── UNIQUE(scope_key)
└── updated_at

student_numbering_settings (singleton — configuration du gabarit de matricule, §1.6)
├── id, template (texte, défaut "{FILIERE}-{COMPTEUR}-{SIGLE}-{AA}")
├── reset_policy (JAMAIS | ANNUEL)
├── counter_padding (entier, défaut 0)
└── updated_at
```

### 2.2 Pourquoi une table `student_enrollments` distincte plutôt que filière/niveau/classe directement sur `students`

C'est le choix structurant de ce module. Le Python stockait la classe courante directement sur `etudiants` + une table d'historique séparée en parallèle (deux sources de vérité à synchroniser). Ici, `student_enrollments` **est** à la fois l'affectation courante (la ligne de l'année universitaire active) et l'historique complet (toutes les lignes passées) — une seule source de vérité, alignée sur le principe déjà appliqué au Module 2 (`Class` est déjà rattachée à une `AcademicYear`, donc changer d'année implique naturellement une nouvelle ligne). Les "redoublements" et "transferts" se lisent directement dans la succession des lignes (`status`/`decision`), sans table parallèle à maintenir.

### 2.3 Changement de classe en cours d'année (§4.9)

Un changement de classe/filière/niveau **en cours de la même année universitaire** modifie en place la ligne `student_enrollments` de l'année active (`class_id`/`filiere_id`/`level_id` recalculés), plutôt que de créer une nouvelle ligne (qui casserait la contrainte `UNIQUE(student_id, academic_year_id)` et la lecture "une ligne = une année"). Chaque changement est journalisé dans la table `audit_log` existante (Module 1), avec `before`/`after` — je réutilise l'infrastructure d'audit déjà en place plutôt que de créer une table d'historique parallèle (principe d'architecture n°6). Une ligne d'année **clôturée** (mécanisme déjà existant au Module 2) devient en lecture seule : impossible de la modifier tant que l'année n'est pas rouverte par un SUPER_ADMIN.

### 2.4 Contact officiel unique (§4.3)

`is_primary_contact` sur `student_guardians` : au plus un responsable "contact officiel" par étudiant. Contrainte imposée par un index unique partiel PostgreSQL (`WHERE is_primary_contact = true`), ajouté en SQL brut dans la migration Prisma (Prisma ne modélise pas nativement les index partiels) ; définir un nouveau contact officiel désactive automatiquement l'ancien, dans une transaction.

### 2.5 Documents — stockage

Réutilise l'infrastructure de fichiers du Module 2 (route REST dédiée hors tRPC, ADR-012) mais l'étend : les documents administratifs incluent des PDF (diplômes, relevés), pas seulement des images — une nouvelle fonction de stockage `saveDocumentFile` (pas de redimensionnement, types acceptés élargis : PNG/JPEG/WebP/PDF, taille max relevée à 10 Mo) complète `saveResizedImage` (Module 2, qui reste utilisée telle quelle pour la photo de l'étudiant).

---

## 3. Règles métier

1. **Création** : matricule généré automatiquement (§1.6) au moment de la création, jamais modifiable ensuite. Champs obligatoires : nom, prénom, sexe, date de naissance, filière, niveau, classe, année universitaire (= création simultanée du premier `student_enrollment`, statut par défaut `NOUVEAU`). Une année universitaire active doit exister (réutilise la contrainte déjà en place au Module 2), sinon création bloquée avec message explicite.
2. **Modification** : le matricule n'apparaît jamais dans le formulaire de modification. Modifier la filière/classe/niveau **hors** création se fait exclusivement via l'action dédiée "Changer de classe" (§2.3), jamais par édition directe du formulaire d'identité, pour garantir la traçabilité.
3. **Contrôle de doublons** (§1.8) : avertissement non bloquant avant enregistrement (création et import), sur téléphone/email/nom+prénom+date de naissance ; confirmation explicite tracée dans `audit_log`.
4. **Contact officiel** : exactement un responsable "reçoit les communications officielles" dès qu'au moins un responsable est lié ; imposé par contrainte DB + logique applicative (§2.4).
5. **Documents** : consultables/téléchargeables par toute personne ayant `ETUDIANTS_DOCUMENTS:LECTURE` ; remplacement = nouvel upload sur le même enregistrement (`file_path` écrasé, `uploaded_at`/`uploaded_by` mis à jour) — pas de conservation de versions successives (non demandé) ; suppression d'un document (erreur de saisie) autorisée sous `ETUDIANTS_DOCUMENTS:SUPPRESSION`, car il s'agit d'un fichier joint et non d'une donnée d'historique académique (la règle "aucune suppression définitive" du §4.10/4.5 s'applique à l'étudiant et à son historique, pas aux pièces jointes).
6. **Archivage** (§4.10) : réversible à tout moment, aucune perte de données ; un étudiant archivé n'apparaît plus dans le tableau/la recherche par défaut (filtre "Afficher les archivés" disponible) ; restauration en un clic, tracée dans `audit_log`.
7. **Historique** (§4.5) : jamais de suppression de ligne `student_enrollments` ; une ligne d'année clôturée devient en lecture seule (§2.3).
8. **Import** (§4.11) : assistant en 3 étapes — (1) dépôt du fichier Excel/CSV + association des colonnes aux champs, (2) validation (champs obligatoires présents, codes filière/niveau/classe résolvables, doublons détectés en base et à l'intérieur même du fichier), rapport ligne par ligne, (3) confirmation d'import — seules les lignes sans erreur bloquante sont importées, chaque ligne obtient son propre matricule via le compteur atomique ; une ligne en échec n'annule pas les autres.
9. **Export** : CSV et Excel (.xlsx) réels ; "export PDF" du tableau = impression navigateur existante (§1.9).
10. **Sécurité** (§4.13) — permissions dédiées (voir §5), vérifiées côté serveur pour chaque opération, contournées uniquement par SUPER_ADMIN (comportement déjà en place).
11. **Performance** : recherche et pagination côté serveur pour le tableau principal (§1.10).

---

## 4. Conception UI/UX

Respecte le design system existant (tokens de couleur du Module 0/2, `bg-menu` pour la navigation, fond assombri pour toute nouvelle fenêtre).

- **Écran "Étudiants" (tableau)** : recherche instantanée (matricule/nom/prénom/téléphone/email), filtres avancés (filière/niveau/classe/année/statut/archivés), tri par colonne, pagination serveur, personnalisation des colonnes affichées (persistée localement), export CSV/Excel/impression, badge de statut (actif/archivé).
- **Formulaire étudiant** : au vu du nombre de champs (§4.2), une **page dédiée** (pas une fenêtre modale, trop étroite) organisée en sections : Identité & photo, Coordonnées, Situation familiale, Informations académiques (uniquement à la création). Validation en temps réel (React Hook Form + Zod), alerte de doublon avant soumission (§1.8/3.3).
- **Fiche complète de l'étudiant** (§4.7) : page dédiée à onglets — Identité, Coordonnées, Parents/Tuteurs, Documents, Historique académique, puis onglets **présents mais désactivés/vides** avec mention "Disponible à partir du Module X" pour Paiements, Notes/Bulletins, Sanctions, Présences, Communications (§1.3).
- **Onglet Parents/Tuteurs** : liste des responsables liés, ajout (nouveau ou recherche d'un responsable existant pour lier une fratrie), désignation du contact officiel, édition/suppression du lien (le `guardian` lui-même n'est jamais supprimé s'il reste lié à un autre étudiant).
- **Onglet Documents** : une carte par type de document (existant ou "non fourni"), bouton importer/remplacer/télécharger/supprimer selon permissions.
- **Onglet Historique académique** : tableau chronologique des `student_enrollments` (année, classe, filière, niveau, statut, décision, moyenne), en lecture seule sauf ligne de l'année active ; bouton "Changer de classe" sur la ligne active uniquement.
- **Assistant d'import** : dialogue en 3 étapes (dépôt fichier → mappage colonnes → rapport de validation et confirmation).
- **Écran Paramètres de numérotation** : nouvelle section dans le `SettingsShell` existant (Module 2), gabarit + politique de réinitialisation + aperçu du prochain matricule.

---

## 5. Permissions proposées

| Code | Usage |
|---|---|
| `ETUDIANTS:LECTURE` | Consulter le tableau et les fiches |
| `ETUDIANTS:CREATION` | Créer un étudiant |
| `ETUDIANTS:MODIFICATION` | Modifier l'identité/coordonnées, changer de classe |
| `ETUDIANTS:SUPPRESSION` | Archiver / restaurer |
| `ETUDIANTS:IMPRESSION` | Imprimer le tableau / une fiche |
| `ETUDIANTS:EXPORT` | Exporter CSV/Excel |
| `ETUDIANTS:ADMINISTRATION` | Paramètres de numérotation du matricule |
| `ETUDIANTS_DOCUMENTS:LECTURE` | Consulter/télécharger les documents |
| `ETUDIANTS_DOCUMENTS:CREATION` | Importer un document |
| `ETUDIANTS_DOCUMENTS:MODIFICATION` | Remplacer un document |
| `ETUDIANTS_DOCUMENTS:SUPPRESSION` | Supprimer un document (erreur de saisie) |
| `ETUDIANTS_IMPORT:CREATION` | Lancer l'assistant d'import |
| `ETUDIANTS_IMPORT:VALIDATION` | Confirmer l'exécution d'un import |

Documents administratifs isolés de la permission générale `ETUDIANTS` (certains contiennent des données sensibles — certificat médical, pièce d'identité) pour permettre de restreindre leur accès indépendamment de la consultation des fiches, si besoin.

---

## 6. Points à valider avant migrations et développement

1. Le module s'appelle **"Module 4 — Étudiants"** dans la documentation technique (numérotation `ROADMAP.md` conservée) malgré le "Module 3" du cahier des charges (§0).
2. Modèle `student_enrollments` par année universitaire (au lieu de champs filière/niveau/classe directs sur `students`) comme unique source de l'historique académique (§2.2).
3. Gabarit configurable pour le matricule (variables `{FILIERE}`/`{COMPTEUR}`/`{SIGLE}`/`{AA}`/`{AAAA}`, politique de réinitialisation jamais/annuelle, zéro-padding) (§1.6).
4. Doublons = alerte non bloquante avec confirmation, pas de contrainte unique stricte sur téléphone/email (§1.8).
5. Suppression de document autorisée (fichier joint), alors que l'étudiant et son historique académique ne sont jamais supprimables (§3.5).
6. "Export PDF" du tableau = impression navigateur existante pour ce module ; le vrai moteur PDF arrive au Module 9 (§1.9).
7. Sanctions et Présences : non couvertes par un module existant de `ROADMAP.md` — onglets réservés vides dans la fiche étudiant en attendant une clarification de portée (§1.3).

**✅ Tous ces points ont été validés par le porteur du projet le 2026-07-26** ("je valide").

---

## 7. Développement

Réalisé conformément aux §2/§3/§4 :
- Schéma Prisma (7 nouvelles tables/singletons + 4 enums) et migrations appliquées (`20260726205223_module4_etudiants`, `20260726205309_module4_primary_contact_partial_index` pour l'index unique partiel du contact officiel).
- Seed : 13 nouvelles permissions `ETUDIANTS*`, ligne singleton `student_numbering_settings`.
- `packages/shared` : schémas Zod (`student`, `guardian`, `studentDocument`, `studentEnrollment`, `studentNumbering`, `studentImport`).
- `packages/api` : `matriculeService` (gabarit + compteur atomique verrouillé en transaction), `studentService` (CRUD, liste paginée/triée côté serveur, export, doublons, archivage), `studentEnrollmentService` (historique, changement de classe avec verrou sur année clôturée), `guardianService` (liaison, contact officiel unique), `studentDocumentService`, `studentImportService` (validation puis exécution par lot) ; routers tRPC correspondants ; route REST `/uploads/documents` (images + PDF, non redimensionnés) en complément de `/uploads`.
- `packages/ui` : `ServerDataTable` (pagination/tri/recherche serveur, colonnes personnalisables, export CSV/Excel), `Tabs`, utilitaires `exportRowsToCsv`/`exportRowsToXlsx`/`parseSpreadsheetFile` (dépendance `xlsx` ajoutée).
- `apps/desktop` : écran tableau étudiants, formulaire de création (page dédiée), fiche complète à onglets (identité, parents/tuteurs, documents, historique académique + onglets réservés pour Paiements/Notes/Sanctions/Présences/Communications), assistant d'import 3 étapes, écran de configuration de la numérotation (intégré au `SettingsShell` du Module 2).

## 8. Tests

| Test | Résultat |
|---|---|
| Tests unitaires (`renderMatriculeTemplate`, `padCounter`, `extractYearParts`, `normalizeGender`, `normalizeMaritalStatus`) | ✅ 15 tests, tous verts |
| Lint / typecheck / build sur les 5 packages | ✅ Tous verts |
| Vérification de bout en bout contre PostgreSQL réel (création d'étudiant avec génération de matricule atomique, détection de doublon, liaison d'un responsable avec contact officiel unique, document, historique d'inscription, archivage/restauration, aperçu de matricule) | ✅ Toutes les vérifications passées, données de test nettoyées |
| Démarrage réel du serveur API + appel HTTP/tRPC non authentifié sur `students.list` | ✅ Rejeté proprement en 401, aucune erreur de démarrage |
| Parcours des écrans par le porteur du projet | ✅ **Testé et confirmé par le porteur du projet le 2026-07-26** — "j'ai accès et tout marche bien". |

## 9. Validation

**✅ Validé le 2026-07-26** par le porteur du projet, après test manuel des écrans (tableau, création, fiche complète — identité/parents/documents/historique, changement de classe, archivage/restauration, assistant d'import, paramètres de numérotation).
