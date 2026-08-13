# Module 8 — Paie des enseignants et du personnel

**Statut** : ✅ **Terminé — validé le 2026-07-28** (conception validée — "je suis ok" ; parcours des écrans testé et confirmé par le porteur du projet — "oui c'est bon", après correction de deux anomalies détectées lors du test, voir §8).
**Dépend de** : Module 1 (Identité & Accès, validé), Module 2 (Paramètres — établissement/campus, validé), Module 4.3 (Paiements — modes de paiement réutilisés, validé), Module 5 (Gestion des enseignants — affectations/charge horaire réutilisées, en attente de votre test manuel), Module 7 (Comptabilité — intégration conditionnelle, validé).
**Source** : Chapitre 11 du cahier des charges (reçu le 2026-07-27), intitulé par vous "Module 10". Sections transmises : §11.3, §11.4, §11.5, §11.6, §11.10, §11.18 (les §11.1-11.2, §11.7-11.9, §11.11-11.17 n'ont pas été transmises — voir §0).

---

## 0. Notes de numérotation et de périmètre

**Numérotation.** "Module 10" est déjà pris dans `ROADMAP.md` (Tableau de bord & Rapports décisionnels — KPI transverses, sans rapport avec la paie). L'emplacement **"Module 8 — RH & Paie"** (dépend du Module 5, non commencé) est en revanche déjà réservé pour exactement ce domaine ("Employés administratifs, heures, avances, bulletins de paie"). Je numérote donc ce chapitre **"Module 8"**.

**Sections manquantes.** Seules six des dix-huit sous-sections attendues du chapitre ont été transmises (§11.3 Périodes de paie, §11.4 Modes de calcul, §11.5 Personnel administratif enseignant, §11.6 Calcul mensuel automatique, §11.10 Bulletin de paie, §11.18 Tableau de bord). Il manque notamment §11.1 (objectif détaillé), §11.2 (création d'un employé — champs exacts), §11.7-§11.9 (barèmes précis de primes/indemnités/retenues/cotisations), §11.11-§11.17 (dossier numérique employé, historique, recherche, sécurité détaillée, intégration, base de données proposée par vous, documentation). J'ai conçu ce qui suit à partir des six sections reçues et des principes déjà établis dans le reste de l'ERP ; les points où j'ai dû **interpréter** faute de texte sont marqués **[interprétation]** et repris en §6 pour validation explicite — je préfère vous les soumettre plutôt que d'inventer silencieusement des règles de paie, un domaine sensible.

## 1. Analyse fonctionnelle

### 1.1 `Employee` : sujet de paie unique, y compris pour les enseignants — **[interprétation]**

Le personnel administratif n'a pas de fiche ailleurs dans l'ERP : il faut une nouvelle entité `employees`. Mais les enseignants ont déjà une fiche complète au Module 5 (`teachers`) — et le §11.5 dit explicitement qu'un employé administratif peut aussi enseigner, "les matières lui sont affectées **depuis le module Enseignants**". Reconstruire une fiche personnelle complète et parallèle sur `employees` pour les enseignants dupliquerait identité/contact déjà portés par `teachers` (violerait le principe n°6 et le risque de désynchronisation).

Je propose donc : `employees` est le **sujet de paie unique** (administratifs purs ET enseignants payés), avec `teacher_id` **optionnel** :
- **Personnel purement administratif** (Secrétaire, Comptable, Chauffeur...) : `teacher_id = null`, identité (nom/prénom/téléphone/email/photo...) portée directement par `employees`.
- **Enseignant payé** (avec ou sans rôle administratif) : `teacher_id` renseigné vers un `Teacher` existant (Module 5) ; l'identité de l'employé est alors **lue depuis `teachers`, jamais recopiée** — les colonnes d'identité de `employees` restent `null` dans ce cas (contrôlé côté service). Les affectations pédagogiques et la charge horaire restent exclusivement sur `teacher_assignments` (Module 5), jamais dupliquées ici.

Ce modèle couvre nativement le cas "Directeur des Études qui assure un cours" (§11.5) : une seule fiche `employees` (catégorie = Directeur des Études, salaire fixe), avec `teacher_id` renseigné pour que le Module 5 gère ses affectations de matières.

### 1.2 Catégories de personnel — référentiel configurable, découplé des rôles RBAC

Le §11.4.B liste des catégories ("Directeur Général, Directeur de Campus... toute autre catégorie créée par l'établissement") qui **ressemblent** aux codes de rôles système du Module 1 (`SYSTEM_ROLES`), mais ce sont deux concepts différents : le rôle RBAC détermine ce qu'un utilisateur peut **faire dans le logiciel** (permissions), la catégorie d'employé détermine son **poste réel pour la paie** (un Comptable pourrait très bien ne jamais se connecter à l'ERP). Je crée donc un référentiel indépendant `employee_categories` (configurable, comme `PaymentMethod`/`EnrollmentRegime`/`TeacherStatus`), plutôt que de réutiliser `roles` — coupler les deux aurait signifié qu'changer le poste RH de quelqu'un modifie accidentellement ses permissions applicatives, ou l'inverse.

### 1.3 Mode de rémunération de l'enseignant (§11.4.A)

`employees.salary_mode` (`FIXE` / `HORAIRE`), configurable par employé :
- `FIXE` : `fixed_monthly_salary` (toujours utilisé si `teacher_id` est `null`, c'est-à-dire personnel administratif — §11.4.B l'impose).
- `HORAIRE` : uniquement possible si `teacher_id` est renseigné ; `hourly_rate` × heures du mois = salaire de base. Voir §1.4 pour la source des heures.

### 1.4 Heures "réellement exécutées et validées" — **[interprétation, point ouvert clé]**

Le §11.4.A.2 demande de "récupérer les heures de cours **réellement effectuées et validées**". Aucun mécanisme de présence/exécution réelle de cours n'existe encore dans l'ERP — le Module 5 ne porte que les **affectations planifiées** (`teacher_assignments` + volumes horaires de la `SubjectOffering`), pas un journal de présence enseignant réel (cela relèverait d'un futur module Emploi du temps + Présences, explicitement hors périmètre du Module 5, voir sa doc §0). En l'absence de ce suivi, je propose d'utiliser en attendant les heures **planifiées** de l'enseignant sur le mois de paie (affectations actives × nombre de semaines du mois calendaire, même logique que `computeWorkloadFromPeriods` du Module 5) comme approximation — donc en pratique "réellement" reste "planifié" tant qu'un vrai suivi de présence n'existe pas. C'est un point à valider explicitement en §6 : je ne veux pas décider seul d'inventer une notion de "présence réelle" non demandée ailleurs dans le cahier des charges.

### 1.5 Personnel administratif enseignant (§11.5)

`employees.teaching_hours_paid` (booléen, configurable par employé) : quand `true` **et** `teacher_id` renseigné **et** `salary_mode = FIXE` (cas "Directeur des Études qui enseigne"), le calcul mensuel ajoute une rémunération complémentaire HORAIRE (à un `hourly_rate` propre, distinct du salaire fixe) en plus du fixe, calculée sur les mêmes heures planifiées que §1.4. Quand `false`, les heures d'enseignement de cet employé n'ont aucun impact sur sa paie (son salaire fixe seul est versé), conformément à "l'établissement pourra choisir... si ces heures donnent droit ou non à une rémunération supplémentaire".

### 1.6 Périodes de paie mensuelles (§11.3)

`pay_periods`, clé (année, mois) — **même granularité calendaire que `accounting_periods` du Module 7** (mois civil, jamais l'année universitaire) mais table distincte : `accounting_periods` n'est qu'un verrou binaire, alors qu'une période de paie a un cycle de vie plus riche explicitement demandé (`OUVERT` → `EN_COURS` → `CLOTURE`, date d'ouverture, date de clôture, date de paiement, utilisateur ayant validé). "Aucune paie ne pourra être modifiée après la clôture du mois, sauf par un administrateur autorisé" → contrôlé par une permission dédiée (`PAIE:ADMINISTRATION`) plutôt qu'un simple flag, cohérent avec le reste du RBAC de l'ERP.

### 1.7 Primes, indemnités, retenues, cotisations (§11.6) — **[interprétation, périmètre simplifié]**

Sans les barèmes détaillés (§11.7-§11.9 non transmises), je ne construis pas de règles de calcul automatique complexes (pourcentages progressifs, tranches...). Je propose un référentiel configurable `payroll_component_types` (type : PRIME / INDEMNITE / RETENUE / COTISATION, libellé, montant par défaut optionnel) — même esprit que `ExpenseCategory` (Module 7) — dont des instances sont ajoutées manuellement à chaque ligne de paie (`payroll_line_components`), pas calculées automatiquement selon des règles métier non spécifiées. Une bibliothèque de barèmes pourra être ajoutée dans une version ultérieure, une fois les règles précises fournies.

### 1.8 Avances sur salaire — **[interprétation]**

Modèle simple proposé : `salary_advances` (employé, montant, période d'octroi, période de déduction prévue, statut EN_ATTENTE/DEDUITE/ANNULEE). Pas d'échéancier multi-mois ni de taux d'intérêt (non demandés). Jamais supprimée physiquement.

### 1.9 Calcul mensuel automatique (§11.6)

`payroll_lines` (une ligne par employé × période de paie) : capture le calcul complet (salaire de base, heures prévues/réalisées, heures supplémentaires, primes, indemnités, retenues, avances déduites, cotisations, brut, net). Statut `BROUILLON` → `CALCULEE` → `VALIDEE`. Recalculable tant que non `VALIDEE` (le calcul écrase le brouillon précédent) ; figée dès validation, cohérent avec "aucune paie modifiée après clôture".

### 1.10 Bulletin de paie (§11.10)

Même traitement que le reçu de paiement (Module 4.3, ADR-026) et les rapports financiers (Module 7) : écran HTML/CSS imprimable réutilisant les données déjà en base (logo, coordonnées, signataire, cachet du Module 2), pas de second moteur PDF avant le futur Module 9 (Documents officiels). Le "QR Code (prévoir l'architecture)" est traité comme les reçus : un champ `verification_code` réservé sur `payroll_lines`, sans génération d'image QR pour l'instant. L'archivage "automatique dans le dossier numérique de l'employé" ne nécessite pas de nouvelle table : la ligne de paie validée, une fois figée, **est** l'archive consultable et réimprimable à tout moment — comme un paiement validé sert déjà d'archive pour son reçu.

### 1.11 Intégration comptable (Module 7) — **[interprétation]**

La consigne de clôture du chapitre demande que la paie soit "intégrée à la comptabilité de l'ERP". Je propose de réutiliser le mécanisme conditionnel du Module 7 (ADR-028) : une nouvelle ligne de configuration singleton `payroll_settings.salary_expense_account_id` (nullable) pour le compte de charges de personnel, combinée au `linked_account_id` déjà existant sur le `PaymentMethod` choisi pour le paiement (trésorerie). Si l'un des deux comptes manque, **aucune écriture n'est générée** — le bulletin reste valide mais non comptabilisé, exactement le principe déjà appliqué aux paiements et dépenses.

### 1.12 Tableau de bord (§11.18)

Calculé à la volée depuis `payroll_lines` de la période sélectionnée (et cumul de l'année) : masse salariale du mois/année, nombre d'employés payés/en attente, ventilation enseignants vs administratifs, coût des heures d'enseignement, total primes/retenues, historique des paiements mensuels (barres CSS, cohérent avec ADR-030).

### 1.13 Recommandation du chapitre — futur Module RH

Le chapitre recommande un futur module RH (congés, absences, autorisations, sanctions, évaluations, formations). Je le note dans le backlog `ROADMAP.md` comme extension possible du Module 8 (ou nouveau module dédié) — **non construit maintenant**, sauf demande explicite ultérieure.

### 1.14 Hors périmètre de cette version

| Élément | Traitement |
|---|---|
| Suivi réel des présences/heures exécutées | N'existe nulle part dans l'ERP — proxy sur heures planifiées en attendant, voir §1.4 |
| Barèmes automatiques de primes/indemnités/retenues/cotisations | Référentiel configurable + saisie manuelle par ligne, pas de calcul automatique de barème (§11.7-§11.9 non transmises) |
| Rendu PDF réel + image QR Code | Placeholder jusqu'au futur Module 9, comme les reçus et rapports |
| Congés/absences/sanctions/évaluations/formations du personnel | Futur module RH recommandé par le chapitre, non construit ici |
| Paie détaillée des enseignants au sein d'un même Employee multi-établissement/multi-campus | Hors périmètre V1 (mono-campus, cohérent avec ADR-005) |

---

## 2. Conception de la base de données

```
employee_categories (référentiel configurable — Directeur Général, Secrétaire, Comptable..., extensible)
├── id, code (unique), label, is_active
└── created_at / updated_at

employees (sujet de paie unique — administratifs ET enseignants payés)
├── id, matricule (unique, généré via le moteur de numérotation — purpose EMPLOYE)
├── category_id → employee_categories.id
├── department (texte libre, nullable)
├── contract_type_id → teacher_contract_types.id (RÉUTILISÉ du Module 5, nullable — voir §6 point 3)
├── teacher_id → teachers.id (nullable, unique — Module 5, jamais dupliqué)
├── last_name, first_name, gender, phone_primary, phone_secondary, email, address, photo_path, hire_date
│    (tous nullables — ignorés et lus depuis `teachers` quand teacher_id est renseigné, voir §1.1)
├── salary_mode (FIXE | HORAIRE — HORAIRE valide seulement si teacher_id renseigné)
├── fixed_monthly_salary (nullable)
├── hourly_rate (nullable)
├── teaching_hours_paid (bool, défaut false — §1.5)
├── archived_at / archived_reason / archived_by
└── created_at / updated_at

pay_periods (mois de paie — clé année+mois, distincte de accounting_periods)
├── id, year, month, status (OUVERT | EN_COURS | CLOTURE)
├── opened_at, closed_at (nullable), payment_date (nullable)
├── validated_by → users.id (nullable)
└── created_at / updated_at
   (@@unique[year, month])

payroll_component_types (référentiel configurable — primes/indemnités/retenues/cotisations)
├── id, code (unique), label, kind (PRIME | INDEMNITE | RETENUE | COTISATION), is_active
└── created_at / updated_at

salary_advances (avances sur salaire — jamais supprimées)
├── id, employee_id → employees.id
├── amount, granted_pay_period_id → pay_periods.id
├── deduction_pay_period_id → pay_periods.id (nullable)
├── reason (nullable), status (EN_ATTENTE | DEDUITE | ANNULEE)
└── created_at / updated_at

payroll_lines (une ligne par employé × période — le bulletin figé après validation)
├── id, pay_period_id → pay_periods.id, employee_id → employees.id
├── base_salary, hours_planned (nullable), hours_worked (nullable), hourly_rate (nullable)
├── overtime_hours (nullable), overtime_amount (nullable)
├── total_primes, total_indemnites, total_retenues, total_advances_deducted, total_cotisations
├── gross_salary, net_salary
├── payment_method_id → payment_methods.id (RÉUTILISÉ du Module 4.3, nullable)
├── status (BROUILLON | CALCULEE | VALIDEE)
├── verification_code (nullable — réservé pour un futur QR code, comme Payment)
├── calculated_at (nullable), validated_at (nullable), validated_by → users.id (nullable)
└── created_at / updated_at
   (@@unique[pay_period_id, employee_id])

payroll_line_components (détail des primes/indemnités/retenues/cotisations d'une ligne)
├── id, payroll_line_id → payroll_lines.id, component_type_id → payroll_component_types.id
├── amount
└── created_at

payroll_settings (singleton — intégration comptable conditionnelle, voir §1.11)
├── id, salary_expense_account_id → chart_accounts.id (RÉUTILISÉ du Module 7, nullable)
└── updated_at
```

**Aucune table existante modifiée**, hormis l'extension additive habituelle de `NumberingPurpose` (gagne `EMPLOYE`, 8ᵉ réutilisation du moteur de numérotation). Réutilisations : `teachers`/`teacher_assignments` (Module 5, jamais redéfinis), `teacher_contract_types` (Module 5, réutilisé tel quel — voir §6 point 3), `payment_methods` (Module 4.3), `chart_accounts` (Module 7), `users` (Module 1).

---

## 3. Règles métier

1. **`employees` = sujet de paie unique.** Personnel administratif pur (`teacher_id = null`) porte sa propre identité ; enseignant payé (`teacher_id` renseigné) a son identité lue depuis `teachers`, jamais recopiée.
2. **Mode de rémunération** : `FIXE` obligatoire si `teacher_id` est `null` ; `HORAIRE` possible seulement si `teacher_id` est renseigné.
3. **Heures "réellement exécutées"** = proxy sur les affectations planifiées actives (Module 5) tant qu'aucun suivi de présence réel n'existe (voir §1.4, à confirmer §6).
4. **Personnel administratif enseignant** : `teaching_hours_paid` décide, par employé, si les heures d'enseignement ajoutent une rémunération HORAIRE complémentaire au salaire FIXE conservé.
5. **Périodes de paie** : cycle `OUVERT` → `EN_COURS` → `CLOTURE`, jamais de suppression ; aucune modification d'une ligne de paie après clôture de sa période sauf permission `PAIE:ADMINISTRATION` explicite.
6. **Calcul recalculable** tant que `BROUILLON`/`CALCULEE` ; figé dès `VALIDEE`.
7. **Primes/indemnités/retenues/cotisations** : référentiel configurable + saisie manuelle par ligne, aucun barème automatique inventé (sections non transmises).
8. **Avances** jamais supprimées physiquement, seulement marquées déduites/annulées.
9. **Intégration comptable** conditionnée à la configuration explicite des comptes (charges de personnel + trésorerie du mode de paiement) — jamais d'écriture partielle/déséquilibrée, jamais de calcul inventé si non configuré (même principe qu'ADR-028).
10. **Sécurité** : `PAIE:*` (périodes, tableau de bord, réglages), `PAIE_EMPLOYES:*` (fiches employés), `PAIE_BULLETINS:*` (calcul/validation des bulletins), `PAIE_AVANCES:*`. Toutes les opérations journalisées dans `audit_log`.

## 4. UI/UX

- Nouvelle section **"Paie"** dans la navigation principale : Tableau de bord, Employés (liste/fiche), Périodes de paie (ouverture, calcul, contrôle, validation, clôture), Bulletins (par période, réimprimables), Avances.
- Nouvelle sous-section **"Paie"** dans Paramètres : Catégories d'employés, Composants de paie (primes/indemnités/retenues/cotisations), Réglages (compte de charges de personnel).
- Fiche employé à onglets, sur le modèle de la fiche enseignant : Identité (masquée/en lecture depuis `teachers` si lié à un enseignant), Paie (mode de rémunération, salaire/tarif, historique des bulletins), Avances.
- Bulletin de paie imprimable réutilisant logo/coordonnées/signataire/cachet du Module 2, même mécanisme `[data-print-area]` que les reçus.
- Respect intégral du Design System (zébrage, couleurs par pertinence, `DataTable`/`ServerDataTable`).

## 5. Permissions

| Code | Usage |
|---|---|
| `PAIE:LECTURE`/`ADMINISTRATION` | Tableau de bord, réglages, modification après clôture |
| `PAIE_EMPLOYES:LECTURE`/`CREATION`/`MODIFICATION`/`SUPPRESSION`/`EXPORT`/`IMPRESSION` | Fiches employés, catégories |
| `PAIE_BULLETINS:LECTURE`/`CREATION`/`MODIFICATION`/`VALIDATION`/`IMPRESSION` | Calcul, contrôle, validation, impression des bulletins ; ouverture/clôture des périodes |
| `PAIE_AVANCES:LECTURE`/`CREATION`/`MODIFICATION`/`SUPPRESSION` | Avances sur salaire |

## 6. Points ouverts — merci de valider avant les migrations

1. **Numérotation "Module 8"** (§0) : d'accord ?
2. **`employees` comme sujet de paie unique**, avec `teacher_id` optionnel liant à un `Teacher` existant (identité jamais dupliquée quand lié) — confirmez ce modèle (§1.1), ou préférez-vous une fiche employé totalement indépendante même pour les enseignants (au prix d'une duplication d'identité) ?
3. **Réutilisation de `teacher_contract_types`** tel quel pour les employés administratifs (nom du modèle resterait "teacher_..." bien qu'utilisé aussi pour l'administratif) — confirmez, ou préférez-vous que je le renomme en `contract_types` générique (migration supplémentaire sans risque, le Module 5 n'ayant pas encore été testé manuellement en production) ?
4. **Heures "réellement exécutées et validées"** (§1.4, point le plus important) : en l'absence de tout suivi de présence réel dans l'ERP, j'utiliserais les heures **planifiées** (affectations Module 5) comme approximation. Confirmez cette approche provisoire, ou préférez-vous que le mode HORAIRE reste indisponible tant qu'un vrai suivi de présence n'est pas construit ?
5. **Primes/indemnités/retenues/cotisations** : référentiel configurable + saisie manuelle par ligne de paie (pas de barème automatique, §11.7-§11.9 non transmises) — confirmez ce périmètre simplifié pour cette première version ?
6. **Avances sur salaire** : modèle simple (montant + période d'octroi + période de déduction prévue) — confirmez, ou avez-vous une logique plus précise (échéancier, plafond, taux) ?
7. **Intégration comptable automatique** à la validation d'un bulletin, conditionnée à un compte de charges de personnel configuré (§1.11) — confirmez, ou préférez-vous reporter cette intégration ?
8. **QR code du bulletin** : champ réservé uniquement (comme les reçus), aucun rendu d'image ni PDF réel avant le Module 9 — confirmez ce traitement identique ?
9. **Futur module RH** (congés, absences, sanctions, évaluations, formations) recommandé par le chapitre : je l'ajoute au backlog `ROADMAP.md` sans le construire maintenant — d'accord ?
10. **Sections manquantes** (§11.1-11.2, §11.7-11.9, §11.11-11.17, voir §0) : le périmètre ci-dessus est ma meilleure interprétation des six sections reçues. Si vous disposez du texte des sections manquantes, merci de me les transmettre avant les migrations si elles changent la conception (notamment §11.2 sur les champs exacts de la fiche employé).

---

## 7. Développement et tests

| Étape | Résultat |
|---|---|
| Migration Prisma (`employees`, `employee_categories`, `pay_periods`, `payroll_component_types`, `salary_advances`, `payroll_lines`, `payroll_line_components`, `payroll_settings` + `NumberingPurpose.EMPLOYE`) | ✅ Appliquée (technique non interactive habituelle) |
| Seed (12 catégories d'employés, 5 composants de paie par défaut, 17 permissions `PAIE*`/`PAIE_EMPLOYES*`/`PAIE_BULLETINS*`/`PAIE_AVANCES*`, réglages singleton) | ✅ Appliqué (170 permissions au total) |
| `packages/shared` (schémas Zod : `employeeCategory`, `employee`, `payPeriod`, `payrollComponentType`, `salaryAdvance`, `payrollLine`, `payrollSettings`, `payrollDashboard`) | ✅ |
| `packages/api` (`employeeCategoryService`, `employeeService` — identité résolue depuis `teachers` sans duplication —, `payPeriodService` — cycle OUVERT/EN_COURS/CLOTURE —, `payrollComponentTypeService`, `salaryAdvanceService`, `payrollLineService` — calcul réutilisant les affectations du Module 5, fonctions pures `intersectDateRanges`/`computeMonthlyPlannedHours`/`computePayrollTotals` testées séparément —, `payrollSettingsService`, `payrollDashboardService` ; `journalEntryService` étendu (`recordPayrollValidationEntry`, intégration comptable conditionnelle) ; `matriculeService` étendu (`generateEmployeeNumber`, 8ᵉ réutilisation) ; 8 routers composés) | ✅ |
| `apps/desktop` : section "Paie" (Tableau de bord, Employés avec fiche à onglets, Périodes de paie avec calcul/validation/clôture, bulletin de paie imprimable réutilisant le modèle "BULLETIN" déjà existant, Avances), sous-section "Paie" dans Paramètres (Catégories d'employés, Composants de paie, Réglages) | ✅ |
| Tests unitaires (intersection de dates, heures planifiées mensuelles, calcul brut/net — fonctions pures) | ✅ 7 tests supplémentaires, tous verts (74 au total sur `packages/api`) |
| Lint / typecheck / build sur les 5 packages | ✅ Tous verts |
| Vérification de bout en bout contre PostgreSQL réel (employé lié à un enseignant avec identité résolue sans duplication, employé administratif pur, salaire horaire calculé depuis les affectations réelles du Module 5, salaire fixe exact, avance sur salaire automatiquement incluse puis déduite à la validation, rémunération complémentaire d'enseignement pour un employé administratif enseignant conservant son fixe, ajout d'une prime recalculant brut/net, clôture de période bloquée tant que tous les bulletins ne sont pas validés puis réussie une fois tous validés, écriture comptable générée automatiquement une fois le compte de charges configuré puis absente sinon, bulletin figé et non recalculable après validation, aucune modification possible après clôture, tableau de bord calculé) | ✅ Toutes les vérifications passées, données de test nettoyées, réglages comptables restaurés |
| Démarrage réel du serveur API + appel HTTP/tRPC non authentifié sur `employees.list` | ✅ Rejeté proprement en 401, aucune erreur de démarrage |

## 8. Validation

Conception validée le 2026-07-27 ("je suis ok"). Développement terminé et vérifié techniquement (§7) le 2026-07-27.

Test manuel du 2026-07-28 : deux anomalies réelles détectées et corrigées immédiatement —
1. **Formulaire "Nouvel employé" silencieusement bloqué** : le champ "Catégorie" (obligatoire) restait vide par défaut et l'erreur de validation n'était pas assez visible — l'utilisateur cliquait "Créer" sans qu'aucune requête ne parte jamais au serveur, et sans comprendre pourquoi (0 employé n'a jamais pu être créé). Corrigé en présélectionnant automatiquement la première catégorie active et en rendant le message d'erreur explicite ("La catégorie est obligatoire.").
2. **Recherche d'employé incomplète** : chercher un employé par le matricule de l'enseignant auquel il est lié (au lieu de son propre matricule ou de son nom) ne renvoyait aucun résultat. Corrigé en ajoutant `teacher.matricule` au filtre de recherche.

Un troisième bug, hors périmètre strict de la paie mais découvert pendant le même test, a aussi été corrigé : ouvrir une période de paie déjà existante renvoyait une erreur technique brute (HTTP 500) au lieu d'un message clair — désormais : "La période *mois année* est déjà ouverte."

Après ces corrections, parcours complet reconfirmé par le porteur du projet ("oui c'est bon"). **Module 8 validé.**

---

## 9. Révision — saisie des heures entièrement manuelle (2026-08-08)

Retour du porteur du projet : "je veux que lorsque j'ouvre une période ou un mois de paie que rien ne soit automatique, je veux saisir les heures exécutées pour tout le monde [...] je veux pouvoir manuellement mettre à jour ces heures à chaque fois puis valider." Trois changements, confirmés en deux allers-retours avant modification (calcul de paie = argent, jamais deviné) :

1. **Bug corrigé — pré-remplissage silencieux du tarif horaire.** À la création d'un employé, le champ "Tarif horaire" se remplissait automatiquement depuis `payrollSettings.defaultHourlyRate` (réglages de paie), donnant l'impression d'une valeur "par défaut enregistrée" jamais explicitement saisie. Supprimé (`EmployeeFormScreen.tsx`) — le champ reste vide tant que l'utilisateur ne le remplit pas lui-même.
2. **Estimation automatique des heures retirée du calcul.** `calculatePayrollLine` proposait jusqu'ici une estimation d'heures travaillées calculée depuis les affectations pédagogiques actives (classes × heures/semaine × semaines chevauchant le mois) ou depuis le pointage numérique (déjà abandonné par ailleurs, voir §1.10 historique). Cette estimation est supprimée : "Calculer" crée désormais une ligne à 0 heure / 0 salaire de base pour un enseignant, à saisir entièrement à la main (`updatePayrollLineHours`) puis à valider. Une saisie manuelle déjà présente n'est jamais écrasée par un recalcul (comportement inchangé). Les fonctions pures sous-jacentes (`computeMonthlyPlannedHours`, `intersectDateRanges`, `getTeacherPayrollHours`) restent dans le code et sous test — non appelées, pas supprimées, pour rester réversible sans reconstruire cette logique si un besoin futur le justifie.
3. **Champ heures rendu disponible pour tout employé lié à un enseignant.** Avant ce correctif, le champ de saisie des heures n'apparaissait dans le détail d'un bulletin que si l'employé était en mode "Selon les heures" ou avait la case "heures d'enseignement rémunérées" cochée — un enseignant créé avec les réglages par défaut (mode "Salaire fixe", case décochée) n'avait jamais ce champ et restait bloqué à 0 GNF sans explication visible. Nouveau champ `employeeIsLinkedToTeacher` sur `PayrollLineDto`, la saisie des heures est maintenant systématiquement disponible dès qu'un employé est lié à un enseignant, indépendamment du mode de rémunération. La formule de calcul du salaire (`computeBaseSalary`) n'a **pas** été modifiée : en mode "Salaire fixe" sans la case cochée, les heures saisies restent informatives et n'affectent pas le salaire de base — un message explicite l'indique désormais dans le bulletin plutôt que de laisser deviner pourquoi le montant ne bouge pas.

4. **Mode "Selon les heures" présélectionné depuis "Ajouter à la paie".** Le porteur du projet a demandé une clarification : pourquoi un enseignant doit-il être "enregistré comme employé" alors que les enseignants ne touchent normalement pas un salaire fixe ? Réponse apportée : `Employee` est le sujet de paie unique (voir §1.1) — "employé" n'y signifie pas "salaire fixe", c'est justement le rôle du champ `salaryMode`. Ceci révèle un vrai défaut d'ergonomie : `EmployeeFormScreen.tsx` démarrait toujours en mode "Salaire fixe" par défaut, même en arrivant via "Ajouter à la paie" depuis une fiche enseignant (où `teacherId` est déjà pré-rempli). Corrigé : le mode par défaut est désormais "Selon les heures" dès que `prefillTeacherId` est présent ; reste "Salaire fixe" pour un employé créé sans enseignant lié.

Vérifié : suite complète (176 tests, 30 fichiers) sans régression, `typecheck` + `build` de `packages/api`/`apps/desktop` propres.

5. **Précision demandée : la fiche d'émargement (Module 9) n'est pas la paie.** Le porteur du projet a ensuite signalé deux problèmes sur "Émargement (mensuel)" (génération en lot des fiches papier signées, écran distinct de la paie ci-dessus) : (a) aucun aperçu/impression possible après génération en lot — corrigé, la page liste désormais chaque fiche générée avec un lien "Voir le PDF", comme le fait déjà la génération individuelle ; (b) un vrai bug empêchait la génération de fonctionner du tout : la page demandait jusqu'à 500 enseignants d'un coup alors que `teacherListFilterInputSchema` plafonne `pageSize` à 200 — la requête échouait silencieusement (aucune erreur affichée par défaut), affichant "0 enseignant" et un bouton grisé sans explication ; corrigé (`pageSize: 200` + message d'erreur visible en cas d'échec futur).

   À cette occasion, le porteur du projet a demandé que le volume horaire prévu de chaque fiche d'émargement soit calculé automatiquement depuis le calendrier réel des affectations de l'enseignant ce mois-ci, plutôt qu'une valeur unique saisie à la main pour tout le monde — **explicitement pas la même demande que le retrait de l'automatisation en paie ci-dessus** : la fiche d'émargement reste un document administratif (signatures manuscrites), pas un calcul financier, une suggestion pré-remplie y reste donc utile et n'est pas contraire à "rien d'automatique" pour la paie. Nouvelle procédure `teacherAssignments.getPlannedHoursForMonth`, réutilisant telle quelle `computeMonthlyPlannedHours` (déjà présente, désormais uniquement pour cet usage). Câblée dans `TeacherEmargementTab.tsx` (suggestion pré-remplie, toujours modifiable) et `BulkEmargementScreen.tsx` (calcul propre à chaque enseignant, plus jamais une valeur forfaitaire partagée) — le document lui-même (`documentEngineService.ts`) n'a pas été touché, conformément à la demande explicite. Nouvel utilitaire testé `resolveCalendarYearForMonth` (`apps/desktop/src/renderer/src/lib/academicCalendar.ts`) pour résoudre l'année calendaire correcte à partir d'une année scolaire (toujours à cheval sur deux années) et d'un mois.

   Vérifié : 176 tests API + 12 tests desktop (dont 3 nouveaux pour `resolveCalendarYearForMonth`) sans régression, `typecheck` + `build` de `packages/api`/`apps/desktop` propres.
