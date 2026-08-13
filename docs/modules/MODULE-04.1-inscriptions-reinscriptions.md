# Module 4.1 — Inscriptions et réinscriptions

**Statut** : ✅ **Terminé — validé le 2026-07-27**
**Dépend de** : Module 0 (validé), Module 1 (validé), Module 2 (validé), Module 4 (validé — Étudiants, table `student_enrollments`).
**Source** : Chapitre 5 du cahier des charges (reçu le 2026-07-26), intitulé par vous "Module 4". Voir §0 ci-dessous pour la note de numérotation.

---

## 0. Note de numérotation

Votre Chapitre 5 est titré "MODULE 4 – Gestion des inscriptions et réinscriptions". Comme pour le Chapitre 4, ce nom entre en collision avec la numérotation déjà utilisée dans `ROADMAP.md` (Module 4 = Étudiants, déjà validé). Ce contenu n'avait pas non plus d'emplacement dédié dans la roadmap initiale — l'inscription y était implicitement traitée comme une sous-partie du Module Étudiants. Je l'ajoute donc comme un **module intercalaire "Module 4.1"**, entre le Module 4 (Étudiants) et le Module 5 (Professeurs), sans renuméroter en cascade les modules suivants (même politique qu'au Chapitre 4, voir `MODULE-04-etudiants.md` §0 et ADR-011). Dites-moi si vous préférez que je renumérote tout à l'inverse.

---

## 1. Analyse fonctionnelle

### 1.1 Relation avec le Module 4 (Étudiants) — point structurant

Le Module 4 a déjà posé les fondations de ce module : la table `student_enrollments` (une ligne = un étudiant × une année universitaire) est **déjà** la source unique de l'affectation courante et de l'historique académique (ADR-014), et sert déjà à la création du premier dossier d'un étudiant (assistant de création = "nouvelle inscription" implicite) ainsi qu'au changement de classe en cours d'année.

Ce module **étend** cette même table plutôt que d'en créer une parallèle (ce qui dupliquerait la logique d'historique déjà construite et validée, contraire au principe n°6 de `ARCHITECTURE_MASTER.md`) :
- Le formulaire de création d'étudiant du Module 4 **devient** l'assistant "Nouvelle inscription" du §5.2 pour un étudiant qui n'existe pas encore — je lui ajoute les champs manquants (régime, numéro d'inscription).
- La **réinscription** (§5.3) est une opération nouvelle : créer, pour un étudiant **existant**, une nouvelle ligne `student_enrollments` pour une **nouvelle** année universitaire (impossible aujourd'hui : le Module 4 ne permet que de modifier l'inscription de l'année **active** via "Changer de classe", jamais d'en créer une nouvelle pour une autre année).
- Le "changement de filière/niveau/classe" en cours d'année, déjà couvert par le Module 4, n'est pas redéveloppé ici.

### 1.2 Nouvelle inscription vs réinscription — un seul mécanisme sous-jacent

Après analyse de votre §5.2 et §5.3, les deux ne sont, techniquement, qu'une seule opération : "créer une inscription pour un étudiant (nouveau ou existant) sur une année universitaire donnée", avec deux points d'entrée UI différents :
- **Nouvelle inscription** : l'assistant permet de choisir "étudiant existant" (recherche par matricule/nom) ou "nouvel étudiant" (ouvre le formulaire de création du Module 4). Dans les deux cas, l'étape suivante est identique : année/filière/niveau/classe/régime/date.
- **Réinscription** : raccourci pour un étudiant existant, pré-rempli avec les valeurs de sa **dernière inscription connue** (filière/niveau reconduits par défaut, modifiables) — "récupérer son dossier sans ressaisie" (§5.3) signifie que l'identité/coordonnées ne sont jamais redemandées, seules les informations académiques de la nouvelle année le sont.

### 1.3 Numéro d'inscription vs matricule

Le matricule (Module 4) est **permanent**, attribué une seule fois à la création de l'étudiant, jamais recalculé. Le **numéro d'inscription** (§5.4) est **distinct** : généré à **chaque** inscription/réinscription (donc porté par `student_enrollments`, pas par `students`), avec son propre gabarit configurable. Je réutilise le même moteur de gabarit que le Module 4 (ADR-015), étendu pour servir aux deux usages (§2.3).

### 1.4 Frais d'inscription — pas de calcul financier dupliqué (§5.6)

Le Module 7 (Finances/Paiements) n'existe pas encore. Ce module se limite à :
- afficher un montant attendu (champ simple, saisi ou dérivé d'un futur barème du Module 7 — pour l'instant, un champ éditable manuellement) ;
- stocker un statut de paiement (Non payé / Partiellement payé / Totalement payé) comme **simple indicateur affiché**, pas comme calcul ;
- prévoir la structure pour que le Module 7, une fois construit, devienne la source de vérité réelle (mise à jour de ce statut) sans migration destructive.

### 1.5 Contrôle des conditions (§5.5) — portée proposée

- **Même année, déjà inscrit** : déjà garanti par la contrainte `UNIQUE(student_id, academic_year_id)` existante (Module 4).
- **Capacité de classe** : `classes.max_capacity` existe déjà (Module 2) mais n'est **vérifié nulle part** actuellement. Ce module ajoute le contrôle, activable/désactivable globalement (§2.4).
- **Documents obligatoires** : aucune notion de document "obligatoire" n'existe aujourd'hui (Module 4 traite tous les types de la même façon). Ce module ajoute une configuration "ce type de document est-il requis pour valider une inscription ?" (§2.4), désactivée par défaut sur tous les types pour ne rien bloquer rétroactivement.
- **Conditions administratives diverses** : le cahier des charges reste vague ("éventuelles conditions administratives") — je ne modélise rien de plus que les deux points ci-dessus tant qu'aucune règle précise n'est communiquée ; point ouvert (§6).

### 1.6 Impression (§5.10)

Comme pour le Module 4 (§1.9 de son document), le vrai moteur de documents centralisé (logos/signatures/cachet appliqués automatiquement) est le Module 9. Ce module propose, pour l'instant, une **fiche d'inscription imprimable simple** (résumé à l'écran + impression navigateur), sans gabarit visuel avancé. Le "reçu d'inscription" dépend du Module 7 (non construit) — bouton absent tant que ce module n'existe pas. "Certificat de scolarité" et "attestation d'inscription" correspondent aux types `CERTIFICAT`/`ATTESTATION` déjà déclarés au Module 2 (`document_type`) — leur génération réelle reste au Module 9.

### 1.7 Portée non couverte par ce module

| Élément mentionné | Couverture |
|---|---|
| Reçu d'inscription | Module 7 — Finances (non démarré) |
| Calcul des frais, barème par filière/niveau | Module 7 — Finances |
| Rendu PDF réel des documents (fiche, certificat, attestation) | Module 9 — Documents officiels |

---

## 2. Conception de la base de données (validée et implémentée)

### 2.1 Schéma proposé

```
student_enrollments (TABLE EXISTANTE DU MODULE 4 — étendue, pas recréée)
├── ... colonnes existantes (student_id, academic_year_id, class_id, filiere_id, level_id, status, decision, annual_average, mention, enrollment_date) ...
├── + regime_id            → enrollment_regimes.id (nullable — rétrocompatibilité des lignes déjà créées avant ce module)
├── + registration_number  (nullable, unique — numéro d'inscription généré, distinct du matricule)
├── + fee_amount_expected  (nullable — simple indicateur, pas un calcul, en attente du Module 7)
├── + payment_status       (NON_PAYE | PARTIELLEMENT_PAYE | TOTALEMENT_PAYE, nullable — indicateur affiché, source de vérité future = Module 7)
├── + cancelled_at, cancelled_reason, cancelled_by → users.id (annulation réversible dans l'esprit du Module 4 : jamais de suppression physique d'une inscription)
└── (aucune colonne existante retirée ni renommée)

enrollment_regimes (nouveau référentiel configurable, même esprit que `levels` du Module 2)
├── id, code, label, is_active
└── created_at / updated_at
   (seedé avec NORMAL et PROFESSIONNEL par défaut, extensible depuis Paramètres — pas de liste figée en dur)

enrollment_settings (singleton)
├── id, enforce_class_capacity (booléen, défaut false)
└── updated_at

enrollment_document_requirements (une ligne par type de document)
├── id, document_type (référence l'enum StudentDocumentType du Module 4), is_required (défaut false)
└── updated_at

student_number_sequences / student_numbering_settings (TABLES EXISTANTES DU MODULE 4 — étendues)
├── + purpose (MATRICULE | INSCRIPTION) ajouté aux deux tables
├── contrainte d'unicité de student_number_sequences : (purpose, scope_key) au lieu de (scope_key) seul
└── student_numbering_settings devient une ligne par purpose au lieu d'un singleton unique
   (réutilise le même moteur de gabarit/compteur atomique que le matricule — voir §1.3 — plutôt que dupliquer la logique)
```

### 2.2 Pourquoi étendre `student_enrollments` plutôt que créer une table `inscriptions` séparée

Une table séparée dupliquerait exactement les mêmes données (étudiant, année, classe, filière, niveau) déjà présentes dans `student_enrollments`, avec le risque de désynchronisation entre les deux, et casserait la garantie "une ligne = l'historique complet" du Module 4 (ADR-014). Ajouter des colonnes à la table existante est une évolution additive (aucune colonne supprimée, migration non destructive), cohérente avec le principe de conception affiché dès le départ par votre cahier des charges pour ce module ("s'intégrer parfaitement avec le module Étudiants").

### 2.3 Numéro d'inscription — réutilisation du moteur de gabarit du Module 4

Plutôt que de dupliquer `matriculeService` (gabarit + compteur atomique verrouillé en transaction), j'ajoute un discriminant `purpose` aux deux tables qui le portent déjà (`student_number_sequences`, `student_numbering_settings`), et la même fonction de rendu de gabarit et de verrouillage sert aux deux numéros. C'est un changement **additif** sur des tables déjà validées au Module 4 — je le signale explicitement ici plutôt que de le faire silencieusement, puisque le Module 4 est déjà clos.

### 2.4 Nouveaux réglages, tous par défaut "non bloquants"

- `enforce_class_capacity = false` par défaut : le contrôle de capacité (§1.5) reste désactivé tant que vous ne l'activez pas explicitement dans Paramètres, pour ne rien casser sur les données déjà créées au Module 4.
- Toutes les lignes de `enrollment_document_requirements` sont `is_required = false` par défaut (aucun document n'est obligatoire tant que vous ne l'activez pas).

---

## 3. Règles métier

1. **Nouvelle inscription (étudiant existant)** : vérifie qu'aucune inscription n'existe déjà pour (étudiant, année) [contrainte déjà existante] ; si `enforce_class_capacity` est actif, compte les inscriptions non annulées de la classe cible et bloque si `max_capacity` est atteint ; si des types de documents sont marqués obligatoires, vérifie leur présence pour cet étudiant et alerte (bloquant) si manquants ; génère le numéro d'inscription (gabarit configurable, purpose=INSCRIPTION) ; statut initial `NOUVEAU`.
2. **Nouvelle inscription (nouvel étudiant)** : délègue à la création d'étudiant du Module 4 (matricule généré comme avant), en ajoutant régime + numéro d'inscription à la première ligne `student_enrollments` créée.
3. **Réinscription** : même contrôle qu'au point 1, avec pré-remplissage filière/niveau/classe à partir de la dernière inscription connue de l'étudiant (modifiable) ; statut par défaut `ANCIEN` (ou `REDOUBLANT` si l'utilisateur le précise, cohérent avec l'enum déjà existant `EnrollmentStatus` du Module 4 — pas de nouvel enum nécessaire).
4. **Annulation** (`cancelled_at`/`cancelled_reason`/`cancelled_by`) : jamais de suppression physique, réversible (comme l'archivage d'un étudiant) ; une inscription annulée ne compte plus dans le calcul de capacité de classe ni dans les tableaux de bord d'effectifs, mais reste visible dans l'historique.
5. **Frais d'inscription** : `fee_amount_expected`/`payment_status` sont des champs d'affichage, modifiables manuellement tant que le Module 7 n'existe pas ; aucun calcul (remise, échéancier...) n'est fait ici.
6. **Numéro d'inscription** : jamais recalculé après génération, comme le matricule.
7. **Régimes** : liste configurable (`enrollment_regimes`), gérée comme les niveaux/filières du Module 2 (Paramètres) — désactivation logique, jamais de suppression si utilisée par une inscription existante.
8. **Sécurité** : permissions dédiées (§5), vérifiées côté serveur, contournées uniquement par SUPER_ADMIN.
9. **Audit** : toute création/modification/annulation d'inscription journalisée dans `audit_log` (infrastructure du Module 1, réutilisée).
10. **Import** : même logique que l'import d'étudiants du Module 4 (validation puis exécution ligne par ligne, doublons détectés avant écriture) — mais pour des étudiants **déjà existants** (recherchés par matricule), avec les mêmes contrôles de capacité/documents qu'une réinscription unitaire.

---

## 4. Conception UI/UX

- **Assistant "Nouvelle inscription"** : étape 1 (rechercher un étudiant existant OU créer un nouvel étudiant — réutilise le formulaire du Module 4), étape 2 (année/filière/niveau/classe/régime/date, avec alerte immédiate si capacité atteinte ou document manquant), étape 3 (confirmation + numéro d'inscription généré).
- **Écran "Réinscrire"** : accessible depuis la fiche étudiant (nouveau bouton à côté de "Changer de classe") et depuis un écran dédié "Réinscriptions en masse" pour l'année en cours — pré-rempli, validation identique.
- **Onglet "Historique académique"** de la fiche étudiant (Module 4) : enrichi pour afficher régime, numéro d'inscription, statut de paiement, et un badge "Annulée" le cas échéant, plutôt qu'un nouvel onglet séparé (cohérent avec §1.1).
- **Tableau de bord des inscriptions** (§5.8) : nouvel écran, cartes de synthèse (nouvelles inscriptions, réinscriptions, effectifs par classe/filière/niveau, répartition par sexe) filtrable par année universitaire.
- **Écran "Inscriptions"** (liste transverse, différente du tableau "Étudiants" du Module 4) : recherche/filtres (matricule, nom, prénom, année, classe, filière, niveau, statut de paiement, statut d'inscription), tri, pagination côté serveur (réutilise `ServerDataTable`), export CSV/Excel, impression.
- **Assistant d'import** : même schéma en 3 étapes que l'import d'étudiants du Module 4.
- **Paramètres** : nouvelle section "Inscriptions" dans le `SettingsShell` existant — régimes (CRUD), gabarit du numéro d'inscription (réutilise l'écran de numérotation du Module 4 avec un sélecteur de "purpose"), activation du contrôle de capacité, liste des documents obligatoires (cases à cocher par type).

---

## 5. Permissions proposées

| Code | Usage |
|---|---|
| `INSCRIPTIONS:LECTURE` | Consulter la liste/le tableau de bord des inscriptions |
| `INSCRIPTIONS:CREATION` | Nouvelle inscription, réinscription |
| `INSCRIPTIONS:MODIFICATION` | Modifier une inscription (régime, statut de paiement...) |
| `INSCRIPTIONS:SUPPRESSION` | Annuler une inscription |
| `INSCRIPTIONS:IMPRESSION` | Imprimer la fiche d'inscription / le tableau |
| `INSCRIPTIONS:EXPORT` | Exporter CSV/Excel |
| `INSCRIPTIONS:ADMINISTRATION` | Régimes, numérotation, capacité, documents obligatoires |
| `INSCRIPTIONS_IMPORT:CREATION` | Lancer l'assistant d'import |
| `INSCRIPTIONS_IMPORT:VALIDATION` | Confirmer l'exécution d'un import |

---

## 6. Points à valider avant migrations et développement

1. Le module s'appelle **"Module 4.1 — Inscriptions et réinscriptions"**, inséré entre le Module 4 et le Module 5 sans renumérotation en cascade (§0).
2. **Extension additive de `student_enrollments`** (régime, numéro d'inscription, frais/statut de paiement, annulation) plutôt qu'une table séparée (§2.2).
3. **Généralisation du moteur de numérotation du Module 4** (`purpose` MATRICULE/INSCRIPTION ajouté à `student_number_sequences`/`student_numbering_settings`, déjà validées) pour porter aussi le numéro d'inscription, plutôt qu'une seconde infrastructure dupliquée (§2.3).
4. **Régimes d'inscription** modélisés comme référentiel configurable (`enrollment_regimes`, type "Niveaux") plutôt qu'une liste figée en dur (§2.1).
5. Contrôle de capacité de classe et documents obligatoires **désactivés par défaut** (aucun impact rétroactif sur les données déjà créées au Module 4), activables depuis Paramètres (§2.4).
6. Frais/statut de paiement = **champs d'affichage manuels** pour l'instant, aucun calcul, en attendant le Module 7 (§1.4).
7. "Reçu d'inscription" non disponible tant que le Module 7 n'existe pas ; "fiche d'inscription" = impression simple navigateur pour l'instant, vrai moteur de documents au Module 9 (§1.6).
8. "Conditions administratives" au-delà de capacité/documents non modélisées, faute de règle précise communiquée (§1.5) — à clarifier si vous en avez de spécifiques en tête.

**✅ Tous ces points ont été validés par le porteur du projet le 2026-07-27.**

---

## 7. Développement

Réalisé conformément aux §2/§3/§4 :
- Schéma Prisma étendu (7 nouveaux champs sur `student_enrollments`, 3 nouvelles tables `enrollment_regimes`/`enrollment_settings`/`enrollment_document_requirements`, généralisation `purpose` de `student_number_sequences`/`student_numbering_settings`) et migrations appliquées (`module4_1_inscriptions`, générée via `prisma migrate diff` + `migrate deploy` pour rester non interactive, puis vérifiée par `prisma migrate status`).
- Seed : 2 régimes par défaut (Normal, Professionnel), 9 permissions `INSCRIPTIONS*`/`INSCRIPTIONS_IMPORT*`, ligne singleton `enrollment_settings` (capacité désactivée), lignes `enrollment_document_requirements` pour chaque type de document (toutes non obligatoires par défaut), migration de la ligne `student_numbering_settings` existante vers `purpose=MATRICULE` + nouvelle ligne `purpose=INSCRIPTION`.
- `packages/shared` : schémas Zod (`enrollmentRegime`, `enrollmentSettings`, `enrollment`), extension de `studentEnrollment`/`student` (régime, numéro d'inscription, paiement, annulation) et de `studentNumbering` (discriminant `purpose`).
- `packages/api` : `matriculeService` généralisé (fonctions `generateMatricule`/`generateRegistrationNumber` partageant le même moteur de gabarit/compteur), `createEnrollmentRow` factorisée dans `studentEnrollmentService` et réutilisée par la création d'étudiant (Module 4) et les nouvelles inscriptions (Module 4.1), `enrollmentService` (contrôle des conditions, création, annulation, liste transverse paginée, tableau de bord), `enrollmentRegimeService`, `enrollmentSettingsService`, `enrollmentImportService` ; routers tRPC correspondants (`enrollments`, `enrollmentRegimes`, `enrollmentSettings`, `enrollmentImport`, `enrollmentNumbering`) + extension de `studentEnrollments` (`updatePayment`).
- `apps/desktop` : bouton "Réinscrire" sur la fiche étudiant, onglet Historique académique enrichi (régime, n° d'inscription, paiement modifiable, annulation), module "Inscriptions" dédié (tableau de bord, liste transverse avec `ServerDataTable`, assistant de nouvelle inscription/réinscription avec contrôle des conditions en direct, assistant d'import), nouvelle section "Inscriptions" dans les Paramètres (régimes, capacité/documents obligatoires, numérotation).
- Retour visuel du porteur du projet (2026-07-27) : jeux de couleur ajoutés au tableau de bord des inscriptions (cartes statistiques colorées par pertinence, listes de répartition à puces/badges colorés) et bandes zébrées légèrement colorées sur **toutes** les lignes paires de **tous** les tableaux de l'application — appliqué une fois dans les composants partagés `DataTable`/`ServerDataTable` (`packages/ui`), donc rétroactif sur les tableaux déjà livrés (Modules 1/2/4) et automatique pour tous les tableaux futurs.

## 8. Tests

| Test | Résultat |
|---|---|
| Tests unitaires (`normalizeStatus` de l'import d'inscriptions) | ✅ 3 tests, tous verts (32 au total sur `packages/api` avec ceux du Module 4) |
| Lint / typecheck / build sur les 5 packages | ✅ Tous verts |
| Vérification de bout en bout contre PostgreSQL réel (création avec régime + numéro d'inscription distinct du matricule, contrôle de capacité, contrôle des documents obligatoires, réinscription vers une nouvelle année, blocage d'un doublon d'année, annulation réversible, tableau de bord, aperçu de numérotation) | ✅ Toutes les vérifications passées, données de test nettoyées |
| Parcours des écrans par le porteur du projet | ✅ **Testé et confirmé par le porteur du projet le 2026-07-27** — "OUI" (après ajustement des couleurs du tableau de bord et du zébrage des tableaux). |

## 9. Validation

**✅ Validé le 2026-07-27** par le porteur du projet, après test manuel des écrans (inscription, réinscription, tableau de bord, liste, annulation, paiement, import, paramètres) et ajustement visuel (couleurs).
