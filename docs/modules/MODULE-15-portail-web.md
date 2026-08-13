# Module 15 — Portail web

**Statut** : 🟠 **Phase 1 — Fondations développées (2026-08-07), en attente du test manuel du porteur du projet** avant les phases 2-5. Ce module est d'une nature différente de tous les précédents : il ne s'agit pas d'ajouter un domaine métier à une application déjà autonome, mais d'ajouter un **second client** (un portail web) à l'installation existante d'un campus, sans toucher à l'architecture mono-campus/LAN déjà en place pour le reste de l'application.

**Décisions du porteur du projet (2026-08-07)** :
1. **Public** : étudiants, parents/tuteurs **et** enseignants, chacun en lecture seule scopée à leurs propres données — **plus le Super Administrateur, qui doit avoir accès complet** (pas limité à la lecture) depuis le portail, via son compte `User` existant.
2. **Capacités** : lecture seule pour étudiants/parents/enseignants (aucun paiement en ligne, aucune saisie à distance en v1). Périmètre enseignant précisé : emploi du temps, classes/matières affectées, liste de ses étudiants, présences, notes déjà enregistrées, bulletins publiés, annonces/documents administratifs — tout en lecture seule, rien de modifiable depuis le portail.
3. **Hébergement** : le serveur du campus lui-même est exposé sur Internet (pas de serveur relais séparé) — implique HTTPS et durcissement de sécurité (CORS restreint, etc.) avant toute mise en production.
4. **Création de compte** : validée telle que proposée — le personnel génère un mot de passe temporaire depuis la fiche existante de l'étudiant/enseignant/tuteur, transmis par e-mail/SMS/WhatsApp (canaux du Module 12 déjà en place), changement obligatoire à la première connexion (réutilise enfin le champ `mustChangePassword`, déjà présent sur `User` mais jusqu'ici jamais appliqué).
5. **Architecture — point clarifié explicitement** : un temps de confusion a eu lieu sur ce point, tranché explicitement — **un seul campus pilote, architecture mono-campus/LAN actuelle strictement inchangée** (ADR-005/007). Une architecture multi-campus à base de données centrale unique a été évoquée puis explicitement écartée après clarification : elle rendrait tous les campus dépendants d'Internet au quotidien (pas seulement pour le portail), à l'opposé de la raison d'être d'ADR-005 (coupures Internet fréquentes en Guinée). Le Module 15 ajoute un accès web à **un** campus existant, sans aucun changement à l'indépendance des campus entre eux ni à la disponibilité hors-ligne du reste de l'application.
**Dépend de** : Modules 1–10 "selon exposition choisie" (`ROADMAP.md`). En pratique, dépend surtout des réponses au §2.
**Source** : `ROADMAP.md` ne donne qu'une ligne : *"Accès web distant à l'installation d'un campus (lecture/écriture selon rôle)"*. Aucun cahier des charges détaillé, aucun ADR dédié — seulement des mentions anticipatives dans `ARCHITECTURE_MASTER.md` (un dossier `apps/web-portail/` réservé "phase ultérieure") et dans les choix de conception du Module 1 (sessions par jeton, pas par cookie de navigateur — "pour rester compatible avec un futur portail web/mobile").

---

## 0. Ce qui existe déjà — et le vrai écart

**Réutilisable directement** :
- **Sessions par jeton** (`UserSession`, en-tête `x-session-token`, jamais un cookie) — déjà pensé pour fonctionner par-delà le LAN, contrairement à une session de navigateur classique liée à une origine.
- **RBAC** (`Role`/`Permission`, chaînes `MODULE:ACTION`) — le mécanisme d'autorisation lui-même est réutilisable.
- **tRPC** (typage bout-en-bout) — un futur client web peut consommer le même router que le client Electron sans réécrire l'API.

**L'écart réel — pas un détail technique, une refonte de fond** :
1. **Aucune identité externe n'existe.** `Student` et `Teacher` sont aujourd'hui de purs enregistrements gérés *par* le personnel — ils n'ont ni mot de passe, ni identifiant de connexion, ni aucun mécanisme d'authentification. Seul `User` (le personnel administratif) sait se connecter. Un "portail" pour étudiants/enseignants/parents suppose de créer un **type d'identité entièrement nouveau**, avec son propre flux d'inscription/mot de passe/récupération — rien à voir avec un ajustement du RBAC existant, qui est conçu pour des comptes de personnel, pas pour des milliers de comptes externes à portée restreinte (un parent ne doit voir que **son** enfant, jamais consulté par module entier comme le fait le RBAC actuel).
2. **Aucun chiffrement TLS/HTTPS nulle part.** Le serveur (`packages/api/src/index.ts`) tourne aujourd'hui en HTTP simple, volontairement, car le LAN d'un campus est un réseau de confiance. Exposer ça tel quel sur Internet ferait transiter mots de passe, notes, données financières **en clair**.
3. **CORS grand ouvert** (`origin: true`, tout site accepté) — acceptable sur un LAN fermé où personne d'externe ne peut atteindre le serveur ; dangereux si le même serveur devient joignable depuis Internet.
4. **Le serveur écoute déjà sur `0.0.0.0`**, mais uniquement parce que c'est nécessaire pour que les postes du campus s'y connectent — ce n'est pas une exposition Internet volontaire, c'est un effet de bord de l'architecture LAN actuelle.

---

## 1. La tension à trancher avant tout le reste

L'ADR-005 (architecture actuelle, validée) donne sa raison d'être explicitement : *"Coupures Internet fréquentes en Guinée — une dépendance réseau rendrait l'application inutilisable par intermittence."* C'est exactement la même contrainte qui pèse sur un portail web : si le serveur d'un campus doit être joignable depuis Internet en permanence pour qu'un étudiant consulte ses notes chez lui, on réintroduit précisément la dépendance qu'ADR-005 a été écrite pour éviter — sauf que cette fois, c'est le point d'accès **entrant** (un tiers qui se connecte au campus), pas une dépendance **sortante** (le campus qui a besoin d'Internet pour fonctionner). Le campus continuerait de fonctionner hors-ligne en interne ; seul le portail externe serait indisponible pendant une coupure. C'est un compromis différent, pas nécessairement mauvais, mais qui mérite d'être nommé plutôt que découvert après coup.

---

## 2. Conception proposée (à valider avant tout code)

### 2.1 Trois nouveaux types de compte externe, un compte existant réutilisé

Le portail sert deux mondes différents :
- **Personnel existant (Super Administrateur)** — se connecte avec son compte `User` déjà existant, aucune nouvelle table, aucun nouveau mécanisme d'autorisation : le RBAC actuel (`Role`/`Permission`) s'applique tel quel. Le portail web n'est alors qu'un second client (en plus de l'application desktop) qui parle au même serveur — cohérent avec le choix déjà fait des sessions par jeton (§0).
- **Étudiants, parents/tuteurs, enseignants** — nouvelles identités de connexion, sans rapport avec le RBAC de personnel. Chacune a un mot de passe propre et ne voit **que ses propres données**, jamais un module entier :
  - Un étudiant voit ses notes/bulletins/emploi du temps/statut de paiement — les siens uniquement.
  - Un parent/tuteur voit les mêmes informations, mais pour le ou les étudiant(s) dont il est effectivement le tuteur enregistré (`Guardian`, déjà lié à `Student`).
  - Un enseignant voit (tout en lecture seule) : son emploi du temps, ses classes/matières affectées, la liste de ses étudiants, les présences déjà saisies, les notes déjà enregistrées, les bulletins déjà publiés, et les annonces/documents administratifs qui lui sont destinés.

  Ce n'est **pas** un rôle RBAC de plus (le RBAC actuel autorise par module, pas par enregistrement précis) — c'est un contrôle d'accès différent, à portée d'enregistrement unique, appliqué systématiquement au niveau de chaque requête du portail.

### 2.2 Comment un étudiant/parent/enseignant obtient-il ses identifiants ?

Aucun mécanisme d'auto-inscription (cohérent avec le reste du projet — l'établissement garde le contrôle des identités). Proposition, reprenant un mécanisme déjà éprouvé côté personnel (`resetPassword`/mot de passe temporaire du Module 1) :
- Le Super Administrateur (ou un rôle autorisé) déclenche la création d'un compte portail depuis la fiche de l'étudiant/enseignant existant (ou du tuteur) — un mot de passe temporaire est généré.
- Ce mot de passe est transmis via les canaux déjà en place (Module 12 — e-mail/SMS/WhatsApp), sans nouveau canal à construire.
- Le champ `mustChangePassword` (déjà présent sur `User` mais aujourd'hui jamais appliqué nulle part dans l'application desktop) serait enfin exploité : le nouveau compte doit changer son mot de passe à la première connexion — le portail est l'occasion de combler ce point déjà identifié.

### 2.3 Durcissement de sécurité obligatoire avant mise en production

Puisque le serveur du campus est directement exposé (décision validée, voir §0/status) :
- **HTTPS obligatoire** — aucun HTTP en clair vers Internet (contrairement à l'usage LAN actuel).
- **CORS restreint** — remplacer `origin: true` (tout accepté) par une liste explicite d'origines autorisées pour le portail.
- **Limitation de débit (rate limiting)** sur les tentatives de connexion externes — le verrouillage de compte existant (Module 1) protège déjà un compte précis, mais pas contre un balayage massif de comptes différents.
- Le pare-feu/routeur du campus (port-forwarding) reste sous la responsabilité de l'établissement — hors du périmètre du code de l'application, mais à documenter clairement pour le porteur du projet.

### 2.4 Un seul campus pilote

Confirmé, après clarification explicite (voir le point 5 des décisions en tête de document) : cohérent avec ADR-005/007 (chaque campus reste une installation isolée), le portail d'un campus reste propre à ce campus. Aucune base de données centrale multi-campus.

---

## 3. Conception de la base de données (proposée)

Trois nouvelles identités de connexion externes, indépendantes de `User` (personnel) — chacune avec son propre mot de passe/verrouillage, jamais mêlées au RBAC de personnel. Reprend le principe déjà établi (Module 13/14) : plutôt qu'une relation polymorphe complexe, une table de session portail générique référencée par un type + un id.

```prisma
/// Identifiants de connexion externes — un par étudiant/tuteur/enseignant qui doit pouvoir se
/// connecter au portail. Distinct de `User` (personnel) : aucun rôle RBAC, portée toujours limitée à
/// ses propres données (voir MODULE-15 §2.1). Trois FK nullables (un seul renseigné à la fois) plutôt
/// qu'une relation polymorphe — même convention que `Loan`/`Asset`/`DigitalDocumentShare` (Modules
/// 13/14), qui donne une vraie intégrité référentielle au lieu d'un `principalId` en texte libre.
model PortalCredential {
  id                 String    @id @default(uuid())
  studentId          String?   @unique
  guardianId         String?   @unique
  teacherId          String?   @unique
  username           String    @unique   // ex. matricule étudiant, ou email
  passwordHash       String
  mustChangePassword Boolean   @default(true)
  failedAttempts     Int       @default(0)
  lockedUntil        DateTime?
  isActive           Boolean   @default(true)
  createdBy          String?               // membre du personnel ayant créé le compte
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  sessions PortalSession[]

  @@map("portal_credentials")
}

/// Session portail — même principe que `UserSession` (jeton haché, jamais un cookie), table séparée
/// pour ne jamais mélanger les sessions de personnel et les sessions externes.
model PortalSession {
  id           String   @id @default(uuid())
  credentialId String
  tokenHash    String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  lastSeenAt   DateTime @default(now())

  credential PortalCredential @relation(fields: [credentialId], references: [id], onDelete: Cascade)

  @@map("portal_sessions")
}
```

Pas de nouveau modèle de permission : l'accès est vérifié à chaque requête tRPC du portail en comparant `principalType`/`principalId` de la session à l'enregistrement demandé (ex. un étudiant ne peut interroger que `Student.id === credential.principalId`), jamais via une table de permissions — cohérent avec la décision "portée toujours limitée à ses propres données" (§2.1).

---

## 4. Prochaines étapes de mise en œuvre

Compte tenu de l'ampleur (nouvelle application `apps/web-portail/`, nouveau système d'authentification, nouveau modèle d'autorisation à portée d'enregistrement, durcissement sécurité), la mise en œuvre est phasée :
1. **Fondations** — ✅ **livrées (2026-08-07), en attente du test manuel du porteur du projet**. Schéma Prisma ci-dessus, service d'authentification portail (connexion, déconnexion, changement de mot de passe obligatoire), création de compte côté personnel (nouvel onglet dédié "Portail web" dans le desktop plutôt qu'un bouton par fiche — sélection étudiant/enseignant/tuteur, choix du canal e-mail/WhatsApp), scaffold de `apps/web-portail/` (Next.js 15) avec écrans Connexion / Changement de mot de passe obligatoire / Accueil authentifié fonctionnels, vérifiés de bout en bout contre l'API réelle en développement. **Connexion Super Administrateur ajoutée le même jour** (demande explicite du porteur du projet, en avance sur le phasage initial) : `/admin/connexion` réutilise directement `auth.login`/`auth.verifyTwoFactor` (même compte `User`, même 2FA que le desktop), jeton stocké séparément (`x-session-token`, jamais mêlé au jeton portail `x-portal-session-token` — le contexte serveur résolvait déjà les deux en parallèle). Accès réservé au rôle `SUPER_ADMIN` : toute autre connexion de personnel réussie est immédiatement déconnectée côté client avec un message explicite — contrôle applicatif seulement, pas encore un vrai rejet serveur (cohérent avec le durcissement sécurité encore différé à la phase 5).
2. **Lecture seule étudiant** — ✅ **livrée (2026-08-07), en attente du test manuel du porteur du projet**. `portalStudentService.ts`/`portalStudentRouter` (portée résolue depuis `credentialId`, jamais un `studentId` fourni par le client) réutilisent directement les DTO/fonctions existants : `listSeances` (emploi du temps, classe résolue depuis l'inscription active), `listBulletinsPeriodeStudent`/`listBulletinsAnnuelsStudent` (bulletins, filtrés `annule: false`), `getStudentFeeSummary`/`computePaymentStatus` (statut de paiement) — seule une requête `Note` dédiée a dû être écrite (aucune fonction existante ne renvoyait les notes brutes d'un étudiant, seulement des moyennes calculées). Tableau de bord à onglets sur `/portail` (Emploi du temps/Notes/Bulletins/Paiement), visible uniquement pour un principal de type étudiant — tuteur/parent et enseignant restent sur le message d'attente jusqu'à la phase 3.
3. **Lecture seule parent/tuteur, puis enseignant** — ✅ **livrée (2026-08-08)**, en autonomie, à la suite de la phase Super Admin ci-dessous. `portalGuardianService.ts`/`portalGuardianRouter` : un tuteur peut avoir plusieurs enfants (`StudentGuardian`) — chaque appel prend l'enfant ciblé en entrée et le revérifie systématiquement côté serveur contre les enfants réels du tuteur avant de renvoyer quoi que ce soit (jamais une confiance aveugle en un `studentId` client). Réutilise les 4 mêmes lectures que la phase 2 (emploi du temps/notes/bulletins/paiement), simplement reparamétrées par enfant ; `/portail` affiche un sélecteur d'enfant au-dessus des mêmes onglets. `portalTeacherService.ts`/`portalTeacherRouter` : un seul écran (emploi du temps propre), réutilise `listSeances` déjà filtrable par `teacherId` — aucune nouvelle requête d'emploi du temps, seule la résolution `credentialId` → `teacherId` est propre au portail. À cette occasion, les appels `.query()` de `/portail` (page étudiant) qui n'avaient pas de `.catch()` ont été corrigés (même défaut que celui trouvé et corrigé sur le Tableau de bord et les Étudiants du portail Super Admin, voir note ci-dessous).
4. **Accès Super Administrateur complet** depuis le portail (réutilise entièrement l'authentification/RBAC existants). **Poursuivi en autonomie (2026-08-08, demande explicite du porteur du projet — "développe un à un sans mon assistance et sans me dire de valider")**, module par module, chacun réutilisant directement les routeurs tRPC existants sans nouvelle route API (sauf écart ponctuel documenté) :
   - Tableau de bord général (`homeDashboard.get`, identique au desktop) — livré.
   - Étudiants (`/admin/etudiants` — annuaire `ServerDataTable`, création avec détection de doublons, fiche identité/coordonnées/situation familiale éditable) — livré, réutilise `students`.
   - Paiements (`/admin/paiements` — onglets Encaissement/Caisse/Historique) — livré, réutilise `payments`/`cashRegisters`/`cashRegisterSessions`/`paymentMethods`.
   - Enseignants (`/admin/enseignants` — annuaire, création, fiche identité/coordonnées/informations professionnelles) — livré, réutilise `teachers`/`teacherStatuses`/`teacherContractTypes`.
   - Inventaire (`/admin/inventaire` — registre des biens, création, fiche avec historique de mouvements et réforme/mise au rebut) — livré, réutilise `assets`/`assetCategories`/`assetLocations`.
   - Bibliothèque (`/admin/bibliotheque` — onglets Ouvrages/Emprunts ; fiche ouvrage avec gestion des exemplaires, emprunt et retrait) — livré, réutilise `books`/`bookCategories`/`loans`.
   - Communication (`/admin/communication` — onglets Envoi rapide/Historique, sélection de destinataires via le carnet d'adresses transverse) — livré, réutilise `communicationMessages`/`communicationContacts`/`messageTemplates`.
   - Comptabilité (`/admin/comptabilite` — onglets Grand livre/Balance) — livré, réutilise `financialReports`/`chartAccounts`.

   Chaque écran suit le même gabarit vanilla tRPC (`trpcClient.<router>.<procedure>.query()/.mutate()` dans `useEffect`/`useState`, toujours avec `.catch()` pour éviter les rejets de promesse non gérés) et le même modèle de composants (`ServerDataTable` pour les listes paginées côté serveur, `DataTable` pour les listes non paginées, `Card variant="form"`/`Dialog` pour les formulaires). Vérifié à chaque étape par `typecheck` + `build` de production (`next build`) avant de passer au module suivant.
5. **Durcissement sécurité** (HTTPS, CORS restreint, rate limiting) avant toute mise en production réelle — voir §2.3. **Rate limiting livré partiellement (2026-08-08)**, sur demande explicite du porteur du projet limitée à cette seule sous-partie (CORS restreint et HTTPS jugés trop risqués à activer avant de connaître le domaine de production — casseraient l'accès de développement `http://localhost`). `packages/api/src/security/rateLimit.ts` : fenêtre glissante en mémoire par IP, ciblée uniquement sur les routes sensibles (`auth.login` 10/min, `portalAuth.login` 10/min, `communicationMessages.sendQuick` 20/min) — le reste du trafic n'est jamais affecté. Le hook est attaché directement sur l'instance Fastify racine (`registerSensitiveRouteRateLimit(app)`, jamais via `app.register(...)`) : un hook `onRequest` ajouté à l'intérieur d'un plugin encapsulé ne s'applique qu'aux routes de ce même plugin en Fastify, jamais aux routes sœurs comme le catch-all `/trpc/*` enregistré séparément — piège découvert et corrigé pendant la vérification (le premier essai ne bloquait jamais rien). Vérifié par test réel : 10 tentatives de connexion consécutives passent, la 11e renvoie `429` avec un message clair, une route non concernée (`filieres.list`) reste inaffectée. CORS restreint et HTTPS restent à faire avant toute mise en production réelle.
