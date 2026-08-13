# Module 7 — Comptabilité générale et gestion financière

**Statut** : ✅ **Terminé — validé le 2026-07-27** (développement autonome intégral autorisé avant l'absence du porteur du projet — "JE VALIDE" à son retour).
**Dépend de** : Module 0/1/2 (validés), Module 4 (Étudiants, validé), Module 4.2 (Frais de scolarité, validé — référentiel unique des tarifs), Module 4.3 (Paiements et caisse, validé — référentiel unique des montants payés).
**Source** : Chapitre 8 du cahier des charges (reçu le 2026-07-27), intitulé par vous "Module 7". Voir §0.

---

## 0. Note de numérotation et d'autorisation

**Numérotation** : contrairement aux chapitres précédents, "Module 7" ne rentre pas en collision avec `ROADMAP.md` — la ligne 7 ("Finances") y était déjà réservée et son périmètre avait été explicitement réduit lors du Module 4.3 à "bilan / comptabilité générale" (dépendances déjà posées : 4, 4.2, 4.3), exactement ce que couvre ce chapitre. Pas de sous-numéro décimal nécessaire : ce module occupe simplement l'emplacement "7" déjà prévu, renommé "Comptabilité générale et gestion financière".

**Autorisation** : votre message d'autorisation portait dans son en-tête sur "Module 6 – Gestion des Paiements et de la Caisse" (déjà livré et validé au Module 4.3) — un décalage manifeste de copier-coller par rapport au contenu réellement joint ("CHAPITRE 8 : MODULE 7 – COMPTABILITÉ GÉNÉRALE ET GESTION FINANCIÈRE"). Je traite l'autorisation de travail autonome comme portant sur le chapitre effectivement transmis (Comptabilité), signale l'écart ici pour traçabilité, et m'arrête à la fin de ce module comme demandé.

## 1. Analyse fonctionnelle

### 1.1 Comptabilité en partie double — condition de "bonnes pratiques comptables"

Le chapitre demande explicitement un Grand Livre et une Balance comptable "conformes aux bonnes pratiques comptables" : ces deux états n'ont de sens que sur une **comptabilité en partie double** (chaque écriture = un ensemble de lignes débit/crédit, dont la somme des débits égale toujours la somme des crédits). Le modèle central est donc `journal_entries`/`journal_entry_lines`, pas une simple liste de mouvements. C'est la seule façon de garantir "l'intégrité des écritures comptables" (§8.17) sans réinventer une comptabilité approximative.

### 1.2 Génération automatique — intégration avec Paiements (4.3) sans duplication

"Aucune écriture ne devra être créée manuellement si elle peut être générée automatiquement" (§8.3) et "toutes les écritures devront être générées automatiquement à partir des opérations des autres modules" (§8.14). Concrètement, pour rester fidèle au principe n°6 (pas de duplication de logique) :
- `payment_methods` (Module 4.3, référentiel déjà en place) reçoit une colonne additive `linked_account_id` (compte de trésorerie associé — Caisse, Banque...).
- `fee_types` (Module 4.2) reçoit une colonne additive `revenue_account_id` (compte de produits associé).
- À la création ou à l'annulation d'un paiement (`paymentService.createPayment`/`cancelPayment`), ce module génère automatiquement l'écriture correspondante **si et seulement si** le mode de paiement et chaque type de frais concerné ont un compte configuré. Si un compte manque, **aucune écriture partielle ou déséquilibrée n'est créée** — le paiement reste enregistré normalement (Module 4.3 inchangé), simplement non comptabilisé tant que le plan comptable n'est pas relié. C'est le même principe que "aucun calcul inventé" déjà appliqué au Module 4.2/4.3 (`paidAmountAvailable`), appliqué ici à la comptabilisation automatique.
- Même logique pour les dépenses : `expense_categories` reçoit un `default_account_id` (compte de charges), relié au `linked_account_id` du mode de paiement utilisé.

### 1.3 Dépenses — workflow d'approbation

Une dépense suit un statut (`BROUILLON` → `EN_ATTENTE_APPROBATION` → `APPROUVEE`/`REJETEE`) — "approuver les dépenses selon les droits des utilisateurs" (§8.4). L'écriture comptable n'est générée qu'à l'**approbation** (une dépense en attente n'a pas encore d'impact comptable réel), jamais recréée ensuite.

### 1.4 Recettes (§8.5) — lecture, pas duplication

"Afficher automatiquement toutes les recettes" est une vue filtrable/exportable sur les paiements déjà enregistrés par le Module 4.3 (`payments`/`payment_allocations`), pas une nouvelle table : ce module ne fait qu'exposer un écran "Recettes" dans sa propre section, alimenté par le service existant.

### 1.5 Verrouillage des périodes comptables (§8.15)

Une période (année/mois calendaire — distincte de l'année universitaire, une école a une année comptable, souvent civile) peut être verrouillée. Aucune écriture (automatique ou manuelle) ne peut plus être créée ou modifiée dans une période verrouillée. Le déverrouillage reste possible (traçé dans `audit_log`, comme la réouverture d'année universitaire du Module 2).

### 1.6 Annulation — jamais de suppression, contre-passation

"Aucune suppression définitive d'une écriture comptable" (§8.15). Une écriture erronée est **annulée par contre-passation** (une écriture miroir inverse générée automatiquement, liée à l'originale), jamais supprimée ni éditée — c'est la pratique comptable standard, et cohérent avec la politique de l'ERP (jamais de suppression physique sur les entités sensibles).

### 1.7 Plan comptable — configurable, pas un référentiel national figé

Le chapitre demande un plan comptable "configurable" avec numérotation configurable — pas explicitement le plan SYSCOHADA (zone OHADA, dont fait partie la Guinée) ni aucune norme précise. Je n'impose donc aucun plan figé : `chart_accounts` est un référentiel librement éditable par l'établissement (code, libellé, nature), avec un jeu de comptes par défaut raisonnable (Caisse, Banque, Produits de scolarité, Charges diverses, Fournisseurs) pour ne pas partir d'un système vide — modifiable/complétable à tout moment, comme les types de frais (Module 4.2) ou les régimes d'inscription (Module 4.1). La **nature** d'un compte (Actif/Passif/Trésorerie/Charge/Produit) reste un enum technique fixe : contrairement au libellé/numéro, ce n'est pas une donnée métier propre à l'établissement mais un concept comptable universel.

### 1.8 Fournisseurs

Référentiel simple (§8.10) : nom, coordonnées, contact, catégorie (texte libre plutôt qu'un référentiel séparé — proportionné au besoin exprimé), historique des paiements = vue calculée sur les dépenses liées à ce fournisseur (pas une table dupliquée).

### 1.9 Budget

Un budget annuel (année civile) réparti par catégorie de dépense (`budget_lines`), avec écart prévisionnel/réalisé calculé à la volée (somme des dépenses approuvées de la catégorie sur l'année) — jamais stocké, pour ne jamais désynchroniser prévisionnel affiché et réalisé réel.

### 1.10 Pièces justificatives

Réutilise la route d'upload de documents existante (Module 4, `/uploads/documents`) — nouvelle table `expense_documents` sur le même modèle que `student_documents` (plusieurs documents par dépense : facture, devis, reçu, contrat, autre).

### 1.11 Rapports et tableau de bord

- **Grand livre / Balance** : calculés depuis `journal_entry_lines` (la seule source qui garantit la cohérence débit=crédit).
- **Rapports par catégorie/utilisateur/caisse** : calculés directement depuis `expenses`/`payments` (dimensions naturelles de ces tables), pas depuis le journal — ces deux sources restent cohérentes entre elles puisque chaque dépense approuvée/chaque paiement valide a au plus une écriture associée.
- **Graphiques** : rendus en CSS (barres/listes colorées), cohérent avec le reste de l'ERP qui n'utilise aucune bibliothèque de graphiques à ce jour — pas de nouvelle dépendance introduite (le registre npm s'est montré instable sur cette machine).

### 1.12 Hors périmètre

| Élément | Couverture réelle |
|---|---|
| Écritures issues des "Salaires" | Futur Module 8 — RH & Paie (non construit). Le point d'intégration (compte de charge lié) sera le même mécanisme que pour les dépenses. |
| "Remboursements" comme source d'écriture | Aucune fonctionnalité de remboursement n'existe encore ailleurs dans l'ERP — rien à automatiser tant qu'elle n'existe pas ; prévu structurellement (annulation de paiement déjà gérée par le Module 4.3) mais pas de flux de sortie d'argent modélisé. |
| Conformité à une norme comptable nationale précise (SYSCOHADA...) | Plan comptable volontairement neutre/configurable — l'établissement doit lui-même le paramétrer selon ses obligations réelles ; non tranché ici faute de consigne explicite du cahier des charges. |
| Rendu PDF fichier des rapports/Grand livre/Balance | Écrans imprimables (impression native, comme les reçus du Module 4.3) + export Excel/CSV ; le rendu PDF fichier centralisé reste au Module 9. |

---

## 2. Conception de la base de données

```
chart_accounts (plan comptable configurable)
├── id, code (unique), label, type (ACTIF|PASSIF|TRESORERIE|CHARGE|PRODUIT), is_active
└── created_at / updated_at

accounting_periods (verrouillage — MODULE-07 §1.5)
├── id, year, month, is_locked, locked_at, locked_by
└── unique(year, month)

journal_entries (écriture comptable — en-tête)
├── id, entry_number (unique — numérotation généralisée, purpose = ECRITURE_COMPTABLE)
├── entry_date, label
├── source_module (ex. "PAIEMENTS", "DEPENSES", "MANUEL"), source_type (ex. "Payment", "Expense"), source_id (nullable)
├── status (VALIDEE | ANNULEE), reversal_of_id (nullable, auto-référence — écriture de contre-passation)
├── created_by, created_at, updated_at
└── cancelled_at / cancelled_reason / cancelled_by

journal_entry_lines
├── id, journal_entry_id → journal_entries.id
├── account_id → chart_accounts.id
├── debit, credit (l'un des deux à 0 — contrôlé côté service)
├── label (nullable)
└── created_at

expense_categories (référentiel configurable)
├── id, code, name, default_account_id → chart_accounts.id (nullable), is_active
└── created_at / updated_at

suppliers (fournisseurs)
├── id, code, name, address, phone, email, contact_person, category (texte libre, nullable), is_active
└── created_at / updated_at

expenses
├── id, expense_number (unique — numérotation généralisée, purpose = DEPENSE)
├── date, label, category_id → expense_categories.id, supplier_id → suppliers.id (nullable)
├── amount, payment_method_id → payment_methods.id (Module 4.3, réutilisé)
├── responsible_user_id → users.id, observations (nullable)
├── status (BROUILLON|EN_ATTENTE_APPROBATION|APPROUVEE|REJETEE|ANNULEE)
├── approved_by / approved_at (nullable), rejected_reason (nullable)
├── journal_entry_id → journal_entries.id (nullable — renseigné à l'approbation si les comptes sont configurés)
└── created_by, created_at, updated_at

expense_documents (pièces justificatives — même esprit que student_documents)
├── id, expense_id → expenses.id, document_type (FACTURE|DEVIS|RECU|CONTRAT|AUTRE)
├── file_path, file_name, mime_type, file_size_bytes, uploaded_by
└── created_at

budgets
├── id, year (unique), label (nullable)
└── created_at / updated_at

budget_lines
├── id, budget_id → budgets.id, category_id → expense_categories.id, allocated_amount
├── unique(budget_id, category_id)
└── created_at / updated_at
```

**Colonnes additives sur des tables existantes (aucune suppression, aucune donnée dupliquée)** :
- `payment_methods.linked_account_id` → `chart_accounts.id` (nullable) — Module 4.3.
- `fee_types.revenue_account_id` → `chart_accounts.id` (nullable) — Module 4.2.

**Réutilisations** :
- Numérotation généralisée (Module 4/4.1/4.3) : 2 nouveaux `purpose` (`ECRITURE_COMPTABLE`, `DEPENSE`) — 5ᵉ et 6ᵉ usages du même moteur de gabarit/compteur atomique. Le moteur est généralisé pour accepter une filière/année universitaire **optionnelles** (aucune des deux n'a de sens pour une écriture comptable ou une dépense).
- `payment_methods` (Module 4.3) réutilisé tel quel pour le mode de règlement d'une dépense.
- Route d'upload de documents existante (Module 4) réutilisée pour les pièces justificatives.
- Aucune table de "recettes" séparée : lecture directe de `payments`/`payment_allocations` (Module 4.3).

---

## 3. Règles métier

1. **Équilibre obligatoire** : toute écriture (`journal_entries` + `journal_entry_lines`) doit avoir somme(débit) = somme(crédit) sur l'ensemble de ses lignes — vérifié côté service avant insertion, dans une transaction ; jamais d'écriture déséquilibrée en base.
2. **Génération automatique conditionnelle** : un paiement/une dépense approuvée ne génère une écriture que si les comptes nécessaires (mode de paiement ↔ compte de trésorerie, type de frais/catégorie ↔ compte de produits/charges) sont configurés. Sinon, l'opération reste valide dans son module d'origine, simplement non comptabilisée.
3. **Aucune suppression, contre-passation uniquement** : annuler une écriture crée une écriture miroir (montants inversés) datée du jour de l'annulation, liée par `reversal_of_id` ; l'écriture d'origine passe en statut `ANNULEE` mais n'est jamais supprimée.
4. **Verrouillage de période** : aucune écriture (création ou contre-passation) n'est acceptée si sa date tombe dans une période verrouillée (`accounting_periods.is_locked`).
5. **Dépenses** : workflow `BROUILLON → EN_ATTENTE_APPROBATION → APPROUVEE/REJETEE`, écriture générée uniquement à l'approbation, jamais recréée si la dépense est modifiée après (une dépense approuvée n'est plus modifiable, seulement annulable par contre-passation de son écriture).
6. **Budget** : l'écart prévisionnel/réalisé est toujours calculé à la volée depuis les dépenses approuvées de l'année, jamais stocké.
7. **Grand livre / Balance / Tableau de bord** : calculés depuis `journal_entry_lines` uniquement, jamais depuis les tables sources — garantit l'équilibre débit/crédit global. **Une écriture `ANNULEE` continue de compter** dans ces calculs, au même titre que sa contre-passation (toujours `VALIDEE`) : c'est la paire {originale + contre-passation} qui se neutralise exactement à zéro, jamais l'originale seule — l'exclure aurait laissé un solde fantôme égal à la contre-passation (bogue identifié et corrigé pendant la vérification de bout en bout, voir §7).
8. **Sécurité** : `COMPTABILITE:*` pour le plan comptable, `ECRITURES:*` pour le journal/verrouillage, `DEPENSES:*`, `FOURNISSEURS:*`, `BUDGET:*`, `RAPPORTS_FINANCIERS:*` — permissions distinctes reflétant la sensibilité et les rôles différents (comptable vs direction), SUPER_ADMIN contourne comme partout ailleurs.
9. **Audit** : toute création/annulation d'écriture, création/approbation/rejet de dépense, verrouillage/déverrouillage de période est journalisée dans `audit_log`.

## 4. UI/UX

- Section **"Comptabilité"** dédiée dans la navigation principale, avec sous-écrans : **Tableau de bord financier** (recettes/dépenses du jour et du mois, trésorerie disponible, évolution récente), **Plan comptable** (CRUD), **Journal** (liste des écritures, création manuelle, annulation), **Grand livre** (par compte, par période), **Balance** (générale/par période/par compte, imprimable), **Dépenses** (liste, création, approbation, pièces jointes), **Fournisseurs** (CRUD, historique), **Recettes** (vue filtrée des paiements du Module 4.3), **Budget** (définition par catégorie, suivi des écarts), **Rapports** (jour/semaine/mois/année/catégorie/utilisateur/caisse, export Excel/CSV).
- Verrouillage de période visible et actionnable depuis le Journal.
- Respect intégral du Design System (zébrage, couleurs par pertinence, `ServerDataTable`/`DataTable` selon le volume).

## 5. Permissions

| Code | Usage |
|---|---|
| `COMPTABILITE:LECTURE`/`CREATION`/`MODIFICATION`/`SUPPRESSION` | Plan comptable |
| `ECRITURES:LECTURE`/`CREATION`/`SUPPRESSION`/`VALIDATION`/`EXPORT`/`IMPRESSION` | Journal, Grand livre, Balance ; `VALIDATION` = verrouillage/déverrouillage de période ; `SUPPRESSION` = annulation (contre-passation) |
| `DEPENSES:LECTURE`/`CREATION`/`MODIFICATION`/`SUPPRESSION`/`VALIDATION`/`EXPORT`/`IMPRESSION` | Dépenses ; `VALIDATION` = approbation |
| `FOURNISSEURS:LECTURE`/`CREATION`/`MODIFICATION`/`SUPPRESSION` | Fournisseurs |
| `BUDGET:LECTURE`/`CREATION`/`MODIFICATION`/`SUPPRESSION` | Budget |
| `RAPPORTS_FINANCIERS:LECTURE`/`EXPORT`/`IMPRESSION` | Rapports, tableau de bord, recettes |

## 6. Points de conception tranchés en autonomie

Développement autonome intégral autorisé par le porteur du projet avant son absence ("N'attends pas ma validation... je vais m'absenter pendant un moment"). Décisions techniques prises seule, documentées ici et dans `DECISIONS.md` (ADR-027 à ADR-030) :

1. **Numérotation** : pas de nouveau sous-numéro — le chapitre occupe l'emplacement "Module 7" déjà réservé et déjà réduit au bon périmètre (voir §0).
2. **Comptabilité en partie double** (plan comptable/journal/lignes débit-crédit) plutôt qu'un simple journal de mouvements — condition nécessaire pour un Grand Livre et une Balance conformes aux "bonnes pratiques comptables" explicitement demandées.
3. **Génération automatique conditionnelle** aux comptes configurés (§1.2/§3 règle 2) plutôt qu'un mappage figé en dur — cohérent avec le principe n°8 (rien de codé en dur) et le principe "aucun calcul inventé" déjà appliqué aux Modules 4.2/4.3.
4. **Dépenses en workflow à 4 statuts**, écriture générée à l'approbation seulement — cohérent avec "approuver les dépenses selon les droits des utilisateurs" (§8.4).
5. **Comptes de dépense responsable** = créateur de la dépense par défaut (pas de sélecteur d'utilisateur séparé, pour éviter une dépendance à `UTILISATEURS:LECTURE` que tous les rôles comptables n'ont pas forcément) — réassignation à un autre responsable non couverte dans cette version.
6. **Graphiques du tableau de bord rendus en CSS** (barres de progression), pas de bibliothèque de graphiques — cohérent avec le reste de l'ERP (aucun module existant n'en utilise) et évite une nouvelle dépendance externe (registre npm instable sur cette machine durant tout le développement du projet).

## 7. Développement et tests

| Étape | Résultat |
|---|---|
| Migration Prisma (10 nouveaux modèles + 2 colonnes additives + 2 `NumberingPurpose`, généralisation de `matriculeService.generateNumber` pour filière/année universitaire optionnelles) | ✅ Appliquée (technique non interactive habituelle) |
| Seed (7 comptes comptables par défaut, rattachement des modes de paiement/types de frais existants à leurs comptes, 6 catégories de dépenses par défaut, gabarits de numérotation `ECRITURE_COMPTABLE`/`DEPENSE`, 27 nouvelles permissions) | ✅ Appliqué |
| `packages/shared` (schémas Zod : `chartAccount`, `accountingPeriod`, `journalEntry`, `expenseCategory`, `supplier`, `expense` + documents, `budget`, `financialReport`) | ✅ |
| `packages/api` : `chartAccountService`, `accountingPeriodService`, `journalEntryService` (équilibre débit/crédit — fonction pure `assertBalanced` testée séparément —, contre-passation, hooks `recordPaymentEntry`/`recordPaymentCancellationEntry`/`recordExpenseApprovalEntry`), `expenseCategoryService`, `supplierService`, `expenseService` (workflow d'approbation), `budgetService` (écart calculé à la volée), `financialReportService` (grand livre, balance, tableau de bord, rapports — fonctions de calcul de période `startOfWeek`/`endOf` testées séparément). `paymentService` étendu pour appeler les hooks comptables après chaque création/annulation de paiement. | ✅ |
| `apps/desktop` : section "Comptabilité" (Tableau de bord, Plan comptable, Journal avec verrouillage de périodes, Grand livre, Balance, Recettes, Dépenses avec pièces jointes et approbation, Fournisseurs, Budget, Rapports), entrée de navigation | ✅ |
| Tests unitaires (équilibre débit/crédit — 6 cas, calculs de dates de période — 4 cas) | ✅ 10 tests supplémentaires, tous verts (58 au total sur `packages/api`) |
| Lint / typecheck / build sur les 5 packages | ✅ Tous verts |
| Vérification de bout en bout contre PostgreSQL réel (encaissement → écriture automatique, annulation → contre-passation, dépense → soumission → approbation → écriture, rejet sans écriture, annulation de dépense approuvée → contre-passation, fournisseur avec historique calculé, écriture manuelle, verrouillage de période sur une année fictive sans risque pour les données réelles, budget avec écart calculé à la volée) | ✅ Toutes les vérifications passées après correction d'une anomalie détectée (voir "Corrigé / appris" ci-dessous), données de test nettoyées |
| Démarrage réel du serveur API + appel HTTP/tRPC non authentifié sur `journalEntries.list` | ✅ Rejeté proprement en 401, aucune erreur de démarrage |

### Corrigé / appris

La toute première exécution de la vérification de bout en bout a révélé une anomalie réelle : après annulation d'un paiement comptabilisé, le solde du compte Caisse dans le Grand Livre ne revenait pas à zéro (il affichait le montant de la seule contre-passation). Cause : `getGeneralLedger`/`getTrialBalance`/le tableau de bord filtraient les lignes sur `journalEntry.status = "VALIDEE"`, excluant à tort l'écriture d'origine désormais `ANNULEE` — alors que dans une contre-passation, l'écriture d'origine reste un mouvement historique réellement posté, et c'est la **paire** {originale + contre-passation} qui doit se neutraliser à zéro, pas la contre-passation seule. Corrigé en retirant ce filtre de statut sur les cinq requêtes concernées (le statut ne sert qu'à décider si une écriture *peut encore être annulée*, jamais à l'exclure des calculs de solde). Point de vigilance retenu pour tout futur calcul agrégé sur `journal_entry_lines` : ne jamais filtrer par statut d'écriture.

## 8. Validation

**✅ Validé le 2026-07-27.** Conception, développement, tests et vérification de bout en bout réalisés en autonomie complète (autorisation explicite du porteur du projet, limitée à ce module). Une anomalie détectée durant la vérification a été corrigée avant conclusion (voir §7). Validation finale reçue du porteur du projet à son retour ("JE VALIDE").

---

*Développement autonome intégral en cours conformément à l'autorisation reçue — migrations, services, écrans, tests et vérification de bout en bout à suivre sans point de blocage intermédiaire.*
