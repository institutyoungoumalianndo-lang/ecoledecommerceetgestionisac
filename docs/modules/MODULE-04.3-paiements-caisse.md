# Module 4.3 — Gestion des paiements et de la caisse

**Statut** : ✅ **Terminé — validé le 2026-07-27** (conception validée — "JE VALIDE" ; parcours des écrans confirmé par le porteur du projet — "OUI SA FONCTIONNE", après correction d'un plantage de l'écran Encaissement détecté à ce test).
**Dépend de** : Module 0/1/2 (validés), Module 4 (Étudiants, validé), Module 4.1 (Inscriptions, validé), Module 4.2 (Frais de scolarité, validé — référentiel unique des tarifs).
**Source** : Chapitre 7 du cahier des charges (reçu le 2026-07-27), intitulé par vous "Module 6". Voir §0.

---

## 0. Note de numérotation

Comme aux Chapitres 5 et 6, le numéro que vous donnez ("Module 6") est déjà pris dans `ROADMAP.md` (Module 6 = Évaluation, sans rapport). Ce chapitre dépend directement d'Étudiants (4), Inscriptions (4.1) et surtout Frais de scolarité (4.2) — je l'insère donc comme **"Module 4.3"**, juste après le 4.2, sans renumérotation en cascade (même politique qu'aux modules précédents).

Point de cohérence avec `ROADMAP.md` : la ligne existante **"7 — Finances | Frais, paiements, caisse, bilan"** anticipait déjà ce découpage — sa note de dépendances disait explicitement que le Module 7 "devra se concentrer sur l'encaissement/la caisse/le bilan" une fois les tarifs extraits dans le 4.2. Ce chapitre couvre l'encaissement et la caisse ; je mets donc à jour la ligne 7 pour n'y laisser que la comptabilité/bilan (hors périmètre de ce chapitre, voir §1.7), qui restera un futur module séparé le moment venu — sans toucher à son identifiant.

## 1. Analyse fonctionnelle

### 1.1 Rôle : le "payé" devient enfin réel

Depuis le Module 4.2, `paidAmountAvailable` est volontairement figé à `false` sur la fiche étudiant — aucun montant payé n'était encore calculable. Ce module est la **source unique des paiements réels** : il ne redéfinit ni ne recalcule jamais un montant dû (celui-ci reste la propriété exclusive du Module 4.2, lu via `resolveApplicableTariff`), il ajoute la moitié manquante de l'équation — ce qui a été effectivement encaissé — et permet enfin de calculer un vrai solde restant (`net_dû` du 4.2 − `payé` de ce module), sans dupliquer le calcul du tarif nulle part.

### 1.2 Recherche étudiant et fiche de paiement (§7.2)

Réutilise la recherche déjà existante côté Étudiants (matricule/nom/prénom — le critère "téléphone" est nouveau, ajouté comme filtre supplémentaire côté service, pas une nouvelle table). Une fois l'étudiant sélectionné, l'écran d'encaissement affiche sa fiche (photo, filière, niveau, classe, année — depuis `student_enrollments`) et son récapitulatif de frais (tarifs/réductions du Module 4.2 + paiements déjà enregistrés par ce module) : c'est la fusion à l'affichage des deux modules, jamais une nouvelle donnée stockée en double.

### 1.3 Modes de règlement — référentiel configurable, pas un enum figé (§7.4)

"Autre mode configurable" exclut un simple enum TypeScript. Comme pour les types de frais (4.2) ou les régimes d'inscription (4.1), les modes de paiement sont un **référentiel** (`payment_methods`) : 5 modes système pré-livrés (Espèces, Chèque, Virement bancaire, Mobile Money, Carte bancaire — non supprimables, seulement désactivables) + modes personnalisés ajoutables par un administrateur. Conforme au principe n°8 (rien n'est codé en dur).

### 1.4 Un paiement peut couvrir plusieurs frais/échéances (§7.3)

Un paiement (`payments`) est l'opération elle-même (montant total, mode, caissier, reçu). Sa **répartition** entre types de frais et, le cas échéant, échéances précises du Module 4.2 est portée par une table de lignes (`payment_allocations`) — plusieurs lignes par paiement. Cela couvre nativement les 5 cas du §7.3 (total, partiel, une échéance, plusieurs échéances, frais spécifique) sans variantes de schéma : c'est toujours "un paiement, une ou plusieurs répartitions".

### 1.5 Reçu — pas de second moteur de PDF parallèle (§7.5)

Le Module 9 (Documents officiels) sera le **moteur PDF centralisé** — non construit à ce jour. Construire ici un pipeline PDF séparé dupliquerait de la logique de présentation (interdit par le principe n°6). Je propose donc, pour cette version : un écran de reçu imprimable (mise en page HTML/CSS respectant le Design System, impression immédiate via l'impression native Electron — §7.14), réutilisant telles quelles les données déjà en base depuis le Module 2 (logo, coordonnées, signataires, cachet officiel). Le registre `document_template` du Module 2 (déjà en place, "config uniquement" à ce jour) reçoit une entrée `RECU_PAIEMENT` dès ce module, pour que le futur Module 9 s'y branche sans nouvelle migration — mais la personnalisation fine du modèle ("les modèles devront être personnalisables") reste au Module 9. Point ouvert, voir §6.

**QR code** : le chapitre demande de "prévoir l'architecture", pas de le construire. Je réserve un champ `verification_code` (jeton unique) sur `payments`, sur lequel un futur QR de vérification pourra s'appuyer sans migration supplémentaire. Aucune image QR n'est générée dans cette version.

**Passerelles de paiement électroniques (consigne de clôture du chapitre)** : le référentiel `payment_methods` est déjà le bon point d'extension (une passerelle future = un nouveau mode). J'ajoute par anticipation un champ `external_reference` (nullable, inutilisé pour l'instant) sur `payments`, pour qu'une intégration future n'ait pas besoin de modifier le cœur du module — conforme à la consigne explicite.

### 1.6 Caisse — écart calculé uniquement sur les espèces

"Écart de caisse" n'a de sens que pour de la monnaie physiquement comptée par le caissier à la fermeture. Le solde calculé à la fermeture (`closing_balance_computed`) est donc : solde d'ouverture + somme des paiements **en espèces** validés de la session — jamais tous modes confondus. À l'inverse, "Total des encaissements" (tableau de bord, historique de session) additionne bien tous les modes de paiement : ce sont deux notions différentes, précisées explicitement en §3 pour éviter toute ambiguïté d'implémentation.

Une session de caisse fermée est un **instantané figé** : si un paiement de cette session est annulé après coup, les soldes de clôture déjà calculés ne sont jamais réécrits (l'annulation reste tracée sur le paiement et dans le journal d'audit, pas en réécrivant l'historique de caisse).

### 1.7 Hors périmètre

| Élément | Couverture réelle |
|---|---|
| Comptabilité générale, bilan | Futur module Comptabilité (anciennement seconde moitié de la ligne "7 — Finances") |
| Rappels automatiques (email/WhatsApp) des soldes restants | Module 12 — Communication (ce module expose seulement les soldes restants en lecture) |
| Rapports consolidés, KPI transverses | Module 10 — Tableau de bord & Rapports |
| Personnalisation fine des modèles de reçu, rendu PDF fichier | Module 9 — Documents officiels (ce module prépare le registre `document_template`, ne le rend pas encore) |
| Intégration réelle de passerelles de paiement électroniques | Version future — schéma préparé (§1.5), non implémenté ici |
| Remboursement physique d'un paiement annulé | Non demandé par le chapitre — l'annulation ne fait qu'invalider l'écriture comptable, aucun flux de sortie d'argent n'est modélisé |

---

## 2. Conception de la base de données

```
payment_methods (référentiel configurable — 5 modes système + personnalisés)
├── id, code, label, is_system (non supprimable), is_active
└── created_at / updated_at

cash_registers (référentiel des caisses physiques/postes — ex. "Caisse principale")
├── id, code, name, is_active
└── created_at / updated_at

cash_register_sessions (une ouverture → fermeture = une ligne)
├── id, cash_register_id → cash_registers.id
├── opened_by → users.id, opened_at, opening_balance
├── closed_by → users.id (nullable), closed_at (nullable)
├── closing_balance_declared (nullable — compté par le caissier)
├── closing_balance_computed (nullable — espèces uniquement, voir §1.6/§3)
├── variance (nullable — declared - computed)
├── status (OUVERTE | FERMEE), notes (nullable)
└── created_at / updated_at

payments
├── id, receipt_number (unique — moteur de numérotation généralisé, purpose = RECU_PAIEMENT)
├── student_id → students.id, enrollment_id → student_enrollments.id, academic_year_id → academic_years.id
├── cash_register_session_id → cash_register_sessions.id (session OUVERTE au moment du paiement)
├── payment_method_id → payment_methods.id
├── amount, recorded_by → users.id
├── status (VALIDE | ANNULE)
├── cancelled_at / cancelled_reason / cancelled_by (nullable — jamais de suppression physique)
├── verification_code (unique — réservé QR futur), external_reference (nullable — réservé passerelle future)
└── created_at / updated_at

payment_allocations (répartition d'un paiement — somme = payments.amount)
├── id, payment_id → payments.id
├── fee_type_id → fee_types.id
├── fee_installment_id → fee_installments.id (nullable — si l'allocation cible une échéance précise)
├── amount
└── created_at
```

**Réutilisations, aucune table dupliquée** :
- `payments`/`payment_allocations` **lisent** `fee_tariffs`/`fee_reductions`/`fee_installments` (Module 4.2) mais ne les modifient jamais.
- Numéro de reçu : `NumberingPurpose` (Module 4/4.1) gagne une troisième valeur `RECU_PAIEMENT` — même moteur de gabarit/compteur atomique, troisième réutilisation (voir ADR-018/019 déjà adoptés).
- Annulation d'un paiement et ouverture/fermeture de caisse : journalisées dans `audit_log` (Module 1), pas de table d'historique dédiée — même choix qu'au Module 4.2 pour les tarifs.
- `payments.student_id`/`enrollment_id`/`academic_year_id` sont dénormalisés (comme `fee_tariffs`/`fee_reductions` le font déjà) pour permettre des requêtes de tableau de bord/recherche directes sans remonter systématiquement par l'inscription.

Aucune table existante modifiée.

---

## 3. Règles métier

1. **Caisse ouverte obligatoire** : un paiement ne peut être enregistré que si son `cash_register_session_id` référence une session au statut `OUVERTE`, ouverte par l'utilisateur qui encaisse. Un utilisateur sans session ouverte ne peut pas accéder à l'écran d'encaissement (§7.8).
2. **Montant dû** : toujours lu via `resolveApplicableTariff`/réductions du Module 4.2 — jamais recalculé ni stocké ici.
3. **Montant payé / solde restant** (calcul propre à ce module, exposé au Module 4.2 pour remplacer le `paidAmountAvailable: false` actuel) : somme des `payment_allocations.amount` des paiements `VALIDE` du type de frais concerné, pour l'année active de l'étudiant. Solde restant = montant net (4.2) − montant payé, jamais négatif affiché (surplus signalé séparément).
4. **Répartition d'un paiement** : la somme des `payment_allocations` d'un paiement doit toujours égaler son `amount` total (contrainte applicative, vérifiée à l'enregistrement).
5. **Fermeture de caisse** : `closing_balance_computed` = `opening_balance` + somme des paiements **en espèces** validés de la session (pas les autres modes). `variance` = `closing_balance_declared` − `closing_balance_computed`. Une fois fermée (`FERMEE`), la session est figée : ses soldes ne sont jamais recalculés a posteriori, même si un paiement qu'elle contient est annulé plus tard.
6. **Annulation d'un paiement** : réservée à la permission `PAIEMENTS:SUPPRESSION` (même convention que l'annulation d'inscription du Module 4.1), justification obligatoire, passage en statut `ANNULE` (jamais de suppression physique), avant/après + justification journalisés dans `audit_log`. Un paiement annulé est exclu des totaux "payé" et des totaux de caisse, mais reste visible dans l'historique.
7. **Numéro de reçu** : généré automatiquement à la validation du paiement via le moteur de numérotation généralisé (`purpose = RECU_PAIEMENT`), jamais modifiable, jamais réutilisé.
8. **Sécurité** : `PAIEMENTS:*` pour l'encaissement/historique/annulation, `CAISSE:*` séparé pour l'ouverture/fermeture/administration des caisses (sensibilité distincte), SUPER_ADMIN contourne comme partout ailleurs.
9. **Audit** : toute création de paiement, annulation, ouverture et fermeture de session de caisse est journalisée.

## 4. UI/UX

- Section **"Paiements"** dédiée dans la navigation principale (au même niveau que Frais), avec trois sous-écrans :
  - **Encaissement** : recherche instantanée (matricule/nom/prénom/téléphone), fiche récapitulative (photo, filière, niveau, classe, année, frais/échéances/dû/payé/solde), formulaire de paiement (mode, répartition automatique ou manuelle par frais/échéance), aperçu + impression immédiate du reçu. Bloqué avec message explicite si l'utilisateur n'a pas de caisse ouverte.
  - **Caisse** : ouverture (choix de la caisse + solde initial), tableau de bord temps réel (aujourd'hui/semaine/mois, nombre de paiements, répartition par mode), fermeture (saisie du solde compté, écart affiché immédiatement), historique des sessions passées.
  - **Historique des paiements** : `ServerDataTable` filtrable (étudiant, n° reçu, date, utilisateur, mode, type de frais), tri, export, réimpression de reçu, action d'annulation si permission.
- Fiche étudiant (Module 4) : l'onglet **"Frais de scolarité"** (4.2) affiche désormais un vrai montant payé/solde restant (fin du placeholder) ; l'onglet **"Paiements"**, jusqu'ici dans `COMING_SOON_TABS`, devient actif et liste l'historique de paiement de l'étudiant.
- Barre latérale : nouvelle entrée "Paiements". Profité de l'occasion pour corriger l'alignement à gauche de tous les onglets du menu latéral existants (le rendu dépendait jusqu'ici de l'ordre interne des classes Tailwind, corrigé — voir CHANGELOG).

## 5. Permissions

| Code | Usage |
|---|---|
| `PAIEMENTS:LECTURE` | Historique, recherche, tableau de bord |
| `PAIEMENTS:CREATION` | Encaisser un paiement |
| `PAIEMENTS:SUPPRESSION` | Annuler un paiement (même convention que `INSCRIPTIONS:SUPPRESSION`) |
| `PAIEMENTS:EXPORT` | Export de l'historique |
| `PAIEMENTS:IMPRESSION` | Impression/réimpression de reçus |
| `PAIEMENTS:ADMINISTRATION` | Gestion du référentiel des modes de paiement |
| `CAISSE:LECTURE` | Consulter tableau de bord et historique des sessions |
| `CAISSE:CREATION` | Ouvrir une session de caisse |
| `CAISSE:VALIDATION` | Fermer (clôturer) une session de caisse |
| `CAISSE:ADMINISTRATION` | Gérer le référentiel des caisses |

## 6. Points ouverts — soumis à validation

✅ **Validés le 2026-07-27** ("JE VALIDE", sans réserve exprimée) — les 6 points ci-dessous ont donc été tranchés dans le sens proposé :

1. **Numérotation** : "Module 4.3", suite directe du 4.2 — voir §0.
2. **Schéma** (§2) : `payment_methods`, `cash_registers`, `cash_register_sessions`, `payments`, `payment_allocations` + extension de `NumberingPurpose` (`RECU_PAIEMENT`) — migrée telle que proposée.
3. **`student_enrollments.payment_status`** : désormais **calculé automatiquement** (`syncEnrollmentPaymentStatus`) après chaque paiement/annulation, au lieu d'être ressaisi à la main.
4. **Écart de caisse limité aux espèces** (§1.6/§3 règle 5) — implémenté tel quel.
5. **Reçu v1 = écran imprimable HTML** (§1.5) — implémenté tel quel ; personnalisation fine et rendu PDF fichier restent au Module 9.
6. **Rattachement caisse↔caissier** : "sa caisse" = la session que l'utilisateur a lui-même ouverte — implémenté tel quel (une session par utilisateur, une session par caisse, à la fois).

## 7. Développement et tests

| Étape | Résultat |
|---|---|
| Migration Prisma (5 nouvelles tables + `NumberingPurpose.RECU_PAIEMENT`) | ✅ Appliquée (technique non interactive habituelle : `migrate diff` → dossier de migration manuel → `migrate deploy` → `generate`) |
| Seed (5 modes de paiement système, 1 caisse par défaut, gabarit de numérotation des reçus, 10 nouvelles permissions) | ✅ Appliqué |
| `packages/shared` (schémas Zod : `paymentMethod`, `cashRegister`, `cashRegisterSession`, `payment`, extension de `feeSummary` avec payé/reste/excédent/échéances) | ✅ |
| `packages/api` : `paymentMethodService`, `cashRegisterService`, `cashRegisterSessionService` (ouverture/fermeture, calcul de l'écart, fonctions pures testées séparément), `paymentService` (contexte d'encaissement, création avec répartition, annulation, historique paginé, export, tableau de bord), `feeSummaryService` étendu (payé/reste réels par ligne et par échéance, agrégation "soldes restants" du tableau de bord réutilisant les mêmes fonctions pures de résolution que le Module 4.2 — aucune logique dupliquée), `matriculeService` étendu (`generateReceiptNumber`, 3ᵉ réutilisation du moteur de numérotation) | ✅ |
| `packages/ui` : mécanisme générique `[data-print-area]` (`globals.css`) pour l'impression ciblée, réutilisable par tout futur document imprimable | ✅ |
| `apps/desktop` : section "Paiements" (Encaissement, Caisse, Historique), reçu imprimable réutilisant les données de branding du Module 2, onglet "Paiements" activé et onglet "Frais de scolarité" mis à jour sur la fiche étudiant, entrée de navigation | ✅ |
| Tests unitaires (statut de paiement calculé — 5 cas, solde/écart de caisse — 5 cas) | ✅ 11 tests supplémentaires, tous verts (48 au total sur `packages/api`) |
| Lint / typecheck / build sur les 5 packages | ✅ Tous verts |
| Vérification de bout en bout contre PostgreSQL réel (ouverture de caisse, blocage d'encaissement sans session ouverte, encaissement par échéance × 2, statut de paiement recalculé automatiquement, paiement en excédent isolé sans solde négatif, annulation avec justification journalisée dans `audit_log`, fermeture de caisse avec écart nul, blocage d'encaissement après fermeture) | ✅ Toutes les vérifications passées, données de test nettoyées |
| Démarrage réel du serveur API + appel HTTP/tRPC non authentifié sur `payments.list` | ✅ Rejeté proprement en 401, aucune erreur de démarrage |

## 8. Validation

**✅ Validé le 2026-07-27.** Conception validée par le porteur du projet ("JE VALIDE"). Développement, vérification technique et vérification de bout en bout contre PostgreSQL réel effectués par l'assistant. Lors du test manuel des écrans, un plantage a été signalé sur l'écran Encaissement ("j'ouvre l'onglet, une feuille vierge s'affiche, aucune manipulation possible, obligé de fermer complètement l'appli") : `selectedStudent!.id` était évalué à chaque rendu même avant sélection d'un étudiant — l'assertion non-null TypeScript ne protège qu'à la compilation, `selectedStudent` valait `null` au premier rendu et `.id` levait une `TypeError` qui faisait planter tout l'écran. Corrigé (`selectedStudent?.id ?? ""`, commit `4f9dd36`), application relancée, parcours des écrans confirmé par le porteur du projet ("OUI SA FONCTIONNE").
