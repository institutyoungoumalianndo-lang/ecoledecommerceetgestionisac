# Module 1 — Identité, Authentification et Gestion des Accès

**Statut** : ✅ **Terminé — validé le 2026-07-26**
**Dépend de** : Module 0 (validé).
**Source** : Chapitre 2 du cahier des charges (reçu le 2026-07-26).

---

## 1. Analyse fonctionnelle

### 1.1 Objectif

Porte d'entrée unique de l'ERP : aucun accès sans authentification, toute opération sécurisée/tracée/contrôlée par les droits du rôle de l'utilisateur.

### 1.2 Périmètre inclus

- Écran de connexion (logo, identité établissement/campus, champs identifiants, options).
- Authentification (vérification identifiants, compte actif, compte verrouillé, journalisation).
- Gestion des utilisateurs (CRUD complet + réinitialisation mot de passe + activation/désactivation).
- Gestion des rôles (CRUD, y compris création de rôles personnalisés par l'administrateur).
- Gestion des permissions (attribution par module × action, matrice rôle↔permissions).
- Journal d'audit (table technique + écran de consultation, alimenté par ce module ET par tous les modules futurs).
- Sessions serveur (suivi de l'inactivité, déconnexion automatique, révocation).
- Sécurité (hachage, verrouillage progressif, expiration facultative de mot de passe, contrôle d'accès systématique côté serveur — principe non négociable n°1 de `ARCHITECTURE_MASTER.md`).
- **Bootstrap de première installation** : détection qu'aucun administrateur n'existe encore et parcours guidé de création du premier compte (remplace le script CLI `creer_premier_administrateur.py` de l'ancien projet par une vraie expérience UI).

### 1.3 Dépendance croisée avec le futur Module 2 (Paramètres)

Deux besoins de ce chapitre appartiennent normalement au Module 2 (pas encore construit), mais sont nécessaires dès l'écran de connexion :
- **Identité affichée** (logo, nom établissement, nom campus).
- **Politique de sécurité configurable** (nombre de tentatives avant verrouillage, durée de verrouillage, délai d'inactivité avant déconnexion, activation/durée d'expiration du mot de passe).

**Proposition** (à valider, voir §2.10) : créer dès ce module deux petites tables techniques minimales :
- `establishment_display` : uniquement les 3 champs d'affichage nécessaires au login (nom établissement, nom campus, chemin du logo), seedée avec des valeurs par défaut modifiables. Le Module 2 l'étendra (coordonnées, responsables, devise, fuseau horaire, couleurs) sans la casser — c'est le Module 1 qui la crée, mais le Module 2 qui la rendra pleinement éditable via une vraie interface.
- `security_settings` : la politique de sécurité elle-même (verrouillage, inactivité, expiration mot de passe), possédée par ce Module 1 puisqu'elle est au cœur de son périmètre. Une interface d'édition (réservée à l'administrateur) sera livrée dans ce module.

Cela évite de bloquer le Module 1 en attendant le Module 2, tout en respectant le principe « rien n'est codé en dur ».

### 1.4 Points tranchés par le porteur du projet (2026-07-26)

1. **Bouton « Paramètres » sur l'écran de connexion** : ✅ **confirmé** — comportement conditionnel : si aucun administrateur n'existe encore, ouvre l'assistant de création du premier compte ; sinon, demande des identifiants administrateur puis ouvre uniquement des réglages techniques minimaux (connexion serveur/DB), jamais les écrans Paramètres métier du Module 2.
2. **Suppression d'utilisateur** : ✅ **confirmé** — suppression **logique** (`deleted_at`), distincte de la désactivation, réservée à la permission `UTILISATEURS:SUPPRESSION`. Historique d'audit toujours intact.

---

## 2. Conception de la base de données (proposition — migrations non créées, en attente de validation)

### 2.1 Schéma proposé

```
users (utilisateurs)
├── id                    UUID PK
├── first_name            string
├── last_name             string
├── username              string, unique
├── password_hash         string
├── email                 string, unique, nullable
├── phone                 string, nullable
├── job_title             string, nullable   (« fonction »)
├── photo_path             string, nullable
├── is_active             boolean, default true
├── failed_login_attempts int, default 0
├── locked_until          timestamp, nullable
├── password_changed_at   timestamp
├── must_change_password  boolean, default false   (pour la réinitialisation)
├── created_at / updated_at
└── deleted_at            timestamp, nullable   (suppression logique — voir point ouvert §1.4.2)

roles
├── id           UUID PK
├── code         string, unique  (ex. SUPER_ADMIN, DIRECTEUR_GENERAL, COMPTABLE...)
├── label        string          (ex. "Comptable")
├── is_system    boolean, default false  (rôles pré-livrés non supprimables ; false = rôle créé par un administrateur)
└── created_at / updated_at

user_roles (Affectation des rôles — table demandée explicitement en §2.10)
├── user_id      UUID FK -> users
├── role_id      UUID FK -> roles
├── assigned_at  timestamp
├── assigned_by  UUID FK -> users, nullable
└── PK composite (user_id, role_id)
    Règle métier : un seul rôle actif par utilisateur pour cette version (voir §3.2),
    mais le schéma reste multi-rôles pour rester extensible sans migration destructive.

permissions
├── id       UUID PK
├── code     string, unique   (convention "MODULE:ACTION", ex. UTILISATEURS:LECTURE)
├── module   string            (ex. IDENTITE, ETUDIANTS, FINANCES... — grandit à chaque nouveau module)
├── action   enum              (LECTURE, CREATION, MODIFICATION, SUPPRESSION, IMPRESSION, EXPORT, VALIDATION, ADMINISTRATION)
├── label    string
└── created_at

role_permissions
├── role_id        UUID FK -> roles
├── permission_id  UUID FK -> permissions
├── granted_at     timestamp
└── PK composite (role_id, permission_id)

user_sessions (Sessions)
├── id                UUID PK
├── user_id           UUID FK -> users
├── token_hash        string, unique   (le jeton en clair n'est jamais stocké, seul son hash)
├── created_at
├── last_activity_at  timestamp        (base du calcul d'inactivité)
├── expires_at        timestamp
├── ip_address        string, nullable
├── user_agent        string, nullable  (poste/OS d'origine)
└── revoked_at        timestamp, nullable

audit_log (Journal d'audit — table transversale, alimentée par TOUS les modules futurs)
├── id             UUID PK
├── user_id        UUID FK -> users, nullable   (nullable : ex. échec de connexion avec identifiant inexistant)
├── username_input string, nullable             (identifiant saisi si l'utilisateur n'existe pas)
├── action         string   (LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT, USER_CREATE, USER_UPDATE, USER_DELETE,
│                             USER_DEACTIVATE, USER_REACTIVATE, PASSWORD_RESET, PASSWORD_CHANGE,
│                             ROLE_CREATE, ROLE_UPDATE, PERMISSION_GRANT, SECURITY_SETTINGS_UPDATE, ...)
├── module         string   (ex. IDENTITE — les modules futurs utiliseront leur propre valeur)
├── entity_type    string, nullable   (ex. "User", "Role")
├── entity_id      UUID, nullable
├── result         enum (SUCCES, ECHEC)
├── details        JSON, nullable     (contexte libre : raison d'échec, anciennes/nouvelles valeurs...)
├── ip_address     string, nullable
└── created_at     timestamp           (« Date et heure »)

establishment_display   (minimal, propriété future du Module 2 — voir §1.3)
├── id (singleton)
├── establishment_name
├── campus_name
└── logo_path

security_settings   (singleton, propriété de ce module)
├── id (singleton)
├── max_failed_login_attempts       int,     défaut 5
├── account_lockout_minutes         int,     défaut 15
├── session_inactivity_timeout_min  int,     défaut 30
├── password_expiration_enabled     boolean, défaut false
├── password_expiration_days        int,     nullable
└── updated_at
```

### 2.2 Relations

- `users` 1—N `user_sessions`, `users` 1—N `audit_log` (nullable).
- `users` N—N `roles` via `user_roles` (contrainte applicative : une seule ligne active par utilisateur, voir §3.2).
- `roles` N—N `permissions` via `role_permissions`.
- `establishment_display` et `security_settings` : tables singleton (une seule ligne), pas de FK entrantes.

### 2.3 Écarts par rapport à l'ancien projet Python (et pourquoi)

- La table `journal_audit` était définie deux fois avec des schémas incompatibles dans l'ancien projet (voir `RAPPORT_ANALYSE_ISAC_ERP.md` §3/§6) — ici, un seul schéma `audit_log`, dès le départ, générique et réutilisable par tous les modules.
- Clés primaires en UUID (et non entiers auto-incrémentés) — conforme au principe d'extensibilité multi-campus (ADR-005/009).
- Sessions **stockées côté serveur** (table dédiée) plutôt qu'un simple jeton JWT auto-porteur : nécessaire pour permettre la déconnexion automatique par inactivité et la révocation à distance d'une session, ce qu'un JWT classique ne permet pas sans complexité additionnelle. *(Décision technique enregistrée en ADR-009, voir `DECISIONS.md`.)*

**Rien ne sera migré tant que vous n'aurez pas validé ce schéma.**

---

## 3. Règles métier

### 3.1 Authentification
- Vérification dans l'ordre : utilisateur existe → compte non supprimé → compte actif → compte non verrouillé → mot de passe correct (bcrypt).
- Message d'erreur **toujours générique** ("Identifiants incorrects") quelle que soit la cause exacte, pour ne pas renseigner un attaquant (bonne pratique reprise de l'ancien projet).
- Échec : incrémente `failed_login_attempts` ; au seuil `security_settings.max_failed_login_attempts` (défaut 5), pose `locked_until = maintenant + account_lockout_minutes` (défaut 15 min) et journalise `LOGIN_FAILURE`.
- Succès : remise à zéro de `failed_login_attempts`, création d'une ligne `user_sessions`, journalisation `LOGIN_SUCCESS`.
- Toute tentative (succès ou échec) est journalisée dans `audit_log`, y compris avec un nom d'utilisateur inexistant (`username_input` rempli, `user_id` nul).

### 3.2 Rôle unique par utilisateur (pour cette version)
Bien que le schéma `user_roles` soit multi-rôles par construction (demandé explicitement en §2.10), la règle métier de cette version impose **exactement un rôle actif par utilisateur** — assigner un nouveau rôle remplace l'ancien (jamais d'addition). Ceci correspond à la formulation singulière du cahier des charges (« rôle » au singulier en §2.4) tout en gardant le schéma prêt pour une évolution future (multi-rôles) sans migration destructive.

### 3.3 Rôles et permissions
- Rôles pré-livrés (`is_system = true`) : Super Administrateur, Directeur Général, Directeur de Campus, Directeur des Études, Responsable Scolarité, Comptable, Caissier, Enseignant, Bibliothécaire, Responsable RH, Secrétaire, Agent administratif (§2.5). Leur `code` n'est jamais modifiable ; ils ne sont pas supprimables (seulement leurs permissions sont ajustables).
- Un administrateur peut créer des rôles personnalisés (`is_system = false`), librement supprimables.
- Le rôle **Super Administrateur** possède implicitement toutes les permissions (pas besoin de les cocher une à une) — évite qu'un administrateur se verrouille lui-même l'accès par erreur de configuration.
- Permissions structurées par **module × action** (ex. `UTILISATEURS:LECTURE`, `UTILISATEURS:SUPPRESSION`) ; chaque nouveau module ajoutera ses propres permissions dans ce même référentiel, sans changer le mécanisme.
- **Toute vérification de permission se fait côté serveur** (`packages/api`), jamais seulement côté interface — principe non négociable n°1. L'UI masque ce que l'utilisateur ne peut pas faire, mais le serveur refuse aussi l'action si elle est tentée directement.

### 3.4 Utilisateurs
- `username` unique, insensible à la casse.
- Mot de passe : politique reprise de l'ancien projet (≥ 8 caractères, 1 majuscule, 1 chiffre) et durcie si besoin lors de la conception UI (à confirmer).
- Réinitialisation de mot de passe (par un administrateur) : génère un mot de passe temporaire et positionne `must_change_password = true` — l'utilisateur doit le changer à la prochaine connexion.
- Désactivation (`is_active = false`) : réversible, action courante, ferme aussi toute session active de l'utilisateur.
- Suppression (`deleted_at`) : action logique, distincte de la désactivation, réservée à une permission spécifique — **point ouvert à valider, voir §1.4.2**.
- Un utilisateur désactivé, supprimé ou verrouillé ne peut plus se connecter et ses sessions actives sont immédiatement invalidées.

### 3.5 Sessions
- Une session expire après `security_settings.session_inactivity_timeout_min` minutes sans activité (`last_activity_at` non rafraîchi) — déconnexion automatique côté client dès expiration détectée.
- Une session peut être révoquée manuellement (ex. désactivation de l'utilisateur, ou action admin « déconnecter cet utilisateur »).
- Le jeton de session n'est jamais stocké en clair côté serveur (seul son hash), ni écrit sur disque côté client au-delà de la durée de vie du process Electron.

### 3.6 Journal d'audit
- Toutes les actions listées en §2.7 du cahier des charges sont journalisées, sans exception, y compris les échecs.
- Le journal est **consultable mais non modifiable/supprimable**, même par un Super Administrateur (intégrité de la traçabilité).

---

## 4. Conception UI/UX

### 4.1 Écran de connexion (`fenetre_connexion` équivalent React)
Mise en page centrée, carte unique sur fond de la palette neutre du design system (Module 0) :
- Logo établissement (haut, depuis `establishment_display`), nom établissement + nom campus en dessous.
- Champ **Nom d'utilisateur**, champ **Mot de passe** avec icône œil (afficher/masquer).
- Bouton **Connexion** (primaire), bouton **Quitter** (ferme l'application), lien **Mot de passe oublié** (désactivé/grisé avec infobulle « disponible dans une prochaine version », conforme §2.2).
- Bouton **Paramètres** discret (coin de la fenêtre) : comportement conditionnel décrit en §1.4.1.
- Pied de page : numéro de version de l'application (lu depuis `package.json`).
- Message d'erreur générique sous le formulaire en cas d'échec, sans rechargement de page.

### 4.2 Gestion des utilisateurs
- Table listant les utilisateurs : recherche instantanée, tri par colonne, filtres (rôle, statut actif/inactif), pagination, export (CSV), impression — conforme §2.9.
- Colonnes : photo (avatar), nom complet, nom d'utilisateur, rôle, fonction, statut, dernière connexion.
- Formulaire création/édition (panneau latéral ou modale) : tous les champs de §2.4, upload photo, sélection du rôle (liste des rôles actifs).
- Actions rapides par ligne : modifier, désactiver/réactiver, réinitialiser mot de passe, supprimer (icône distincte, confirmation renforcée compte tenu du caractère plus définitif de l'action).

### 4.3 Gestion des rôles et permissions
- Liste des rôles (avec badge « rôle système » pour les rôles non supprimables).
- Écran de création de rôle personnalisé : code, libellé.
- **Matrice de permissions** : tableau rôle sélectionné × modules, avec cases à cocher par action (Lecture/Création/Modification/Suppression/Impression/Export/Validation/Administration) — se remplit progressivement à mesure que les futurs modules ajoutent leurs permissions.

### 4.4 Journal d'audit
- Table paginée, filtrable par utilisateur, action, module, résultat, plage de dates.
- Colonnes conformes à §2.7 : date/heure, utilisateur, action, module, résultat, adresse IP.
- Lecture seule stricte (aucun bouton d'édition/suppression, même pour le Super Administrateur — voir §3.6).

### 4.5 Assistant de premier lancement (bootstrap)
- Si `users` est vide au démarrage : au lieu de l'écran de connexion normal, un assistant en 2 étapes s'affiche — (1) création du compte Super Administrateur (nom, prénom, nom d'utilisateur, mot de passe), (2) confirmation puis redirection vers l'écran de connexion normal.

### 4.6 Cohérence
Tous ces écrans réutilisent exclusivement les composants du design system du Module 0 (`packages/ui` : `Button`, `Input`, `Card`) — aucun style ad hoc, conformément au principe non négociable n°4.

---

## 5. Développement

Réalisé intégralement, conforme au schéma et aux règles métier ci-dessus :

- **`packages/db`** : schéma Prisma complet (§2.1), seed (`prisma/seed.ts`) des 12 rôles système, du catalogue de permissions IDENTITE, et des lignes singleton `security_settings`/`establishment_display`.
- **`packages/shared`** : schémas Zod (auth, utilisateur, rôle, permission, journal d'audit, paramètres de sécurité), constantes de permissions typées (`PERMISSIONS`), politique de mot de passe partagée.
- **`packages/api`** :
  - Sécurité : hachage bcrypt (`bcryptjs`), génération de mot de passe temporaire, verrouillage de compte (fonction pure testée), sessions serveur (jeton haché, glissement d'inactivité).
  - Autorisation : middleware tRPC (`permissionProcedure`) vérifiant systématiquement la permission côté serveur, court-circuité pour SUPER_ADMIN (fonction pure testée).
  - Services : `authService` (bootstrap, connexion, déconnexion, vérification admin technique), `userService`, `roleService`, `auditService` (journal transversal), `securitySettingsService`, `establishmentDisplayService`.
  - Routers tRPC : `auth`, `users`, `roles`, `auditLog`, `securitySettings`, `establishmentDisplay`.
  - **superjson** ajouté comme transformer tRPC (client + serveur) : sans lui, les `Date` traversent le réseau en `string` et le typage ne correspond plus à la réalité — corrigé avant que ça ne devienne un piège récurrent pour tous les modules suivants.
- **`packages/ui`** : nouveaux composants `Select`, `Label`, `Checkbox`, `Badge`, `Dialog`, et surtout `DataTable` (recherche, tri, pagination, export CSV, impression — réutilisable par tous les futurs écrans à tableau).
- **`apps/desktop`** : store d'authentification (Zustand, jeton en mémoire uniquement — pas de persistance disque, voir décision dans le code), client tRPC authentifié, écrans `BootstrapScreen`, `LoginScreen`, `TechnicalSettingsDialog`, `AppShell` (navigation minimale), `UsersScreen` + `UserFormDialog`, `RolesScreen` + `PermissionMatrix`, `AuditLogScreen`.

## 6. Tests

| Vérification | Résultat |
|---|---|
| `pnpm lint` | ✅ 5/5 packages |
| `pnpm typecheck` | ✅ 6/6 tâches |
| `pnpm test` (Vitest) | ✅ 21 tests (verrouillage de compte, vérification de permission, hachage/vérification de mot de passe, génération de mot de passe temporaire, + tests hérités du Module 0) |
| `pnpm build` | ✅ |
| Test E2E Playwright (`login-screen.spec.ts`) | ✅ — l'app démarre et affiche l'écran de connexion (ou l'assistant de première installation) |
| Connexion PostgreSQL réelle (bootstrap → création admin → connexion → écrans) | ✅ **Vérifié en conditions réelles le 2026-07-26** — PostgreSQL 17 installé nativement (Docker Desktop indisponible sur cette machine, voir DECISIONS.md ADR-010), migration + seed appliqués, parcours complet (bootstrap → création du Super Administrateur → connexion → Utilisateurs/Rôles/Journal d'audit) confirmé fonctionnel par le porteur du projet. |

Tests unitaires ajoutés (logique pure, sans dépendance à une base réelle) : `packages/api/src/security/lockout.test.ts`, `authorization.test.ts`, `password.test.ts`.

## 7. Validation

**✅ Validé le 2026-07-26** par le porteur du projet, après vérification du parcours complet en conditions réelles (bootstrap → création du Super Administrateur → connexion → Utilisateurs/Rôles/Journal d'audit) sur une base PostgreSQL réelle.
