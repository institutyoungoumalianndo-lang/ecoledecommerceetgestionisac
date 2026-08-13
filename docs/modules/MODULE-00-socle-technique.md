# Module 0 — Socle technique & design system

**Statut** : ✅ **Terminé — validé le 2026-07-26**
**Dépend de** : —
**Document de suivi** : ce fichier est mis à jour au fil des 7 étapes ; voir `docs/ROADMAP.md` pour le statut global.

---

## 1. Analyse fonctionnelle

### 1.1 Objectif du module

Mettre en place le socle technique commun sur lequel tous les modules métier (1 à 17) seront construits : structure du projet, shell applicatif, connexion base de données, design system de base, outillage de qualité (tests, CI), et conventions de développement. Ce module ne contient **aucune logique métier scolaire** — c'est de l'infrastructure pure, validée une fois puis réutilisée partout ensuite.

### 1.2 Adaptation de la méthodologie à un module d'infrastructure

Le Module 0 n'a pas d'utilisateur final au sens métier, donc certaines des 7 étapes standard sont adaptées :
- **Étape 2 (Conception BDD)** : pas de tables métier ici — uniquement la mise en place de Prisma, la connexion PostgreSQL, et une table technique minimale (`_health_check` ou équivalent) pour valider la chaîne bout-en-bout. Les vraies tables commencent au Module 1.
- **Étape 3 (Règles métier)** : remplacée par les **conventions techniques** (nommage, structure, tests, commits) qui joueront le rôle de "règles" pour tous les modules suivants.
- **Étape 4 (Conception UI/UX)** : remplacée par la mise en place des **tokens du design system** (couleurs, typographie, espacements) et d'un écran de démarrage minimal (splash + fenêtre principale vide), pas d'écran métier.
- **Étapes 1, 5, 6, 7** : inchangées dans leur esprit.

### 1.3 Périmètre inclus

1. **Monorepo** : initialisation pnpm workspaces + Turborepo, structure `apps/` et `packages/` telle que définie dans `ARCHITECTURE_MASTER.md` §4.2.
2. **Backend local** : squelette Fastify + tRPC (`packages/api`), démarré comme service local (préparation à l'exécution en tant que serveur LAN du campus, conformément à ADR-007).
3. **Base de données** : `packages/db` avec Prisma, connexion PostgreSQL locale, première migration technique (table de vérification de santé), scripts `dev`/`migrate`/`seed`.
4. **Shell desktop** : `apps/desktop` — Electron (main + preload avec `contextIsolation: true`) + React + Vite, fenêtre principale vide qui affiche un état de connexion (DB OK / KO) pour prouver la chaîne Electron → API locale → PostgreSQL.
5. **Design system de base** (`packages/ui`) : tokens Tailwind (couleurs, typographie, rayons, ombres), 3-4 composants de base (Button, Input, Card) avec shadcn/ui, thème clair uniquement pour l'instant (le thème complet sera affiné au fil des écrans métier réels).
6. **Schémas partagés** (`packages/shared`) : structure de dossier, convention Zod, constantes globales (ex. codes de permission — vides pour l'instant, remplis au Module 1).
7. **Outillage qualité** : configuration ESLint + Prettier + TypeScript strict, Vitest configuré (avec un test d'exemple), Playwright configuré (un test E2E d'exemple : l'app démarre et affiche "Connexion DB OK"), pre-commit hook (lint + typecheck).
8. **CI/CD minimal** : workflow GitHub Actions (lint + typecheck + tests) déclenché sur chaque push — le build de l'installeur `.exe` complet sera activé quand il y aura une première version livrable (probablement fin Module 1 ou 2).
9. **Conventions documentées** (voir §1.7) — figées dans `ARCHITECTURE_MASTER.md` §7 une fois ce module validé.
10. **Dépôt Git** initialisé pour `isac-erp/` avec `.gitignore` adapté (Node, Electron, Prisma, `.env`).

### 1.4 Périmètre explicitement exclu (renvoyé aux modules suivants)

- Toute authentification réelle (Module 1).
- Tout écran métier, toute table métier.
- Le thème visuel complet / palette finale de marque (dépend du module Paramètres, Module 2, qui pilotera les couleurs d'identité visuelle par établissement — le Module 0 pose une palette neutre par défaut, remplaçable).
- Le build/signature de l'installeur `.exe` final et sa distribution.
- La configuration réseau réelle multi-postes (le Module 0 prouve que l'architecture *permet* un serveur local + clients, mais le déploiement réel sur le réseau d'un campus physique n'est pas testé ici, faute d'environnement).

### 1.5 Livrables concrets attendus en fin de module

- Un dépôt Git fonctionnel avec la structure monorepo complète.
- `pnpm install && pnpm dev` démarre : le backend local, puis l'app Electron qui s'ouvre et affiche un écran "ISAC ERP — Connexion base de données : OK".
- `pnpm test` exécute les tests unitaires (Vitest) et E2E (Playwright) avec succès.
- `pnpm lint` et `pnpm typecheck` passent sans erreur.
- La CI GitHub Actions est verte sur le dépôt.
- `ARCHITECTURE_MASTER.md` §7 (Conventions & standards) rempli et considéré définitif (jusqu'à révision explicite).

### 1.6 Décisions d'architecture mobilisées

Rappel des ADR déjà validées qui structurent directement ce module (détail dans `DECISIONS.md`) :
- ADR-001 (stack), ADR-002 (monorepo), ADR-003 (backend Node/Fastify/tRPC/Prisma), ADR-007 (serveur LAN local partagé — **adopté par défaut suite à votre feu vert**, corrigez-moi si ce n'est pas ce que vous vouliez).

Nouvelle question technique soulevée par ce module, à trancher avant l'étape 5 (Développement) :
- **Gestion du secret `.env` par installation** : chaque campus aura son propre `.env` (identifiants PostgreSQL locaux, clé de session, etc.), jamais commité. Un fichier `.env.example` documenté sera fourni. Pas de bloqueur, juste à confirmer que c'est bien l'attente (un technicien sur place configure le `.env` à l'installation).

### 1.7 Conventions proposées (à valider avec ce module)

| Sujet | Convention proposée |
|---|---|
| Nommage code TypeScript | camelCase pour variables/fonctions, PascalCase pour composants/types, dossiers en kebab-case |
| Nommage base de données | snake_case pour les tables/colonnes PostgreSQL, mappé automatiquement vers camelCase côté Prisma/TS (`@map`) |
| Langue | Interface, données métier et documentation utilisateur en **français** ; identifiants de code (variables, fonctions, tables techniques) en **anglais** ; commentaires de code en français quand nécessaire (rare, cf. règle "pas de commentaire sauf si le POURQUOI n'est pas évident") |
| Commits | [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `test:`...) — facilite un changelog automatique par module |
| Branches | `main` protégée ; une branche par module (`module/01-identite-acces`) ; fusion après validation de l'étape 7 |
| Tests | Arborescence miroir (`foo.ts` → `foo.test.ts`), Vitest pour unitaire/intégration, Playwright pour E2E sur l'app Electron packagée |
| Gestion d'erreur API | Convention `Result<T, E>` (inspirée du pattern `(succès, message)` de l'existant, mais typé) plutôt que des exceptions non typées entre couches |
| Versionnement du schéma DB | Prisma Migrate exclusivement, jamais de script SQL manuel hors migration versionnée |

### 1.8 Risques & points de vigilance

- **Environnement Windows sans Node/pnpm préinstallé** : à vérifier avant l'étape 5 — le poste de développement doit avoir Node.js LTS et pnpm installés (je vérifierai et installerai si besoin, avec votre accord, au moment du développement).
- **PostgreSQL local pour le développement** : nécessite une instance PostgreSQL accessible (Docker Desktop recommandé, ou installation native Windows) — à confirmer selon ce qui est disponible sur cette machine.
- **Contrainte hors-ligne stricte** (principe n°7 de `ARCHITECTURE_MASTER.md`) : dès ce module, aucune dépendance à un service cloud/CDN externe au runtime (les polices, icônes, etc. doivent être embarquées, pas chargées depuis Internet) — point de vigilance pour tous les modules suivants également.

### 1.9 Definition of Done du Module 0

Le module sera proposé à votre validation (étape 7) quand tous les livrables du §1.5 sont vérifiables concrètement (démonstration possible), et seulement après votre accord explicite à chaque étape intermédiaire structurante (schéma technique, conventions).

---

## 2. Conception de la base de données

Schéma Prisma minimal en place (`packages/db/prisma/schema.prisma`) : un seul modèle technique `SystemHealth` (table `system_health`, clé UUID, horodatage), sans aucune table métier — conforme à l'adaptation prévue en §1.2. PostgreSQL local géré via `infra/docker/docker-compose.yml` (image `postgres:16-alpine`, port 5432, volume nommé persistant). `.env.example` fourni dans `packages/db/`.

Conventions actées et déjà appliquées dans ce schéma (voir aussi §3) : snake_case en base via `@map`/`@@map`, `created_at`-style horodatage, clé primaire en UUID (extensibilité multi-campus future, ADR-005).

## 3. Règles métier / Conventions techniques

Les conventions proposées en §1.7 sont **adoptées et appliquées** dans le code de ce module (nommage, langue, gestion d'erreur, versionnement Prisma). Elles sont recopiées telles quelles dans `ARCHITECTURE_MASTER.md` §7, qui devient leur référence définitive à partir de maintenant — ce document-ci n'en garde qu'un résumé historique.

Deux ajustements découverts pendant le développement, à retenir comme conventions supplémentaires :
- **Résolution de modules TypeScript** : tout le monorepo utilise `moduleResolution: "Bundler"` (hérité de `tsconfig.base.json`) — ne pas surcharger avec `NodeNext` par package sauf raison impérieuse, cela casse la consommation de `packages/shared` en TS source direct (rencontré et corrigé dans `packages/api`).
- **Vitest sur les packages sans logique métier propre** (ex. `packages/db`, `packages/ui` au Module 0) : utiliser `vitest run --passWithNoTests` plutôt que d'écrire des tests de complaisance juste pour satisfaire le runner.

## 4. Conception UI/UX (tokens & shell)

Design system de base en place dans `packages/ui` : palette neutre par défaut en tokens CSS (HSL) + préréglage Tailwind partagé (`tailwind-preset.ts`), composants `Button`, `Input`, `Card` (+ sous-composants). Écran unique du Module 0 (`apps/desktop/src/renderer/src/App.tsx`) : carte centrale affichant le nom de l'application et un badge d'état de connexion à la base de données (Connectée/Indisponible), avec bouton de rafraîchissement manuel — pas d'écran métier, conforme au périmètre.

## 5. Développement

Réalisé intégralement : monorepo pnpm/Turborepo, `packages/shared` (schéma Zod `healthCheck`, constantes), `packages/db` (Prisma + client singleton), `packages/api` (Fastify + tRPC, route `health.check`, écoute sur `0.0.0.0` conformément à ADR-007 pour être joignable depuis le réseau local du campus), `packages/ui` (design system), `apps/desktop` (Electron + React + Vite via `electron-vite`, preload isolé avec `contextBridge`, CSP stricte dans `index.html`). Dépôt Git initialisé.

Bugs de configuration rencontrés et corrigés pendant cette étape (consignés ici pour éviter de les reproduire dans les modules suivants) :
- `main` du `package.json` de `apps/desktop` pointait vers un chemin `dist-electron/main.js` incohérent avec la sortie réelle d'`electron-vite` (`out/main/index.js`) — corrigé.
- Conflit de version `vite` 6 vs `electron-vite` 2.x (attend `vite` ^4/^5) — `vite` ramené en `^5.4.0`.
- `pnpm` v10 a déplacé le réglage `onlyBuiltDependencies` de `package.json` vers `pnpm-workspace.yaml` — sans lui, les scripts d'installation d'Electron et Prisma sont bloqués par sécurité et rien ne se télécharge silencieusement.
- Règle ESLint `react/no-unescaped-entities` désactivée (application entièrement en français, apostrophes omniprésentes dans le JSX).

## 6. Tests

Tous verts sur cette machine :

| Vérification | Résultat |
|---|---|
| `pnpm install` | ✅ |
| `pnpm lint` | ✅ 5/5 packages |
| `pnpm typecheck` | ✅ 6/6 tâches |
| `pnpm test` (Vitest, unitaire) | ✅ 6/6 tâches (2 tests `shared`, 1 test `api`, 1 test `desktop`, `db`/`ui` sans test propre à ce stade) |
| `pnpm build` (production) | ✅ (`packages/api` compilé, `apps/desktop` bundle Electron généré) |
| Test E2E Playwright (app Electron packagée, `apps/desktop/tests/health-screen.spec.ts`) | ✅ 1/1 — l'app démarre réellement et affiche le titre + le badge de statut |
| Mode développement (`pnpm dev`) | ✅ vérifié manuellement : fenêtre Electron réelle ouverte, requête tRPC `health.check` reçue et traitée par l'API locale |
| Connexion PostgreSQL réelle (`Connectée`) + migration Prisma | ⏸️ **Non vérifiable pour l'instant** : Docker Desktop sur cette machine renvoie une erreur 500 sur son moteur (`dockerDesktopLinuxEngine`), indépendamment du code du projet. En attendant, l'app affiche correctement "Indisponible" — ce qui valide au passage la dégradation propre en cas de base injoignable (principe non négociable n°7). |

## 7. Validation

**✅ Validé le 2026-07-26** par le porteur du projet, sur la base des preuves du §6 (installation, lint, typecheck, tests unitaires, build de production, E2E Playwright tous verts ; dégradation propre déjà démontrée en l'absence de base de données).

**Point reporté explicitement au Module 1** : la connexion PostgreSQL réelle (badge "Connectée") et la première migration Prisma n'ont pas pu être vérifiées sur cette machine (Docker Desktop en panne, problème d'environnement local, pas de code). Ce sera la toute première chose à vérifier concrètement à l'ouverture du Module 1, puisque celui-ci a de toute façon besoin d'une base fonctionnelle pour ses propres tables (utilisateurs, rôles, permissions).
