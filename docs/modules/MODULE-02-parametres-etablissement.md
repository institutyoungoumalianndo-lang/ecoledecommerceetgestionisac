# Module 2 — Paramètres généraux et configuration de l'établissement

**Statut** : ✅ **Terminé — validé le 2026-07-26**
**Dépend de** : Module 0 (validé), Module 1 (validé).
**Source** : Chapitre 3 du cahier des charges (reçu le 2026-07-26).

---

## 1. Analyse fonctionnelle

### 1.1 Objectif

Centre de configuration unique de l'ERP : aucune information propre à un établissement n'est codée en dur, tout est configurable depuis ce module, permettant d'installer le logiciel dans n'importe quel établissement sans toucher au code.

### 1.2 Périmètre inclus — et regroupement avec l'ancienne roadmap

Ce chapitre est **beaucoup plus large** que ce que `ROADMAP.md` prévoyait initialement pour le "Module 2 — Paramètres de l'établissement" : il englobe aussi toute la **structure pédagogique** (années universitaires, semestres, filières, classes, niveaux) que la roadmap avait provisoirement isolée dans un "Module 3 — Référentiels pédagogiques" séparé.

**Décision de réorganisation** (voir §7 pour la mise à jour formelle de `ROADMAP.md`) : l'ancien Module 3 est **fusionné dans ce Module 2**, conformément à votre cahier des charges — je ne réécris pas la numérotation existante (pas de renumérotation en cascade des 15 modules suivants), je marque simplement l'ancien Module 3 comme fusionné et je rattache les dépendances des modules suivants (Étudiants, Professeurs...) à ce Module 2.

Périmètre concret (repris de votre chapitre) :
1. Établissement (identité légale, coordonnées) — §3.2
2. Campus (unique par installation) — §3.3
3. Logos (principal, secondaire, ministère, favicon) — §3.4
4. Signatures numérisées (5 signataires) — §3.5
5. Cachet officiel (import, taille, position, documents concernés) — §3.6
6. Informations administratives/légales — §3.7
7. Années universitaires (une seule active à la fois) — §3.8
8. Semestres/périodes académiques (découpage configurable) — §3.9
9. Filières — §3.10
10. Classes — §3.11
11. Niveaux d'études (liste configurable) — §3.12
12. Devise (GNF par défaut, format) — §3.13
13. Paramètres régionaux (langue, fuseau, formats) — §3.14
14. Personnalisation graphique (couleurs, police, images, appliqué en direct) — §3.15
15. Modèles de documents (9 types) — §3.16
16. Sauvegarde/restauration des paramètres (export/import) — §3.17
17. Journal des modifications (audit avant/après) — §3.18

### 1.3 Continuité avec le Module 1

Le Module 1 avait créé une table minimale `establishment_display` (nom établissement, nom campus, logo) uniquement pour afficher l'écran de connexion, en attendant ce module. Ce Module 2 **remplace** cette table par le modèle complet décrit en §2, avec migration des données existantes (pas de perte).

### 1.4 Points tranchés par le porteur du projet (2026-07-26)

Les 5 points ci-dessous ont tous été confirmés tels que proposés :
1. ✅ **"Modèles de documents"** : registre de configuration par type de document (logo/signature/cachet applicables, pied de page), pas d'éditeur visuel de mise en page — celui-ci viendra avec le moteur de rendu du Module 9.
2. ✅ Import de fichiers via route REST dédiée + `sharp` (détail technique, non soumis à décision).
3. ✅ Thème graphique : rechargement à chaud des variables CSS, sans redémarrage de l'application.
4. ✅ "Sauvegarde des paramètres" = export/import JSON du paramétrage uniquement, distinct de la sauvegarde complète de la base (Module 11).
5. ✅ Nouvelle teinte de fond de fenêtre acceptée telle quelle.

---

## 2. Conception de la base de données (proposition — migrations non créées, en attente de validation)

### 2.1 Schéma proposé

```
establishment_settings (singleton — remplace establishment_display du Module 1)
├── id, official_name, acronym, motto, slogan
├── address, city, prefecture, region, country
├── phones (liste), primary_email, secondary_email, website
├── logo_primary_path, logo_secondary_path, ministry_logo_path, favicon_path
├── authorization_number, tax_number, rccm_number, administrative_references, legal_mentions
└── created_at / updated_at

campus_settings (singleton — un seul campus par installation, conforme à l'architecture mono-campus)
├── id, name, code, address, phones, email
├── gps_latitude, gps_longitude (nullable)
├── manager_user_id  → users.id (nullable)
└── created_at / updated_at

document_signatories (5 lignes attendues, extensible)
├── id, role_code (DIRECTEUR_GENERAL | DIRECTEUR_CAMPUS | DIRECTEUR_ETUDES | COMPTABLE | RESPONSABLE_ADMINISTRATIF)
├── display_name, title, signature_image_path
├── linked_user_id → users.id (nullable)
└── updated_at

official_stamp (singleton)
├── id, image_path, width_mm, height_mm
├── position_x_mm, position_y_mm
├── applicable_document_types (liste de codes document)
└── updated_at

academic_years
├── id, label (ex. "2026-2027"), start_date, end_date
├── is_active (une seule ligne à true — contrainte applicative, voir §3.1)
├── is_closed, closed_at, reopened_at, reopened_by → users.id (nullable)
└── created_at / updated_at

academic_periods (semestres/trimestres/découpage personnalisé)
├── id, academic_year_id → academic_years.id
├── code, label, start_date, end_date, order_index
└── created_at / updated_at

filieres
├── id, code, name, description
├── responsable_user_id → users.id (nullable)
├── duration, is_active
└── created_at / updated_at

levels (niveaux d'études — liste libre, pas figée à L1..M2)
├── id, code, label, order_index, is_active
└── created_at / updated_at

classes
├── id, code, name
├── filiere_id → filieres.id, level_id → levels.id, academic_year_id → academic_years.id
├── max_capacity, main_room, is_active
└── created_at / updated_at

currency_settings (singleton)
├── id, currency_code (défaut "GNF"), amount_format, thousands_separator, decimal_count
└── updated_at

regional_settings (singleton)
├── id, language, timezone, date_format, time_format, first_day_of_week
└── updated_at

theme_settings (singleton)
├── id, primary_color, secondary_color, button_color, menu_color, font_family
├── login_image_path, background_image_path
└── updated_at

document_templates (une ligne par type de document)
├── id, document_type (CARTE_ETUDIANT | ATTESTATION | CERTIFICAT | BULLETIN | RECU | FACTURE | DIPLOME | CONVOCATION | DECISION)
├── show_logo_primary, show_logo_secondary, show_stamp (booléens)
├── signatory_role_code (référence document_signatories.role_code, nullable)
├── custom_footer_text
└── updated_at
```

**Aucune nouvelle table pour le journal des modifications (§3.18)** : la table `audit_log` du Module 1 couvre déjà ce besoin (transversale, avec `details` JSON) — chaque mutation de ce module y écrira une entrée avec `details: { before: {...}, after: {...} }`. Nouveaux codes d'action à documenter : `SETTINGS_ESTABLISHMENT_UPDATE`, `SETTINGS_CAMPUS_UPDATE`, `ACADEMIC_YEAR_CREATE/UPDATE/CLOSE/REOPEN/ACTIVATE`, `FILIERE_CREATE/UPDATE/DEACTIVATE`, `CLASS_CREATE/UPDATE`, `LEVEL_CREATE/UPDATE`, `THEME_UPDATE`, `SETTINGS_EXPORT/IMPORT`.

### 2.2 Relations

- `campus_settings.manager_user_id`, `filieres.responsable_user_id`, `document_signatories.linked_user_id`, `academic_years.reopened_by` → `users.id` (Module 1).
- `classes.filiere_id → filieres.id`, `classes.level_id → levels.id`, `classes.academic_year_id → academic_years.id`.
- `academic_periods.academic_year_id → academic_years.id`.
- `establishment_settings`, `campus_settings`, `official_stamp`, `currency_settings`, `regional_settings`, `theme_settings` : tables singleton (une seule ligne), même principe que `security_settings`/`establishment_display` du Module 1.

### 2.3 Migration depuis le Module 1

`establishment_display` (3 champs) est remplacée par `establishment_settings` (champ complet) + `campus_settings` — une migration de données recopiera `establishment_name`→`official_name`, `campus_name`→`campus_settings.name`, `logo_path`→`logo_primary_path` avant suppression de l'ancienne table.

---

## 3. Règles métier

### 3.1 Années universitaires
- **Une seule année active à la fois** : activer une année désactive automatiquement l'année précédemment active (transaction atomique, comme `activer()` dans l'ancien projet Python analysé).
- Une année **clôturée** bloque toute saisie dans les modules qui en dépendent (notes, paiements — appliqué à partir des modules concernés, pas ce module-ci).
- **Réouverture** réservée à une permission dédiée (`ANNEES:ADMINISTRATION`), journalisée avec l'ancien état.
- Une classe est toujours rattachée à une année précise (pas de réutilisation d'une classe d'une année sur l'autre) — reprend le modèle validé de l'ancien projet.

### 3.2 Semestres/périodes
- Le nombre de périodes par année scolaire est libre (2 pour semestres, 3 pour trimestres, ou découpage personnalisé) — pas de contrainte figée en base, juste `order_index` pour l'ordre d'affichage.
- Les dates de périodes doivent rester à l'intérieur des dates de l'année universitaire parente (validation applicative).

### 3.3 Filières / Niveaux / Classes
- Désactivation logique uniquement (`is_active=false`), jamais de suppression physique si des étudiants ou classes y sont rattachés (principe non négociable n°2/n°6) — la suppression réelle sera bloquée si des dépendances existent (vérifiée dès que le Module Étudiants existera ; pour l'instant, bloquée dès qu'une classe référence la filière/le niveau).
- Code de filière/niveau/classe unique (contrainte UNIQUE), format libre validé côté formulaire.

### 3.4 Logos, signatures, cachet
- Redimensionnement automatique à l'import (`sharp`), formats acceptés PNG/JPEG, taille maximale raisonnable (ex. 5 Mo avant compression) pour rester compatible avec un poste de campus modeste.
- Signatures et cachet ne sont accessibles qu'aux permissions `PARAMETRES:ADMINISTRATION`.

### 3.5 Devise et régional
- Le format de devise (`currency_settings`) est LA source de vérité pour tout affichage monétaire dans l'application — aucun module financier futur ne doit reformater les montants localement (principe non négociable n°6, factorisation dans `packages/shared`).

### 3.6 Thème graphique
- Application immédiate : la sauvegarde déclenche un rechargement des variables CSS dans toutes les fenêtres ouvertes (pas besoin de redémarrer l'app).

### 3.7 Journal des modifications
- Toute mutation de ce module (établissement, campus, années, filières, classes, niveaux, thème, devise, régional) écrit une entrée `audit_log` avec les valeurs avant/après — reprend le mécanisme déjà en place au Module 1, étendu avec de nouveaux codes d'action (voir §2.1).

### 3.8 Sauvegarde des paramètres
- Export : sérialise toutes les tables de ce module (hors fichiers binaires eux-mêmes, référencés par chemin) en un fichier JSON horodaté.
- Import/restauration : validation stricte du format avant application, transaction atomique (tout ou rien), journalisée.

---

## 4. Conception UI/UX

### 4.1 Organisation générale
Nouvelle section **Paramètres** dans `AppShell` (visible selon permission `PARAMETRES:LECTURE` a minima), avec sous-navigation par catégories :
- **Identité** : Établissement, Campus, Logos, Signatures, Cachet officiel, Informations administratives
- **Structure académique** : Années universitaires, Semestres, Filières, Niveaux, Classes
- **Régional & Devise** : Devise, Paramètres régionaux
- **Apparence** : Personnalisation graphique
- **Documents** : Modèles de documents
- **Système** : Sauvegarde des paramètres

### 4.2 Écrans (un par item de §1.2), tous construits avec les composants du design system existant (`Input`, `Select`, `Checkbox`, `DataTable`, `Dialog`)
- Formulaires simples pour les tables singleton (Établissement, Campus, Cachet, Devise, Régional, Thème).
- `DataTable` + `Dialog` de création/édition pour les tables à plusieurs lignes (Années, Filières, Niveaux, Classes, Signatures, Modèles de documents) — réutilise exactement le patron déjà en place pour Utilisateurs/Rôles au Module 1.
- Écrans d'upload d'image (Logos, Signatures, Cachet, images de thème) : zone de dépôt + aperçu redimensionné avant validation.
- Écran Personnalisation graphique : sélecteurs de couleur + aperçu en direct (les changements s'appliquent à l'écran de paramètres lui-même immédiatement, avant même l'enregistrement, pour prévisualisation).
- Écran Années universitaires : badge "Active" sur la ligne courante, actions Clôturer/Réouvrir avec confirmation renforcée (comme la restauration de sauvegarde au Module 0/1).

### 4.3 Cohérence
Tous les écrans utilisent exclusivement les composants `packages/ui` existants — aucun nouveau composant structurant prévu sauf un composant `ImageUpload` (zone de dépôt + aperçu) et `ColorPicker` (sélecteur de couleur), tous deux ajoutés à `packages/ui` pour réutilisation future.

---

## 5. Développement

Réalisé intégralement, conforme au schéma et aux règles ci-dessus :

- **`packages/db`** : 13 modèles Prisma (§2.1), migration appliquée (`20260726191210_module2_parametres_etablissement`), `EstablishmentDisplay` du Module 1 remplacé. Seed étendu : catalogue de 34 nouvelles permissions (18 modules × actions), 5 niveaux par défaut (L1-M2), 5 signataires, 9 modèles de documents.
- **`packages/api`** : upload de fichiers hors tRPC (`@fastify/multipart` + `@fastify/static` + `sharp`, redimensionnement automatique max 1200px, ADR-012), services et routers pour établissement, campus, signatures, cachet, années/périodes, filières, niveaux, classes, devise, régional, thème, modèles de documents, export/import de configuration. Toutes les mutations journalisent avant/après dans `audit_log` (§3.7/§3.18).
- **`packages/ui`** : composants `ImageUpload` et `ColorPicker`. Variables CSS `--button`/`--menu` ajoutées, distinctes de `--primary`/`--muted`, pour que la personnalisation graphique (§3.15) règle indépendamment couleur principale, couleur des boutons et couleur du menu.
- **`apps/desktop`** : 12 écrans (`EstablishmentScreen`, `CampusScreen`, `SignatoriesScreen`, `StampScreen`, `AcademicYearsScreen` avec gestion des périodes imbriquée, `FilieresScreen`, `LevelsScreen`, `ClassesScreen`, `LocalizationScreen`, `ThemeScreen`, `DocumentTemplatesScreen`, `BackupScreen`), regroupés dans `SettingsShell` (sous-navigation par catégories) et intégrés à `AppShell` sous une nouvelle section « Paramètres ». Thème appliqué en direct dès le démarrage de l'app (conversion hex→HSL, fonction pure testée) et en aperçu immédiat dans l'écran d'édition, avant même l'enregistrement.
- Fond de fenêtre et menu latéral assombris conformément à la consigne du porteur du projet, désormais pilotés par les variables `--muted`/`--menu` (personnalisables via ce module).

## 6. Tests

| Vérification | Résultat |
|---|---|
| `pnpm lint` | ✅ 5/5 packages |
| `pnpm typecheck` | ✅ |
| `pnpm test` (Vitest) | ✅ 25 tests (dont 4 nouveaux sur la conversion hex→HSL du thème, valeurs vérifiées par calcul indépendant) |
| `pnpm build` | ✅ |
| Vérification en conditions réelles (`pnpm dev`, vraie base PostgreSQL) | ✅ écran de connexion charge établissement/campus depuis la base réelle (requêtes traitées avec succès) |
| Parcours complet de tous les écrans Paramètres (création année/filière/niveau/classe, upload logo/signature/cachet, personnalisation graphique, export/import) | ✅ **Testé et confirmé par le porteur du projet le 2026-07-26** — tout fonctionne. |

## 7. Validation

**✅ Validé le 2026-07-26** par le porteur du projet, après test manuel de l'ensemble des écrans (identité, structure académique, régional/devise, apparence, modèles de documents, sauvegarde).

---

## Annexe — Mise à jour de `ROADMAP.md` (à appliquer après votre validation de ce document)

- Fusionner l'ancien "Module 3 — Référentiels pédagogiques" dans ce Module 2 (statut → "Fusionné dans le Module 2, voir Chapitre 3").
- Modules dépendant auparavant de "3" (Étudiants, Professeurs & Emploi du temps, etc.) dépendront désormais de "2".
