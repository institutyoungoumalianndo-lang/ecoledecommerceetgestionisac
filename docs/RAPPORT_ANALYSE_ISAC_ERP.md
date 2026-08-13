# Rapport d'analyse — Projet Python existant "Gestion Scolaire ISAC"
### En vue de la réécriture en ISAC ERP (Electron / React / TypeScript / Tailwind / PostgreSQL)

**Date** : 2026-07-26
**Périmètre analysé** : `gestion_scolaire_NOUVEAU/` — ~205 fichiers Python (hors cache), ~21 600 lignes de code, 14 migrations SQL, 44 fichiers d'historique de développement (`INSTRUCTIONS_ETAPE*.md`, `INSTRUCTIONS_CORRECTIF*.md`).

---

## 0. Vue d'ensemble

Le projet actuel est une application desktop **PySide6 (Qt)** connectée à **MySQL 8** (`mysql-connector-python`), construite étape par étape (27 étapes fonctionnelles + 17 correctifs post-hoc) avec l'aide d'un assistant IA, sans environnement de test visuel ni suite de tests automatisés significative (~2% de couverture). L'architecture logicielle est en 5 couches disciplinées :

```
ui/ (PySide6)  →  controllers/  →  services/  →  repositories/  →  database/connection.py (MySQL)
                                         ↘ models/ (dataclasses)
reports/ (génération PDF, reportlab)  ←  appelé par services/
```

C'est un socle fonctionnel réel et déjà exploité en conditions quasi réelles (données de test cohérentes : étudiants, paiements, bulletins, paie générés). Il constitue une **excellente source de vérité métier** pour le futur ERP, mais son code (Python/Qt/MySQL) ne sera pas porté — seule sa logique métier et ses schémas de documents seront réutilisés, comme le souhaite le cahier des charges.

Aucun fichier de "cahier des charges" n'a été trouvé dans le dossier fourni (seul le README y fait référence sous les noms `Phase2_Arbitrages_et_Architecture_ISAC.md`, `Phase3_Base_de_donnees_ISAC.md`, `Phase8_Roadmap_ISAC.md`, absents du périmètre analysé). Si vous les avez, transmettez-les avant validation finale de l'architecture — ils contiennent probablement des règles métier arbitrées que le code seul ne révèle pas complètement.

---

## 1. Fonctionnalités déjà présentes

| Domaine | Fonctionnalités couvertes |
|---|---|
| **Authentification & sécurité** | Connexion bcrypt (coût 12), verrouillage après 5 échecs / déverrouillage auto 15 min, RBAC piloté par la base (rôles/permissions), messages d'erreur génériques anti-énumération |
| **Référentiels pédagogiques** | Filières, niveaux, classes (rattachées à une année scolaire), matières, années scolaires (une seule active, clôture/réouverture réservée admin) |
| **Étudiants** | Fiche complète, matricule auto-généré atomique (`FF-NNNN-ISAC-AA`), photo, désactivation (jamais de suppression), historique de scolarité (décision par année : Admis/Ajourné/Redoublant/Abandon) |
| **Professeurs** | Fiche, affectation aux matières (max 10 matières/prof/an, doublons bloqués) |
| **Emploi du temps** | Créneaux hebdomadaires par classe, **détection de conflits** salle et professeur, réplication d'un créneau à toutes les classes d'une filière/niveau |
| **Notes** | Saisie 3 composantes (orale/écrite/composition), note finale = moyenne des composantes renseignées, moyenne de module pondérée par coefficient, moyenne annuelle, verrouillage post-bulletin |
| **Bulletins** | Génération PDF par module + bulletin annuel, avec QR code, historique des générations |
| **Classement** | Par mérite, tous niveaux/sections confondus, gestion des ex-æquo (rang "1,1,3") |
| **Frais & paiements** | Paramétrage frais par filière/niveau/année avec échéancier, paiements (4 modes : espèces, mobile money, virement, chèque), annulation soft (jamais supprimé), calcul de solde et statut d'échéance |
| **Caisse & comptabilité simple** | Caisse du jour, livre de caisse consolidé (paiements + mouvements manuels + dépenses), bilan mensuel/annuel (cycle scolaire sept.–juil.) |
| **Documents officiels** | Attestations de scolarité, attestations de niveau/fin de cycle, certificats (éligibilité = dernière année + admis), cartes étudiant (QR, format CR80, génération en masse), cartes de paiement, reçus (avec conversion montant→lettres) |
| **Paie / RH minimal** | Professeurs payés oct.–juin, employés administratifs 12 mois, heures calculables depuis l'emploi du temps, avances sur salaire, bulletins de paie PDF (double exemplaire) |
| **Rapports & tableau de bord** | KPI, graphiques (barres/camembert), taux de réussite, activité récente, alertes |
| **Journal d'audit** | Traçabilité partielle (annulation paiement, forçage attestation, actions sur année scolaire, sauvegarde) |
| **Sauvegarde/restauration** | Via `mysqldump`/`mysql`, double confirmation, réservé admin |
| **Utilisateurs & permissions** | CRUD utilisateurs, gestion fine des rôles/permissions |
| **Feuille de saisie** | Export PDF vierge pour saisie manuelle hors-ligne des notes |

**Absent du projet actuel** (à construire entièrement pour l'ERP) : gestion réelle multi-campus (un seul campus géré en dur aujourd'hui), communication Email/WhatsApp/SMS, bibliothèque, inventaire, portail web, application mobile, intelligence artificielle, comptabilité complète (au-delà du bilan simple), paramètres avancés multi-tenant.

---

## 2. Points forts (à retenir)

1. **Architecture en couches disciplinée** : les controllers sont réellement minces (souvent < 20 lignes, purs relais), toute la logique métier est isolée dans `services/`, tout le SQL dans `repositories/` (sauf 2 exceptions notées en §3). C'est un excellent point de départ conceptuel pour découper les futurs modules/services de l'ERP.
2. **RBAC réel, piloté par la base**, pas cosmétique côté données (menus qui se masquent selon permission, table `role_permissions`).
3. **Sécurité des mots de passe solide** : bcrypt, verrouillage progressif, messages anti-énumération — standard directement transposable.
4. **Logique métier pure et déjà testable** : calcul de note finale, mentions, décisions, classement avec ex-æquo, éligibilité aux documents, calcul de solde/échéances, règles de paie (mois payables) sont des fonctions/algorithmes clairs, bien isolés, documentés par l'usage réel.
5. **Auditabilité par conception** : aucune suppression physique sur les entités sensibles (étudiants, paiements) — flags `actif`/`annule` à la place. Bonne pratique à ériger en règle dure du nouveau schéma.
6. **Contenu des documents PDF très abouti** : 13 générateurs couvrant des besoins réglementaires réels (mentions légales, QR codes de vérification, formats non standards comme la carte CR80). C'est une **spécification fonctionnelle précieuse**, même si le code lui-même (reportlab bas niveau) ne sera pas repris.
7. **Historique de développement richement documenté** (44 fichiers) : les 17 correctifs constituent un catalogue réel de bugs métier rencontrés en production simulée — une mine d'informations pour ne pas répéter les mêmes erreurs (voir §4).
8. **Convention d'erreurs cohérente** (`(succès: bool, message: str)`), transposable directement en un type `Result<T, E>` côté TypeScript.

---

## 3. Points faibles (à corriger absolument)

1. **Couverture de tests quasi nulle** (4 fichiers de tests pour 205 fichiers, ~2%). Aucune spécification exécutable de la logique métier critique (paie, bilan, notes) hors le code source lui-même.
2. **Autorisation jamais vérifiée en profondeur** : les services et repositories font explicitement confiance à l'appelant (« vérifié par le contrôleur, pas ici » — cité littéralement dans `utilisateur_service.py`). Dans une architecture desktop mono-processus c'est un risque limité ; **dans une architecture Electron + API réseau, c'est une faille structurelle qui doit être corrigée dès la conception** (toute autorisation doit être revérifiée côté serveur, jamais côté client).
3. **Schéma SQL non fiable comme source de vérité** :
   - la table `journal_audit` est définie deux fois avec des structures différentes ;
   - `models/note.py` référence une colonne `note_composition` qui n'existe dans **aucune** migration SQL (dérive de schéma non versionnée) ;
   - le nom de base de données change (`isac_gestion_scolaire` → `_v2`) sans migration de renommage ;
   - la permission `PAIE_GERER` est très probablement **jamais réellement assignée** (bug de filtre `libelle` vs `code` dans la migration 011) ;
   - pas d'outil de migration formel (pas de Flyway/Alembic/Prisma Migrate) — historique dépendant de scripts SQL exécutés à la main.
   → **Le schéma MySQL réel devra être extrait de la base vivante (pas seulement des fichiers de migration) avant toute conception du schéma PostgreSQL.**
4. **Duplication de code massive** : le dessin du drapeau guinéen copié dans 8 générateurs PDF différents, la recherche de logo dupliquée dans 9 services, le pattern "ligne provisoire → PDF → finalisation" réimplémenté sans abstraction dans chaque module documentaire.
5. **Gestion transactionnelle incohérente** : le pattern "insérer une ligne provisoire (`'EN_COURS'`) avant génération du PDF, la finaliser après" n'est protégé par `try/except/rollback` que dans 2 modules sur ~9 (paie, bulletin annuel) — ailleurs, un échec de génération PDF laisse une ligne orpheline en base. Ce pattern a d'ailleurs déjà causé un **bug bloquant en production** (`Duplicate entry 'EN_COURS'` sur la paie, migration 013).
6. **Aucune opération asynchrone** : pas un seul `QThread` dans tout le projet — génération PDF, sauvegarde/restauration DB bloquent le thread UI. À ne surtout pas reproduire dans Electron (prévoir des opérations async avec état de chargement, éventuellement en worker/process séparé pour les tâches lourdes).
7. **Incohérence visuelle** : ~30% des écrans ont reçu une "refonte premium" (dégradés, ombres, sidebar moderne), les ~70% restants sont restés au style Qt basique d'origine, avec 3 fichiers utilisant encore des émojis comme icônes alors que le reste de l'app les bannit explicitement.
8. **Code mort non nettoyé** : un dossier entier (`etudiants/`) et 2 fichiers racine (`formulaire_etudiant.py`, `main_window.py`) sont des versions obsolètes jamais supprimées, confirmé sans aucune référence dans le code actif.
9. **Observabilité quasi nulle** : seul le module d'authentification et la connexion DB journalisent quoi que ce soit ; aucune trace des opérations métier (génération de documents, paiements, etc.).
10. **Couverture d'audit incohérente** : certaines actions sensibles sont journalisées (annulation de paiement, forçage d'attestation), d'autres tout aussi sensibles ne le sont pas (création d'utilisateur, réinitialisation de mot de passe, révocation de carte).
11. **Gestion multi-campus quasi absente** : `parametres_etablissement` est une table à une seule ligne — un seul campus réellement géré malgré la demande. C'est un point d'attention majeur puisque l'ERP cible doit gérer **deux campus dès le départ**.
12. **Valeurs métier codées en dur** dans le code de présentation (nom du comptable, contacts, mentions) plutôt qu'en configuration.
13. **Multi-fenêtrage sans cache partagé** : chaque écran ouvert re-fetch ses propres données sans invalidation croisée — un bouton "Actualiser" a dû être ajouté à la main dans certains écrans faute de mieux.

---

## 4. Leçons tirées de l'historique des correctifs (17 bugs réels documentés)

L'analyse des 17 fichiers `INSTRUCTIONS_CORRECTIF*.md` fait ressortir **quatre familles de bugs récurrents**, directement exploitables comme check-list de vigilance pour la réécriture :

- **Hypothèses de schéma SQL non vérifiées** (journal d'audit v2/v3, paie v2) : du code généré en supposant une structure de table jamais consultée directement → colonnes inexistantes, requêtes silencieusement en échec. *Leçon : toujours partir du schéma réel, jamais d'une supposition.*
- **Mise en page PDF pixel-perfect itérative** : la carte de paiement a nécessité **5 versions** successives (chevauchements, débordements, alignements) faute de pouvoir visualiser le rendu avant livraison. *Leçon : pour l'ERP web, prévoir un aperçu PDF systématique en boucle courte de développement.*
- **Formatage monétaire non centralisé dès le départ** : corrigé a posteriori sur 13 fichiers différents (`CORRECTIF_MONNAIE_GNF.md`). *Leçon : centraliser le formatage GNF (et toute donnée d'identité d'établissement) dans une fonction/config partagée dès le premier jour.*
- **Écriture en base avant confirmation de succès complet de l'opération**, sans transaction robuste → bug bloquant `Duplicate entry 'EN_COURS'` en production. *Leçon : toute opération multi-étapes (créer ligne → générer document → finaliser) doit être transactionnelle avec rollback garanti.*

Ce mode de développement (itératif, sans tests automatisés, sans rendu visuel vérifiable côté IA) a été fonctionnel mais fragile. Pour l'ERP, il faudra : valider le schéma réel en amont, centraliser formatage/config dès la conception, sécuriser les écritures multi-étapes par transaction, et couvrir la logique financière/paie par des tests automatisés.

---

## 5. Ce qui peut être conservé (conceptuellement — logique métier, pas le code)

- Toutes les **règles de calcul métier** : note finale (moyenne des composantes renseignées), moyenne de module (pondérée par coefficient), moyenne annuelle, barème de mentions, règle de décision (Admis si ≥10), classement avec gestion des ex-æquo, éligibilité aux attestations/certificats (dernière année + admis), calcul de solde et statut d'échéance, règles de paie (mois payables profs vs employés, avances déduites).
- Le **modèle RBAC** (rôles, permissions, codes de permission) et son principe de résolution à la connexion.
- Le **contenu informationnel des documents officiels** (quelles données apparaissent sur quel document, mentions légales, numérotation unique) — à reprendre en gabarits HTML/CSS.
- Les **règles de génération de numéros/matricules atomiques** (via séquence verrouillée).
- Le **formatage GNF** (montants entiers, pas de décimales, séparateur espace) et le convertisseur montant→lettres françaises.
- La **politique de sécurité des mots de passe** (bcrypt, verrouillage progressif, messages génériques).
- Les **44 fichiers d'historique** comme documentation vivante des règles métier et des pièges déjà identifiés — à garder comme référence pendant tout le développement du nouvel ERP (ne pas les supprimer, ni les porter en code).

## 6. Ce qui doit être entièrement réécrit

- **Toute la couche présentation** (PySide6 → React/Tailwind), sans reprendre ni le layout ni les composants Qt.
- **Le schéma de données**, repensé pour PostgreSQL avec vraies contraintes, migrations versionnées formelles (Prisma Migrate ou équivalent), correction des dérives connues (`journal_audit` unifiée, `note_composition` correctement définie), et **vraie modélisation multi-campus** dès la conception (pas une ligne unique de paramètres).
- **La couche d'accès aux données** (repositories Python → ORM/requêtes TypeScript typées).
- **L'autorisation**, à revérifier systématiquement côté backend pour chaque opération sensible (jamais de confiance implicite à l'appelant).
- **La génération de documents**, avec un moteur factorisé (templates partagés, pas de duplication du dessin d'en-tête dans 8 fichiers).
- **Les scripts de patch fragiles** (`_appliquer_theme_fenetres.py`, `_patch_icones_dashboard.py`) : à ignorer intégralement — seul leur résultat (thème, icônes) doit être repris.
- **Le code mort confirmé** (`etudiants/`, `formulaire_etudiant.py` racine, `main_window.py` racine) : à ignorer, aucune valeur de référence.

---

## 7. Proposition d'architecture moderne — ISAC ERP

### 7.1 Principes directeurs

- **Monorepo** (pnpm workspaces + Turborepo) pour partager types, schémas de validation et design system entre desktop, futur portail web et future app mobile.
- **Autorisation vérifiée côté backend systématiquement** — leçon directe du point faible n°2 ci-dessus.
- **Schéma PostgreSQL conçu à neuf**, migrations versionnées (Prisma Migrate), avec vraie table `campus` référencée partout où c'est pertinent (étudiants, classes, caisse, employés...).
- **Toute opération multi-étapes est transactionnelle** (leçon du bug `EN_COURS`).
- **Design system unique dès le jour 1**, appliqué à 100% des écrans (pas de refonte partielle comme dans l'existant).
- **Tests automatisés dès le début** sur la logique métier critique (paie, bilan, notes, calcul de solde), avant tout affichage.

### 7.2 Structure du monorepo (proposition)

```
isac-erp/
├── apps/
│   ├── desktop/            # Electron (main + preload) + React (renderer), Vite
│   ├── web-portail/        # (phase ultérieure) portail web — Next.js, réutilise packages/ui et /shared
│   └── mobile/             # (phase ultérieure) React Native, réutilise /shared
├── packages/
│   ├── api/                # Backend Node (Fastify + tRPC ou REST), logique métier, auth, RBAC serveur
│   ├── db/                 # Schéma Prisma, migrations, seed scripts
│   ├── pdf/                # Moteur de génération de documents (templates HTML/CSS communs + rendu PDF)
│   ├── ui/                 # Design system partagé (composants Tailwind/shadcn, tokens de thème)
│   └── shared/              # Schémas Zod, types TS, constantes métier (permissions, formats), i18n
├── infra/
│   ├── docker/              # PostgreSQL local de dev, scripts de sauvegarde
│   └── ci/                  # GitHub Actions : lint, tests, build de l'installeur .exe
└── docs/                    # Documentation vivante (remplace les fichiers INSTRUCTIONS_*)
```

### 7.3 Stack technique par couche

| Couche | Choix proposé | Justification |
|---|---|---|
| Shell desktop | **Electron** (main + preload isolé, `contextIsolation: true`) | Demandé, permet un installeur `.exe` Windows natif |
| UI | **React + TypeScript + Tailwind CSS**, composants **shadcn/ui** (Radix) | Demandé ; shadcn donne un design system cohérent et accessible dès le départ, évite l'incohérence visuelle constatée dans l'existant |
| État serveur / cache | **TanStack Query** | Corrige directement le problème de données désynchronisées entre fenêtres multiples de l'existant (invalidation de cache automatique) |
| État UI local | **Zustand** | Léger, suffisant pour l'état d'interface (pas de Redux nécessaire) |
| Formulaires & validation | **React Hook Form + Zod**, schémas partagés avec le backend (`packages/shared`) | Une seule source de vérité pour les règles de validation, front et back |
| Backend applicatif | **Node.js + Fastify**, API typée via **tRPC** (ou REST si intégration future avec des tiers l'exige) | Autorisation vérifiée systématiquement côté serveur ; tRPC élimine une classe entière de bugs de contrat front/back |
| Base de données | **PostgreSQL** | Demandé ; ORM **Prisma** avec migrations versionnées formelles (corrige l'absence d'outil de migration constatée) |
| Génération de documents | Templates **HTML/CSS** communs + rendu PDF via **Puppeteer/Playwright** (ou `@react-pdf/renderer` pour les documents à mise en page simple type reçus) | Élimine la duplication massive du code reportlab ; un aperçu HTML est vérifiable en boucle courte avant impression, corrigeant le problème des "5 versions" de la carte de paiement |
| Authentification | Sessions ou JWT + refresh token, **bcrypt/argon2** côté backend, verrouillage progressif conservé | Reprend la bonne pratique existante, corrigée côté serveur |
| Tests | **Vitest** (logique métier, unitaire), **Playwright** (E2E Electron) | Corrige la couverture quasi nulle actuelle ; prioriser paie/bilan/notes/solde en premier |
| Observabilité | Logs structurés (**pino**), stockage local + rotation, option Sentry pour les erreurs | Corrige l'observabilité quasi nulle actuelle |
| CI/CD | **GitHub Actions** : lint + tests + build `electron-builder` → `.exe` signé | Absent actuellement, à instaurer dès le départ |
| Sauvegarde | Job planifié `pg_dump` + rotation, restauration avec double confirmation (pattern UX à conserver) | Reprend la bonne pratique UX existante sur une base technique plus fiable |

### 7.4 Découpage en modules métier (bounded contexts)

Repris et étendus depuis les domaines identifiés dans l'existant :

1. **Identité & accès** — utilisateurs, rôles, permissions, **campus** (vraie entité, pas une ligne fixe)
2. **Pédagogie** — filières, niveaux, classes, matières, années scolaires, emploi du temps (avec détection de conflits, logique à reprendre)
3. **Étudiants** — fiches, historique de scolarité, inscriptions
4. **RH & Paie** — professeurs, employés, affectations, heures, avances, bulletins de paie
5. **Évaluation** — notes, bulletins, classement, calculs (logique pure à porter directement, bien testée dès le départ)
6. **Finances** — frais, paiements, caisse, bilan, **comptabilité générale** (à étoffer largement par rapport à l'existant)
7. **Documents** — moteur de génération PDF centralisé (attestations, certificats, cartes, reçus, bulletins)
8. **Communication** *(nouveau)* — Email (SMTP/API), WhatsApp Business API, SMS (passerelle locale Guinée à identifier), notifications internes
9. **Bibliothèque** *(nouveau)*
10. **Inventaire** *(nouveau)*
11. **Rapports décisionnels / BI** *(à étoffer)* — au-delà du taux de réussite actuel
12. **Paramètres, sauvegarde, sécurité, journal d'audit** — audit systématisé (middleware, pas d'appels manuels dispersés comme actuellement)
13. **Intelligence artificielle** *(nouveau, phase ultérieure)* — assistant d'analyse sur les données de reporting, génération de synthèses

### 7.5 Question ouverte majeure à trancher avant de coder : topologie multi-campus

Le projet actuel ne gère qu'un seul campus dans les faits. Pour l'ERP, il faut décider **comment les deux campus partagent les données** :

- **Option A — Base centralisée unique** (PostgreSQL hébergé sur un serveur central, cloud ou sur site à l'un des campus), les deux campus s'y connectant via Internet/VPN. Plus simple à développer et maintenir, données toujours cohérentes en temps réel, mais dépend d'une connexion réseau fiable entre campus.
- **Option B — Base locale par campus avec synchronisation** différée/périodique vers un serveur central. Plus résilient en cas de coupure réseau, mais introduit de la complexité (résolution de conflits, latence de synchronisation) qu'il vaut mieux éviter sauf nécessité avérée.

Sauf contrainte réseau connue en Guinée qui imposerait l'option B, je recommande l'**option A** pour la version 1, avec un mode dégradé lecture-seule en cas de perte de connexion. Merci de confirmer ce point — il conditionne fortement l'architecture du backend et du module offline.

---

## 8. Prochaines étapes proposées

1. Vous validez (ou amendez) ce rapport et la proposition d'architecture ci-dessus.
2. Si disponibles, vous transmettez les documents de cadrage mentionnés dans le README (`Phase2_Arbitrages_et_Architecture_ISAC.md`, `Phase3_Base_de_donnees_ISAC.md`, `Phase8_Roadmap_ISAC.md`) et votre cahier des charges, pour vérifier qu'aucune règle métier arbitrée n'a été manquée.
3. Tranchez la question de topologie multi-campus (§7.5).
4. Une fois validé, je proposerai un plan de développement détaillé (phasage des modules, schéma PostgreSQL initial, maquettes d'écrans clés) — **avant d'écrire la moindre ligne de code**, conformément à votre demande.
