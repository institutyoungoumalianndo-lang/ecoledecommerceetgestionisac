# Module 5.2 — Emploi du temps et pointage pédagogique

**Statut** : 🟠 **Développé (2026-07-29) — en attente du test manuel des écrans par le porteur du projet** (conception validée le 2026-07-28). Points bloquants tranchés par le porteur du projet : (1) refonte d'architecture confirmée, (2) génération automatique optimisée différée, création manuelle et assistée avec détection de conflits en direct livrée dans cette version. Point 5 (heures supplémentaires/plafond mensuel) reste sans règle précisée — champs de configuration livrés mais **aucun calcul automatique tant que la règle exacte n'est pas fournie** (voir §7).
**Dépend de** : Module 2 (structure académique), Module 2.1 (`Subject`/`SubjectOffering`), Module 4 (`Student`), Module 5 (`Teacher`, `TeacherAssignment`), Module 5.1 (pointage — **révisé en profondeur par ce chapitre**, voir §0), Module 6 (Notes — communication annoncée par le chapitre, non requise techniquement), Module 8 (Paie).
**Source** : Chapitre 12 du cahier des charges (reçu le 2026-07-28), intitulé par vous "12 — GESTION INTELLIGENTE DES EMPLOIS DU TEMPS ET POINTAGE PÉDAGOGIQUE". Toutes les sous-sections (§12.1 à §12.17) ont été transmises.

---

## 0. Notes de numérotation et de périmètre — À LIRE EN PREMIER

### 0.1 Numérotation

"Module 12" est déjà pris dans `ROADMAP.md` (**Communication** — Email, WhatsApp, SMS, notifications internes — un domaine sans rapport). Ce chapitre porte sur l'emploi du temps et le pointage pédagogique, un prolongement direct du Module 5 (Gestion des enseignants) et surtout du **Module 5.1** (Créneaux hebdomadaires et fiche de pointage), qu'il vient réviser en profondeur (voir §0.2). Je numérote donc ce chapitre **Module 5.2**, sur le même principe que 2.1/4.1-4.3/5.1 (sous-module d'un domaine déjà numéroté).

### 0.2 Point le plus important : ce chapitre révise le Module 5.1, il ne s'y ajoute pas simplement

Le Module 5.1 (livré et actuellement en attente de votre test manuel) a résolu, **par une solution volontairement minimale**, le même problème de fond que ce chapitre traite en profondeur :

- ADR-038 documentait explicitement : *"solution minimale... substitut réduit à un véritable moteur 'Emploi du temps'"* et annonçait qu'un futur chapitre dédié pourrait la remplacer.
- Le Module 5.1 utilise `teacher_weekly_slots` : un créneau récurrent (jour/heure/salle en texte libre) **rattaché à une seule affectation** (`teacher_assignment` = un enseignant × une matière × **une seule classe**). **Aucune détection de conflit. Aucune notion de salle réelle (capacité). Aucune possibilité native de cours mutualisé** (un même créneau ne peut pas couvrir plusieurs classes à la fois).

Ce chapitre demande précisément ce que le Module 5.1 avait mis de côté : détection de conflits (§12.4), salles réelles avec capacité (§12.7), et surtout les **cours mutualisés/tronc commun** (§12.5/§12.6/§12.11) — un cas que l'architecture actuelle de `teacher_weekly_slots`/`teacher_assignments` **ne peut pas représenter sans risquer la règle interdite de multiplication de la rémunération** (§12.11 : "il est strictement interdit de calculer 3h × 4 classes = 12h"). Avec l'architecture actuelle, la seule façon de planifier un cours mutualisé serait de créer une affectation/un créneau par classe — ce qui multiplierait mécaniquement les heures comptées à la paie, exactement l'erreur que le chapitre interdit.

**Je ne peux donc pas empiler ce chapitre sur le Module 5.1 sans le modifier.** Je propose une refonte ciblée (§1.8) qui conserve tout ce qui a été validé et testé (calcul de paie, statuts enrichis, écran de contrôle, verrouillage des notes) mais remplace la brique de planification (`teacher_weekly_slots` + génération synthétique de séances) par une entité `Séance` de premier ordre, capable de couvrir nativement 1 à N classes. C'est un changement d'architecture réel, pas cosmétique — **point ouvert bloquant n°1, §6**.

### 0.3 Portée de la "génération automatique optimisée" (§12.3)

Le chapitre demande trois modes de création : manuelle, assistée, et **génération automatique optimisée** tenant compte des disponibilités, volumes horaires, contraintes pédagogiques, jours fériés et périodes d'examens. Une génération automatique *optimisée* d'emploi du temps est un problème d'optimisation combinatoire (proche du "timetabling problem", NP-difficile en général) — un moteur de résolution sous contraintes est un chantier à part entière, non détaillé par le chapitre (aucun algorithme, aucune priorité entre contraintes n'est précisée). Je propose de livrer dans cette version : création **manuelle** et **assistée** (l'assistant empêche/avertit en temps réel des conflits pendant la saisie, ce qui couvre l'essentiel de la valeur pratique), et de **différer la génération automatique optimisée** à une itération future dédiée, une fois le référentiel de contraintes précisé avec vous. **Point ouvert bloquant n°2, §6.**

## 1. Analyse fonctionnelle

### 1.1 Objectif — référentiel unique (§12.1)

L'emploi du temps devient le référentiel des séances réellement planifiées. Notes (Module 6) et Paie (Module 8) consomment ses données sans jamais les ressaisir — c'est exactement le principe déjà appliqué à chaque module de cet ERP.

### 1.2 Vues multiples, une seule donnée (§12.2)

Aucune duplication : une vue "par classe/enseignant/salle/filière/niveau/semestre" est une requête filtrée sur la même table `seances`, jamais une table séparée par vue.

### 1.3 Modes de création (§12.3) — voir §0.3

Manuelle et assistée dans cette version ; génération automatique optimisée différée (point ouvert n°2).

### 1.4 Détection de conflits (§12.4)

À la création/modification d'une séance, contrôle bloquant :
- l'enseignant n'est pas déjà occupé sur un créneau qui chevauche ;
- la salle n'est pas déjà occupée par une autre séance qui chevauche ;
- aucune des classes de la séance n'a déjà une autre séance qui chevauche.
Le conflit est signalé avec le détail (avec qui/quoi) avant toute validation, comme demandé.

### 1.5/1.6 Cours mutualisés et groupe pédagogique (§12.5/§12.6) — **[interprétation, point clé]**

`pedagogical_groups` : référentiel configurable (libellé + classes membres, ex. "Tronc Commun Licence 1" → 4 classes), entièrement paramétrable par vous, sans limite de classes. Une séance peut être créée pour : une classe, plusieurs classes choisies librement, ou un groupe pédagogique existant (qui préremplit ses classes membres, modifiables au cas par cas). Techniquement, une séance porte une liste de classes (relation N-N), qu'elle vienne d'un groupe ou d'une sélection libre — le groupe n'est qu'un raccourci de saisie, jamais une contrainte figée.

### 1.7 Gestion des salles (§12.7) — **[interprétation]**

Aucun référentiel de salle n'existe aujourd'hui dans l'ERP (`Class.mainRoom` n'est qu'un texte libre). Je propose un référentiel `rooms` minimal (libellé, capacité). À la création d'une séance, si l'effectif cumulé des classes dépasse la capacité de la salle choisie, un avertissement s'affiche (non bloquant, car l'effectif exact au moment de la séance peut varier) — cohérent avec "le logiciel devra avertir l'utilisateur".

### 1.8 Fiche mensuelle de pointage (§12.8) — révision du Module 5.1

La fiche mensuelle (`teacher_monthly_timesheets`) et son principe (une par enseignant × mois, verrouillage des notes de paie associées) sont **conservés tels quels** — déjà construits, testés, en attente de votre validation. Ce qui change : ses séances (`teacher_attendance_sessions`) ne sont plus générées à partir d'un créneau hebdomadaire synthétique (`teacher_weekly_slots`), mais correspondent désormais **directement aux séances réelles de l'emploi du temps** (`seances`) de cet enseignant sur le mois — éliminant le besoin de "génération" artificielle, puisque les séances existent déjà, planifiées une à une (ou en série récurrente, voir §1.8.1).

#### 1.8.1 Modèles de récurrence — remplace `teacher_weekly_slots`

Pour éviter de devoir créer une séance à la main pour chaque semaine d'un cours hebdomadaire régulier, je propose un `modele_recurrence` (jour de semaine, heure début/fin, salle, classes/groupe, dates de début/fin) qui **génère** des séances concrètes dans `seances` (idempotent, comme le faisait `teacher_weekly_slots`), mais chaque séance générée est ensuite une entité indépendante, modifiable/déplaçable/annulable individuellement sans affecter le modèle ni les autres occurrences — exactement le comportement attendu d'un emploi du temps réel.

### 1.9 Statuts de séance (§12.9)

Le chapitre liste : Programmé / Effectué / Reporté / Annulé / Remplacé. Le Module 5.1 a déjà construit exactement ces 4 dernières valeurs côté "qualification" (🟢 Dispensé = Effectué, 🟡 Reporté, 🔴 Annulé, 🔵 Remplacé), avec un statut `null` représentant "pas encore qualifiée" — je propose de nommer explicitement cette valeur par défaut **`PROGRAMMEE`** dans le nouveau modèle plutôt que de garder un champ nullable, pour correspondre littéralement à votre vocabulaire ("Cours programmé"). Comportement final identique à ce qui a déjà été validé dans le principe (Module 5.1 §1.4-§1.6), simplement mieux nommé.

### 1.10 Paramétrage des rémunérations (§12.10) — extension du Module 5.1/8 — **[interprétation, point ouvert]**

`payroll_settings` porte déjà `default_hourly_rate`/`default_session_duration_hours` (Module 5.1). Ce chapitre demande en plus : nombre d'heures hebdomadaires/mensuelles (déjà porté par `Teacher.weekly_hours_capacity`, Module 5, réutilisé sans duplication), **heures supplémentaires** et **plafond mensuel** — non modélisés à ce jour. Je propose d'ajouter à `payroll_settings` un taux de majoration des heures supplémentaires (ex. ×1,25 au-delà du plafond) et un plafond mensuel par défaut, tous deux modifiables sans toucher au code — mais la règle exacte de déclenchement (plafond par enseignant individualisable ? majoration uniforme ou paliers ?) n'est pas précisée dans le chapitre. **Point ouvert, §6.**

### 1.11 Rémunération des cours mutualisés (§12.11) — règle centrale, non négociable

Une séance mutualisée (N classes) compte pour **une seule durée**, jamais multipliée par le nombre de classes. Avec la nouvelle architecture (§1.5/§2), c'est structurellement garanti : les heures d'un enseignant sur un mois se calculent en sommant la durée de chaque **séance** à laquelle il est rattaché (une ligne dans `seances`), jamais en sommant par couple (séance, classe) — le nombre de classes liées à une séance n'entre à aucun moment dans le calcul des heures ou du montant. C'est exactement la garantie que l'architecture à base de `teacher_assignments` (un par classe) ne pouvait pas offrir nativement (§0.2).

### 1.12 Calcul mensuel automatique (§12.12)

Repris tel quel du Module 5.1 : recalcul à la volée à chaque qualification de séance, aucune valeur stockée en cache incohérente.

### 1.13 Intégration avec la paie (§12.13)

Réutilise directement `getTeacherPayrollHours`/`hours_source` (POINTAGE/PLANIFIE, ADR-039) déjà construits au Module 5.1 — seule la source des séances change (`seances` au lieu de `teacher_attendance_sessions` générées depuis `teacher_weekly_slots`). Le contrat avec `payrollLineService` (Module 8) ne change pas.

### 1.14 Contrôle avant validation (§12.14)

L'écran "Contrôle avant paie" existe déjà (Module 5.1) ; j'y ajoute les colonnes "séances reportées" (distinctes de "non effectuées", qui regroupe aujourd'hui annulées et reportées) pour correspondre exactement à la liste demandée.

### 1.15 Impression (§12.15) — **[interprétation]**

Emplois du temps (classe/enseignant/salle) et fiche de pointage : écrans HTML/CSS imprimables réutilisant le moteur de thèmes d'impression (Module 5.1/ADR-037), comme tous les documents déjà migrés — **pas de génération de fichier PDF sur disque** (cohérent avec le choix déjà fait et validé pour les bulletins de notes/paie, Module 6/ADR-041). "Exportable en PDF" est couvert par l'impression navigateur "Enregistrer en PDF", déjà disponible nativement, sans moteur PDF dédié tant que le futur Module 9 (Documents officiels) n'est pas construit.

### 1.16 Journal d'audit (§12.16)

Toutes les mutations (création/modification/annulation/qualification/remplacement de séance, création de salle/groupe pédagogique) passent par le journal d'audit déjà systématique (Module 1), comme partout ailleurs dans l'ERP.

### 1.17 Documentation (§12.17)

Suivra la clôture du module (ARCHITECTURE_MASTER.md, ROADMAP.md, DECISIONS.md, CHANGELOG.md), comme pour chaque module.

### 1.18 Hors périmètre de cette version

| Élément | Traitement |
|---|---|
| Génération automatique optimisée (solveur sous contraintes) | Différée — voir §0.3, point ouvert n°2 |
| Jours fériés / périodes d'examens comme contraintes actives | Non modélisés : aucun calendrier de jours fériés n'existe encore dans l'ERP ; à construire si la génération automatique est demandée plus tard |
| Rendu PDF avec mise en page dédiée par imprimante | Écran HTML/CSS imprimable, comme tous les documents déjà migrés (§1.15) |
| Réservation de salle pour des besoins hors emploi du temps (réunions...) | Non demandé, hors périmètre |

---

## 2. Conception de la base de données

```
rooms (référentiel configurable — salles, voir §1.7)
├── id, label, capacity (nullable), is_active

pedagogical_groups (référentiel configurable — tronc commun, voir §1.6)
├── id, label, is_active
pedagogical_group_classes (liaison N-N groupe × classes)
├── pedagogical_group_id, class_id

seance_recurrence_templates (modèle de récurrence — remplace teacher_weekly_slots, voir §1.8.1)
├── id, teacher_id, subject_offering_id, room_id (nullable)
├── day_of_week, start_time, end_time
├── pedagogical_group_id (nullable)
├── is_active
seance_recurrence_template_classes (liaison N-N modèle × classes, si pas de groupe)
├── template_id, class_id

seances (entité centrale — une séance réelle, planifiée une à une ou générée depuis un modèle)
├── id, teacher_id, subject_offering_id, room_id (nullable)
├── recurrence_template_id (nullable — traçabilité de la génération)
├── session_date, start_time, end_time
├── status (PROGRAMMEE / EFFECTUEE / REPORTEE / ANNULEE / REMPLACEE)
├── reason (texte, obligatoire si status ≠ EFFECTUEE/PROGRAMMEE)
├── rescheduled_to_seance_id (nullable — séance de rattrapage)
├── substitute_teacher_id (nullable — enseignant remplaçant)
├── validated_at, validated_by
├── timesheet_id → teacher_monthly_timesheets.id (rattachement au mois de pointage de l'enseignant, ou du remplaçant si statut REMPLACEE)
seance_classes (liaison N-N séance × classes concernées — voir §1.11, jamais dupliqué par classe)
├── seance_id, class_id

payroll_settings (Module 5.1/8, étendu de façon additive — voir §1.10)
├── ... champs existants
├── overtime_multiplier (nullable — majoration heures supplémentaires)
└── monthly_hours_cap (nullable — plafond mensuel par défaut)
```

`teacher_weekly_slots` et le mode de génération actuel de `teacher_attendance_sessions` (Module 5.1) seraient retirés au profit de `seances`/`seance_recurrence_templates` ; `teacher_monthly_timesheets` (fiche mensuelle) reste inchangée dans son rôle (regroupement mensuel, verrouillage, numérotation).

## 3. Règles métier

1. Une séance ne peut être créée/modifiée que si aucun conflit (enseignant, salle, classe) n'existe sur son créneau — contrôle bloquant (§1.4).
2. Les heures/le montant d'une séance ne sont jamais multipliés par le nombre de classes qui y assistent (§1.11) — non négociable.
3. Seul un utilisateur du système peut qualifier une séance — `Teacher` reste sans compte de connexion (inchangé depuis Module 5.1).
4. Une fiche mensuelle clôturée reste figée (inchangé depuis Module 5.1).
5. Aucune suppression physique d'une séance déjà passée/qualifiée — seulement requalifiée ou annulée (inchangé depuis Module 5.1).
6. Un modèle de récurrence désactivé n'affecte jamais les séances déjà générées (inchangé dans l'esprit du principe déjà appliqué aux créneaux hebdomadaires).

## 4. UI/UX

- **Emploi du temps** : vue calendrier par classe/enseignant/salle/filière/niveau/semestre (filtre sur les mêmes données), création manuelle et assistée (conflits signalés en direct), impression.
- **Salles** et **Groupes pédagogiques** : nouveaux écrans Paramètres, référentiels simples.
- **Pointage** (Module 5.1, adapté) : les séances affichées proviennent désormais de l'emploi du temps réel.
- **Paramètres → Ressources Humaines → Rémunération** (Module 5.1, étendu) : heures supplémentaires, plafond mensuel.

## 5. Permissions

- `EMPLOI_DU_TEMPS:LECTURE`, `EMPLOI_DU_TEMPS:MODIFICATION`, `EMPLOI_DU_TEMPS:ADMINISTRATION`
- `SALLES:LECTURE`, `SALLES:MODIFICATION`
- `GROUPES_PEDAGOGIQUES:LECTURE`, `GROUPES_PEDAGOGIQUES:MODIFICATION`
- `POINTAGE:*` (Module 5.1, réutilisées telles quelles)

## 6. Points ouverts — merci de valider avant les migrations

1. **[bloquant]** Ce chapitre révise l'architecture du Module 5.1 (§0.2) : remplacement de `teacher_weekly_slots`/génération synthétique par une entité `Séance` de premier ordre supportant nativement les cours mutualisés (relation N-N vers les classes), condition nécessaire pour respecter la règle "jamais de multiplication par le nombre de classes" (§12.11/§1.11). Ce qui a déjà été validé dans le Module 5.1 (calcul de paie, statuts enrichis, écran de contrôle, verrouillage) est conservé ; seule la brique de planification change. Confirmez-vous cette refonte ?
2. **[bloquant]** Génération automatique *optimisée* différée à une itération future (§0.3) — création manuelle et assistée (avec détection de conflits en direct) livrées dans cette version. D'accord ? Si non, quelles contraintes/priorités doit respecter le générateur automatique (je ne peux pas en inventer les règles) ?
3. Référentiel `rooms` minimal (libellé + capacité), remplaçant à terme `Class.mainRoom` (texte libre) — d'accord ?
4. Groupe pédagogique : un simple raccourci de saisie (préremplit les classes d'une séance, jamais une contrainte figée après création) — d'accord ?
5. Heures supplémentaires/plafond mensuel (§1.10) : merci de préciser la règle de déclenchement et de majoration exacte — je ne peux pas la deviner sans risquer une erreur de paie.
6. Renommage du statut "non qualifié" en `PROGRAMMEE` explicite (au lieu de `null`), pour coller à votre vocabulaire — d'accord ?
7. Numérotation proposée : **Module 5.2**. D'accord ?
8. Emplois du temps/fiche de pointage imprimés en écran HTML/CSS (comme tous les documents déjà migrés), "export PDF" couvert par l'impression navigateur — d'accord, ou souhaitez-vous un moteur PDF dédié dès ce module (anticiperait le futur Module 9) ?
9. Une fois cette refonte validée, faut-il migrer les données déjà saisies dans `teacher_weekly_slots` (créneaux hebdomadaires éventuellement créés pendant votre test du Module 5.1) vers des `seance_recurrence_templates`, ou repartir d'une base vide pour l'emploi du temps (le Module 5.1 n'étant pas encore définitivement validé par vous) ?

## 7. Développement et tests

### 7.1 Schéma Prisma et migrations

Deux migrations : `20260729003451_module_5_2_emploi_du_temps` (suppression de `teacher_weekly_slots`/
`teacher_attendance_sessions`/enum `AttendanceSessionStatus` — 0 ligne en base au moment de la
migration, vérifié avant d'exécuter ; création de `rooms`, `pedagogical_groups`(_classes),
`seance_recurrence_templates`(_classes), `seances`, `seance_classes`, enum `SeanceStatus` ; extension
additive de `payroll_settings` avec `overtime_multiplier`/`monthly_hours_cap`) et
`20260729004459_seance_recurrence_template_unique_slot_date` (contrainte unique
`recurrenceTemplateId`+`sessionDate` sur `seances`, nécessaire à l'idempotence de la génération
depuis un modèle — le NULL de `recurrenceTemplateId` sur les séances manuelles ne collisionne jamais,
Postgres traitant chaque NULL comme distinct). `teacher_monthly_timesheets`/`TimesheetStatus`
conservés inchangés, seule leur relation `sessions` pointe désormais vers `Seance`.

### 7.2 Seed

7 permissions : `EMPLOI_DU_TEMPS:LECTURE/MODIFICATION/ADMINISTRATION`, `SALLES:LECTURE/MODIFICATION`,
`GROUPES_PEDAGOGIQUES:LECTURE/MODIFICATION`. `POINTAGE:*` (Module 5.1) réutilisées telles quelles.

### 7.3 packages/shared

`room.ts`, `pedagogicalGroup.ts`, `seanceRecurrenceTemplate.ts`, `seance.ts` (remplace
`teacherWeeklySlot.ts`/`teacherAttendanceSession.ts`) : `SeanceDto` porte `classIds`/`classNames`
(N classes, jamais dupliqué), `SeanceStatus` (`PROGRAMMEE`/`EFFECTUEE`/`REPORTEE`/`ANNULEE`/
`REMPLACEE`), schémas de détection de conflits (`checkSeanceConflictsInputSchema`/
`checkSeanceConflictsResultSchema`). `payrollSettings.ts` étendu avec `overtimeMultiplier`/
`monthlyHoursCap`.

### 7.4 packages/api

- `roomService.ts`, `pedagogicalGroupService.ts` : CRUD référentiels, jamais de suppression physique.
- `seanceRecurrenceTemplateService.ts` : CRUD + `generateSeancesFromTemplate` (idempotent, s'appuie
  sur la contrainte unique §7.1 et sur `createSeanceCore` du service `seances`).
- `seanceService.ts` : cœur du module.
  - `checkSeanceConflicts` : recherche les séances `PROGRAMMEE`/`EFFECTUEE` (une séance annulée,
    reportée ou remplacée libère le créneau — interprétation documentée en commentaire) qui
    chevauchent sur le même enseignant, la même salle, ou une classe commune ; `createSeance`/
    `updateSeance` appellent ce contrôle et rejettent en cas de conflit (§3 règle 1).
  - `getTeacherPayrollHours` : conserve le contrat externe de l'ancien
    `teacherAttendanceSessionService` (même signature, même sémantique repli PLANIFIE/POINTAGE) —
    `payrollLineService.ts` n'a nécessité qu'un changement d'import.
  - Garantie structurelle de la règle §1.11 : `sessionDurationHours` n'a pas de paramètre "nombre de
    classes" — les heures d'un enseignant se calculent en sommant une ligne par `Seance`, jamais par
    couple (séance, classe), donc la multiplication par le nombre de classes est impossible à
    exprimer à ce niveau, pas seulement évitée par convention.
  - Écran de contrôle avant paie : colonne `sessionsPostponed` (reportées) ajoutée, distincte de
    `sessionsNotDone` (annulées + reportées, comportement inchangé depuis le Module 5.1).

### 7.5 apps/desktop

Nouveau module **Emploi du temps** (vue filtrée classe/enseignant/salle/filière/niveau/semestre,
création assistée avec conflits affichés en direct via `seances.checkConflicts`, impression
réutilisant le moteur de thèmes ; onglet Modèles de récurrence avec génération sur plage de dates).
Nouveaux écrans Paramètres : Salles, Groupes pédagogiques. `PayrollSettingsScreen` étendu (heures
supplémentaires/plafond, marqué "aucun calcul automatique" dans l'UI). Pointage et Contrôle avant
paie adaptés au nouveau vocabulaire de statuts. `TeacherWeeklySlotsDialog` et son bouton "Créneaux"
sur la fiche enseignant supprimés (remplacés par le module Emploi du temps).

### 7.6 Tests

9 tests unitaires (`seanceService.test.ts` : durée de séance, chevauchement de créneaux avec bornes
exclusives, bornes de mois y compris année bissextile — dont un test explicite documentant que
`sessionDurationHours` ne peut structurellement pas multiplier par le nombre de classes). Vérification
de bout en bout contre PostgreSQL réel (script `verify-module-5-2.e2e.ts`, créé puis supprimé après
exécution, conformément à la convention du projet) : séance mutualisée à 2 classes facturée 3h — jamais
6h —, détection de conflit enseignant+classe bloquant `createSeance`, qualification EFFECTUEE,
génération idempotente depuis un modèle de récurrence (même liste de séances à la deuxième
génération). Toutes les données créées par le script ont été nettoyées ; les 99 tests de
`packages/api` passent (90 précédents + 9 nouveaux) ; `packages/shared`/`packages/api`/`apps/desktop`
typechecks verts.

## 8. Validation

En attente du test manuel des écrans par le porteur du projet.
