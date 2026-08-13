# Module 5.1 — Créneaux hebdomadaires et fiche de pointage des enseignants

**Statut** : 🟠 **Développé (2026-07-28) — en attente du test manuel des écrans par le porteur du projet** (conception validée le 2026-07-28, "oui je suis d'accord").
**Dépend de** : Module 1 (RBAC, journal d'audit), Module 2 (structure académique — années/semestres), Module 2.1 (`SubjectOffering`), Module 5 (`Teacher`, `TeacherAssignment` — validé), Module 8 (Paie — validé ; ce module vient réviser ADR-035).
**Source** : Chapitre reçu le 2026-07-28, intitulé "FICHE MENSUELLE DE POINTAGE DES ENSEIGNANTS" (aucun numéro de module attribué par vous cette fois — voir §0).

---

## 0. Notes de numérotation et de périmètre

**Numérotation.** Ce chapitre ne portait pas de numéro de "Module X" cette fois. Aucun emplacement n'est réservé dans `ROADMAP.md` pour un domaine "Emploi du temps / Pointage" (les emplacements libres — 6 Évaluation, 9 Documents officiels, 10 Tableau de bord — couvrent des domaines différents). Le contenu porte directement sur les enseignants et leurs affectations déjà modélisées au Module 5, et vient réviser une limite documentée du Module 8 (ADR-035). Je le numérote donc **Module 5.1**, sur le même principe que 2.1/4.1/4.2/4.3 (sous-module d'un domaine déjà numéroté, plutôt qu'un nouveau numéro racine qui viendrait percuter 6/7/8/9 déjà réservés).

**Point de blocage majeur — pas de moteur "Emploi du temps".** Le chapitre indique explicitement : *"Le module Emploi du temps devra générer automatiquement une fiche mensuelle de pointage... À partir de l'emploi du temps validé, le logiciel devra créer automatiquement une fiche mensuelle..."*. Aucun module "Emploi du temps" n'existe dans l'ERP : le Module 5 (sa propre doc, §0) a explicitement exclu "créneaux, détection de conflits" de son périmètre, en attendant une demande dédiée. `TeacherAssignment` ne porte aujourd'hui qu'un volume horaire hebdomadaire agrégé (via `SubjectOffering.hoursCourse/hoursTd/hoursTp`), pas un jour de semaine ni une heure de début/fin concrète : il est donc impossible, en l'état, de savoir "quel enseignant a cours quel jour à quelle heure, dans quelle salle" pour générer un calendrier de séances cochables comme demandé.

Je ne peux pas construire la fiche de pointage sans résoudre ce point d'abord. Je propose ci-dessous une solution **minimale** (créneaux hebdomadaires simples, sans détection de conflit) plutôt que d'attendre un chapitre "Emploi du temps" séparé et complet — mais c'est un ajout de périmètre réel qui doit être validé explicitement avant toute migration (**point ouvert n°1, §6**).

## 1. Analyse fonctionnelle

### 1.1 Créneaux hebdomadaires — le prérequis manquant, réduit au strict nécessaire — **[interprétation, point ouvert clé]**

Plutôt qu'un véritable moteur d'emploi du temps (détection de conflits de salle/enseignant/classe, vue calendrier glisser-déposer — un chantier à part entière), je propose d'ajouter à `TeacherAssignment` une liste de **créneaux hebdomadaires récurrents** : jour de semaine (réutilise l'enum `DayOfWeek` déjà créé au Module 5), heure de début, heure de fin, salle (texte libre, préremplie depuis `Class.mainRoom` mais modifiable). C'est la donnée minimale nécessaire pour dériver "quelles séances concrètes existent ce mois-ci" — **sans aucune détection de conflit** (deux enseignants pourraient être positionnés sur le même créneau/la même salle sans blocage, exactement comme le Module 5 l'avait annoncé). Un véritable "Module Emploi du temps" avec conflits et vue glisser-déposer resterait un chantier futur distinct si vous le souhaitez un jour.

### 1.2 Génération automatique des séances du mois (§ "Génération automatique")

Un mois se génère pour les mois où l'année universitaire active a une période (`AcademicPeriod`) en recouvrement — plutôt que de coder en dur "octobre à juin" (qui n'est qu'un exemple du chapitre, propre à un calendrier scolaire donné, et qui contredirait le principe déjà appliqué partout ailleurs dans l'ERP : "aucune valeur codée en dur"). Pour chaque créneau hebdomadaire actif dont l'affectation chevauche le mois, une **séance concrète** est générée pour chaque occurrence du jour de semaine dans le mois calendaire (ex. tous les lundis 10h-12h de juillet 2026).

### 1.3 Fiche mensuelle de pointage (§ "Présentation")

`teacher_monthly_timesheets` : une fiche par (enseignant, année, mois), complétée automatiquement à l'ouverture du mois. Chaque séance générée devient une ligne `teacher_attendance_sessions` rattachée à la fiche, affichée comme une case à cocher dans un calendrier du mois (date, heure début/fin, classe, filière, matière, salle, durée — toutes ces informations proviennent de `TeacherAssignment`/`SubjectOffering`/`Class`/`Subject`, jamais dupliquées, à l'exception de la date/heure/salle concrètes de la séance elle-même, qui n'existent qu'ici).

### 1.4 Statut de séance enrichi, sur votre propre recommandation (§ "Validation des cours" + "Une amélioration que je te conseille")

Vous recommandez vous-même un statut plutôt qu'une simple case cochée. Je reprends cette recommandation telle quelle plutôt que la case binaire décrite plus haut dans le chapitre, car elle règle mieux le cas "cours reporté puis rattrapé" que vous décrivez : `DISPENSE` (🟢) / `REPORTE` (🟡) / `ANNULE` (🔴) / `REMPLACE` (🔵). Un motif texte est obligatoire pour tout statut autre que `DISPENSE`. Chaque changement de statut est horodaté et écrit dans le journal d'audit existant (Module 1), avec l'utilisateur ayant validé.

### 1.5 Séance reportée puis rattrapée — **[interprétation, point ouvert]**

Pour qu'une séance reportée "soit tout de même prise en compte dans la paie du mois où elle a réellement été effectuée" (votre exigence), je propose que marquer une séance `REPORTE` permette de la lier à une séance de rattrapage (existante ou créée à une nouvelle date/heure) via un champ `rescheduledToSessionId`. C'est la séance de rattrapage, une fois `DISPENSE`, qui compte dans les heures/le montant du mois où elle a réellement eu lieu — pas le mois d'origine.

### 1.6 Séance remplacée par un autre enseignant — **[interprétation, point ouvert]**

Statut `REMPLACE` : ajout d'un champ `substituteTeacherId` (→ `Teacher`). Les heures/le montant de cette séance sont alors comptés dans la fiche mensuelle du **remplaçant**, pas de l'enseignant initialement affecté.

### 1.7 Qui peut valider une séance — **[point ouvert clé, contrainte RBAC]**

Le chapitre autorise "l'enseignant, responsable pédagogique ou administrateur". Or `Teacher` est une **fiche autonome, pas un compte utilisateur** — un enseignant ne se connecte pas à l'ERP aujourd'hui (voir MODULE-05 §1.1). La validation par l'enseignant lui-même n'est donc pas réalisable sans construire un portail/compte enseignant séparé, un chantier à part entière hors périmètre de ce chapitre. Je propose donc, pour cette version : seuls les **utilisateurs du système** disposant d'une permission dédiée (responsable pédagogique, administrateur...) peuvent qualifier une séance, en se basant sur la déclaration réelle de l'enseignant recueillie hors logiciel. Un futur "portail enseignant" pourrait lever cette limite — noté en évolutivité (§1.12), non construit ici.

### 1.8 Paramétrage des rémunérations — réutilisation du Module 8, pas un second système — **[interprétation, point ouvert]**

Le chapitre demande un tarif horaire et une durée standard de séance configurables, sans montant codé en dur. Le Module 8 porte déjà un tarif horaire **par employé** (`Employee.hourlyRate`, §11.4.A) — je ne crée pas de second système de tarif parallèle. Je propose d'ajouter à `payroll_settings` (singleton déjà existant) deux valeurs par défaut globales, utilisées uniquement pour préremplir un nouvel employé (jamais pour écraser un tarif déjà personnalisé) : `default_hourly_rate` et `default_session_duration_hours`. La "valeur d'une séance" (90 000 GNF dans l'exemple du chapitre) reste donc **toujours calculée** (tarif horaire × durée), jamais stockée en dur.

### 1.9 Écran récapitulatif avant génération de la paie (§ "Contrôle avant génération de la paie")

Nouvel écran (module Paie) listant par enseignant : séances prévues/effectuées/non effectuées, heures prévues/réalisées, montant brut calculé, observations (motifs des séances non `DISPENSE`). Le responsable peut corriger une séance directement depuis cet écran avant de lancer le calcul de la période de paie (Module 8, `calculatePayPeriodLines`).

### 1.10 Intégration avec le Module 8 — révision d'ADR-035 — **[interprétation, point ouvert clé]**

Aujourd'hui (ADR-035), le calcul horaire de paie utilise les heures **planifiées** (`computeMonthlyPlannedHours`) faute de mieux. Je propose que le calcul utilise désormais en priorité les heures **réellement validées** de la fiche de pointage du mois (séances `DISPENSE` + `REPORTE`-rattrapées + `REMPLACE` comptées côté remplaçant), quand une fiche mensuelle existe et est complète pour cet enseignant/ce mois. À défaut (mois antérieur à la mise en service de ce module, ou enseignant sans créneaux hebdomadaires renseignés), le calcul continue d'utiliser l'ancien proxy planifié, signalé clairement sur le bulletin ("heures estimées, pointage non disponible"). Ceci **supersède** ADR-035 sans le supprimer — un nouvel ADR sera rédigé une fois ce point validé.

### 1.11 Clôture mensuelle

`teacher_monthly_timesheets.status` : `OUVERTE` → `CLOTUREE`. Une fiche clôturée devient figée (plus aucune séance modifiable), symétrique de `PayPeriod` (Module 8). Le rapprochement exact entre "clôture du pointage" et "clôture de la période de paie" est un point ouvert (§6).

### 1.12 Évolutivité (§ "Évolutivité")

Notée mais non construite maintenant : signature électronique de l'enseignant (suppose un compte/portail enseignant, voir §1.7), validation par le Directeur des Études, validation par le Directeur du Campus, génération automatique d'un rapport mensuel d'activité d'enseignement.

### 1.13 Hors périmètre de cette version

| Élément | Traitement |
|---|---|
| Détection de conflits d'emploi du temps (salle/enseignant/classe) | Non construite — créneaux simples sans validation croisée, comme annoncé par le Module 5 |
| Vue calendrier glisser-déposer / construction visuelle de l'emploi du temps | Hors périmètre — les créneaux sont saisis un par un sur la fiche d'affectation |
| Portail / compte de connexion pour l'enseignant (auto-validation, signature électronique) | Hors périmètre — `Teacher` reste une fiche autonome sans compte (Module 5 §1.1) |
| Référentiel de salles avec capacité/réservation | Hors périmètre — champ texte libre, préremplissage depuis `Class.mainRoom` |
| Rapport mensuel d'activité automatique, validations Directeur des Études/Campus | Notées en évolutivité, non construites |

---

## 2. Conception de la base de données

```
teacher_weekly_slots (créneau hebdomadaire récurrent — le prérequis minimal, sans détection de conflit)
├── id, teacher_assignment_id → teacher_assignments.id
├── day_of_week (enum DayOfWeek, réutilisé du Module 5)
├── start_time, end_time (heure locale)
├── room (texte libre, préremplissage suggéré depuis class.main_room)
├── is_active
└── created_at / updated_at

teacher_monthly_timesheets (fiche mensuelle de pointage — un enseignant × un mois)
├── id, teacher_id → teachers.id
├── year, month
├── status (OUVERTE / CLOTUREE)
├── closed_at, closed_by → users.id (nullable)
└── created_at / updated_at
    unique (teacher_id, year, month)

teacher_attendance_sessions (séance concrète générée — une ligne = une case à cocher)
├── id, timesheet_id → teacher_monthly_timesheets.id
├── teacher_assignment_id → teacher_assignments.id (source : matière/classe/filière)
├── weekly_slot_id → teacher_weekly_slots.id (nullable — traçabilité de la génération)
├── session_date, start_time, end_time (dénormalisées au moment de la génération —
│    jamais recalculées si le créneau change ensuite, pour ne jamais réécrire l'historique)
├── room
├── status (DISPENSE / REPORTE / ANNULE / REMPLACE, défaut : à qualifier)
├── reason (texte, obligatoire si status ≠ DISPENSE)
├── rescheduled_to_session_id → teacher_attendance_sessions.id (nullable, cas REPORTE rattrapé)
├── substitute_teacher_id → teachers.id (nullable, cas REMPLACE)
├── validated_at, validated_by → users.id (nullable tant que non qualifiée)
└── created_at / updated_at

payroll_settings (Module 8, étendu de façon additive)
├── ... champs existants (salary_expense_account_id)
├── default_hourly_rate (nullable — préremplissage nouvel employé, jamais écrasement)
└── default_session_duration_hours (nullable — préremplissage nouvel employé)
```

Aucune table du Module 5/Module 8 n'est reconstruite : `teacher_weekly_slots` étend `TeacherAssignment` de façon additive, `teacher_attendance_sessions` réutilise `TeacherAssignment`/`SubjectOffering`/`Class`/`Subject` pour toutes les informations pédagogiques déjà connues, et ne stocke en propre que ce qui n'existe nulle part ailleurs (date/heure/salle concrètes, statut, motif).

## 3. Règles métier

1. Une séance ne peut être qualifiée (`DISPENSE`/`REPORTE`/`ANNULE`/`REMPLACE`) que par un utilisateur disposant de la permission de validation — jamais par l'enseignant lui-même (voir §1.7).
2. Un motif est obligatoire pour tout statut différent de `DISPENSE`.
3. Une séance `REPORTE` liée à une séance de rattrapage (`rescheduledToSessionId`) ne compte dans aucun calcul tant que la séance de rattrapage n'est pas elle-même `DISPENSE`.
4. Une séance `REMPLACE` compte dans la fiche mensuelle du remplaçant, jamais dans celle de l'enseignant initialement affecté.
5. Une fiche mensuelle `CLOTUREE` devient intégralement figée : aucune séance qui lui est rattachée ne peut plus changer de statut (symétrique de la règle de clôture du Module 8).
6. La génération des séances d'un mois est idempotente : relancer la génération ne duplique jamais une séance déjà générée pour un même (créneau, date).
7. Aucune suppression physique : une séance ou une fiche mensuelle, une fois créée, n'est jamais supprimée — seulement requalifiée.

## 4. UI/UX

- **Fiche affectation (Module 5)** : nouvel onglet/section "Créneaux hebdomadaires" sur chaque `TeacherAssignment`, pour saisir jour/heure début/heure fin/salle.
- **Nouvelle section "Pointage"** (rattachée aux Enseignants ou à la Paie — à confirmer, voir §6) : vue calendrier mensuel par enseignant, chaque séance affichée comme une case colorée selon son statut (🟢🟡🔴🔵), qualifiable en un clic avec saisie du motif si nécessaire.
- **Écran récapitulatif de contrôle** (§1.9), accessible avant le calcul d'une période de paie du Module 8.
- **Paramètres → Ressources Humaines → Rémunération** (chemin demandé par le chapitre) : nouvel écran exposant `default_hourly_rate`/`default_session_duration_hours` (Module 8, `payroll_settings`) — pas un second référentiel, un prolongement de l'écran de réglages de paie déjà existant.

## 5. Permissions

Nouvelles permissions proposées (préfixe `POINTAGE*`, sur le modèle des préfixes déjà en place) :
- `POINTAGE:CONSULTATION`
- `POINTAGE:VALIDATION` (qualifier une séance)
- `POINTAGE:CONFIGURATION` (créneaux hebdomadaires, paramètres de rémunération par défaut)
- `POINTAGE:ADMINISTRATION` (modifier une séance/fiche déjà clôturée, cas exceptionnel)

## 6. Points ouverts — merci de valider avant les migrations

1. **[bloquant]** Acceptez-vous la solution minimale de créneaux hebdomadaires (§1.1 — jour/heure/salle, sans détection de conflit) comme substitut au moteur "Emploi du temps" que le chapitre présuppose ? Ou préférez-vous que j'attende un futur chapitre dédié "Emploi du temps" complet (avec détection de conflits) avant de construire quoi que ce soit ici ?
2. Numérotation proposée : **Module 5.1**. D'accord ?
3. Génération des mois : bornée aux périodes de l'année universitaire active plutôt que "octobre à juin" codé en dur (§1.2). D'accord ?
4. Statuts de séance enrichis 🟢🟡🔴🔵 (votre propre recommandation) adoptés à la place de la case à cocher binaire décrite plus haut dans le chapitre (§1.4). D'accord ?
5. Séance reportée : liaison manuelle à une séance de rattrapage via `rescheduledToSessionId` (§1.5), plutôt qu'un mécanisme de replanification automatique (plus lourd, non demandé explicitement). D'accord ?
6. Séance remplacée : les heures/le montant vont au remplaçant (§1.6). D'accord ?
7. **[bloquant]** Seuls les utilisateurs du système (responsable pédagogique/administrateur) peuvent valider une séance — l'enseignant ne peut pas s'auto-valider faute de compte (§1.7). Confirmez-vous, ou souhaitez-vous que j'envisage un compte/portail enseignant (chantier bien plus large, hors de ce chapitre) ?
8. Tarif horaire/durée de séance : réutilisation de `Employee.hourlyRate` (Module 8) + ajout de deux valeurs par défaut globales dans `payroll_settings` (§1.8), plutôt qu'un second référentiel de rémunération. D'accord ?
9. **[bloquant]** Le calcul de paie horaire utilisera en priorité les heures réellement pointées, avec repli sur l'ancien proxy planifié (ADR-035) si aucune fiche n'existe pour le mois (§1.10). D'accord avec ce mécanisme de repli, et avec le fait qu'il **supersède** ADR-035 (nouvel ADR) sans revenir sur les bulletins déjà validés ?
10. Où placer l'écran "Pointage" dans le menu : sous-section du module Enseignants (Module 5), sous-section du module Paie (Module 8), ou nouvelle entrée de menu autonome ?
11. Clôture d'une fiche mensuelle de pointage : automatique à la clôture de la période de paie correspondante (Module 8), ou clôture manuelle indépendante avant que la paie ne puisse même être calculée ? Le chapitre suggère plutôt la seconde lecture ("le module Paie devra récupérer... à la clôture du mois"), à confirmer.

## 7. Développement et tests

Développement réalisé le 2026-07-28 après validation de la conception ("oui je suis d'accord") :

- **Migrations** : `teacher_weekly_slots`, `teacher_monthly_timesheets`, `teacher_attendance_sessions` (+ contrainte unique `weekly_slot_id`/`session_date` pour l'idempotence de la génération) ; extension additive de `payroll_settings` (`default_hourly_rate`, `default_session_duration_hours`) et de `payroll_lines` (`hours_source`).
- **`packages/shared`** : schémas Zod (`teacherWeeklySlot.ts`, `teacherAttendanceSession.ts`), dont `qualifyAttendanceSessionInputSchema` (motif obligatoire si statut ≠ DISPENSE, enseignant remplaçant obligatoire si REMPLACE, via `superRefine`).
- **`packages/api`** : `teacherWeeklySlotService`, `teacherAttendanceSessionService` (génération idempotente des séances bornée aux périodes qui chevauchent le mois — jamais "octobre à juin" codé en dur —, qualification, clôture/réouverture, `getTeacherPayrollHours` exposant la priorité pointage réel / repli planifié, écran de contrôle avant paie) ; `payrollLineService.calculatePayrollLine` révisé pour consommer `getTeacherPayrollHours` (voir ADR-039) ; 4 permissions `POINTAGE*`.
- **`apps/desktop`** : onglet "Créneaux" sur chaque affectation pédagogique (Module 5), nouvel onglet "Pointage des enseignants" et "Contrôle avant paie" dans le module Paie, extension de l'écran Réglages de la paie (tarif horaire/durée de séance par défaut), préremplissage du tarif horaire à la création d'un employé.
- **Tests** : 6 tests unitaires supplémentaires (durée de séance, bornes du mois, génération des dates d'un jour de semaine) + 5 tests sur le schéma Zod de qualification (motif/remplaçant obligatoires selon le statut). Vérification de bout en bout contre PostgreSQL réel (créneau → génération idempotente de 4 séances sur un mois fictif 2099 → repli PLANIFIE tant que la fiche n'est pas complète → qualification DISPENSE/REPORTE/REMPLACE → bascule vers la source POINTAGE une fois la fiche complète → heures d'une séance REMPLACE créditées au remplaçant → écran de contrôle avant paie → clôture bloquant la qualification → réouverture), script temporaire supprimé après usage. Démarrage réel du serveur API confirmé (santé 200, requête tRPC non authentifiée refusée en 401). Lint/typecheck/build verts sur les 5 packages.

Décisions actées suite aux points ouverts §6 : créneaux hebdomadaires minimaux sans détection de conflit (ADR-038), révision d'ADR-035 par ADR-039, numérotation Module 5.1, statuts enrichis 🟢🟡🔴🔵, génération bornée aux périodes actives (pas de mois codés en dur), séance remplacée créditée au remplaçant, tarif/durée par défaut dans `payroll_settings` (pas de second référentiel), écran "Pointage" et "Contrôle avant paie" intégrés au module Paie, clôture manuelle de la fiche indépendante de la période de paie.

## 8. Validation

Conception validée le 2026-07-28 ("oui je suis d'accord"). Développement terminé et vérifié techniquement (§7) le 2026-07-28. **En attente du test manuel des écrans par le porteur du projet** avant validation finale du module.

*(en attente de votre retour)*
