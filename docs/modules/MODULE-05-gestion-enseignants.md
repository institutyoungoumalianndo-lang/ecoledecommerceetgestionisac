# Module 5 — Gestion des enseignants

**Statut** : ✅ **Terminé — validé le 2026-07-28** (conception validée — "OUI" ; parcours des écrans testé et confirmé par le porteur du projet — "oui c'est bon").
**Dépend de** : Module 2 (Paramètres généraux — filières/niveaux/classes/années/semestres, validé), Module 2.1 (Structure pédagogique — matières/affectations, validé).
**Source** : Chapitre 10 du cahier des charges (reçu le 2026-07-27), intitulé par vous "Module 9".

---

## 0. Note de numérotation

"Module 9" est déjà pris dans `ROADMAP.md` (Documents officiels — moteur PDF centralisé, non commencé, sans rapport avec les enseignants). En revanche, l'emplacement **"Module 5 — Professeurs & Emploi du temps"** (dépendances 2, 2.1, non commencé) est déjà réservé exactement pour ce domaine et n'a encore aucun contenu : je numérote donc ce chapitre **"Module 5"**.

Point à noter : ce chapitre couvre le **dossier administratif et pédagogique de l'enseignant** (identité, affectations, charge horaire, disponibilités, historique, recherche, tableau de bord) mais **pas** la génération de l'emploi du temps lui-même (créneaux, détection de conflits, calendrier visuel) — le §10.5 dit explicitement que les disponibilités saisies ici "seront utilisées **automatiquement par le module Emploi du temps**", au futur, comme un module séparé et distinct qui lira ces données. Je scinde donc la description originale du Module 5 ("Fiches professeurs, affectations, créneaux, détection de conflits") : ce chapitre livre la première moitié (fiches/affectations), la seconde moitié (créneaux/détection de conflits, calendrier) restera hors périmètre jusqu'à une demande explicite dédiée — probablement un futur "Module 5.1 — Emploi du temps", sur le même modèle que la scission Module 2 / Module 2.1.

## 1. Analyse fonctionnelle

### 1.1 Enseignant : entité autonome, pas un compte utilisateur

Comme `Student` (Module 4), l'enseignant est modélisé comme une fiche administrative indépendante (`teachers`), **pas** un compte `User` de connexion à l'application — rien dans ce chapitre ne demande qu'un enseignant se connecte au logiciel. Si un futur "portail enseignant" est demandé, il pourra relier un `Teacher` à un `User` optionnel sans redéfinir la fiche (même schéma d'extension additive que partout ailleurs).

### 1.2 Affectation pédagogique — réutilisation de `SubjectOffering` (Module 2.1), pas de duplication

Le §10.3 demande d'affecter un enseignant à une combinaison filière/niveau/classe/matière/semestre. Cette combinaison (hors classe précise) est **exactement** ce que représente déjà `SubjectOffering` (Module 2.1) : matière × année universitaire × semestre × niveau × filière optionnelle, avec ses volumes horaires et son coefficient. Réinventer un second ensemble de champs filière/niveau/matière/semestre sur l'enseignant dupliquerait une donnée déjà gouvernée par le module Structure pédagogique (violerait sa propre consigne de clôture : "Les affectations devront respecter les règles définies dans le module Structure pédagogique").

Je modélise donc `teacher_assignments` comme une table de liaison : `teacherId` + `subjectOfferingId` (porte déjà matière/année/semestre/niveau/filière/coefficient/volumes horaires) + `classId` (la classe précise au sein de ce niveau/filière — une `SubjectOffering` ne descend pas jusqu'à la classe, plusieurs classes pouvant partager le même niveau). C'est la même logique de table de liaison que `StudentGuardian` ou `student_enrollments`.

### 1.3 Charge horaire — jamais stockée, calculée depuis les affectations existantes

Le §10.4 demande heures/semaine, /mois, /semestre, /année, "déjà attribuées" et "encore disponibles". Aucune de ces valeurs n'est stockée : le volume hebdomadaire d'une affectation est déjà porté par sa `SubjectOffering` (`hoursCourse + hoursTd + hoursTp`) — la charge hebdomadaire d'un enseignant est la somme de ces volumes sur ses affectations actives d'un semestre donné. Les heures "encore disponibles" comparent cette somme à un **plafond hebdomadaire configurable par enseignant** (`weeklyHoursCapacity`, nullable = pas de plafond suivi). Mensuel/semestriel/annuel sont dérivés du nombre de semaines de chaque `AcademicPeriod` (`endDate`/`startDate`), jamais stockés non plus — même principe que le total de crédits d'UE (Module 2.1) ou l'écart budgétaire (Module 7) : "ne jamais stocker ce qui est calculable".

### 1.4 Disponibilités — deux natures distinctes

Le §10.5 mélange deux concepts de nature différente :
- des **créneaux hebdomadaires récurrents** ("jours de disponibilité, plages horaires") → `teacher_weekly_availabilities` (jour de semaine + heure début/fin).
- des **indisponibilités ponctuelles datées** ("indisponibilités, congés") → `teacher_leaves` (date début/fin + motif), qui ne se répètent pas chaque semaine.

Les deux tables sont de simples données de référence, consommées plus tard par le futur module Emploi du temps — ce module-ci ne fait que les saisir et les afficher, sans aucune logique de détection de conflit (hors périmètre, voir §0).

### 1.5 Dossier numérique et historique — réutilisation du modèle Étudiant + `audit_log`

Le §10.6 (dossier : diplômes, CV, contrats, évaluations, documents administratifs) reprend à l'identique le modèle `StudentDocument` (Module 4) : `teacher_documents` avec un type énuméré et upload via la route REST déjà générique. "Historique des affectations/cours/classes" : jamais une table séparée — `teacher_assignments` n'est **jamais supprimée physiquement** (uniquement désactivée), donc son historique complet reste nativement consultable, filtrable par année universitaire via sa `SubjectOffering`.

Le §10.7 (changements de statut, de fonction, modifications administratives) est déjà couvert par le journal d'audit transversal existant (`audit_log`, Module 1) sur chaque `UPDATE` de `teachers` — même principe que l'historique des tarifs (Module 4.2, "vue filtrée du journal d'audit existant, pas de table dupliquée"). Seules les **formations suivies** ("les formations suivies" au §10.7) sont une vraie donnée métier structurée (intitulé, organisme, dates, certificat) et non un simple changement de champ : elles méritent leur propre table, `teacher_trainings`.

"Historique des emplois du temps" (§10.6) restera vide tant que le futur module Emploi du temps n'existe pas — rien à construire ici (hors périmètre, voir §0).

### 1.6 Statut et type de contrat — référentiels configurables, pas des enums figés

Le §10.2 liste "Statut (Permanent, Vacataire, Contractuel, Visiteur, **etc.**)" — le "etc." signale explicitement une liste ouverte, extensible par l'administrateur. Je modélise donc `teacher_statuses` comme référentiel configurable (même schéma que `PaymentMethod`/`EnrollmentRegime`), seedé avec les 4 valeurs citées. "Type de contrat" n'a pas ce signal d'extensibilité dans le texte — je propose néanmoins le même traitement (référentiel configurable `teacher_contract_types`, seedé avec CDI/CDD/Vacation/Prestation) pour rester cohérent avec le principe déjà appliqué partout dans l'ERP ("référentiel configurable plutôt qu'énumération figée en dur") plutôt que de figer un choix arbitraire dans le code — à confirmer en §6.

### 1.7 Export PDF — pas de second moteur avant le Module 9 (Documents officiels)

Le §10.10 demande un "export PDF". Comme pour le reçu de paiement (Module 4.3, ADR-026) et les rapports financiers (Module 7), aucun moteur PDF n'est construit avant le futur Module 9 (Documents officiels, moteur centralisé). Ce module livre l'export CSV/Excel et l'impression navigateur (`window.print()`), déjà standard sur tous les tableaux de l'ERP (`DataTable`/`ServerDataTable`) — l'export PDF spécifique restera un placeholder documenté, comme précédemment.

### 1.8 Import Excel/CSV — non demandé explicitement

Contrairement aux chapitres Étudiants/Inscriptions/Matières, ce chapitre ne mentionne aucun assistant d'import en masse (seulement "export PDF, Excel et CSV" en sortie, §10.10). Je ne construis donc pas d'assistant d'import pour les enseignants dans cette première version, sauf si vous le souhaitez explicitement — voir §6.

### 1.9 Hors périmètre

| Élément | Couverture réelle |
|---|---|
| Créneaux, calendrier visuel, détection de conflits d'emploi du temps | Futur module dédié (Emploi du temps) — ce module ne fait que fournir les données de disponibilité qu'il consommera |
| Notes, présences, bulletins, charges de paie | Futurs modules qui **liront** `teachers`/`teacher_assignments` sans les redéfinir (consigne explicite de clôture du chapitre) |
| Export PDF réel | Placeholder jusqu'au futur Module 9 (Documents officiels), comme les reçus (Module 4.3) et rapports (Module 7) |
| Assistant d'import Excel/CSV | Non demandé explicitement dans ce chapitre — à confirmer en §6 |
| Compte de connexion enseignant (portail) | Non demandé ; fiche `Teacher` volontairement indépendante de `User`, extensible plus tard sans redéfinition |

---

## 2. Conception de la base de données

```
teacher_statuses (référentiel configurable — Permanent/Vacataire/Contractuel/Visiteur, extensible)
├── id, code (unique), label, is_active
└── created_at / updated_at

teacher_contract_types (référentiel configurable — CDI/CDD/Vacation/Prestation, extensible)
├── id, code (unique), label, is_active
└── created_at / updated_at

teachers (fiche enseignant — entité autonome, pas un compte User)
├── id, matricule (unique, généré via le moteur de numérotation généralisé — purpose ENSEIGNANT)
├── last_name, first_name, gender (enum Gender réutilisé), birth_date, birth_place, nationality, photo_path
├── address, city, phone_primary, phone_secondary, whatsapp, email
├── highest_degree, academic_grade, specialty, function, hire_date
├── contract_type_id → teacher_contract_types.id (nullable)
├── status_id → teacher_statuses.id (nullable)
├── weekly_hours_capacity (nullable — plafond hebdomadaire pour le calcul des heures "encore disponibles")
├── archived_at / archived_reason / archived_by (archivage réversible, même principe que Student)
└── created_at / updated_at

teacher_assignments (affectation pédagogique — table de liaison, jamais supprimée physiquement)
├── id, teacher_id → teachers.id
├── subject_offering_id → subject_offerings.id (porte déjà matière/année/semestre/niveau/filière/coefficient/volumes horaires — Module 2.1)
├── class_id → classes.id (classe précise au sein du niveau/filière de la subject_offering)
├── is_active
└── created_at / updated_at
   (charge horaire de l'affectation = subject_offerings.hours_course + hours_td + hours_tp, jamais dupliquée ici)

teacher_weekly_availabilities (créneaux hebdomadaires récurrents)
├── id, teacher_id → teachers.id
├── day_of_week (enum lundi..dimanche), start_time, end_time
└── created_at / updated_at

teacher_leaves (indisponibilités ponctuelles / congés — datés, non récurrents)
├── id, teacher_id → teachers.id
├── start_date, end_date, reason (nullable)
└── created_at / updated_at

teacher_trainings (formations suivies — donnée structurée, pas un simple log d'audit)
├── id, teacher_id → teachers.id
├── title, institution (nullable), start_date, end_date (nullable), certificate_path (nullable)
└── created_at / updated_at

teacher_documents (dossier numérique — même modèle que student_documents)
├── id, teacher_id → teachers.id
├── type (enum : DIPLOME, CV, CONTRAT, EVALUATION, CARTE_IDENTITE_PASSEPORT, AUTRE)
├── label (nullable), file_path, file_name, mime_type, file_size_bytes, uploaded_by → users.id (nullable)
└── created_at / updated_at
```

**Aucune table existante modifiée.** Extension additive : `NumberingPurpose` gagne la valeur `ENSEIGNANT` (7ᵉ réutilisation du moteur de numérotation généralisé, après matricule étudiant/inscription/reçu/écriture comptable/dépense). Réutilisations : `SubjectOffering` (Module 2.1, jamais redéfinie), `Class`/`Filiere`/`Level`/`AcademicYear`/`AcademicPeriod` (Module 2), `Gender` (enum existant), `audit_log` (Module 1), route REST d'upload générique déjà existante (Module 4).

---

## 3. Règles métier

1. **Enseignant = entité autonome** : aucun lien obligatoire avec `User` ; suppression toujours logique (archivage réversible, jamais physique), même principe que `Student`.
2. **Affectation pédagogique = liaison, pas de duplication** : `teacher_assignments` référence une `SubjectOffering` existante (Module 2.1) plutôt que de recopier matière/année/semestre/niveau/filière ; la validation de cohérence (matière bien offerte à ce niveau/filière/semestre) est donc automatiquement garantie par la `SubjectOffering` elle-même.
3. **Charge horaire jamais stockée** : toujours recalculée à la demande depuis les affectations actives de l'enseignant pour la période concernée (semaine/mois/semestre/année), jamais désynchronisable.
4. **Disponibilités = deux tables distinctes** : créneaux hebdomadaires récurrents (`teacher_weekly_availabilities`) vs indisponibilités ponctuelles datées (`teacher_leaves`) — aucune logique de détection de conflit dans ce module (hors périmètre, futur module Emploi du temps).
5. **Historique jamais supprimé** : `teacher_assignments` désactivées jamais supprimées ; changements de statut/fonction/informations administratives captés automatiquement par `audit_log` ; formations suivies dans leur propre table (`teacher_trainings`), jamais supprimées.
6. **Statut et type de contrat = référentiels configurables**, jamais un enum figé en dur — cohérent avec `PaymentMethod`/`EnrollmentRegime`/`FeeType`.
7. **Sécurité** : `ENSEIGNANTS:*` pour la fiche, `ENSEIGNANTS_DOCUMENTS:*` pour le dossier numérique, `ENSEIGNANTS_AFFECTATIONS:*` pour les affectations pédagogiques. Toutes les opérations journalisées dans `audit_log` (existant, aucune nouvelle infrastructure).
8. **Export PDF** : placeholder documenté jusqu'au futur Module 9 (Documents officiels) — CSV/Excel/impression disponibles immédiatement via les composants partagés existants.

## 4. UI/UX

- Nouvelle section **"Enseignants"** dans la navigation principale (permission `ENSEIGNANTS:LECTURE`) : tableau paginé/trié/recherché côté serveur (`ServerDataTable`, réutilisé), filtres (statut, spécialité, filière, niveau, matière), export CSV/Excel, impression.
- **Fiche enseignant** à onglets, sur le modèle de la fiche étudiant : Identité/Coordonnées/Informations professionnelles, Affectations pédagogiques (par année universitaire), Charge horaire (barres de progression semaine/mois/semestre/année vs plafond configuré), Disponibilités (créneaux hebdomadaires + congés), Formations, Documents, Historique (vue filtrée de `audit_log`).
- **Tableau de bord Enseignants** : effectif total, répartition par statut (permanent/vacataire/contractuel/etc.), répartition par spécialité, charge horaire moyenne, disponibilité — même style de cartes colorées et barres CSS que les tableaux de bord déjà livrés (Module 4.1, Module 2.1), sans nouvelle bibliothèque de graphiques (cohérent avec ADR-030).
- Recherche instantanée transverse (matricule/nom/prénom/matière/filière/niveau/spécialité/téléphone).
- Nouvelle sous-section **"Statuts"** et **"Types de contrat"** dans Paramètres, pour administrer ces deux référentiels configurables (même schéma d'écran que les modes de paiement du Module 4.3).

## 5. Permissions

| Code | Usage |
|---|---|
| `ENSEIGNANTS:LECTURE`/`CREATION`/`MODIFICATION`/`SUPPRESSION`/`EXPORT`/`IMPRESSION` | Fiche enseignant |
| `ENSEIGNANTS:ADMINISTRATION` | Gestion des référentiels Statuts / Types de contrat |
| `ENSEIGNANTS_AFFECTATIONS:LECTURE`/`CREATION`/`MODIFICATION`/`SUPPRESSION` | Affectations pédagogiques, disponibilités, congés |
| `ENSEIGNANTS_DOCUMENTS:LECTURE`/`CREATION`/`MODIFICATION`/`SUPPRESSION` | Dossier numérique (documents, formations) |

## 6. Points ouverts — merci de valider avant les migrations

1. **Numérotation "Module 5"** (§0) et périmètre réduit (fiches/affectations/disponibilités, sans le moteur d'emploi du temps lui-même) : d'accord ?
2. **Schéma proposé** (§2) : `teachers`, `teacher_assignments` (réutilisant `SubjectOffering` du Module 2.1), `teacher_weekly_availabilities`, `teacher_leaves`, `teacher_trainings`, `teacher_documents`, `teacher_statuses`, `teacher_contract_types`. D'accord pour lancer les migrations sur cette base ?
3. **Type de contrat en référentiel configurable** (§1.6), comme le statut, plutôt qu'un enum figé (CDI/CDD/Vacation/Prestation) : confirmez-vous, ou préférez-vous un enum simple puisque le texte ne signale pas explicitement l'extensibilité pour ce champ ?
4. **Aucun assistant d'import Excel/CSV** pour cette première version (§1.8), le chapitre n'en demandant pas explicitement : confirmez-vous, ou souhaitez-vous que j'en ajoute un (même modèle que Matières/Étudiants) ?
5. **Plafond d'heures hebdomadaire par enseignant** (`weekly_hours_capacity`, §1.3) pour calculer les heures "encore disponibles" : champ optionnel saisi sur la fiche enseignant, laissé vide = pas de suivi de disponibilité horaire pour cet enseignant. D'accord ?

---

## 7. Développement et tests

| Étape | Résultat |
|---|---|
| Migration Prisma (`teachers`, `teacher_statuses`, `teacher_contract_types`, `teacher_assignments`, `teacher_weekly_availabilities`, `teacher_leaves`, `teacher_trainings`, `teacher_documents` + `NumberingPurpose.ENSEIGNANT`) | ✅ Appliquée (technique non interactive habituelle : `migrate diff` → dossier de migration manuel → `migrate deploy` → `generate`) |
| Seed (4 statuts, 4 types de contrat, 15 permissions `ENSEIGNANTS*`/`ENSEIGNANTS_AFFECTATIONS*`/`ENSEIGNANTS_DOCUMENTS*`) | ✅ Appliqué (153 permissions au total) |
| `packages/shared` (schémas Zod : `teacher`, `teacherStatus`, `teacherContractType`, `teacherAssignment`, `teacherAvailability`, `teacherTraining`, `teacherDocument`, `teacherDashboard`) | ✅ |
| `packages/api` (`teacherService`, `teacherStatusService`, `teacherContractTypeService`, `teacherAssignmentService` — charge horaire calculée via `computeWorkloadFromPeriods`, fonction pure testée séparément —, `teacherAvailabilityService`, `teacherTrainingService`, `teacherDocumentService`, `teacherDashboardService` ; 8 routers composés ; `matriculeService` étendu (`generateTeacherNumber`, 7ᵉ réutilisation du moteur de numérotation)) | ✅ |
| `apps/desktop` : section "Enseignants" (tableau de bord, liste transverse, fiche à onglets — Identité, Affectations & charge horaire, Disponibilités, Formations, Documents, Historique), sous-section "Enseignants" dans Paramètres (Statuts, Types de contrat) | ✅ |
| Tests unitaires (calcul de charge horaire — semaine/mois/semestre/année depuis les affectations actives) | ✅ 5 tests supplémentaires, tous verts (67 au total sur `packages/api`) |
| Lint / typecheck / build sur les 5 packages | ✅ Tous verts |
| Vérification de bout en bout contre PostgreSQL réel (matricule généré via le moteur de numérotation, affectation réutilisant une `SubjectOffering` existante sans duplication, doublon d'affectation rejeté, classe d'un niveau différent rejetée, charge horaire/plafond/heures disponibles calculés correctement pour le semestre en cours, créneau de disponibilité invalide rejeté, congé créé, formation et document rattachés au dossier, archivage puis restauration réversibles, tableau de bord calculé) | ✅ Toutes les vérifications passées, données de test nettoyées |
| Démarrage réel du serveur API + appel HTTP/tRPC non authentifié sur `teachers.list` | ✅ Rejeté proprement en 401, aucune erreur de démarrage |

## 8. Validation

Conception validée le 2026-07-27 ("OUI"). Développement terminé et vérifié techniquement (§7) le 2026-07-27. Parcours des écrans de la section "Enseignants" et de sa sous-section dans Paramètres testé manuellement et confirmé par le porteur du projet le 2026-07-28 ("oui c'est bon"), après correction de deux anomalies détectées lors du test (formulaire "Nouvel employé" — voir MODULE-08 §8 — et recherche d'employé par matricule d'enseignant lié). **Module 5 validé.**

---

## 9. Révisions post-validation (2026-08-08/09)

1. **Bouton "Réaffecter"** sur chaque affectation active (onglet "Affectations & charge horaire") — retour du porteur du projet : *"une méthode pour réaffecter un prof du Module 1 vers le Module 2, avec aussi la possibilité de changer les matières les heures les niveaux etc"*. Ouvre le même formulaire que "Nouvelle affectation", pré-rempli avec les valeurs actuelles (année/module/niveau/matière/classe) mais tous les champs restent modifiables. À la validation, la nouvelle affectation est créée d'abord ; seulement en cas de succès, l'ancienne est désactivée (jamais l'inverse, pour ne jamais la perdre si la création échoue). `TeacherAssignmentDto` expose désormais `academicYearId`/`periodId`/`levelId`/`subjectId` (repris de la `SubjectOffering` liée) pour permettre ce pré-remplissage.

2. **Deux garde-fous ajoutés dans `teacherAssignmentService.ts`/`academicPeriodService.ts`**, suite à un cas réel observé en test (charge horaire "Par semaine/mois/semestre" à 0h malgré un vrai créneau au calendrier, "Par année" gonflée à 1206.9h) :
   - Une affectation vers une `SubjectOffering` dont le volume horaire déclaré (cours+TD+TP) est resté à 0 est désormais rejetée à la création, avec un message renvoyant vers Réglages → Matières.
   - La création/modification d'un module (`AcademicPeriod`) est désormais rejetée si ses dates chevauchent un autre module de la même année universitaire, ou sortent des bornes (`startDate`/`endDate`) de cette année. Nouvelles fonctions pures testées : `findOverlappingPeriod`, `isPeriodWithinAcademicYear` (`academicPeriodService.ts`).

   Cause racine du cas observé : deux modules ("Module 1" 01/04→28/06/2026, "Module 2" 01/04→30/08/2026) se chevauchaient entièrement et débordaient tous deux des bornes réelles de l'année universitaire (05/10/2026→30/06/2027), combiné à une affectation "Cuisine" orpheline à 0h sur Module 2 côtoyant la vraie affectation (48h/semaine, créneau réel) sur Module 1. La formule de calcul de charge horaire elle-même (`computeWorkloadFromPeriods`) n'était pas en cause.

   Vérifié : 182 tests API (dont 6 nouveaux) sans régression, `typecheck` + `build` de `packages/api`/`apps/desktop` propres.

---

*Module 5 terminé et validé.*
