# Module 2.1 — Structure pédagogique (matières, unités d'enseignement, coefficients, volumes horaires)

**Statut** : ✅ **Terminé — validé le 2026-07-27** (conception validée — "OUI" ; parcours des écrans testé et confirmé par le porteur du projet).
**Dépend de** : Module 0/1 (validés), Module 2 (Paramètres généraux, validé — années/semestres/filières/niveaux/classes déjà en service).
**Source** : Chapitre 9 du cahier des charges (reçu le 2026-07-27), intitulé par vous "Module 8". Voir §0.

---

## 0. Note de numérotation

"Module 8" est déjà pris dans `ROADMAP.md` (RH & Paie, sans rapport). Mais ce chapitre n'est pas non plus un module réellement nouveau et indépendant : il **redemande explicitement** la gestion complète des années universitaires, semestres, filières, niveaux et classes (§9.2 à §9.6) — **déjà entièrement livrées et validées au Module 2** (Chapitre 3, "structure académique complète"). Une vérification du schéma actuel confirme que tous les champs demandés existent déjà :

| Demandé au §9.x | Déjà en base (Module 2) |
|---|---|
| Années : créer/modifier/activer/désactiver/clôturer/réouvrir, une seule active à la fois | `academic_years` (`is_active`, `is_closed`, `closed_at`, `reopened_at`/`reopened_by`) — déjà exactement ce comportement |
| Semestres : code/nom/dates/statut | `academic_periods` (`code`, `label`, `start_date`, `end_date`, `order_index`) |
| Filières : code/nom/description/responsable/durée/statut | `filieres` (`code`, `name`, `description`, `responsable_user_id`, `duration`, `is_active`) |
| Niveaux : liste libre, extensible | `levels` (`code`, `label`, `order_index`, `is_active`) |
| Classes : code/nom/filière/niveau/effectif max/salle principale/statut | `classes` (`code`, `name`, `filiere_id`, `level_id`, `max_capacity`, `main_room`, `is_active`) |

Reconstruire ces cinq référentiels dupliquerait exactement ce qui existe déjà (violerait le principe n°6 et l'instruction de clôture de ce chapitre lui-même : "sans modification du code métier" pour ce qui doit rester stable). Je numérote donc ce chapitre **"Module 2.1"**, extension directe du Module 2, et son périmètre réel se limite à ce qui n'existe **pas encore** : **matières, unités d'enseignement, coefficients, volumes horaires, validation pédagogique, tableau de bord pédagogique et recherche transverse** — voir §1.1.

## 1. Analyse fonctionnelle

### 1.1 Périmètre réel de ce module

Sur les 16 sous-sections du chapitre, celles ci-dessous sont déjà couvertes par le Module 2 et ne sont donc **pas** reconstruites : §9.2 (années), §9.3 (semestres), §9.4 (filières), §9.5 (niveaux), §9.6 (classes). Ce module 2.1 couvre : §9.7 (matières), §9.8 (UE), §9.9 (coefficients), §9.10 (volumes horaires), §9.11 (validation pédagogique), §9.12 (recherche transverse), §9.13 (tableau de bord pédagogique), et étend les permissions/exports des référentiels existants (§9.15/§9.16) sans toucher à leurs écrans déjà livrés.

### 1.2 Matière et affectation — même modèle de spécificité que les tarifs (Module 4.2)

Le chapitre semble se contredire en apparence : §9.7 liste "Filière concernée, Niveau concerné, Semestre, Coefficient, Volume horaire" comme des champs de la matière, mais §9.9 dit explicitement "chaque matière **pourra posséder un coefficient différent** selon la filière/le niveau/le semestre", et §9.7 conclut "les matières **pourront être communes à plusieurs filières**". Ces deux dernières phrases tranchent : une matière (son code, son nom, ses crédits ECTS) est une **identité partagée**, tandis que son coefficient, son volume horaire et son caractère obligatoire ou non sont **spécifiques à un contexte** (filière/niveau/semestre/année). C'est exactement le modèle déjà validé et en production pour les tarifs de frais (`FeeType` générique + `FeeTariff` à dimensions optionnelles — voir MODULE-04.2 §1.3/ADR-022) : je le réutilise à l'identique plutôt que d'inventer un second mécanisme de spécificité :
- `subjects` (matière) = l'identité partagée (code, nom, description, crédits ECTS) — reprend `FeeType`.
- `subject_offerings` (affectation d'une matière à un contexte) = coefficient, volumes horaires (cours/TD/TP/travail personnel), caractère obligatoire, pour une combinaison (matière, année universitaire, semestre, niveau, filière optionnelle) — reprend `FeeTariff`. Filière optionnelle = "commune à toutes les filières de ce niveau" quand non renseignée. Doublon de portée exacte contrôlé côté service, comme pour les tarifs (voir ADR-022).

### 1.3 Unité d'enseignement (UE)

Une UE regroupe plusieurs affectations de matières (`subject_offerings`), pas des matières brutes — une même matière peut appartenir à une UE différente selon le programme (filière/niveau/semestre) dans lequel elle est enseignée. "Total des crédits" de l'UE (§9.8) n'est **jamais stocké** : toujours calculé à la volée en sommant les crédits des matières qui la composent, pour ne jamais désynchroniser un total affiché d'une somme réelle (même principe que l'écart budgétaire du Module 7 ou le "payé" du Module 4.3).

### 1.4 Semestre : statut calculé, pas stocké

Le "Statut" d'un semestre (§9.3) n'est pas non plus stocké : il est calculé à la lecture (`À_VENIR` / `EN_COURS` / `TERMINÉ`) à partir de la date du jour comparée à `start_date`/`end_date` de `academic_periods` — un statut stocké se désynchroniserait silencieusement des dates dès qu'elles changent.

### 1.5 Validation pédagogique (§9.11) — diagnostic, pas un verrou bloquant

Aucun autre module consommateur (Emploi du temps, Notes, Bulletins) n'existe encore pour être réellement bloqué par une validation stricte. Ce module fournit donc un **diagnostic à la demande** (par classe ou par programme filière/niveau/année) listant : matières obligatoires manquantes pour le contexte, volumes horaires incohérents (ex. total à zéro sur une matière obligatoire), coefficients non renseignés — sur le même principe qu'un contrôle de conditions déjà existant (`enrollmentService.checkEnrollmentConditions`, Module 4.1), qui informe sans bloquer tant que la case "obligatoire" n'est pas cochée.

### 1.6 Recherche transverse (§9.12)

Recherche instantanée par filière/niveau/classe/matière/semestre — le critère "enseignant responsable" est explicitement différé : aucun enseignant n'est encore affecté nulle part dans l'ERP (Module 5 — Professeurs & Emploi du temps — non commencé). Champ de recherche prévu dans le schéma (`subject_offerings` n'a pas de colonne enseignant) mais non activable tant que ce module n'existe pas.

### 1.7 Sécurité et exports (§9.15/§9.16)

Le chapitre redemande explicitement des permissions LECTURE/CREATION/MODIFICATION/SUPPRESSION/IMPORT/EXPORT/IMPRESSION et des exports Excel/CSV pour l'ensemble de la structure pédagogique — y compris les référentiels déjà livrés au Module 2, dont les permissions actuelles (`FILIERES`, `NIVEAUX`, `CLASSES`, `ANNEES`) ne couvrent aujourd'hui que LECTURE/CREATION/MODIFICATION/SUPPRESSION/ADMINISTRATION (pas EXPORT/IMPRESSION). Je propose de **compléter** ces catalogues de permissions existants (ajout additif de nouvelles actions, aucune permission existante modifiée) plutôt que d'en créer de nouveaux redondants, et d'ajouter un export CSV/Excel sur leurs tableaux déjà existants (réutilisation de `exportRowsToCsv`/`exportRowsToXlsx`, déjà utilisés ailleurs) — voir §6 point 3.

### 1.8 Hors périmètre

| Élément | Couverture réelle |
|---|---|
| Écrans CRUD Années/Semestres/Filières/Niveaux/Classes | Déjà livrés au Module 2 — non retouchés, seules leurs permissions/exports sont complétés (§1.7) |
| Recherche par "enseignant responsable" | Différée — Module 5 (Professeurs & Emploi du temps) non commencé |
| Emploi du temps, Notes, Moyennes, Bulletins, Diplômes | Futurs modules consommateurs — liront `subjects`/`subject_offerings`/`teaching_units` sans jamais les redéfinir (consigne explicite de clôture du chapitre) |

---

## 2. Conception de la base de données

```
subjects (matière — identité partagée, réutilisable par plusieurs filières)
├── id, code (unique), name, description (nullable), credits (nullable — ECTS)
├── is_active
└── created_at / updated_at

teaching_units (unité d'enseignement — UE)
├── id, code (unique), name, description (nullable)
├── responsible_user_id → users.id (nullable)
├── is_active
└── created_at / updated_at
   (total des crédits jamais stocké — calculé à la volée en sommant les subject_offerings qui y sont rattachées)

subject_offerings (affectation d'une matière à un contexte — coefficient/volumes/obligatoire)
├── id, subject_id → subjects.id
├── academic_year_id → academic_years.id, period_id → academic_periods.id (semestre)
├── level_id → levels.id, filiere_id → filieres.id (nullable = commune à toutes les filières de ce niveau)
├── teaching_unit_id → teaching_units.id (nullable — une matière peut ne pas être rattachée à une UE)
├── coefficient, hours_course, hours_td, hours_tp, hours_personal_work
├── is_required (obligatoire — utilisé par la validation pédagogique, §9.11)
├── is_active
└── created_at / updated_at
   (pas de contrainte unique stricte en base sur la portée — filière nullable, même limite PostgreSQL que MODULE-04.2 §2.2 — contrôle du doublon de portée côté service, voir ADR-022)
```

**Aucune table existante modifiée.** Réutilisations : `academic_years`/`academic_periods`/`levels`/`filieres` (Module 2, inchangés), modèle de spécificité à dimensions optionnelles (Module 4.2, `matchesContext`/`selectMostSpecificTariff` généralisables en fonctions génériques réutilisables telles quelles pour la résolution matière↔contexte).

---

## 3. Règles métier

1. **Matière partagée, affectation contextuelle** : une matière (`subjects`) n'a ni coefficient ni volume horaire propres ; ces valeurs vivent exclusivement sur `subject_offerings`, pour un contexte (année, semestre, niveau, filière optionnelle) donné.
2. **Résolution par spécificité** : pour un contexte donné (filière+niveau+semestre+année), l'affectation retenue est celle dont les dimensions renseignées correspondent, la plus spécifique (avec filière renseignée) l'emportant sur la générique (sans filière) — algorithme identique à MODULE-04.2 §3 règle 1.
3. **Total des crédits d'une UE** : toujours calculé à la volée (somme des `credits` des matières de ses `subject_offerings` actives), jamais stocké.
4. **Statut d'un semestre** : calculé à la lecture depuis les dates (`À_VENIR`/`EN_COURS`/`TERMINÉ`), jamais stocké.
5. **Validation pédagogique** : fonction de diagnostic pure (par classe ou par programme filière/niveau/année) — liste les matières obligatoires manquantes, les volumes horaires incohérents (total nul sur une matière obligatoire), les coefficients non renseignés ; n'empêche aucune opération dans ce module (aucun module consommateur n'existe encore pour justifier un blocage).
6. **Suppression logique uniquement** : `subjects`/`teaching_units`/`subject_offerings` ne sont jamais supprimées physiquement, seulement désactivées (`is_active = false`), comme tous les référentiels de l'ERP.
7. **Sécurité** : `MATIERES:*` pour les matières et leurs affectations, `UE:*` pour les unités d'enseignement, permissions `EXPORT`/`IMPRESSION` ajoutées aux catalogues existants `ANNEES`/`FILIERES`/`NIVEAUX`/`CLASSES` (additif, voir §1.7).
8. **Audit** : toute création/modification/désactivation de matière, affectation ou UE est journalisée.

## 4. UI/UX

- Nouvelle sous-section **"Structure pédagogique"** dans Paramètres (à côté des écrans Années/Filières/Niveaux/Classes déjà existants) : **Matières** (CRUD, export), **Unités d'enseignement** (CRUD avec total de crédits calculé et liste des matières rattachées), **Affectations** (tableau filtrable par année/semestre/niveau/filière, formulaire coefficient/volumes horaires/obligatoire), **Validation pédagogique** (diagnostic par classe ou par programme), **Tableau de bord pédagogique** (compteurs filières/niveaux/classes/matières/UE actifs, répartition des volumes horaires et des crédits).
- Recherche instantanée transverse (filière/niveau/classe/matière/semestre) accessible depuis cette section.
- Export CSV/Excel ajouté aux tableaux Années/Filières/Niveaux/Classes déjà existants (aucune modification de leur logique de création/modification).
- Respect intégral du Design System (zébrage, couleurs par pertinence, `DataTable`/`ServerDataTable` selon volume).

## 5. Permissions

| Code | Usage |
|---|---|
| `MATIERES:LECTURE`/`CREATION`/`MODIFICATION`/`SUPPRESSION`/`EXPORT`/`IMPRESSION` | Matières et leurs affectations (coefficients/volumes horaires) |
| `MATIERES:ADMINISTRATION` | Gestion des unités d'enseignement |
| `MATIERES_IMPORT:CREATION`/`VALIDATION` | Assistant d'import Excel/CSV des matières (voir §6 point 3) |
| `ANNEES:EXPORT`/`IMPRESSION`, `FILIERES:EXPORT`/`IMPRESSION`, `NIVEAUX:EXPORT`/`IMPRESSION`, `CLASSES:EXPORT`/`IMPRESSION` | Ajout additif aux catalogues existants du Module 2 (aucune permission existante modifiée) |

## 6. Points ouverts — merci de valider avant les migrations

1. **Numérotation "Module 2.1"** et périmètre réduit (§0/§1.1) : je ne reconstruis pas les années/semestres/filières/niveaux/classes, déjà livrés et validés au Module 2. D'accord ?
2. **Schéma proposé** (§2) : `subjects`, `teaching_units`, `subject_offerings`, réutilisant le modèle de spécificité du Module 4.2. D'accord pour lancer les migrations sur cette base ?
3. **Import Excel/CSV des matières** : je propose un assistant d'import uniquement pour les **matières** (`subjects` + leurs `subject_offerings`), pas pour les années/filières/niveaux/classes (déjà de petits référentiels créés manuellement, un assistant d'import serait disproportionné pour quelques lignes) — un programme complet peut compter des dizaines de matières, ce qui justifie l'effort. Confirmez-vous ce périmètre, ou souhaitez-vous un import pour tous les référentiels ?
4. **Crédits ECTS sur la matière, pas sur l'affectation** : les crédits sont portés par `subjects` (fixes, comme le nom/code), alors que coefficient/volumes horaires sont portés par `subject_offerings` (variables selon le contexte) — cohérent avec la pratique académique usuelle (les crédits ECTS d'une matière ne varient en général pas d'une filière à l'autre, contrairement au coefficient). Confirmez-vous, ou souhaitez-vous que les crédits varient aussi par contexte ?
5. **UE rattachée à l'affectation (`subject_offerings.teaching_unit_id`), pas à la matière elle-même** : une même matière peut appartenir à une UE différente selon le programme où elle est enseignée. D'accord ?

---

## 7. Développement et tests

| Étape | Résultat |
|---|---|
| Migration Prisma (`subjects`, `teaching_units`, `subject_offerings` ; colonnes additives sur `AcademicYear`/`AcademicPeriod`/`Filiere`/`Level`/`User`) | ✅ Appliquée (technique non interactive habituelle : `migrate diff` → dossier de migration manuel → `migrate deploy` → `generate`) |
| Seed (9 permissions `MATIERES`/`MATIERES_IMPORT`, ajout additif `EXPORT`/`IMPRESSION` sur `ANNEES`/`FILIERES`/`NIVEAUX`/`CLASSES` — aucune permission existante modifiée) | ✅ Appliqué (138 permissions au total, contre 121 avant) |
| `packages/shared` (schémas Zod : `subject`, `teachingUnit`, `subjectOffering`, `pedagogicalValidation`, `pedagogicalDashboard`, `subjectImport`) | ✅ |
| `packages/api` (services `subjectService`, `teachingUnitService`, `subjectOfferingService` — résolution par spécificité réutilisée du Module 4.2 —, `pedagogicalValidationService`, `pedagogicalDashboardService`, `subjectImportService` ; 6 routers composés) | ✅ |
| `apps/desktop` : nouvelle sous-section "Structure pédagogique" dans Paramètres (Matières, Unités d'enseignement, Affectations, Validation pédagogique, Tableau de bord pédagogique, assistant d'import) | ✅ |
| Tests unitaires (résolution par spécificité — 4 cas) | ✅ 4 tests supplémentaires, tous verts (62 au total sur `packages/api`) |
| Lint / typecheck / build sur les 5 packages | ✅ Tous verts |
| Vérification de bout en bout contre PostgreSQL réel (affectation générique vs spécifique à une filière, rejet d'un doublon de portée exacte, résolution retenant bien l'affectation la plus spécifique, total des crédits d'UE calculé et jamais stocké, diagnostic de validation pédagogique détectant une matière obligatoire manquante sur un semestre sans affectation tout en restant silencieux sur un semestre correctement configuré, import Excel/CSV validant puis créant une matière tout en rejetant un code déjà existant) | ✅ Toutes les vérifications passées, données de test nettoyées |
| Démarrage réel du serveur API + appel HTTP/tRPC non authentifié sur `subjects.list` | ✅ Rejeté proprement en 401, aucune erreur de démarrage |

## 8. Validation

Conception validée le 2026-07-27 ("OUI"). Développement, tests et vérification de bout en bout terminés (§7) le 2026-07-27. Parcours des écrans de la section "Structure pédagogique" (Paramètres) testé manuellement et confirmé par le porteur du projet le 2026-07-27. **Module 2.1 validé.**

À la demande du porteur du projet, une fois le module livré : extension du design system (`packages/ui`) — en-têtes de tableaux et boutons `outline`/`ghost` recolorés (fond bleu, texte blanc), nouvelle variante `Button` `success` (verte), recoloration sémantique des boutons d'action existants dans toute l'application (rouge pour désactiver/supprimer/mettre fin/délier/annuler une inscription, vert pour réactiver/activer/restaurer/réinscrire) — le menu latéral a été volontairement laissé inchangé sur demande explicite.

---

*Module 2.1 terminé et validé.*
