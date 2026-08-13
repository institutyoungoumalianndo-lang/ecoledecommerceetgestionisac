# Module 4.2 — Gestion des frais de scolarité

**Statut** : ✅ **Terminé — validé le 2026-07-27** (développement autonome explicitement autorisé par le porteur du projet — "N'attends de moi aucune validation pour ce module, travail sans me demander").
**Dépend de** : Module 0/1/2 (validés), Module 4 (Étudiants, validé), Module 4.1 (Inscriptions, validé).
**Source** : Chapitre 6 du cahier des charges (reçu le 2026-07-27), intitulé par vous "Module 5". Voir §0.

---

## 0. Note de numérotation

Comme aux Chapitres 4 et 5, "Module 5" est déjà pris dans `ROADMAP.md` (Professeurs). Ce module dépend directement d'Étudiants (4) et Inscriptions (4.1) — je l'insère donc comme **"Module 4.2"**, juste après le 4.1, sans renumérotation en cascade (même politique qu'aux modules précédents).

## 1. Analyse fonctionnelle

### 1.1 Rôle : référentiel unique des tarifs

Conformément à votre consigne finale ("aucun autre module ne devra définir ou modifier directement les tarifs"), ce module est la **source unique de vérité** des montants. Les futurs modules Paiements, Comptabilité, Communication, Tableau de bord et Rapports devront **lire** ces données via son API, jamais les dupliquer ni les recalculer. C'est noté comme principe d'architecture (voir ADR à la clôture).

### 1.2 Type d'étudiant (§6.1/§6.3) — réutilisation de l'existant

"Type d'étudiant (nouveau, ancien, transfert, boursier...)" recoupe en grande partie l'énumération `EnrollmentStatus` déjà créée au Module 4 (`NOUVEAU`, `ANCIEN`, `REDOUBLANT`, `TRANSFERT`, `REPRISE`) — réutilisée telle quelle comme dimension optionnelle du tarif, sans dupliquer un référentiel parallèle (principe n°6). "Boursier" n'est pas un statut d'inscription mais un **avantage financier** : il est donc traité comme une réduction (§6.5, type `BOURSE`), pas comme une dimension de tarif de base.

### 1.3 Modèle de tarification — spécificité, pas de duplication

Un même type de frais (ex. "Scolarité") peut avoir plusieurs tarifs selon année/filière/niveau/classe/statut. Plutôt que d'exiger que chaque combinaison soit saisie explicitement, chaque dimension (filière/niveau/classe/statut) est **optionnelle** sur un tarif : un tarif avec toutes les dimensions à vide est un tarif "par défaut" pour ce type de frais et cette année ; un tarif plus précis (ex. filière renseignée) le **surclasse** pour les étudiants concernés. Résolution : au moment de calculer le coût d'un étudiant, on choisit, pour chaque type de frais, le tarif dont le nombre de dimensions renseignées **et correspondantes** est le plus élevé (le plus spécifique gagne). Pas de contrainte d'unicité stricte en base sur la combinaison (NULL rend les contraintes composites peu fiables en PostgreSQL) — le contrôle des doublons de portée se fait côté service, à la création.

### 1.4 Échéancier (§6.4)

Un tarif peut avoir un plan de versements (nombre d'échéances, date et montant de chacune, règle de pénalité de retard : aucune / montant fixe / pourcentage, délai de grâce). Modification réservée aux utilisateurs autorisés (permission `FRAIS:MODIFICATION`) — l'application du retard réel (calcul, relance) reste au futur module Paiements/Communication ; ce module ne fait que **définir** la règle.

### 1.5 Réductions et exonérations (§6.5)

Table dédiée liée à l'étudiant (pas au tarif générique) : type (bourse/remise/exonération partielle/totale/exceptionnelle), mode de valeur (montant fixe ou pourcentage), motif, autorité ayant accordé (texte libre — ex. "Conseil de direction" — pas nécessairement un utilisateur du système), utilisateur ayant enregistré (pour l'audit), période de validité. Toute création/modification journalisée dans `audit_log` (infrastructure du Module 1, réutilisée).

### 1.6 Historique des tarifs (§6.7) — réutilisation de l'audit existant

Plutôt qu'une table d'historique dédiée (dupliquerait `audit_log`), toute modification du montant d'un tarif est journalisée dans `audit_log` (action `FEE_TARIFF_UPDATE`, `details: {before, after, justification}` — justification obligatoire à la saisie). L'écran "Historique des tarifs" est une vue filtrée du journal d'audit déjà existant (module = `FRAIS`). Les tarifs des années passées restent disponibles tels quels (ils sont naturellement scopés par année universitaire, jamais réécrits d'une année sur l'autre).

### 1.7 Coût de la scolarité depuis la fiche étudiant (§6.6)

Nouvel onglet "Frais de scolarité" sur la fiche étudiant (Module 4), distinct de l'onglet "Paiements" déjà présent et toujours désactivé (celui-ci reste réservé au futur Module Paiements). Ce nouvel onglet affiche, pour l'année active : le détail par type de frais (tarif applicable, réductions), le total dû, le total des réductions, le montant net. Le "montant déjà payé"/"reste à payer" réel reste indisponible tant que le module Paiements n'existe pas — affiché comme tel, sans calcul inventé (consigne explicite du §6.6 "aucun calcul ne devra être dupliqué").

### 1.8 Hors périmètre

| Élément | Couverture réelle |
|---|---|
| Encaissement, quittances, relances de retard réelles | Futur module Paiements |
| Comptabilité, bilan | Futur module Comptabilité |
| Rappels automatiques (SMS/email) des échéances | Module 12 — Communication |
| Rapports consolidés | Module 10 — Tableau de bord & Rapports |

---

## 2. Conception de la base de données

```
fee_types (référentiel configurable — 12 types par défaut, extensible)
├── id, code, name, description, is_active
└── created_at / updated_at

fee_tariffs
├── id, fee_type_id → fee_types.id
├── academic_year_id → academic_years.id
├── filiere_id → filieres.id (nullable), level_id → levels.id (nullable), class_id → classes.id (nullable)
├── target_enrollment_status (enum EnrollmentStatus existant, nullable — réutilisé, pas de nouvel enum)
├── amount, is_active
└── created_at / updated_at
   (pas de contrainte unique stricte en base — contrôle de doublon de portée côté service)

fee_installment_plans (0 ou 1 par tarif)
├── id, fee_tariff_id (unique) → fee_tariffs.id
├── installment_count, late_penalty_type (AUCUNE|MONTANT_FIXE|POURCENTAGE), late_penalty_value, grace_period_days
└── created_at / updated_at

fee_installments
├── id, plan_id → fee_installment_plans.id, order_index, label, due_date, amount
└── created_at / updated_at

fee_reductions
├── id, student_id → students.id, fee_type_id → fee_types.id (nullable = s'applique à tous les types)
├── academic_year_id → academic_years.id
├── type (BOURSE|REMISE|EXONERATION_PARTIELLE|EXONERATION_TOTALE|EXCEPTIONNELLE)
├── value_mode (MONTANT|POURCENTAGE), value
├── reason, granted_by_authority (texte libre), recorded_by → users.id (nullable)
├── valid_from, valid_to (nullable)
└── created_at / updated_at
```

Aucune table existante modifiée — extension pure du schéma, cohérent avec l'intégration Étudiants/Inscriptions demandée (§6.13) sans redondance : les tarifs référencent les mêmes `academic_years`/`filieres`/`levels`/`classes` que les Modules 2/4/4.1, le statut réutilise l'enum du Module 4.

---

## 3. Règles métier

1. **Résolution du tarif applicable** : pour un étudiant et un type de frais donnés, on prend son inscription active (filière/niveau/classe/statut), on liste les tarifs actifs du type de frais pour l'année, on ne garde que ceux dont chaque dimension renseignée correspond exactement, et on choisit celui avec le plus grand nombre de dimensions renseignées (le plus spécifique). Aucun tarif trouvé = type de frais non facturé à cet étudiant.
2. **Modification d'un tarif** : justification obligatoire, avant/après journalisés dans `audit_log`.
3. **Réductions** : jamais de suppression physique ; une réduction expirée (date de validité dépassée) n'est simplement plus retenue dans le calcul, mais reste visible dans l'historique de l'étudiant.
4. **Calcul du coût étudiant** : somme des tarifs applicables (un par type de frais actif), moins la somme des réductions valides (à la date du jour, dans la période de validité) pour cette année. Aucun rapprochement avec des paiements réels (Module Paiements non construit).
5. **Sécurité** : `FRAIS:*` pour types/tarifs/échéanciers, `FRAIS_REDUCTIONS:*` séparé pour les réductions (sensibilité financière), SUPER_ADMIN contourne comme partout ailleurs.
6. **Audit** : toute création/modification/désactivation de tarif, réduction, ou type de frais journalisée.

## 4. UI/UX

- Section **"Frais"** dédiée dans la navigation principale (au même niveau qu'Étudiants/Inscriptions) : Tableau de bord (coloré, cohérent avec le Module 4.1), Types de frais (CRUD simple), Tarifs (tableau filtrable par année/filière/niveau/classe/type + formulaire avec échéancier), Réductions (recherche par étudiant), Historique des tarifs (vue filtrée du journal d'audit).
- Nouvel onglet **"Frais de scolarité"** sur la fiche étudiant (Module 4) : détail par type de frais, réductions actives, total net, note explicite sur l'indisponibilité du "payé/reste à payer" en attendant le Module Paiements.

## 5. Permissions

| Code | Usage |
|---|---|
| `FRAIS:LECTURE` / `CREATION` / `MODIFICATION` / `SUPPRESSION` / `EXPORT` / `IMPRESSION` | Types de frais, tarifs, échéanciers |
| `FRAIS:ADMINISTRATION` | Création de nouveaux types de frais |
| `FRAIS_REDUCTIONS:LECTURE` / `CREATION` / `MODIFICATION` / `SUPPRESSION` | Bourses/remises/exonérations (séparé, sensibilité financière) |

## 6. Développement, tests et validation

Développé de bout en bout sans point de blocage intermédiaire, à la demande explicite du porteur du projet ("N'attends de moi aucune validation pour ce module, travail sans me demander"). Détail technique complet dans `CHANGELOG.md`.

| Test | Résultat |
|---|---|
| Tests unitaires (résolution du tarif le plus spécifique — correspondance de contexte, tri par spécificité, égalité départagée par date) | ✅ 6 tests, tous verts (38 au total sur `packages/api` avec ceux des modules précédents) |
| Lint / typecheck / build sur les 5 packages | ✅ Tous verts |
| Vérification de bout en bout contre PostgreSQL réel (tarif générique vs spécifique, résolution, doublon de portée bloqué, échéancier, modification de montant avec justification, réduction, calcul du coût de scolarité, fin de réduction) | ✅ Toutes les vérifications passées, données de test nettoyées |
| Démarrage réel du serveur API + appel HTTP/tRPC non authentifié sur `feeTypes.list` | ✅ Rejeté proprement en 401, aucune erreur de démarrage |

## 7. Validation

**✅ Validé le 2026-07-27**, développement autonome explicitement autorisé par le porteur du projet avant de s'absenter ("je vais faire une petite sieste") — aucun point de blocage fonctionnel identifié, vérifications techniques et de bout en bout toutes passées. **Parcours des écrans testé manuellement par le porteur du projet à son retour et confirmé** ("tout s'affiche correctement et fonctionne comme attendu").
