# Module 11 — Sauvegarde, Sécurité avancée, Audit

**Statut** : ✅ **Terminé — validé (2026-08-06)** par le porteur du projet après test manuel réel (sauvegarde manuelle réussie, réglages de sécurité enregistrés, activation de la 2FA avec QR code et codes de récupération, connexion avec code à 6 chiffres). Schéma Prisma + migration, seed, packages/shared, packages/api (backupService `pg_dump`/`pg_restore`, twoFactorService, politique de mot de passe, routers) et apps/desktop (écrans Sauvegarde BDD, réglages Sécurité, activation 2FA en libre-service, réinitialisation admin) livrés. Typecheck (shared/api/desktop) et 136 tests unitaires (dont 6 nouveaux sur le défi 2FA) passent. Deux anomalies détectées et corrigées pendant le test réel : `pg_dump`/`pg_restore` absents du `PATH` sur ce poste Windows (détection automatique de `C:\Program Files\PostgreSQL\<version>\bin` ajoutée, `PG_BIN_DIR` en secours) ; le paramètre `?schema=public` de `DATABASE_URL` (convention Prisma) rejeté par ces outils (retiré avant transmission — un seul schéma `public` existe dans le projet, rien n'est perdu). Périmètre : sécurité avancée = 2FA TOTP + politique de mot de passe renforcée (pas de restriction IP), restauration réservée au Super Administrateur, stockage en dossier local par défaut, sauvegarde planifiée quotidienne.
**Dépend de** : Module 1 (Identité & Accès), **terminé — validé**.
**Source** : pas de chapitre dédié du cahier des charges — la seule mention existante est la ligne `ROADMAP.md` du Module 11 ("Sauvegarde/restauration locale, journal d'audit systématisé") et une ligne du rapport d'analyse du projet Python existant (`RAPPORT_ANALYSE_ISAC_ERP.md` §7.3) : *"Sauvegarde | Job planifié `pg_dump` + rotation, restauration avec double confirmation (pattern UX à conserver) | Reprend la bonne pratique UX existante sur une base technique plus fiable"*. Cette analyse est donc une **proposition de périmètre**, comme pour le Module 10 — voir §3 pour les points à valider avant tout développement.

---

## 0. Ce qui existe déjà — à ne pas reconstruire

Avant de proposer quoi que ce soit, l'état réel du code (vérifié, pas supposé) :

- **Export/import de paramétrage** (`settingsBackupService.ts`, écran "Sauvegarde" de Paramètres) — **n'est PAS une sauvegarde de base de données**. Son propre commentaire dans le code le dit explicitement : *"Export du paramétrage uniquement — distinct d'une sauvegarde complète de base de données (Module 11)"*. Il couvre établissement/campus/signataires/cachet/années/filières/niveaux/devise/régional/thème/modèles de documents — jamais les étudiants, utilisateurs, notes, paiements, écritures comptables, paie. Les permissions `PARAMETRES_SAUVEGARDE:LECTURE/VALIDATION` existent déjà pour **cette** fonctionnalité — un nouveau domaine de permission sera nécessaire pour la vraie sauvegarde de base (voir §2).
- **Journal d'audit** (`auditService.ts`, `logAction()`, écran `AuditLogScreen.tsx`) — **déjà largement systématique** : appelé depuis 81 fichiers, environ 244 valeurs d'action distinctes, couvrant la quasi-totalité des modules métier déjà livrés. Ce n'est donc **pas un chantier à construire depuis zéro** — voir §1.3 pour ce qui pourrait raisonnablement rester à ajouter.
- **Réglages de sécurité** (`SecuritySettings`, singleton) — couvre déjà : tentatives de connexion max avant verrouillage, durée de verrouillage, expiration de session par inactivité, expiration de mot de passe (activable, en jours). C'est la base de la "sécurité", mais rien d'"avancé" (pas de double authentification, pas de restriction par adresse IP/réseau, pas de politique de complexité de mot de passe configurable au-delà de ce qui existe depuis le Module 1).
- **Aucune sauvegarde réelle de base de données** — recherche exhaustive du dépôt : aucun `pg_dump`, `pg_restore`, job planifié, génération de `.sql`. **C'est le vrai manque, et le cœur probable de ce module.**

**Proposition de périmètre du Module 11** (à valider, §3) :
1. **Sauvegarde/restauration réelle de la base de données** (le manque confirmé) — job planifié + déclenchement manuel, rotation, restauration à double confirmation (reprend explicitement la recommandation du rapport d'analyse).
2. **Sécurité avancée** — au-delà de l'existant (Module 1) : à préciser avec vous, voir §3 (question ouverte, aucune indication du cahier des charges sur ce que "avancée" doit couvrir concrètement).
3. **Audit** — déjà systématique. Proposition : pas de reconstruction, seulement des améliorations ciblées si vous en identifiez (export, filtres supplémentaires, rétention/purge des vieux enregistrements).

---

## 1. Analyse fonctionnelle

### 1.1 Sauvegarde de la base de données

**Contrainte d'architecture déterminante** (ADR-007, voir `ARCHITECTURE_MASTER.md` §3) : PostgreSQL tourne sur un serveur dédié du réseau local du campus, pas sur le poste de l'utilisateur qui clique "Sauvegarder". La sauvegarde doit donc s'exécuter **côté `packages/api`** (le serveur persistant), jamais côté client Electron — cohérent avec le principe déjà appliqué au moteur d'alertes du Module 10 (`alertEngineService.ts`, boucle serveur).

Mécanisme proposé : `pg_dump`/`pg_restore` en ligne de commande (`child_process`), pas une réimplémentation table par table — PostgreSQL est déjà installé nativement sur la machine serveur (ADR-010), ces utilitaires sont donc déjà présents à côté du serveur PostgreSQL lui-même. Format `--format=custom` (compressé, restaurable sélectivement), horodaté, écrit sur un chemin de dossier configurable (disque local ou réseau du campus — jamais un service cloud, cohérent avec l'architecture hors-ligne).

- **Sauvegarde planifiée** : boucle de vérification périodique côté serveur (même mécanisme que `communicationScheduler.ts`/`alertEngineService.ts` — `setInterval`, aucune dépendance externe), fréquence configurable (ex. quotidienne à une heure creuse).
- **Sauvegarde manuelle** : bouton "Sauvegarder maintenant", pour avant une opération risquée (migration, import en masse).
- **Rotation** : nombre de sauvegardes conservées configurable (ex. les 14 dernières), purge automatique des plus anciennes.
- **Restauration** : reprend le pattern UX déjà en place dans l'ancien système ("double confirmation", explicitement recommandé par le rapport d'analyse) — un premier écran de sélection + avertissement explicite ("cette action remplace toutes les données actuelles, non réversible"), une seconde confirmation par saisie d'un mot de passe/texte de confirmation. Toujours journalisée (`logAction`).
- **Téléchargement/export d'une sauvegarde** vers un support externe (clé USB, autre disque) — cohérent avec "sauvegarde locale", utile pour une copie hors du serveur.

### 1.2 Sécurité avancée — périmètre validé (2026-08-06)

Décision du porteur du projet : **double authentification (2FA par application TOTP)** et **politique de
mot de passe renforcée**, **sans** restriction de connexion par IP (le porteur du projet souhaite
garder la porte ouverte à un accès sécurisé depuis plusieurs campus/à distance).

**Point d'architecture à signaler (non bloquant, mais à avoir en tête)** : aujourd'hui l'application est
strictement mono-campus/LAN (ADR-005/007) — chaque campus est une installation isolée, sans réseau
partagé entre campus, et l'accès à distance (portail web, Module 15) n'existe pas encore. La 2FA et le
mot de passe renforcé restent pertinents dès maintenant (protègent chaque installation individuellement,
y compris contre un accès local non autorisé), mais ils ne créent pas, à eux seuls, un accès multi-
campus ou distant — cela reste un chantier séparé (Module 15/18) le jour où il sera demandé
explicitement. Ne pas restreindre par IP est cohérent avec cet objectif futur et n'a aucun inconvénient
aujourd'hui puisqu'aucune restriction de ce type n'existe déjà.

- **2FA (TOTP)** : secret généré par utilisateur, activable/désactivable par l'utilisateur lui-même
  (avec vérification du code avant activation effective) ; codes de récupération à usage unique en cas
  de perte de l'appareil (sinon un compte perdu deviendrait irrécupérable sans intervention manuelle en
  base — inacceptable). Le Super Administrateur doit pouvoir réinitialiser la 2FA d'un utilisateur
  bloqué (avec journal d'audit).
- **Politique de mot de passe renforcée** : étend `SecuritySettings` (Module 1) avec des règles de
  complexité configurables (longueur minimale, exigences de caractères) — appliquées à la création et
  au changement de mot de passe, jamais rétroactivement sur les mots de passe déjà en place.

### 1.3 Audit — écarts éventuels

L'infrastructure existante (`auditService.ts`) couvre déjà la quasi-totalité des opérations métier. Écarts possibles à confirmer avec vous :
- Rétention/purge configurable des vieux enregistrements (aujourd'hui : conservation indéfinie).
- Export de l'historique d'audit (CSV/PDF) pour archivage externe.
- Filtre supplémentaire sur l'écran existant, si vous en identifiez un manquant à l'usage.

---

## 2. Conception de la base de données (proposée)

```prisma
model DatabaseBackup {
  id          String   @id @default(uuid())
  fileName    String
  filePath    String
  fileSizeBytes Int
  triggerType String   // "PLANIFIEE" | "MANUELLE"
  status      String   // "EN_COURS" | "REUSSIE" | "ECHOUEE"
  errorMessage String?
  createdBy   String?  // null si déclenchée par la boucle planifiée
  createdAt   DateTime @default(now())
}

model BackupSettings {
  id                 String   @id @default(uuid())
  isScheduleEnabled  Boolean  @default(false)
  scheduleHour       Int      @default(2)   // heure locale, 0-23
  retentionCount     Int      @default(14)
  storageDirectory   String?                // chemin configurable, nullable = valeur par défaut de l'appli
  updatedAt          DateTime @updatedAt
}
```

Permissions proposées : `SAUVEGARDE_BDD:LECTURE` (consulter l'historique des sauvegardes), `SAUVEGARDE_BDD:CREATION` (déclencher une sauvegarde manuelle), `SAUVEGARDE_BDD:ADMINISTRATION` (restaurer — action irréversible, réservée à un rôle élevé), `SAUVEGARDE_BDD:MODIFICATION` (configurer planification/rétention).

---

## 3. Décisions et questions restantes

**Décidé (2026-08-06)** :
1. **Périmètre** confirmé (implicitement, en poursuivant sur le détail de la sécurité avancée) : sauvegarde/restauration réelle de la base, sécurité avancée ci-dessous, pas de reconstruction de l'audit.
2. **Sécurité avancée** : 2FA par application TOTP + politique de mot de passe renforcée. Pas de restriction par IP (voir §1.2).

3. **Stockage** : dossier local par défaut (chemin modifiable plus tard si besoin, pas de chemin réseau configurable en v1).
4. **Restauration** : réservée au rôle **Super Administrateur** uniquement.
5. **Fréquence** : sauvegarde planifiée **quotidienne** (heure creuse), configurable plus tard si besoin.

---

## 4. Hors périmètre (sauf demande explicite contraire)

- Sauvegarde vers un service cloud — contraire à l'architecture hors-ligne/mono-campus (ADR-005/007).
- Reconstruction du journal d'audit déjà substantiellement en place.
- Chiffrement du fichier de sauvegarde au repos (à évaluer séparément si demandé — ajoute une gestion de clé/mot de passe à sécuriser elle-même).
