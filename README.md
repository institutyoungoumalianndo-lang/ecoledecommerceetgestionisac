# ISAC ERP

ERP scolaire pour l'École de Commerce et de Gestion ISAC (Guinée). Application desktop Windows (Electron + React + TypeScript + Tailwind), base de données PostgreSQL locale par installation.

**Documentation de référence** — à lire avant toute contribution :
- [`docs/ARCHITECTURE_MASTER.md`](docs/ARCHITECTURE_MASTER.md) — vision, méthodologie, architecture technique, principes non négociables.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — liste des modules, ordre, dépendances, statut.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — journal des décisions techniques (ADR).
- [`docs/RAPPORT_ANALYSE_ISAC_ERP.md`](docs/RAPPORT_ANALYSE_ISAC_ERP.md) — analyse de l'ancien projet Python (référence métier).
- [`docs/modules/`](docs/modules) — un document détaillé par module, mis à jour au fil des 7 étapes de la méthodologie.

## Démarrage rapide (développement)

Prérequis : Node.js ≥ 20, pnpm, Docker Desktop (pour PostgreSQL local).

```bash
pnpm install
pnpm db:up          # démarre PostgreSQL en local via Docker
cp packages/db/.env.example packages/db/.env
pnpm --filter @isac-erp/db prisma:migrate
pnpm dev             # démarre le backend local (packages/api) + l'app Electron
```

`pnpm dev` ouvre la fenêtre ISAC ERP, qui affiche l'état de la connexion à la base de données (Module 0 — socle technique).

## Commandes utiles

| Commande | Effet |
|---|---|
| `pnpm dev` | Démarre tous les services en mode développement (Turborepo) |
| `pnpm build` | Build de production de tous les packages/apps |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Qualité de code, à l'échelle du monorepo |
| `pnpm db:up` / `pnpm db:down` | Démarre/arrête PostgreSQL local (Docker) |
| `pnpm db:migrate` | Applique les migrations Prisma |
| `pnpm --filter @isac-erp/desktop dist:win` | Construit l'installeur Windows `.exe` |

## Structure du monorepo

Voir `docs/ARCHITECTURE_MASTER.md` §4.2 pour le détail et la justification de chaque dossier.

```
apps/desktop      Application Electron + React (le produit livré)
packages/api      Backend local (Fastify + tRPC) — déployé par campus
packages/db       Schéma Prisma + migrations PostgreSQL
packages/ui       Design system partagé (Tailwind + composants)
packages/shared   Schémas Zod, types, constantes partagés front/back
infra/docker      PostgreSQL de développement
```

## Méthodologie

Le projet est développé **module par module**, chaque module suivant 7 étapes obligatoires (analyse fonctionnelle → conception BDD → règles métier → UI/UX → développement → tests → validation). **Aucun module n'est considéré terminé sans validation explicite du porteur du projet.** Détail complet dans `docs/ARCHITECTURE_MASTER.md` §2.
