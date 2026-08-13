# Déploiement du portail sur Netlify

Le portail (`apps/web-portail`) peut être hébergé sur Netlify. Il continue à enregistrer les données dans PostgreSQL du serveur ISAC, car il appelle l'API ISAC : il ne doit jamais contenir une connexion directe à la base de données.

## Limite réseau importante

Un site Netlify s'exécute sur Internet. Il ne peut pas atteindre `localhost`, `192.168.x.x` ou `10.x.x.x` du serveur ISAC. L'adresse `http://10.198.249.89:4310` est utilisable uniquement sur le même réseau local.

Pour permettre l'accès depuis Netlify, publiez **uniquement l'API** à travers une URL HTTPS sécurisée, par exemple `https://api.votre-domaine.tld`. Un tunnel HTTPS géré (Cloudflare Tunnel ou équivalent) est recommandé. Ne publiez jamais PostgreSQL (port 5432) sur Internet.

## Configuration Netlify

1. Connectez le dépôt `ISAC-ERP` à Netlify.
2. Build command : `pnpm --filter @isac-erp/web-portail build`.
3. Définissez dans **Project configuration → Environment variables** :

   ```text
   NEXT_PUBLIC_PORTAL_API_URL=https://api.votre-domaine.tld/trpc
   ```

4. Relancez un déploiement après chaque modification de cette variable.

Netlify détecte et prend en charge Next.js. Les variables peuvent être définies de façon sécurisée dans son interface et appliquées par contexte de déploiement.

## Vérification

Avant le déploiement, vérifiez l'API depuis un réseau extérieur :

```text
https://api.votre-domaine.tld/
```

Elle doit répondre avec l'état `running`. Ensuite, le portail Netlify enverra ses requêtes vers `https://api.votre-domaine.tld/trpc`, et l'API enregistrera les données dans la base PostgreSQL locale `isac_erp`.

## Sécurité minimale

- HTTPS obligatoire pour l'API publique.
- N'exposez que le port/API HTTPS ; jamais PostgreSQL.
- Conservez `DATABASE_URL`, mots de passe SMTP et secrets uniquement sur le serveur ISAC.
- Gardez les comptes Super Administrateur, mots de passe forts et la double authentification activée.
