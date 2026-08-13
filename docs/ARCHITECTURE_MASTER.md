# ISAC ERP — Architecture Master

**Statut du document** : vivant — mis à jour après validation de chaque module.
**Dernière mise à jour** : 2026-08-07 (**Module 13 — Bibliothèque validé** par le porteur du projet après test manuel réel — catalogue ouvrages/exemplaires, emprunts étudiants/enseignants/employés, limite configurable, retards sans pénalité, **et extension Bibliothèque numérique** (fichiers PDF/Word classés, partage e-mail avec pièce jointe réelle ou WhatsApp avec lien pré-rempli — jamais de pièce jointe automatique via WhatsApp, pas d'API officielle) ; Module 14 — Inventaire validé par le porteur du projet après test manuel réel — registre de biens, maintenance/réparations, référentiel de lieux dédié, responsable employé/enseignant, indépendant de la comptabilité ; Module 11 — Sauvegarde & Sécurité avancée validé par le porteur du projet après test manuel réel — sauvegarde/restauration PostgreSQL, double authentification TOTP, politique de mot de passe configurable ; Module 10 — Tableau de bord & Rapports décisionnels validé par le porteur du projet après test manuel réel des écrans Rapports décisionnels et Alertes ; Module 9 livré sous autonomie complète, en attente de retour du porteur du projet après usage réel ; Module 5.2 développé, test manuel partiel — pointage en attente de réinitialisation des dates ; Module 5.1 révisé en profondeur par le Module 5.2, toujours en attente du test manuel du pointage).
**Référence** : ce document est la source de vérité unique du projet ISAC ERP pour l'architecture et les principes. Il travaille avec deux documents compagnons :
- [`ROADMAP.md`](ROADMAP.md) — liste des modules, ordre, dépendances, statut d'avancement, backlog.
- [`DECISIONS.md`](DECISIONS.md) — journal des décisions techniques (ADR) avec justification et alternatives écartées.

En cas de divergence entre ce document et le code, ce document fait foi jusqu'à correction explicite.

---

## 0. À propos de ce document

- Mis à jour **après chaque validation de module** par le porteur du projet — jamais avant.
- Chaque mise à jour ajoute une ligne au [Journal des mises à jour](#8-journal-des-mises-à-jour-de-ce-document) (§8).
- Le rapport d'analyse du projet Python existant (`RAPPORT_ANALYSE_ISAC_ERP.md`) reste la référence pour la logique métier héritée — ce document n'en duplique pas le contenu, il y renvoie.

---

## 1. Vision & objectifs du projet

**ISAC ERP** — ERP scolaire complet pour l'École de Commerce et de Gestion ISAC (Guinée), remplaçant l'application desktop Python/PySide6/MySQL existante par une application desktop Windows moderne (Electron/React/TypeScript/Tailwind/PostgreSQL).

Périmètre fonctionnel cible : étudiants, enseignants, campus, inscriptions, notes, bulletins, emplois du temps, paiements, comptabilité, ressources humaines, bibliothèque, inventaire, communication (Email/WhatsApp/SMS), rapports décisionnels, portail web, application mobile, paramètres avancés, sauvegardes, sécurité, intelligence artificielle.

Le projet Python existant sert **uniquement de référence métier** (règles de calcul, contenu des documents officiels, pièges déjà rencontrés) — ni son code, ni son architecture technique, ni son interface ne sont repris. Détail complet dans `RAPPORT_ANALYSE_ISAC_ERP.md`.

---

## 2. Méthodologie de développement

Le projet est développé **module par module** (voir `ROADMAP.md` pour la liste et l'ordre). Chaque module traverse obligatoirement les 7 étapes suivantes, dans l'ordre :

| # | Étape | Livrable attendu |
|---|---|---|
| 1 | Analyse fonctionnelle | Périmètre du module, écrans/workflows couverts, règles héritées vs nouvelles, questions ouvertes |
| 2 | Conception de la base de données | Schéma Prisma/PostgreSQL du module (tables, relations, contraintes, index), migration |
| 3 | Règles métier | Spécification précise des calculs, validations, permissions, cas limites (documentée, testable) |
| 4 | Conception UI/UX | Maquette ou description d'écrans, parcours utilisateur, cohérence avec le design system |
| 5 | Développement | Implémentation (backend + frontend) |
| 6 | Tests | Tests automatisés (unitaires sur la logique métier au minimum, idéalement intégration/E2E) |
| 7 | Validation | Revue par le porteur du projet — **aucun module n'est considéré terminé sans cette validation explicite** |

**Règle absolue** : un module non validé reste "en cours" dans `ROADMAP.md`, quel que soit son état d'avancement technique. Le développement du module suivant ne démarre qu'après validation du précédent, sauf accord explicite contraire du porteur du projet pour paralléliser.

---

## 3. Modèle de déploiement — architecture mono-campus autonome

**Décision majeure (2026-07-26, voir DECISIONS.md ADR-005)** : l'ERP n'est **pas** une application multi-campus centralisée. C'est une application **mono-campus, autonome, entièrement configurable**, installée indépendamment sur chaque campus.

Principes :
- Chaque campus dispose de **sa propre installation complète** : sa propre base de données PostgreSQL, ses propres utilisateurs, étudiants, comptabilité, sauvegardes — l'intégralité de ses données.
- **Aucune communication réseau entre installations de campus différents.** Aucune dépendance à une connexion Internet entre campus (coupures fréquentes en Guinée).
- Le logiciel fonctionne **entièrement en autonomie sur le réseau local du campus** (LAN).
- L'application est **strictement identique** pour tous les établissements/campus — seule la configuration change, via le module **Paramètres**, sans jamais modifier le code : identité de l'établissement, nom du campus, logos (gauche/droite), cachet officiel, signatures, coordonnées complètes, téléphones, e-mails, site web, responsables (Directeur Général, Directeur de Campus, Directeur des Études, etc.), couleurs/identité visuelle, et tout autre paramètre administratif. **Aucune donnée spécifique à un campus n'est codée en dur.**
- **Exigence d'extensibilité future** : l'architecture doit rester suffisamment modulaire pour permettre, dans une version ultérieure, d'ajouter une synchronisation entre campus ou une consolidation centralisée (ex. reporting multi-sites), **sans réécrire le cœur de l'application**. Concrètement :
  - Le module Paramètres/Établissement est isolé (pas de dépendance dure ailleurs dans le code à une notion de "campus unique").
  - Les schémas de données sont conçus de façon à pouvoir accueillir un futur identifiant d'établissement/tenant sans migration destructive (ex. clés primaires en UUID plutôt qu'entiers auto-incrémentés simples, pas d'hypothèse d'unicité globale codée en dur là où elle n'est pas nécessaire).
  - La couche API (`packages/api`) est conçue comme un service autonome par installation — une future synchronisation se ferait par export/import ou API de consolidation, pas par un accès direct inter-bases.

**Topologie intra-campus (ADR-007, adoptée)** : au sein d'un même campus, un **serveur local sur le réseau du campus** (backend Node/Fastify + PostgreSQL, installés sur une machine serveur ou un poste dédié) auquel les postes clients Electron se connectent via le LAN — pas d'Internet requis, juste le réseau local. C'est la topologie effectivement utilisée et vérifiée en conditions réelles depuis le Module 1. Note opérationnelle issue de ce module (ADR-010) : PostgreSQL peut être installé nativement (sans Docker) si la virtualisation matérielle n'est pas disponible sur la machine serveur — point à trancher formellement pour le futur paquet d'installation/déploiement.

---

## 4. Architecture technique

### 4.1 Stack retenue (validée)

| Couche | Choix | Statut |
|---|---|---|
| Shell desktop | Electron (main + preload isolé, `contextIsolation: true`) | Validé |
| UI | React + TypeScript + Tailwind CSS + shadcn/ui (Radix) | Validé |
| État serveur / cache | TanStack Query | Validé |
| État UI local | Zustand | Validé |
| Formulaires & validation | React Hook Form + Zod (schémas partagés front/back) | Validé |
| Backend applicatif | Node.js + Fastify, API typée via tRPC (superjson) — **déployé localement par campus** (voir §3) | Validé — en service depuis le Module 1 |
| Base de données | PostgreSQL + Prisma ORM (migrations versionnées) — **une instance par campus** | Validé — en service depuis le Module 1 (installation native testée, voir ADR-010) |
| Génération de documents officiels | Moteur PDF centralisé natif (`pdfkit` + `qrcode`, aucun navigateur headless) — voir ADR-047 ; documents déjà validés (bulletin de paie, reçus, bulletins/relevés de notes) restent sur le moteur d'impression HTML/CSS (ligne suivante), non migrés | Validé — en service depuis le Module 9 (2026-07-29) |
| Impression HTML/CSS (documents existants) | Templates HTML/CSS + `window.print()`, sans fichier PDF physique (ADR-037/041) | Validé — en service depuis le Module 8 |
| Authentification | Sessions stockées serveur (table dédiée, jeton haché, ADR-009), bcryptjs, verrouillage progressif — **locale à chaque installation** | Validé — en service depuis le Module 1 |
| Tests | Vitest (unitaire), Playwright (E2E Electron) | Validé |
| Observabilité | Logs structurés (pino), rotation locale, Sentry en option (à évaluer vu la contrainte hors-ligne) | Validé |
| CI/CD | GitHub Actions (lint + tests + build `electron-builder` → `.exe`) | Validé |
| Monorepo | pnpm workspaces + Turborepo | Validé |

### 4.2 Structure du monorepo (cible)

```
isac-erp/
├── apps/
│   ├── desktop/            # Electron (main + preload) + React (renderer), Vite
│   ├── web-portail/        # Next.js 15 — portail web (Module 15, fondations livrées 2026-08-07) — accès distant en lecture seule (étudiants/tuteurs/enseignants) + Super Administrateur, à l'installation d'un campus pilote
│   └── mobile/             # (phase ultérieure) React Native
├── packages/
│   ├── api/                 # Backend Node (Fastify + tRPC), logique métier, auth, RBAC serveur — déployé par campus
│   ├── db/                  # Schéma Prisma, migrations, seed scripts
│   ├── pdf/                 # Moteur de génération de documents (templates communs + rendu)
│   ├── ui/                  # Design system partagé (composants Tailwind/shadcn, tokens de thème)
│   └── shared/               # Schémas Zod, types TS, constantes métier, i18n
├── infra/
│   ├── docker/               # PostgreSQL local de dev, scripts de sauvegarde
│   └── ci/                   # GitHub Actions
└── docs/                     # Documentation vivante (ce dossier + rapports)
```

*Cette structure sera créée concrètement lors du Module 0 (socle technique).*

---

## 5. Principes d'architecture non négociables

Ces principes découlent des points faibles identifiés dans le projet Python existant (voir `RAPPORT_ANALYSE_ISAC_ERP.md` §3) et de la décision d'architecture mono-campus :

1. **Autorisation vérifiée côté backend pour chaque opération sensible**, jamais de confiance implicite envers l'appelant/le client.
2. **Toute opération multi-étapes** (créer ligne provisoire → générer document → finaliser) **est transactionnelle**, avec rollback garanti.
3. **Schéma PostgreSQL conçu explicitement**, migrations versionnées formelles (Prisma Migrate) — jamais de dérive de schéma non documentée.
4. **Design system unique appliqué à 100% des écrans dès leur création** — pas de refonte partielle a posteriori.
5. **Tests automatisés sur la logique métier avant tout affichage**, en particulier pour les calculs financiers et de notes.
6. **Pas de duplication de logique de présentation** (ex. en-têtes de documents, formatage monétaire) — factorisation systématique dans `packages/shared` et `packages/pdf`.
7. **Zéro dépendance réseau externe entre installations** — l'application doit rester pleinement fonctionnelle sans connexion Internet ; toute fonctionnalité en nécessitant une (ex. envoi Email/WhatsApp/SMS) doit se dégrader proprement (file d'attente locale, réessai) plutôt que bloquer l'application.
8. **Aucune donnée d'établissement ou de campus codée en dur** — tout passe par le module Paramètres, sans exception.
9. **Extensibilité multi-campus future sans réécriture du cœur** : ne jamais coder d'hypothèse d'unicité globale (ex. "il n'existe qu'un seul établissement au monde") dans la logique métier ou le schéma là où une future consolidation multi-sites en aurait besoin ; préférer des identifiants stables (UUID) et une couche Paramètres isolée.

---

## 6. Schéma de base de données (cumulé)

Complété à l'issue de l'étape 2 de chaque module, au fur et à mesure de leur validation.

### Module 0 (validé 2026-07-26)
- `system_health` — table technique de vérification de connexion, sans valeur métier.

### Module 1 (validé 2026-07-26)
- `users` — utilisateurs (identité, `password_hash`, statut, verrouillage, `deleted_at` pour suppression logique).
- `roles` — rôles système (12 pré-livrés, non supprimables) et rôles personnalisés créés par un administrateur.
- `user_roles` — affectation rôle↔utilisateur (schéma multi-rôles, contrainte applicative actuelle : un seul rôle actif par utilisateur).
- `permissions` — catalogue de permissions au format `MODULE:ACTION` (8 actions : LECTURE, CREATION, MODIFICATION, SUPPRESSION, IMPRESSION, EXPORT, VALIDATION, ADMINISTRATION).
- `role_permissions` — attribution rôle↔permission.
- `user_sessions` — sessions serveur (jeton haché, expiration glissante par inactivité, révocation).
- `audit_log` — journal d'audit transversal, alimenté par ce module et par tous les modules futurs.
- `security_settings` — politique de sécurité (tentatives max, durée de verrouillage, délai d'inactivité, expiration de mot de passe), propriété de ce module.

Détail complet (relations, contraintes) : `docs/modules/MODULE-01-identite-acces.md` §2.

### Module 2 (validé 2026-07-26)
- `establishment_settings` — identité de l'établissement (singleton logique) : nom, sigle, coordonnées, responsables, logos.
- `campus_settings` — informations propres au campus de l'installation (nom, adresse, contacts).
- `document_signatory` — signataires des documents officiels (rôle, nom, fonction, image de signature).
- `official_stamp` — cachet officiel numérisé de l'établissement.
- `academic_year` — années universitaires, une seule active à la fois (transaction dédiée à l'ouverture/réouverture).
- `academic_period` — semestres/périodes rattachés à une année universitaire.
- `filiere` — filières de formation.
- `level` — niveaux d'études (liste libre, non figée à L1..M2).
- `class` — classes, rattachées filière + niveau + année.
- `currency_settings` — devise et format monétaire de l'installation.
- `regional_settings` — fuseau horaire, format de date, langue.
- `theme_settings` — personnalisation graphique (couleurs appliquées à chaud via CSS custom properties).
- `document_template` — registre de modèles de documents (33 types au total depuis le Module 9 : logos, cachet, signataire, QR, double exemplaire par type).

La table `establishment_display` du Module 1 (champs d'affichage minimaux du login) a été **remplacée** par `establishment_settings`/`campus_settings`, plus complètes et alignées sur le principe « rien n'est codé en dur » (§5 principe 8).

**Module 9 — Moteur Centralisé de Documents Officiels** (2026-07-29, développé sous autonomie complète, voir ADR-047 à ADR-050) : `institutional_header_settings` (singleton — bloc République/devise nationale/école/institut/slogan, entièrement configurable, jamais codé en dur) ; `generated_documents` (archive — un fichier PDF réel par génération, numéro unique par série, QR code, jamais modifié après coup) ; extensions additives de `campus_settings` (`logo_path`), `document_template` (`show_campus_logo`/`show_qr_code`/`allow_double_exemplaire`/`secondary_copy_label`) et `print_theme_settings` (`footer_color`/`border_width_pt`/`margin_mm`/`paper_format`/`orientation` — mise en page, réutilisée par le moteur PDF). 10 types de documents pleinement générables (`document_type`/`NumberingPurpose` étendus), 23 types supplémentaires enregistrés au catalogue sans génération (statut "Bientôt disponible"). Détail complet : `docs/modules/MODULE-09-documents-officiels.md`.

Détail complet (relations, contraintes) : `docs/modules/MODULE-02-parametres-etablissement.md` §2.

### Module 4 (validé 2026-07-26)
- `students` — référentiel principal des étudiants (identité, coordonnées, situation familiale, `archived_at`/`archived_reason`/`archived_by` pour l'archivage réversible — jamais de suppression physique).
- `guardians` — parents/tuteurs, indépendants des étudiants (partage possible entre fratries).
- `student_guardians` — liaison étudiant↔responsable (lien de parenté, contact officiel unique par étudiant via index unique partiel PostgreSQL).
- `student_documents` — documents administratifs (images ou PDF), stockage hors tRPC (voir ADR-017).
- `student_enrollments` — inscription annuelle (une ligne = un étudiant × une année universitaire) : source unique de l'affectation courante ET de l'historique académique complet (voir ADR-014). **Étendue au Module 4.1** (régime, numéro d'inscription, paiement, annulation — voir ci-dessous).
- `student_number_sequences` / `student_numbering_settings` — compteur atomique et gabarit configurable de génération du matricule (voir ADR-015). **Généralisés au Module 4.1** pour porter aussi le numéro d'inscription (discriminant `purpose`).

Détail complet (relations, contraintes) : `docs/modules/MODULE-04-etudiants.md` §2.

### Module 4.1 (validé 2026-07-27)
- `student_enrollments` — étendue (colonnes additives, aucune suppression) : `regime_id`, `registration_number` (numéro d'inscription, distinct du matricule, unique), `fee_amount_expected`/`payment_status` (affichage uniquement, le Module 7 restera la référence), `cancelled_at`/`cancelled_reason`/`cancelled_by` (annulation réversible).
- `enrollment_regimes` — référentiel configurable des régimes d'inscription (Normal, Professionnel... extensible depuis Paramètres, comme les niveaux du Module 2).
- `enrollment_settings` — singleton : activation du contrôle de capacité de classe (désactivé par défaut).
- `enrollment_document_requirements` — une ligne par type de document du Module 4, indiquant s'il est obligatoire pour valider une inscription (toutes désactivées par défaut).
- `student_number_sequences` / `student_numbering_settings` — colonne `purpose` (`MATRICULE` | `INSCRIPTION`) ajoutée ; le même moteur de gabarit/compteur atomique sert désormais aux deux numéros (voir ADR-018/019).

Détail complet (relations, contraintes) : `docs/modules/MODULE-04.1-inscriptions-reinscriptions.md` §2.

### Module 4.2 (validé 2026-07-27)
- `fee_types` — référentiel configurable des types de frais (12 par défaut, extensible par l'administrateur).
- `fee_tariffs` — tarif à dimensions optionnelles (année obligatoire ; filière/niveau/classe/statut d'étudiant facultatifs — réutilise l'enum `EnrollmentStatus` du Module 4) ; le plus spécifique l'emporte à la résolution (voir ADR-021).
- `fee_installment_plans` / `fee_installments` — échéancier optionnel par tarif (nombre de versements, dates, montants, pénalité de retard).
- `fee_reductions` — bourses/remises/exonérations accordées à un étudiant (jamais supprimées, seulement bornées dans le temps).
- **Aucune table d'historique dédiée** : les modifications de tarif sont journalisées dans `audit_log` existant (module `FRAIS`), pas de duplication (voir ADR-022).
- **Référentiel unique des tarifs** (consigne explicite du porteur du projet, §5.2 principe n°8 étendu) : aucun autre module ne doit définir ou recalculer un montant — seulement lire ceux de `fee_tariffs`/`fee_reductions`.

Détail complet (relations, contraintes) : `docs/modules/MODULE-04.2-frais-scolarite.md` §2.

### Module 4.3 (validé 2026-07-27)
- `payment_methods` — référentiel configurable des modes de règlement (5 modes système non supprimables + personnalisés).
- `cash_registers` — référentiel des caisses physiques/postes d'encaissement.
- `cash_register_sessions` — une ouverture→fermeture = une ligne ; figée une fois fermée (solde calculé/écart jamais recalculés a posteriori), voir ADR-023/026.
- `payments` — opération d'encaissement (numéro de reçu via le moteur de numérotation généralisé, `purpose` `RECU_PAIEMENT` — voir ADR-025), jamais supprimé physiquement (statut `VALIDE`/`ANNULE`), `verification_code`/`external_reference` réservés pour un futur QR code et une future passerelle de paiement électronique.
- `payment_allocations` — répartition d'un paiement entre types de frais/échéances (Module 4.2), somme = montant du paiement.
- **Référence unique des montants payés** (symétrique du Module 4.2 pour les montants dus) : `feeSummaryService` calcule désormais un vrai payé/reste à payer à partir de `payments`/`payment_allocations`, remplaçant le placeholder `paidAmountAvailable: false` du Module 4.2 — et `student_enrollments.payment_status` (Module 4.1) devient calculé automatiquement au lieu d'être saisi à la main (voir ADR-023).
- Aucune table existante modifiée.

Détail complet (relations, contraintes) : `docs/modules/MODULE-04.3-paiements-caisse.md` §2.

### Module 7 (validé 2026-07-27)
- `chart_accounts` — plan comptable configurable (nature ACTIF/PASSIF/TRESORERIE/CHARGE/PRODUIT), 7 comptes par défaut.
- `accounting_periods` — verrouillage par mois/année civile (distincte de l'année universitaire).
- `journal_entries` / `journal_entry_lines` — comptabilité en partie double (débit=crédit vérifié à l'insertion), annulation par contre-passation uniquement (`reversal_of_id`), jamais de suppression — voir ADR-027.
- `expense_categories`, `suppliers`, `expenses`, `expense_documents` — dépenses avec workflow d'approbation (BROUILLON→EN_ATTENTE_APPROBATION→APPROUVEE/REJETEE), écriture générée à l'approbation, pièces justificatives sur le modèle de `student_documents`.
- `budgets` / `budget_lines` — budget annuel par catégorie de dépense, écart réalisé toujours calculé à la volée.
- **Extension additive** : `payment_methods.linked_account_id`, `fee_types.revenue_account_id` (nullables) — relient les Modules 4.2/4.3 au plan comptable sans les modifier ; génération automatique des écritures conditionnée à ce rattachement (voir ADR-028).
- **Réutilisations** : moteur de numérotation généralisé une 5ᵉ/6ᵉ fois (`purpose` `ECRITURE_COMPTABLE`/`DEPENSE`, désormais avec filière/année universitaire optionnelles — ADR-029), `payment_methods` du Module 4.3 réutilisé pour le règlement des dépenses, aucune table "recettes" séparée (lecture directe de `payments`).

Détail complet (relations, contraintes) : `docs/modules/MODULE-07-comptabilite.md` §2.

### Module 2.1 (validé 2026-07-27)
- `subjects` — matière, identité partagée réutilisable par plusieurs filières (code, nom, crédits ECTS) ; reprend le modèle `FeeType` du Module 4.2.
- `teaching_units` — unité d'enseignement (UE) ; total des crédits jamais stocké, toujours calculé à la volée en sommant les matières actives qui la composent.
- `subject_offerings` — affectation d'une matière à un contexte (année/semestre/niveau/filière optionnelle) : coefficient, volumes horaires (cours/TD/TP/travail personnel), caractère obligatoire ; reprend le modèle `FeeTariff` à dimensions optionnelles et son algorithme de résolution par spécificité (le plus spécifique l'emporte) — voir ADR-021 réutilisé.
- **Aucune table du Module 2 reconstruite** : années/semestres/filières/niveaux/classes redemandés par le Chapitre 9 existaient déjà intégralement (voir `docs/modules/MODULE-02.1-structure-pedagogique.md` §0) — seules leurs permissions/exports ont été complétés (ajout additif `EXPORT`/`IMPRESSION`, aucune permission existante modifiée).
- Validation pédagogique : diagnostic à la demande (matières obligatoires manquantes, volumes horaires incohérents, coefficients non renseignés), informationnel — aucun module consommateur (Emploi du temps, Notes) n'existe encore pour justifier un blocage.

Détail complet (relations, contraintes) : `docs/modules/MODULE-02.1-structure-pedagogique.md` §2.

### Module 5 (validé 2026-07-28)
- `teachers` — fiche enseignant, entité autonome (pas un compte `User`) ; suppression toujours logique (archivage réversible), même principe que `Student`.
- `teacher_statuses`/`teacher_contract_types` — référentiels configurables (Permanent/Vacataire/Contractuel/Visiteur ; CDI/CDD/Vacation/Prestation), extensibles par l'administrateur — voir ADR-032.
- `teacher_assignments` — affectation pédagogique : table de liaison référençant une `SubjectOffering` existante (Module 2.1) + une `Class` (Module 2), jamais de duplication de matière/année/semestre/niveau/filière — voir ADR-031. Jamais supprimée physiquement, seulement désactivée.
- `teacher_weekly_availabilities`/`teacher_leaves` — disponibilités : créneaux hebdomadaires récurrents vs congés/indisponibilités ponctuels datés, deux tables distinctes ; consommées plus tard par le futur module Emploi du temps (non construit ici).
- `teacher_trainings` — formations suivies, donnée structurée distincte d'un simple changement journalisé.
- `teacher_documents` — dossier numérique, même modèle que `student_documents` (Module 4).
- **Charge horaire (semaine/mois/semestre/année) jamais stockée** — toujours calculée à la volée depuis les affectations actives et les dates du semestre en cours — voir ADR-033.
- **Extension additive** : `NumberingPurpose` gagne `ENSEIGNANT` (7ᵉ réutilisation du moteur de numérotation généralisé, après matricule/inscription/reçu/écriture comptable/dépense).
- **Aucun module Emploi du temps construit ici** : ce module livre les fiches, affectations et disponibilités ; la génération de créneaux et la détection de conflits restent hors périmètre jusqu'à une demande explicite dédiée (voir `docs/modules/MODULE-05-gestion-enseignants.md` §0).

Détail complet (relations, contraintes) : `docs/modules/MODULE-05-gestion-enseignants.md` §2.

### Module 8 (validé 2026-07-28)
- `employees` — sujet de paie unique (personnel administratif ET enseignants payés) : `teacher_id` optionnel vers `teachers` (Module 5) — quand renseigné, l'identité est **lue** depuis `teachers`, jamais dupliquée — voir ADR-034.
- `employee_categories` — référentiel configurable des postes (Directeur Général, Secrétaire, Comptable...), volontairement découplé des rôles RBAC (Module 1).
- `pay_periods` — mois de paie (cycle OUVERT → EN_COURS → CLOTURE), même granularité calendaire que `accounting_periods` (Module 7) mais table distincte (cycle de vie plus riche).
- `payroll_component_types`/`payroll_line_components` — primes/indemnités/retenues/cotisations en référentiel configurable + saisie manuelle par bulletin, aucun barème automatique (sections du chapitre non transmises).
- `salary_advances` — avances sur salaire, jamais supprimées, déduites automatiquement au calcul puis marquées `DEDUITE` à la validation.
- `payroll_lines` — un bulletin par employé × période, recalculable tant que non `VALIDEE` puis figé ; `verification_code` réservé pour un futur QR code (comme `Payment`, Module 4.3).
- **Heures "réellement exécutées" approximées par les heures planifiées** du Module 5 (`computeMonthlyPlannedHours`) faute de suivi de présence réel dans l'ERP — voir ADR-035.
- **Intégration comptable conditionnelle** (Module 7) à la validation d'un bulletin, simplifiée à une seule paire débit/crédit sur le net à payer — voir ADR-036, même principe qu'ADR-028.
- **Extension additive** : `NumberingPurpose` gagne `EMPLOYE` (8ᵉ réutilisation du moteur de numérotation généralisé).

Détail complet (relations, contraintes) : `docs/modules/MODULE-08-paie.md` §2.

### Module 5.1 (développé 2026-07-28, révisé en profondeur par le Module 5.2 le 2026-07-29)
- **Substitut minimal à un moteur "Emploi du temps" inexistant** : `teacher_weekly_slots` (jour/heure/salle par affectation), **sans aucune détection de conflit** de salle/enseignant/classe — voir ADR-038. **Remplacé par `Seance` au Module 5.2 (voir ADR-042) : `teacher_weekly_slots`/`teacher_attendance_sessions` n'existent plus.**
- `teacher_monthly_timesheets` — fiche mensuelle de pointage (un enseignant × un mois), cycle OUVERTE → CLOTUREE, symétrique de `pay_periods` (Module 8). **Conservée inchangée par le Module 5.2**, seule sa relation vers les séances change de cible.
- ~~`teacher_attendance_sessions`~~ — séance concrète générée depuis un créneau hebdomadaire, qualifiable `DISPENSE`/`REPORTE`/`ANNULE`/`REMPLACE`. **Supprimée** : remplacée par `seances` (voir Module 5.2 ci-dessous), vocabulaire renommé `EFFECTUEE`/`REPORTEE`/`ANNULEE`/`REMPLACEE` + `PROGRAMMEE` explicite.
- **Seul un utilisateur du système peut qualifier une séance** : `Teacher` reste une fiche autonome sans compte de connexion (Module 5 §1.1), l'auto-validation par l'enseignant n'est donc pas possible — **principe inchangé au Module 5.2**.
- **Révision d'ADR-035 (voir ADR-039)** : le calcul de paie horaire (`payrollLineService`) utilise en priorité les heures réellement pointées d'une fiche mensuelle complète, avec repli sur l'ancien proxy planifié sinon — tracé sur `payroll_lines.hours_source` (`POINTAGE`/`PLANIFIE`). **Contrat externe (`getTeacherPayrollHours`) inchangé au Module 5.2**, seule sa source de données change.
- **Extension additive** : `payroll_settings` gagne `default_hourly_rate`/`default_session_duration_hours` (préremplissage d'un nouvel employé uniquement, jamais un second référentiel de tarifs).
- Écran de contrôle avant génération de la paie (séances/heures prévues vs effectuées, montant brut, observations) intégré au module Paie.

Détail complet (relations, contraintes, points ouverts validés) : `docs/modules/MODULE-05.1-pointage-enseignants.md` §2/§6.

### Module 5.2 (développé 2026-07-29, en attente du test manuel des écrans)
- **`Seance` remplace `teacher_weekly_slots`/`teacher_attendance_sessions`** (voir ADR-042) : référence directement `teacher_id`+`subject_offering_id` (jamais `teacher_assignment_id`), porte une relation N-N (`SeanceClass`) vers 1 à N classes — supporte nativement les cours mutualisés/tronc commun sans jamais multiplier les heures/le montant par le nombre de classes (règle non négociable). `TeacherAssignment` reste inchangée, conservée uniquement pour la charge horaire (Module 5), plus référencée par la planification.
- `rooms` — référentiel minimal de salles (libellé, capacité), remplace à terme `Class.main_room` (texte libre).
- `pedagogical_groups`/`pedagogical_group_classes` — groupe pédagogique configurable, simple raccourci de saisie qui préremplit les classes d'une séance sans jamais les contraindre après création.
- `seance_recurrence_templates`/`seance_recurrence_template_classes` — modèle de récurrence hebdomadaire remplaçant `teacher_weekly_slots`, génère des `Seance` concrètes et indépendantes (idempotent via une contrainte unique `recurrence_template_id`+`session_date`) ; chaque séance générée est ensuite modifiable/déplaçable sans affecter le modèle ni les autres occurrences.
- **Détection de conflits bloquante** (enseignant/salle/classe) à la création/modification d'une séance — seules les séances `PROGRAMMEE`/`EFFECTUEE` occupent réellement le créneau (une séance annulée/reportée/remplacée le libère).
- Statuts de séance renommés au vocabulaire du chapitre : `PROGRAMMEE` (défaut explicite, remplace le `null` du Module 5.1) / `EFFECTUEE` / `REPORTEE` / `ANNULEE` / `REMPLACEE`.
- **Extension additive** : `payroll_settings` gagne `overtime_multiplier`/`monthly_hours_cap` — champs de configuration uniquement, **aucun calcul automatique** tant que la règle exacte de déclenchement/majoration n'est pas précisée par le porteur du projet.
- **Génération automatique optimisée (solveur sous contraintes) différée** à une itération future — voir ADR-043. Seules la création manuelle et la création assistée (conflits en direct) sont livrées.
- Nouveau module apps/desktop "Emploi du temps" (vue filtrée classe/enseignant/salle/filière/niveau/semestre, impression réutilisant le moteur de thèmes) ; Pointage et Contrôle avant paie adaptés au nouveau vocabulaire.

Détail complet (relations, contraintes, points ouverts validés) : `docs/modules/MODULE-05.2-emploi-du-temps.md` §2/§6/§7.

### Module 6 (validé 2026-07-29)
- **Aucune duplication de matière/contexte** : `notes` référence directement `SubjectOffering` (Module 2.1), qui porte déjà matière/année/semestre/niveau/filière/coefficient — contrairement au système existant analysé, qui dupliquait ces champs sur sa propre table `notes` (voir ADR-041).
- `evaluation_settings` — singleton configurable : pondérations des composantes (orale/écrite/composition) et seuils de mention/admission, jamais codés en dur.
- `notes` — note finale **toujours calculée**, jamais saisie directement ; verrouillée automatiquement à la génération du bulletin de sa période, déverrouillage réservé à `NOTES:ADMINISTRATION`.
- `bulletins_periode`/`bulletins_annuels` — instantané figé à la génération, **aucun fichier PDF stocké** (écran HTML/CSS imprimable, comme le bulletin de paie/reçu) — élimine structurellement le bug de ligne orpheline identifié dans le système existant. **Immuables** une fois générés : un index unique **partiel** (`WHERE annule = false`) autorise une régénération uniquement après annulation explicite (voir ADR-041, MODULE-06 §3 règle 7).
- Moyenne annuelle généralisée à N périodes (pas figée à 2 "modules" comme le système existant) ; classement par mérite jamais stocké, recalculé à la demande, gestion des ex-æquo façon classement sportif (rang 1, 1, 3).
- **Extension additive découverte en cours de développement** : `student_enrollments.annual_average`/`mention`/`decision` (Module 4.1) existaient déjà en attente de ce module — désormais alimentés à la génération du bulletin annuel ; `decision` réutilise directement l'enum `EnrollmentDecision` (Module 4.1) plutôt qu'un enum dédié.
- **Extension additive** : `NumberingPurpose` gagne `BULLETIN_PERIODE`/`BULLETIN_ANNUEL` (8ᵉ/9ᵉ réutilisations du moteur de numérotation généralisé).

Détail complet (relations, contraintes, points ouverts validés) : `docs/modules/MODULE-06-evaluation.md` §2/§6.

### Module 12 (validé 2026-07-29)
- **Carnet d'adresses transverse, aucune nouvelle table de contacts** : lecture à la demande sur `students`/`guardians`/`teachers`/`employees`, déjà porteurs des champs téléphone principal/secondaire/WhatsApp/e-mail nécessaires — voir ADR-044.
- **Architecture indépendante des fournisseurs** (`ChannelAdapter`) : `EmailAdapter` (SMTP, fonctionnel dès cette version), `SmsAdapter` (passerelle Android locale, adaptateur HTTP générique — voir ADR-045), génération de lien `wa.me` pour WhatsApp (jamais un envoi programmatique — voir ADR-046). Changer de fournisseur SMS/e-mail = nouvel adaptateur, jamais une réécriture du reste du module.
- `sms_gateway_accounts` — plusieurs comptes possibles (principal/secours), un seul `is_default` à la fois ; `whatsapp_gateway_settings`/`email_gateway_settings`/`communication_settings` — singletons. Logo/nom officiel/coordonnées réutilisés en lecture depuis `establishment_settings`/`campus_settings` (Module 2), jamais dupliqués.
- `message_templates` — référentiel configurable (11 modèles système seedés), moteur de substitution `{Variable}` pur et testé séparément.
- `notification_event_configs` — un enregistrement par type d'événement automatique (inscription validée, paiement, bulletin disponible, changement d'emploi du temps) ; `channels` ne peut jamais contenir WhatsApp — seuls SMS et e-mail portent une notification réellement automatique (voir ADR-046).
- **Notification automatique de paiement (fonction obligatoire du chapitre)** : branchée sur `paymentService.createPayment` (Module 4.3), envoi simultané à l'étudiant et à tous ses tuteurs marqués contact principal, jamais avant l'émission du reçu. Hooks additionnels : `enrollmentService.createEnrollment` (Module 4.1), `bulletinPeriodeService`/`bulletinAnnuelService` (Module 6), `seanceService.qualifySeance` (Module 5.2, séance reportée/annulée/remplacée). Tous non bloquants par construction : un échec de notification ne remet jamais en cause l'événement source.
- `campaigns`/`communication_messages` — audience résolue à la demande à chaque envoi (jamais figée à la création) ; historique dénormalisé (destinataire/contenu figés au moment de l'envoi, comme les bulletins/bulletins de paie).
- **Boucle de vérification périodique** (`setInterval`, aucune dépendance externe) ajoutée au serveur `packages/api` pour les campagnes planifiées/récurrentes — cohérente avec l'architecture serveur persistant déjà actée (ADR-007) : dégradation propre si le serveur est éteint au moment prévu, l'envoi part au prochain démarrage.
- `internal_notifications` — notifications internes in-app, boîte personnelle par utilisateur, indépendante des permissions du module Communication.
- **Extension additive** : `employees.whatsapp` (alignement avec `students`/`guardians`/`teachers`, qui portaient déjà ce champ).

Détail complet (relations, contraintes, points ouverts validés) : `docs/modules/MODULE-12-communication.md` §2/§6/§7.

### Moteur de thèmes d'impression (2026-07-28, extension transversale)
- `print_theme_settings` — singleton, **seule source des couleurs de tous les documents imprimables** de l'ERP (bulletin de paie, reçus de paiement, et tout futur certificat/attestation/facture/état comptable) — voir ADR-037.
- Décorrélé de `theme_settings` (couleurs de l'interface applicative, Module 2 §3.15) : un document officiel doit rester lisible en noir/blanc sur imprimante laser quelle que soit la couleur choisie pour l'interface.
- **Architecture générique réutilisable sans développement spécifique** : les couleurs sont injectées en CSS custom properties (`--print-border-color`, `--print-title-color`...) sur le conteneur `[data-print-area]` via le hook `usePrintThemeStyle()` (`apps/desktop/src/renderer/src/lib/printTheme.ts`), consommées par des classes utilitaires dédiées (`.print-border`, `.print-separator`, `.print-title`, `.print-header`, `.print-table-border`, `.print-text`, `.print-text-secondary`, `.print-box`, `.print-total`, `.print-net`, voir `packages/ui/src/styles/globals.css`). Tout futur document imprimable applique le hook + ces classes, sans logique de couleur propre.
- Paramètres → Apparence → Thèmes d'impression : 2 thèmes prédéfinis (Noir administratif, Bleu institutionnel) + Personnalisé (10 sélecteurs de couleur).
- Appliqué à `PayslipView.tsx` (bulletin de paie, Module 8) et `ReceiptView.tsx` (reçu, Module 4.3) sans modifier leur structure, calculs, dimensions ni zones de signature/logo/QR. Le double exemplaire (Employé/Administration) initialement ajouté au bulletin de paie a été retiré le 2026-07-28 (ADR-040) — impossible à afficher/imprimer correctement de façon fiable, un seul exemplaire est imprimé.
- **Impression multi-page dans une Dialog** (correctif 2026-07-28) : les documents imprimables sont rendus dans une modale (`Dialog`), désormais montée en **portail React directement sous `<body>`** (au lieu d'être imbriquée dans l'arbre applicatif) — un ancêtre `position: fixed` réancre sinon le contenu sur chaque page imprimée au lieu de le laisser s'écouler normalement sur plusieurs pages. À l'impression, `#root` (le reste de l'application) est masqué en bloc (`display: none`, pas `visibility: hidden`, pour ne réserver aucun espace) et la Dialog perd son habillage/positionnement fixe (`[data-dialog-overlay]`/`[data-dialog-panel]`, voir `globals.css`). Une règle `@page { size: A4; margin: 12mm; }` explicite a été ajoutée.

Principes hérités de l'analyse du schéma MySQL existant, à respecter dès la conception (voir `RAPPORT_ANALYSE_ISAC_ERP.md` §3 et §6), mis à jour pour le mono-campus :
- Une table de configuration établissement (singleton logique — une seule ligne active par installation), mais avec clé primaire en UUID et structure isolée pour rester extensible vers un futur multi-campus sans migration destructive.
- Pas de suppression physique sur les entités sensibles (étudiants, paiements, utilisateurs) — flags `actif`/`annule` + horodatage.
- Contraintes UNIQUE composites explicites pour toute règle d'unicité métier (ex. une note par étudiant/matière/module/année).
- `created_at`/`updated_at` systématiques sur toutes les tables.
- Migrations Prisma versionnées, jamais de script SQL manuel hors migration.

---

## 7. Conventions & standards

*Établies pendant le Module 0 (voir `docs/modules/MODULE-00-socle-technique.md` §3) et **définitives** depuis la validation de ce module le 2026-07-26.*

| Sujet | Convention |
|---|---|
| Nommage code TypeScript | camelCase (variables/fonctions), PascalCase (composants/types), kebab-case (dossiers) |
| Nommage base de données | snake_case en PostgreSQL, mappé en camelCase côté Prisma/TS via `@map`/`@@map` |
| Résolution de modules TS | `moduleResolution: "Bundler"` partout (hérité de `tsconfig.base.json`) — ne pas surcharger en `NodeNext` par package |
| Langue | Interface, données métier, documentation utilisateur : **français**. Identifiants de code et tables techniques : **anglais**. Commentaires : français, seulement si le POURQUOI n'est pas évident |
| Commits | [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `test:`...) |
| Branches | `main` protégée ; une branche par module (`module/01-identite-acces`) ; fusion après validation de l'étape 7 |
| Tests | Arborescence miroir (`foo.ts` → `foo.test.ts`) ; Vitest (unitaire/intégration) avec `--passWithNoTests` tant qu'un package n'a pas encore de logique propre ; Playwright (E2E sur l'app Electron packagée) |
| Gestion d'erreur API | Convention `Result<T, E>` typée (inspirée du pattern `(succès, message)` de l'existant) plutôt que des exceptions non typées entre couches |
| Versionnement du schéma DB | Prisma Migrate exclusivement, jamais de script SQL manuel hors migration versionnée |
| Clés primaires | UUID (extensibilité multi-campus future, voir ADR-005) |
| Build de production PDF/documents | Templates HTML/CSS communs, jamais de logique de dessin dupliquée entre documents (voir principe n°6, §5) |

---

## 8. Journal des mises à jour de ce document

| Date | Modification | Déclencheur |
|---|---|---|
| 2026-07-26 | Création initiale du document | Validation du rapport d'analyse par le porteur du projet ; avant démarrage du Module 0 |
| 2026-07-26 | Révision majeure : passage d'une architecture multi-campus centralisée à une architecture **mono-campus autonome et configurable** (§3 ajouté, §5 mis à jour) ; extraction de la roadmap vers `ROADMAP.md` et du journal de décisions vers `DECISIONS.md` | Décision explicite du porteur du projet sur la topologie multi-campus |
| 2026-07-26 | Conventions & standards (§7) renseignées avec le résultat concret du Module 0 (scaffolding monorepo fonctionnel : install, lint, typecheck, tests unitaires, build, E2E Playwright tous verts) | Étapes 2 à 6 du Module 0 réalisées ; étape 7 (validation) encore en attente |
| 2026-07-26 | **Module 0 validé** par le porteur du projet. Conventions (§7) définitives. Connexion PostgreSQL réelle reportée à l'ouverture du Module 1 (Docker Desktop en panne sur la machine de dev, sans rapport avec le code) | Validation explicite reçue |
| 2026-07-26 | **Module 1 validé** par le porteur du projet (authentification, RBAC, sessions, journal d'audit). Schéma cumulé (§6) complété. Topologie intra-campus (§3) confirmée en conditions réelles. PostgreSQL installé nativement sur cette machine (Docker abandonné, virtualisation indisponible — voir ADR-010) | Parcours complet vérifié avec une vraie base PostgreSQL ; validation explicite reçue |
| 2026-07-26 | **Module 2 validé** par le porteur du projet (paramètres établissement, campus, signataires/cachet, structure académique complète — fusion de l'ancien Module 3 —, devise, régional, thème en direct, registre de modèles de documents, export/import de configuration). Schéma cumulé (§6) complété (13 tables), `establishment_display` du Module 1 remplacée par `establishment_settings`/`campus_settings` | Parcours complet des écrans testé manuellement par le porteur du projet ("tout fonctionne") ; validation explicite reçue |
| 2026-07-26 | **Module 4 validé** par le porteur du projet (référentiel étudiants complet : identité, parents/tuteurs, documents, historique académique par année via `student_enrollments`, changement de classe tracé, archivage réversible, doublons, import/export, matricule à gabarit configurable). Schéma cumulé (§6) complété (7 tables/singletons). Nouveau composant `ServerDataTable` (pagination/tri/recherche côté serveur) pour les tableaux à fort volume. | Vérification de bout en bout contre PostgreSQL réel effectuée par l'assistant, puis parcours des écrans confirmé par le porteur du projet ("j'ai accès et tout marche bien") ; validation explicite reçue |
| 2026-07-27 | **Module 4.1 validé** par le porteur du projet (inscriptions/réinscriptions : extension additive de `student_enrollments` — régime, numéro d'inscription, paiement affiché, annulation —, moteur de numérotation généralisé par `purpose`, contrôle de capacité/documents obligatoires désactivés par défaut, tableau de bord, liste transverse, import). Schéma cumulé (§6) complété. `DataTable`/`ServerDataTable` reçoivent un zébrage coloré (toutes lignes paires, rétroactif sur tous les tableaux existants) et le tableau de bord des inscriptions un jeu de couleurs par pertinence, à la demande du porteur du projet. | Vérification de bout en bout contre PostgreSQL réel effectuée par l'assistant, puis parcours des écrans confirmé par le porteur du projet ("OUI") ; validation explicite reçue |
| 2026-07-27 | **Module 4.2 validé** (référentiel unique des frais de scolarité : types de frais configurables, tarifs à dimensions optionnelles avec résolution automatique du plus spécifique, échéanciers, bourses/remises/exonérations, historique des tarifs réutilisant `audit_log`, coût de scolarité sur la fiche étudiant). Schéma cumulé (§6) complété (5 nouvelles tables). Développement autonome intégral, sans étape de validation intermédiaire, sur autorisation explicite du porteur du projet avant son absence. | Vérification de bout en bout contre PostgreSQL réel effectuée par l'assistant, démarrage réel du serveur API confirmé ; validation explicite du porteur du projet reçue par avance pour ce module, test manuel des écrans à son retour |
| 2026-07-27 | **Module 4.3 validé** (paiements et caisse : encaissement total/partiel/par échéance/par frais spécifique, modes de paiement configurables, reçu imprimable réutilisant les données de branding du Module 2, historique et annulation sécurisée, caisse avec ouverture/fermeture/écart calculé sur les espèces, tableau de bord temps réel). Schéma cumulé (§6) complété (5 nouvelles tables). "Payé"/"reste à payer" enfin calculés réellement (Module 4.2 = dû, Module 4.3 = payé), `student_enrollments.payment_status` désormais calculé automatiquement. Nouveau mécanisme générique d'impression ciblée (`[data-print-area]`, `packages/ui`). | Vérification de bout en bout contre PostgreSQL réel effectuée par l'assistant, démarrage réel du serveur API confirmé ; validation de la conception reçue avant développement, un plantage de l'écran Encaissement signalé au test manuel des écrans a été corrigé sur-le-champ, puis parcours confirmé fonctionnel par le porteur du projet |
| 2026-07-27 | **Module 7 validé** (comptabilité générale et gestion financière : plan comptable configurable, journal en partie double avec génération automatique des écritures depuis les Modules 4.2/4.3 — aucune double saisie —, dépenses avec workflow d'approbation et pièces justificatives, fournisseurs, budget avec écart calculé à la volée, Grand livre, Balance, recettes, tableau de bord et rapports financiers, verrouillage de périodes comptables, annulation par contre-passation jamais par suppression). Schéma cumulé (§6) complété (10 nouvelles tables + 2 colonnes additives sur `payment_methods`/`fee_types`). | Vérification de bout en bout contre PostgreSQL réel effectuée par l'assistant (une anomalie réelle détectée sur le calcul du Grand livre après contre-passation, corrigée avant conclusion), démarrage réel du serveur API confirmé ; développement autonome intégral autorisé par le porteur du projet avant son absence, validation explicite reçue à son retour ("JE VALIDE") |
