# Guide de déploiement — nouveau campus

Ce guide explique comment installer ISAC ERP sur un nouveau campus, de façon totalement
indépendante de tout autre campus (chaque campus a son propre serveur, sa propre base de
données, ses propres comptes — voir `docs/DECISIONS.md` ADR-005/ADR-007). À la fin de ce
guide, vous serez Super Administrateur de votre propre installation, avec vos propres
collaborateurs et vos propres réglages.

---

## 1. Choisir le poste "serveur"

Choisissez **un seul PC Windows** de votre campus qui restera généralement allumé pendant les
heures de travail — c'est lui qui hébergera les données. Les autres postes (secrétariat,
comptabilité, direction, etc.) s'y connecteront par le réseau local (Wi-Fi ou câble), comme des
clients légers.

## 2. Installer les logiciels nécessaires sur le poste serveur

1. **Node.js** (version 20 ou plus récente) : [nodejs.org](https://nodejs.org) — installateur
   Windows standard, options par défaut.
2. **PostgreSQL 17** (installateur officiel EnterpriseDB, jamais Docker — voir ADR-010) :
   [postgresql.org/download/windows](https://www.postgresql.org/download/windows/). Notez le
   mot de passe que vous choisissez pour l'utilisateur `postgres` pendant l'installation.
3. **pnpm** : ouvrez une invite de commande (PowerShell) et tapez :
   ```
   npm install -g pnpm
   ```

## 3. Copier le projet sur le poste serveur

Copiez l'intégralité du dossier du projet (`isac-erp`) sur le poste serveur — par clé USB, ou
via un partage réseau. Placez-le par exemple dans `C:\ISAC-ERP`.

## 4. Créer la base de données

Ouvrez **pgAdmin** (installé avec PostgreSQL) ou une invite de commande, et créez une base
vide nommée `isac_erp` (même nom que le fichier de configuration attend par défaut).

Dans le dossier `packages\db` du projet copié, dupliquez le fichier `.env.example` en `.env`
et adaptez la ligne `DATABASE_URL` avec le mot de passe PostgreSQL choisi à l'étape 2 :

```
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/isac_erp?schema=public"
```

## 5. Installer les dépendances et préparer la base

Dans une invite de commande, à la racine du dossier copié :

```bash
pnpm install
pnpm --filter @isac-erp/db exec prisma migrate deploy
pnpm --filter @isac-erp/db exec prisma db seed
```

Cette dernière commande crée les rôles, permissions et réglages de base indispensables au
démarrage — sans elle, l'application ne pourra pas créer de premier compte.

## 6. Construire l'installeur Windows (recommandé)

Sur une machine de développement (avec Node.js, pnpm et les dépendances installées) :

```bash
pnpm --filter @isac-erp/desktop dist:win
```

Le fichier `.exe` est produit dans `apps/desktop/release/`. Il inclut l'application desktop **et** le bundle serveur (API + portail web). Sur le poste serveur du campus, cochez **« Ce poste héberge le serveur du campus »** au premier lancement : l'API (port 4310) et le portail web (port 3000) démarrent automatiquement à chaque ouverture.

Configurez PostgreSQL dans le fichier `%APPDATA%\ISAC ERP\server.env` (créé automatiquement à la première configuration en mode serveur).

> **Alternative manuelle (développement)** : lancez les services dans PowerShell avec `.\infra\windows\start-campus-services.ps1`, puis ouvrez l'application desktop.

## 6 bis. Démarrage manuel du serveur (sans installeur)

```bash
pnpm --filter @isac-erp/api build
pnpm --filter @isac-erp/web-portail build
node packages/api/dist/index.js
```

Dans une **deuxième** fenêtre PowerShell :

```bash
cd apps/web-portail
pnpm start
```

Laissez ces fenêtres ouvertes — c'est le cœur de l'application. Vous devriez voir un message confirmant que le serveur écoute (`Server listening at http://0.0.0.0:4310`) et que le portail répond sur `http://localhost:3000`.

## 7. Trouver l'adresse réseau du poste serveur

Toujours sur le poste serveur, ouvrez une invite de commande et tapez :

```
ipconfig
```

Notez l'**adresse IPv4** (ex. `192.168.1.10`). C'est cette adresse, suivie de `:4310`, que
chaque poste collaborateur devra saisir à la première étape ci-dessous.

## 8. Installer l'application desktop sur le poste serveur lui-même

Installez le fichier d'installation `.exe` fourni (voir `apps/desktop/release/` dans le projet
copié) sur le poste serveur également — vous vous en servirez pour créer votre propre compte
Super Administrateur.

Au premier lancement :

1. **Adresse du serveur** : saisissez `localhost:4310` (vous êtes sur le même poste que le
   serveur), testez la connexion, enregistrez.
2. **Premier administrateur** : l'écran de démarrage ("Bootstrap") vous invite à créer le tout
   premier compte — celui-ci devient automatiquement Super Administrateur de ce campus.

## 9. Installer l'application sur les postes de vos collaborateurs

Sur chaque poste collaborateur, installez le même fichier `.exe`. Au premier lancement :

1. **Adresse du serveur** : saisissez l'adresse notée à l'étape 7 (ex. `192.168.1.10:4310`),
   testez la connexion, enregistrez.

   > Si le test échoue alors que l'adresse est correcte, vérifiez le pare-feu Windows sur le
   > poste serveur : la première fois qu'un service réseau démarre, Windows peut demander
   > "Autoriser l'accès" — acceptez pour les réseaux privés.

2. **Clé d'activation** : sur l'écran de connexion, cliquez sur "J'ai une clé d'activation" et
   saisissez la clé que vous avez générée pour ce collaborateur (voir étape suivante).

## 10. Générer les clés d'activation pour votre équipe

Connecté en tant que Super Administrateur (poste serveur, étape 8), allez dans le menu
**Administration → Clés d'activation**. Pour chaque collaborateur :

1. Choisissez le rôle à lui attribuer (créé au préalable dans Rôles & permissions si besoin).
2. Générez une clé (une par personne).
3. Transmettez-lui la clé (par message, à l'oral, etc.) — elle n'est valable qu'une seule fois.

Le collaborateur saisit sa clé à la première étape 9.2, choisit son identifiant et son mot de
passe, et se retrouve immédiatement connecté avec le rôle que vous lui avez attribué. Les
connexions suivantes se font normalement, par identifiant/mot de passe.

---

## Résumé du flux pour un nouveau collaborateur

```
Vous générez une clé (rôle X) → vous la transmettez → le collaborateur configure
l'adresse du serveur → il saisit la clé → il choisit son mot de passe → il est connecté.
```

## En cas de problème

- **"Serveur injoignable"** au test de connexion : vérifiez que la fenêtre du serveur (étape 6)
  est toujours ouverte, que l'adresse IP n'a pas changé (`ipconfig`), et le pare-feu Windows.
- **Clé refusée** : une clé ne sert qu'une seule fois — si un collaborateur a déjà essayé une
  fois (même en erreur après avoir choisi un identifiant déjà pris), générez-lui une nouvelle
  clé plutôt que de réutiliser l'ancienne.
- **Changer d'adresse de serveur sur un poste** : sur l'écran de connexion, en bas, cliquez sur
  "Changer de serveur".
