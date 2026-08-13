# Module 13 — Bibliothèque

**Statut** : 🟠 **Développé — en attente du test manuel (2026-08-07)** par le porteur du projet. Schéma Prisma + migration, seed (permissions BIBLIOTHEQUE, 4 catégories d'ouvrages de départ, réglage de bibliothèque par défaut, gabarit de numérotation `EXEMPLAIRE_BIBLIOTHEQUE`), packages/shared, packages/api (bookCategoryService/bookService/loanService/librarySettingsService + routers) et apps/desktop (écrans Ouvrages/Emprunts/Catégories/Réglages, fiche d'ouvrage avec gestion des exemplaires, emprunt/retour) livrés. Typecheck (shared/api/desktop) et 150 tests unitaires (dont 5 nouveaux) passent. Périmètre validé (2026-08-07) : emprunteurs étudiants + enseignants/employés, pas de pénalité financière (signalement visuel du retard uniquement), pas de réservation en v1, limite d'emprunts simultanés configurable par emprunteur.
**Dépend de** : Module 1 (Identité & Accès) et Module 4 (Étudiants), tous deux **terminés — validés**. Emprunteurs enseignants/employés (si validé, voir §3) dépendraient aussi des Modules 5/8, également terminés — validés.
**Source** : `ROADMAP.md` ne donne qu'une ligne de périmètre : *"Gestion des ouvrages, emprunts"*. Le rapport d'analyse du système Python existant (`RAPPORT_ANALYSE_ISAC_ERP.md` §7.4, ligne 184) confirme qu'il s'agit d'un module **entièrement nouveau** — aucune fonctionnalité de bibliothèque n'existait dans l'ancien système, donc aucun pattern UX à reprendre ni migration de données à prévoir. Cette analyse est donc une **proposition de périmètre complète**, à valider avant tout développement (§3).

---

## 0. Ce qui existe déjà — à ne pas reconstruire

Recherche exhaustive du dépôt (aucune supposition) :

- **Aucun concept de livre/ouvrage/emprunt nulle part** — ni dans le schéma Prisma, ni dans `packages/api/src/services`, ni dans les écrans desktop. Module entièrement à construire.
- **Module 14 (Inventaire), tout juste validé**, établit un pattern directement réutilisable : un référentiel de catégories configurable (`AssetCategory`), une fiche avec numéro généré automatiquement (moteur de numérotation générique), un historique de mouvements en append-only (`AssetMovement`), et — point clé — un emprunteur/responsable modélisé par **plusieurs clés étrangères nullables** (`responsibleEmployeeId`/`responsibleTeacherId`) plutôt qu'une relation polymorphe complexe. La Bibliothèque reprend directement ces trois idées : catégories d'ouvrages, numérotation d'exemplaire, et emprunteur multi-type (étudiant **et/ou** enseignant/employé selon votre décision, §3).
- **Différence structurelle avec l'Inventaire** : un bien (Module 14) est une unité unique ; un ouvrage de bibliothèque a typiquement **plusieurs exemplaires physiques** (plusieurs copies du même titre). Il faut donc un niveau `Ouvrage` (titre/auteur/catégorie, une fiche) distinct du niveau `Exemplaire` (une copie physique empruntable, avec son propre numéro et statut) — voir §1.1.
- **Aucun concept de prêt/retour/retard/amende nulle part** dans le Module 4.3 (Paiements) ni le Module 7 (Comptabilité) — si des pénalités financières sont souhaitées (§3), il faudra décider si elles passent par le circuit de paiement existant ou restent un simple champ informatif.

**Proposition de périmètre du Module 13** (à valider, §3) :
1. **Catalogue d'ouvrages** — fiche par titre (auteur, catégorie, description), avec un ou plusieurs exemplaires physiques rattachés.
2. **Gestion des exemplaires** — chaque exemplaire a un numéro d'inventaire propre, un état physique, un statut (disponible/emprunté/perdu/retiré).
3. **Emprunts** — enregistrement d'un emprunt (exemplaire + emprunteur + date d'emprunt + date d'échéance), retour, suivi des retards.
4. **Emprunteur** — étudiants au minimum ; enseignants/employés en option (à trancher, §3).

---

## 1. Analyse fonctionnelle

### 1.1 Catalogue — Ouvrages et Exemplaires

Deux niveaux, comme dans toute bibliothèque réelle :
- **Ouvrage** (`Book`) — le titre : titre, auteur, catégorie (référentiel configurable, ex. "Roman", "Manuel scolaire", "Revue"), description, éditeur/année de publication (facultatif), ISBN (facultatif). Une fiche par titre, indépendamment du nombre d'exemplaires possédés.
- **Exemplaire** (`BookCopy`) — une copie physique précise d'un ouvrage : numéro d'inventaire propre (généré automatiquement, même moteur que Module 4/9/14), état physique (Bon/Moyen/Mauvais, comme Module 14), statut (Disponible/Emprunté/Perdu/Retiré). C'est l'exemplaire, jamais l'ouvrage, qui est effectivement emprunté.

### 1.2 Emprunts — périmètre validé (2026-08-07)

Un emprunt (`Loan`) lie un exemplaire disponible à un emprunteur — **étudiant, enseignant ou employé**, comme le "responsable" du Module 14 (plusieurs clés étrangères nullables, un seul renseigné à la fois) — avec une date d'emprunt et une date d'échéance calculée automatiquement (durée par défaut configurable, ex. 14 jours, réglage `LibrarySettings`). Au retour, l'emprunt passe à "Rendu" avec la date effective de retour ; l'exemplaire redevient disponible. Un emprunt non rendu après l'échéance est **visuellement signalé "En retard"** (calculé à l'affichage à partir de la date d'échéance, jamais un statut stocké qui se désynchroniserait) — **sans pénalité financière**, décision explicite du porteur du projet : aucun lien avec le Module 4.3 (Paiements) ni le Module 7 (Comptabilité).

**Limite d'emprunts simultanés** : un nombre maximum configurable d'emprunts en cours par emprunteur (réglage `LibrarySettings.maxSimultaneousLoans`, ex. 3 par défaut) — vérifié à la création d'un nouvel emprunt, empêche de dépasser la limite tant que l'emprunteur n'a pas rendu un exemplaire.

**Pas de réservation en v1** (décision explicite) : un emprunt ne peut se faire que sur un exemplaire actuellement disponible ; pas de file d'attente sur un exemplaire déjà emprunté.

### 1.3 Réforme / perte d'un exemplaire

Même principe que le Module 14 : un exemplaire perdu ou définitivement retiré change de statut avec justification, jamais supprimé physiquement — cohérent avec la règle du projet entier (aucune suppression physique de données métier).

### 1.4 Tableau de bord et recherche

- Liste des ouvrages/exemplaires paginée/triée/recherchée (mêmes composants déjà utilisés partout), filtrable par catégorie/statut.
- Liste des emprunts en cours, filtrable par emprunteur/retard.
- Compteurs simples : nombre d'ouvrages, exemplaires disponibles/empruntés, emprunts en retard.

### 1.5 Documents imprimables

- **Fiche/reçu d'emprunt** — écran imprimable simple (comme pour le Module 14), sans intégration au moteur centralisé du Module 9 en v1, sauf demande explicite.

---

## 2. Conception de la base de données (proposée)

```prisma
enum BookCopyCondition {
  BON
  MOYEN
  MAUVAIS
}

enum BookCopyStatus {
  DISPONIBLE
  EMPRUNTE
  PERDU
  RETIRE
}

enum LoanStatus {
  EN_COURS
  RENDU
  PERDU
}

model BookCategory {
  id       String  @id @default(uuid())
  name     String  @unique
  isActive Boolean @default(true)
  books    Book[]
}

model Book {
  id          String       @id @default(uuid())
  title       String
  author      String?
  categoryId  String
  category    BookCategory @relation(fields: [categoryId], references: [id])
  description String?
  publisher   String?
  publicationYear Int?
  isbn        String?
  copies      BookCopy[]
}

model BookCopy {
  id              String            @id @default(uuid())
  inventoryNumber String            @unique   // généré via le moteur de numérotation existant
  bookId          String
  book            Book              @relation(fields: [bookId], references: [id])
  condition       BookCopyCondition @default(BON)
  status          BookCopyStatus    @default(DISPONIBLE)
  withdrawalReason String?                    // obligatoire si status = PERDU/RETIRE
  loans           Loan[]
}

model Loan {
  id                  String     @id @default(uuid())
  bookCopyId          String
  bookCopy            BookCopy   @relation(fields: [bookCopyId], references: [id])
  borrowerStudentId   String?                  // emprunteur étudiant, optionnel
  borrowerTeacherId   String?                  // emprunteur enseignant, optionnel
  borrowerEmployeeId  String?                  // emprunteur employé, optionnel — un seul des trois renseigné
  loanDate            DateTime   @default(now())
  dueDate             DateTime
  returnedAt          DateTime?
  status              LoanStatus @default(EN_COURS)
  createdBy           String?                  // utilisateur ayant enregistré l'emprunt
}

/// Réglages de la bibliothèque — singleton (une seule ligne par installation), voir MODULE-13 §1.2.
model LibrarySettings {
  id                     String @id @default(uuid())
  defaultLoanDurationDays Int   @default(14)
  maxSimultaneousLoans   Int    @default(3)
}
```

Permissions proposées (même principe que tous les modules précédents) : `BIBLIOTHEQUE:LECTURE`, `BIBLIOTHEQUE:CREATION` (enregistrer un emprunt/retour), `BIBLIOTHEQUE:MODIFICATION` (modifier une fiche ouvrage/exemplaire), `BIBLIOTHEQUE:SUPPRESSION` (retirer/perdre un exemplaire), `BIBLIOTHEQUE:ADMINISTRATION` (gérer les catégories, la durée d'emprunt par défaut).

Un nouveau `NumberingPurpose` (`EXEMPLAIRE_BIBLIOTHEQUE`) serait ajouté à l'énumération existante, pour le numéro d'inventaire des exemplaires.

---

## 3. Décisions (validées le 2026-08-07)

1. **Emprunteurs** : étudiants **et** enseignants/employés — trois clés étrangères nullables sur `Loan`, un seul type renseigné à la fois.
2. **Retards** : **signalement visuel uniquement**, aucune pénalité financière, aucun lien avec le Module 4.3/Module 7.
3. **Réservation** : **absente en v1** — un emprunt ne cible qu'un exemplaire disponible.
4. **Limite d'emprunts simultanés** : **configurable** (`LibrarySettings.maxSimultaneousLoans`, 3 par défaut), vérifiée à la création d'un emprunt.

---

## 4. Hors périmètre (sauf demande explicite contraire)

- Achats/acquisitions d'ouvrages liés à la comptabilité (Module 7) — même logique que le Module 14 : indépendant en v1, sauf demande contraire.
- Codes-barres physiques à scanner — envisageable en extension du numéro d'inventaire si demandé.
- ~~Catalogue numérique / prêt de fichiers électroniques~~ — **demandé explicitement le 2026-08-07, voir §5 ci-dessous.**

---

## 5. Extension — Bibliothèque numérique (2026-08-07, demande explicite)

**Statut** : ✅ **Terminé — validé (2026-08-07)** par le porteur du projet après test manuel réel, incluant l'extension Bibliothèque numérique (catalogue de biens physiques + emprunts, et fichiers PDF/Word classés/partagés par e-mail/WhatsApp). Schéma Prisma + migration (`Book`/`BookCopy`/`Loan`/`LibrarySettings` + `DigitalDocumentCategory`/`DigitalDocument`/`DigitalDocumentShare`), extension de la liste blanche MIME de l'upload (.docx/.doc) et de la passerelle e-mail (pièces jointes réelles, nodemailer), seed (permissions BIBLIOTHEQUE + BIBLIOTHEQUE_NUMERIQUE, catégories de départ), packages/shared, packages/api et apps/desktop livrés. Typecheck (shared/api/desktop) et 154 tests unitaires passent. **Contrainte technique actée** : le partage WhatsApp n'envoie jamais de pièce jointe réelle (pas d'API officielle WhatsApp) — un message pré-rempli s'ouvre, le membre du personnel joint le fichier lui-même dans WhatsApp.

Demande du porteur du projet : une section pour regrouper des fichiers numériques (PDF, Word...), les
classer, et les partager avec un étudiant ou un enseignant précis par e-mail ou WhatsApp. C'est un
concept **différent** de la bibliothèque physique construite en §1-4 (`Book`/`BookCopy`/`Loan` suivent
des exemplaires physiques empruntables) — ici il s'agit de vrais fichiers stockés sur le serveur,
jamais "empruntés" au sens physique : un fichier partagé reste disponible pour tout le monde.

### 5.0 Ce qui existe déjà — à ne pas reconstruire

- **Upload de fichiers PDF** (`packages/api/src/uploads/storage.ts`, `saveDocumentFile()`) — déjà
  utilisé pour les documents étudiants (Module 4). Accepte déjà PDF/PNG/JPEG/WebP via la route REST
  `POST /uploads/documents` (dédiée, hors tRPC — ADR-012, tRPC ne gère que le JSON). **Le format Word
  (.docx) n'est pas encore accepté** — extension mineure de la liste blanche MIME, pas une
  reconstruction.
- **Passerelle e-mail** (Module 12, `emailAdapter.ts`, `nodemailer`) — envoie déjà des e-mails, mais
  seulement `{to, content}` (texte), sans pièce jointe câblée aujourd'hui. `nodemailer` supporte
  nativement les pièces jointes (`attachments`) — extension mineure, pas une reconstruction.
- **Passerelle WhatsApp** (Module 12, `whatsAppLink.ts`) — **point d'architecture bloquant à
  connaître avant de valider quoi que ce soit** : ce n'est *jamais* un envoi automatique. Le code
  génère un lien `wa.me/<numéro>?text=<message pré-rempli>` qu'un membre du personnel doit ouvrir puis
  cliquer "Envoyer" lui-même dans WhatsApp — c'est une contrainte volontaire (pas d'API WhatsApp
  officielle disponible ; l'automatiser violerait les CGU WhatsApp, voir MODULE-12 §3 règle 7).
  **Conséquence directe : WhatsApp ne peut jamais transmettre une vraie pièce jointe fichier depuis
  l'application.** Seul un **lien vers le fichier** (hébergé sur le serveur, cliquable) peut être
  glissé dans le texte pré-rempli — la personne qui reçoit clique le lien pour télécharger le fichier
  depuis un navigateur. Ce n'est pas un défaut d'implémentation à corriger : c'est une limite du canal
  WhatsApp lui-même dans ce projet, déjà actée pour toutes les autres communications (Module 12).
- **Carnet d'adresses transverse** (Module 12) — les étudiants/enseignants/employés ont déjà un e-mail
  et un téléphone enregistrés, réutilisables directement pour cibler un destinataire de partage, sans
  ressaisie.
- **Aucun étudiant/enseignant ne se connecte à cette application** (ADR-005 : application desktop
  interne au personnel, aucun portail externe). "Partager avec un étudiant" signifie donc concrètement
  : un membre du personnel envoie un e-mail (avec pièce jointe réelle) ou déclenche un message WhatsApp
  pré-rempli (avec un lien de téléchargement) vers le contact déjà enregistré de cet étudiant — jamais
  un accès en libre-service de l'étudiant à l'application elle-même.

### 5.1 Registre de documents numériques (proposition)

- **Fiche document** : titre, catégorie (référentiel configurable — réutiliser les catégories
  d'ouvrages existantes `BookCategory`, ou un référentiel séparé dédié aux documents numériques, à
  trancher §5.3), fichier (PDF ou Word), taille, date d'ajout, ajouté par.
- **Classification** : même principe que partout dans le projet — un référentiel configurable, aucune
  catégorie codée en dur.
- **Recherche/liste** : paginée/triée/recherchée par titre/catégorie, comme tous les modules.

### 5.2 Partage par e-mail / WhatsApp (proposition)

- Depuis la fiche d'un document, un bouton "Partager" ouvre un choix de destinataire (étudiant,
  enseignant, ou employé — recherche dans le carnet d'adresses existant) et de canal :
  - **E-mail** : envoi réel avec le fichier en pièce jointe (nécessite l'extension mineure de
    `emailAdapter.ts` décrite en §5.0).
  - **WhatsApp** : ouvre le lien `wa.me` pré-rempli avec un message contenant un lien de
    téléchargement vers le fichier — jamais une pièce jointe réelle (limite du canal, §5.0).
- **Historique de partage** : chaque partage (document, destinataire, canal, date, par qui) est tracé
  — cohérent avec le journal d'audit déjà systématique du projet, utile pour savoir qui a reçu quoi.

### 5.3 Décisions (validées le 2026-08-07)

1. **Limite WhatsApp** : confirmée — lien de téléchargement dans le message pré-rempli, jamais de
   pièce jointe réelle (seule option techniquement possible sans API officielle WhatsApp).
2. **Formats acceptés** : **PDF et Word (.docx/.doc) uniquement** — correspond exactement à la demande
   initiale ("format Word ou PDF").
3. **Classification** : **référentiel séparé** (`DigitalDocumentCategory`), distinct des catégories
   d'ouvrages physiques (`BookCategory`) — ex. "Support de cours", "Circulaire", "Formulaire".
4. **Accès** : **simple** — une permission `LECTURE` suffit pour tout le personnel autorisé, aucune
   distinction public/restreint en v1.

---

## 6. Conception de la base de données — Bibliothèque numérique (proposée)

```prisma
enum DigitalDocumentFormat {
  PDF
  DOCX
}

/// Référentiel configurable de catégories de documents numériques — distinct de `BookCategory`
/// (ouvrages physiques), voir MODULE-13 §5.3.
model DigitalDocumentCategory {
  id        String   @id @default(uuid())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  documents DigitalDocument[]
}

/// Fichier numérique stocké (PDF/Word) — voir MODULE-13 §5.1. Jamais "emprunté" : reste disponible
/// pour tout le monde après consultation/partage, à la différence de `BookCopy`.
model DigitalDocument {
  id          String                @id @default(uuid())
  title       String
  categoryId  String
  category    DigitalDocumentCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  filePath    String                             // stockage via saveDocumentFile() existant (Module 2)
  fileFormat  DigitalDocumentFormat
  fileSizeBytes Int
  description String?
  uploadedBy  String?
  createdAt   DateTime              @default(now())

  shares DigitalDocumentShare[]
}

enum DigitalDocumentShareChannel {
  EMAIL
  WHATSAPP
}

/// Historique de partage — voir MODULE-13 §5.2. Destinataire étudiant/enseignant/employé (un seul des
/// trois renseigné), même convention que `Loan.borrowerXxxId`.
model DigitalDocumentShare {
  id                  String                      @id @default(uuid())
  documentId          String
  document            DigitalDocument             @relation(fields: [documentId], references: [id], onDelete: Cascade)
  recipientStudentId  String?
  recipientTeacherId  String?
  recipientEmployeeId String?
  channel             DigitalDocumentShareChannel
  sharedBy            String?
  sharedAt            DateTime                    @default(now())
}
```

Permissions proposées : `BIBLIOTHEQUE_NUMERIQUE:LECTURE` (consulter/télécharger), `BIBLIOTHEQUE_NUMERIQUE:CREATION` (ajouter un document, le partager), `BIBLIOTHEQUE_NUMERIQUE:SUPPRESSION` (retirer un document), `BIBLIOTHEQUE_NUMERIQUE:ADMINISTRATION` (gérer les catégories).
