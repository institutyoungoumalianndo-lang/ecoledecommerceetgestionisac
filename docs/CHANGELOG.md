# ISAC ERP — Changelog

**Document compagnon de** [`ARCHITECTURE_MASTER.md`](ARCHITECTURE_MASTER.md), [`ROADMAP.md`](ROADMAP.md) **et** [`DECISIONS.md`](DECISIONS.md).

Historique des changements **livrés et validés**, module par module, dans l'ordre chronologique inverse (le plus récent en haut). Format inspiré de [Keep a Changelog](https://keepachangelog.com/) : chaque entrée correspond à un module validé (étape 7 de la méthodologie), pas à un commit individuel.

Différence avec les autres documents :
- `ROADMAP.md` dit **où en est** chaque module (statut, dépendances) — vue du présent/futur.
- `DECISIONS.md` dit **pourquoi** une décision technique a été prise — un choix, avec alternatives.
- `ARCHITECTURE_MASTER.md` dit **ce qui est vrai maintenant** (architecture, conventions) — un instantané.
- **Ce fichier** dit **ce qui a été livré et quand** — un historique, jamais réécrit rétroactivement.

---

## [Module 13] — Bibliothèque (physique + numérique) — Terminé, validé — 2026-08-07

Test manuel réel effectué par le porteur du projet le jour même — module validé, y compris
l'extension Bibliothèque numérique demandée en cours de test.

Périmètre bibliothèque physique validé le 2026-08-07 (voir `docs/modules/MODULE-13-bibliotheque.md`) :
emprunteurs étudiants **et** enseignants/employés, aucune pénalité financière sur les retards
(signalement visuel uniquement), pas de réservation en v1, limite d'emprunts simultanés configurable
par emprunteur.

- **Schéma Prisma** — `BookCategory`, `Book`, `BookCopy`, `Loan`, `LibrarySettings` (+ enums
  `BookCopyCondition`/`BookCopyStatus`/`LoanStatus`), nouveau `NumberingPurpose.EXEMPLAIRE_BIBLIOTHEQUE`.
- **`loanService.ts`** — emprunt avec vérification de disponibilité de l'exemplaire et de la limite
  configurable d'emprunts simultanés (comptage transactionnel), retour qui libère l'exemplaire ; le
  retard n'est jamais stocké, toujours recalculé à l'affichage depuis `dueDate`.
- **apps/desktop** — nouvel onglet "Bibliothèque" (Ouvrages/Emprunts/Catégories/Réglages), fiche
  d'ouvrage avec gestion des exemplaires (ajout, retrait/perte à justification obligatoire, jamais de
  suppression physique).

Extension **Bibliothèque numérique** demandée par le porteur du projet en cours de test manuel
(2026-08-07) — voir `docs/modules/MODULE-13-bibliotheque.md` §5-6 : coffre de fichiers PDF/Word
classés par catégorie, partageables avec un étudiant/enseignant/employé déjà enregistré par e-mail ou
WhatsApp.

- **Contrainte technique actée** : le canal WhatsApp de l'application n'a jamais d'API officielle
  (voir `whatsAppLink.ts`, Module 12) — aucune pièce jointe automatique n'est possible. Le partage
  WhatsApp ouvre un message pré-rempli qu'un membre du personnel doit envoyer lui-même, en joignant le
  fichier manuellement (déjà disponible localement). Le partage par e-mail, lui, envoie une pièce
  jointe réelle — extension mineure de `emailAdapter.ts`/`ChannelSendInput` (champ `attachments`
  optionnel, `nodemailer` la supporte nativement), sans toucher au comportement des 81 appels
  existants du Module 12.
- **Schéma Prisma** — `DigitalDocumentCategory`, `DigitalDocument`, `DigitalDocumentShare` (historique
  de partage, destinataire étudiant/enseignant/employé — même convention à 3 FK nullables que `Loan`).
- Liste blanche MIME de `POST /uploads/documents` étendue à `.docx`/`.doc` (le stockage brut
  `saveDocumentFile()` du Module 2 acceptait déjà n'importe quel type, seule la validation manquait).
- **apps/desktop** — onglets "Documents numériques" et "Catégories numériques" dans le module
  Bibliothèque : ajout de document, partage (choix destinataire + canal), historique de partage.
- 4 tests unitaires supplémentaires (résolution du destinataire de partage), 154 tests au total,
  lint/typecheck/build tous verts, vérification de bout en bout contre PostgreSQL réel.

---

## [Module 14] — Inventaire — Terminé, validé — 2026-08-07

Test manuel réel effectué par le porteur du projet le jour même ("ÇA FONCTIONNE") — module validé.

Périmètre validé le 2026-08-06 (voir `docs/modules/MODULE-14-inventaire.md`) : registre de biens avec
suivi de maintenance/réparations (historique + coûts) dès la v1, module volontairement indépendant de
la comptabilité (aucun lien avec `Expense`/`Supplier` du Module 7), référentiel de lieux dédié
(bâtiment/étage/désignation, distinct des `Room` du Module 5.2 réservées à l'emploi du temps),
responsable d'un bien limité à un employé ou un enseignant déjà enregistré (Modules 5/8).

- **Schéma Prisma** — `AssetLocation`, `AssetCategory`, `Asset`, `AssetMovement`, `AssetMaintenance`
  (+ enums `AssetCondition`/`AssetStatus`/`AssetMaintenanceStatus`), nouveau `NumberingPurpose.BIEN_INVENTAIRE`
  réutilisant le moteur de numérotation générique existant (gabarit `INV-{COMPTEUR}-{AA}`).
- **`assetService.ts`** — création avec numéro d'inventaire généré atomiquement, mise à jour qui trace
  automatiquement tout changement de localisation/responsable/état dans `AssetMovement` (comparaison
  avant/après en transaction), réforme/mise au rebut à justification obligatoire (jamais de suppression
  physique, même principe que l'annulation de paiement du Module 4.3). Résolution du nom du responsable
  reprend le pattern déjà établi par `documentEngineService.ts` : un employé lié à un enseignant payé
  (`Employee.teacherId`) affiche l'identité de l'enseignant, jamais une copie.
- **apps/desktop** — nouvel onglet "Inventaire" (menu latéral) avec 3 sous-écrans (Biens/Catégories/Lieux),
  fiche de bien avec formulaire d'édition, historique des mouvements, historique de maintenance
  (ajout/modification d'interventions avec coûts), dialogue de réforme à confirmation explicite.
- 9 tests unitaires supplémentaires (résolution du lieu/responsable, garde-fou un-seul-responsable),
  145 tests au total, lint/typecheck/build tous verts, vérification de bout en bout contre PostgreSQL réel.

---

## [Module 11] — Sauvegarde, Sécurité avancée, Audit — Terminé, validé — 2026-08-06

Test manuel réel effectué par le porteur du projet le jour même (sauvegarde manuelle, réglages de
sécurité, activation de la 2FA avec QR code et codes de récupération, connexion avec code à 6
chiffres) — module validé.

Périmètre validé le 2026-08-06 (voir `docs/modules/MODULE-11-sauvegarde-securite.md`) : demande
explicite du porteur du projet — 2FA par application TOTP + politique de mot de passe renforcée,
sans restriction IP (accès multi-campus et à distance à préserver). L'écran "Sauvegarde des
paramètres" existant (Module 2, export/import de configuration) est resté inchangé — ce module
ajoute une sauvegarde/restauration réelle et complète de la base de données, absente jusqu'ici.

- **Schéma Prisma** — `DatabaseBackup`/`BackupSettings` (+ enums `BackupTriggerType`/`BackupStatus`),
  `TwoFactorBackupCode`, et extension de `User` (`totpSecret`/`totpEnabled`) et `SecuritySettings`
  (4 champs de politique de mot de passe).
- **`backupService.ts`** — sauvegarde/restauration réelles via `pg_dump`/`pg_restore` en ligne de
  commande (jamais de réimplémentation table par table), planification quotidienne configurable,
  rotation par rétention, restauration à double confirmation (phrase exacte "RESTAURER") réservée au
  Super Administrateur. Détection automatique du dossier d'installation PostgreSQL sur Windows quand
  `pg_dump`/`pg_restore` ne sont pas sur le `PATH`, et retrait du paramètre `?schema=public` de
  `DATABASE_URL` (convention Prisma non comprise par ces outils) — deux anomalies réelles détectées et
  corrigées pendant le test manuel du porteur du projet.
- **`twoFactorService.ts`** — activation TOTP en deux temps (secret généré puis confirmé par un
  premier code, pour éviter qu'un utilisateur se verrouille en scannant mal le QR code), QR code
  généré côté serveur (réutilise `qrcode`, déjà une dépendance du moteur de documents, évite une
  dépendance client), 8 codes de récupération à usage unique (hachés comme un mot de passe).
  Connexion en deux étapes quand la 2FA est active (`authService.login()` retourne un statut
  `TWO_FACTOR_REQUIRED` avec un jeton de défi en mémoire, 5 minutes, 5 tentatives max).
- **`validatePasswordAgainstPolicy()`** — la politique de mot de passe (longueur, majuscule, chiffre,
  symbole) devient réellement configurable et appliquée côté serveur à la création/réinitialisation
  d'utilisateur, remplaçant le schéma Zod statique qui ne sert plus que d'indication côté client.
- **apps/desktop** — écrans "Sauvegarde de la base de données" et "Sécurité" (Paramètres → Système),
  dialogue d'activation/désactivation de la 2FA en libre-service accessible depuis la barre du haut,
  étape de saisie du code à la connexion, réinitialisation de la 2FA d'un utilisateur par un
  Super Administrateur (écran Utilisateurs).
- 6 tests unitaires supplémentaires (défi 2FA — expiration, limite de tentatives), 136 tests au
  total, lint/typecheck/build tous verts, vérification de bout en bout contre PostgreSQL réel.

---

## [Module 10] — Tableau de bord & Rapports décisionnels — Terminé, validé — 2026-08-06

Test manuel réel effectué par le porteur du projet le jour même ("OUI TOUT MARCHE BIEN") — module validé.

Périmètre validé le 2026-08-06 (voir `docs/modules/MODULE-10-tableau-de-bord.md`) : ne duplique pas le
tableau de bord d'accueil ni les tableaux de bord par module déjà livrés — se concentre sur ce qui
manquait réellement.

- **Schéma Prisma** — `AlertRule`/`AlertEvent` (+ enum `AlertComparator`), seul concept réellement
  nouveau du module : les rapports eux-mêmes restent des requêtes à la demande sur les tables
  existantes (Modules 4.2/4.3/6/7/8), jamais de donnée dupliquée.
- **`pedagogicalPerformanceService.ts`** — rapport de performance pédagogique (taux de réussite, seul
  KPI décisionnel hérité de l'ancien système), réutilise `calculerMoyennePeriodeEtudiant`/
  `calculerMoyenneAnnuelleEtudiant` (Module 6, `noteService.ts`), jamais recalculé indépendamment.
- **`financialTrendsService.ts`** — tendances recettes/dépenses/masse salariale sur période
  configurable (l'existant était figé sur "aujourd'hui"/"ce mois"), réutilise `sumLinesByAccountType`
  (Module 7, exportée pour l'occasion) et la même somme `payrollLine.netSalary` que
  `payrollDashboardService.ts` (Module 8). Taux de recouvrement des frais et coût par étudiant via un
  nouvel helper partagé `getAllActiveStudentFeeSummaries` (`feeSummaryService.ts`).
- **`alertEngineService.ts`** — moteur d'alertes configurables (concept absent du système jusqu'ici) :
  boucle de vérification périodique (même principe que `communicationScheduler.ts`, Module 12),
  publie dans le centre de notifications interne déjà construit (`internalNotificationService.ts`) —
  pas de SMS/E-mail en v1 (décision du porteur du projet). 4 règles d'alerte seedées à titre d'exemple
  (trésorerie basse, impayés en retard, occupation de classe dépassée, masse salariale élevée),
  toutes modifiables/désactivables sans coder.
- **`ChartCard` extrait vers `packages/ui`** (depuis `HomeDashboardScreen.tsx`) — réutilisé par le
  nouvel écran de rapports au lieu d'être redéfini ; `recharts` ajouté aux dépendances de `packages/ui`.
- **Écrans desktop** — `DecisionalReportsScreen.tsx` (rapport pédagogique + tendances financières,
  écran imprimable `window.print()`, pas de document PDF archivé — décision du porteur du projet) et
  `AlertRulesScreen.tsx` (CRUD des règles + historique des déclenchements), regroupés dans un nouvel
  onglet "Pilotage" du menu latéral.
- **Tests** — `alertEngineService.test.ts` (4 tests, les 4 comparateurs) et
  `pedagogicalPerformanceService.test.ts` (3 tests, agrégation/taux de réussite) ; 124 tests passent
  au total sur `packages/api`. Typecheck propre sur les 5 packages concernés (`db`/`shared`/`ui`/
  `api`/`desktop`).

## [Emploi du temps] — Numéro de téléphone de l'enseignant dans chaque case — 2026-08-06

- **`drawSessionCards`** (`emploiDuTemps.ts`) — ajoute `teacher.phonePrimary` (champ déjà existant sur
  `Teacher`, déjà remonté par l'`include: { teacher: true }` des deux requêtes — aucun changement de
  requête nécessaire) sous le nom de l'enseignant dans chaque case, affiché seulement si renseigné.
  Hauteur du bloc de texte recalculée pour rester centrée avec cette 3e (ou 4e, avec la salle) ligne.
- Le nom de la salle était déjà affiché quand un `Room` est associé au créneau (`m.room.label`) — pas de
  changement nécessaire ; il n'apparaît simplement pas pour les créneaux sans salle assignée.

## [Emploi du temps] — En-tête bespoke reproduisant le gabarit papier réel — 2026-08-06

Le porteur du projet a transmis une photo d'un emploi du temps déjà utilisé par l'établissement, avec
demande explicite de reproduction à l'identique ("avec les couleurs et tout"). Ce document a un langage
visuel radicalement différent du reste du moteur PDF (bandeaux pleine couleur plutôt que texte simple
sur fond blanc) — pour ne pas affecter les ~20 autres types de documents qui partagent
`renderInstitutionalHeader`/`renderDocumentTitle`, EMPLOI_DU_TEMPS dessine désormais entièrement son
propre en-tête, en bespoke, dans `emploiDuTemps.ts` :

- **`documentEngineService.ts`** — `renderInstitutionalHeader` et `renderDocumentTitle` sont désormais
  sautés pour `EMPLOI_DU_TEMPS` (nouvelle condition, même pattern que les exclusions signature/QR déjà
  en place pour ce type).
- **`drawInstitutionalBanner`** (nouveau) — bandeau plein bord bleu marine (`#132347`) avec
  République/devise tricolore/Ministère/Institut en texte blanc, puis séparateur doré (`#c8a13a`).
  Réutilise les textes déjà configurés dans `ctx.header` (jamais codés en dur) — seule la mise en forme
  (fond coloré, texte forcé en blanc) est bespoke.
- **`drawTitleBanner`** (nouveau) — bandeau plein bord bleu (`#3a72ad`), "EMPLOI DU TEMPS" en blanc gras
  italique.
- **`drawMetaPanel`/`drawMetaRow`** (nouveau, remplace `drawMetaLine` — supprimée, plus utilisée) — logo
  établissement à gauche et logo ministère/secondaire/campus à droite (découpés en cercle via
  `doc.clip()`), deux colonnes Filière/Niveau/Module et Campus/Année universitaire, libellés rouges
  soulignés. Pas de champ "Département" : n'existe pas dans le modèle `Filiere` actuel (pas de catégorie
  parente) — non ajouté pour éviter une fausse donnée.
  **Correctif** (même jour) : le logo droit ne lisait au départ que `logoSecondaryPath`/`campus.logoPath`,
  jamais `establishment.ministryLogoPath` — le champ que le moteur partagé utilise pourtant pour ce même
  logo sur tous les autres documents. Le porteur du projet a signalé l'absence du logo du ministère ;
  corrigé en faisant passer `ministryLogoPath` en priorité.
- **Grille** — colonne HEURES en rouge plein (`#c0392b`) avec liseré doré, bandeau des jours en bleu
  plein, texte blanc gras italique (`Helvetica-BoldOblique`, seule police base-14 idoine — aucune police
  à intégrer). Cases de séance repassées en `Helvetica-Bold` majuscules (au lieu du Times-Bold serif
  choisi plus tôt dans la journée) pour coller à la typographie sans-serif du gabarit réel.

Le document reste entièrement piloté par les données réelles (aucun nom de signataire ni salle
fictifs codés en dur, contrairement à la photo de référence qui avait des noms pré-remplis à la main).

## [Emploi du temps] — Alignement sur la maquette réelle de l'établissement — 2026-08-06

Le porteur du projet a partagé une photo d'un véritable emploi du temps déjà utilisé par l'établissement
(en-tête République de Guinée, cases blanches, trois signataires) et souhaite s'en rapprocher. Trois
changements, tranchés explicitement (voir questions posées) car ils reviennent sur des choix validés
plus tôt dans la même journée :

- **Trois signataires au lieu de deux** (`drawSignatureBlock`, `emploiDuTemps.ts`) — "LE DIRECTEUR DES
  ÉTUDES" / "LE DIRECTEUR DES CAMPUS" / "LE DIRECTEUR GÉNÉRAL", répartis sur 3 colonnes égales. Revient
  sur la réduction à 2 signataires décidée plus tôt (Directeur des Études/Directeur seul).
  `documentEngineService.ts` mis à jour en conséquence (commentaire).
- **Cases blanches, plus de couleur par matière** (`drawSessionCards`) — la palette `SUBJECT_COLORS` et
  la légende associée (`drawLegend`) sont supprimées ; les cases ne gardent qu'un léger zébrage
  structurel des lignes (déjà en place) et un séparateur fin entre deux séances mutualisées dans la
  même case. Revient sur la maquette "Grille colorée par activité" validée en tout début de journée.
  Le nom de l'enseignant reste affiché dans chaque case (confirmé).
- La salle (dans les cases) et les libellés de la ligne de contexte utilisent désormais la même couleur
  bleu institutionnel (`META_LABEL_COLOR`) plutôt que la couleur (désormais supprimée) de la matière.

## [Emploi du temps] — Contenu des cellules recentré + ligne de contexte stylée — 2026-08-06

Deux ajustements demandés après le premier test du design "Grille institutionnelle" validé.

- **`drawSessionCards`** (`emploiDuTemps.ts`) — matière/enseignant/salle sont désormais centrés comme un
  seul bloc au milieu vertical de la carte (hauteur du bloc calculée puis point de départ
  `y + (innerHeight - contentHeight) / 2`), au lieu d'être calés en haut avec des décalages fixes qui
  paraissaient décentrés dès qu'une carte n'avait pas de salle.
- **`drawMetaLine`** (nouvelle fonction, remplace le texte brut Filière/Niveau/Module/Année) — les
  libellés ("Filière", "Niveau", "Module", "Année universitaire") sont en gras bleu institutionnel
  (`#1f4e8c`, dans la famille du premier accent de `SUBJECT_COLORS`), les valeurs en texte normal, et
  les quatre items sont répartis d'un bord à l'autre de la page (le premier collé à gauche, le dernier à
  droite, l'espace restant distribué entre eux) au lieu d'être séparés par des espaces fixes.

## [Emploi du temps] — Design "Grille institutionnelle" validé — 2026-08-06

Après une comparaison de trois structures de page proposées (`emploi_du_temps_propositions_v2.html` :
A "Grille institutionnelle", B "Vue agenda proportionnelle", C "Tableau d'affichage"), le porteur du
projet a validé la **A**.

- **Titre du document en Times-Bold** (`documentEngineService.ts`, `renderDocumentTitle`) — EMPLOI_DU_TEMPS
  rejoint ATTESTATION_INSCRIPTION dans les documents à titre serif, pour un rendu plus institutionnel.
- **Noms de jour et noms de matière en Times-Bold** (`emploiDuTemps.ts`, `drawGridMode`/`drawSessionCards`)
  — même logique, cohérence avec le titre.
- **Lignes alternées (zébrage)** entre créneaux horaires successifs — repère visuel supplémentaire sur une
  grille dense, sans dépendre uniquement des bordures fines.

## [Emploi du temps] — Grille : jours vides masqués + polices agrandies et centrées — 2026-08-06

Retour du porteur du projet après un premier test de la grille paysage : les jours sans cours pour la
sélection occupaient de la place pour rien, et le texte des cartes de séance était trop petit.

- **`drawGridMode`** (`emploiDuTemps.ts`) — calcule désormais `activeDays` (sous-ensemble de
  `GRID_DAYS` réellement présent dans les créneaux trouvés) et l'utilise à la place de la liste fixe des
  6 jours ouvrés pour construire les colonnes. Moins de colonnes = chaque colonne restante est plus
  large, donc plus de place pour le texte.
- Polices agrandies dans toute la grille : en-têtes de colonnes (9→11), en-tête "HEURES" et heures de
  créneau (8.5→10), nom de matière dans la carte (8→9.5), enseignant (7→8.5), salle (6.5→8), légende
  (8→9.5). `headerRowHeight` élargi (22→28) pour accueillir le texte plus grand sans le comprimer.
- Texte des cartes de séance (matière, enseignant, salle) et de l'en-tête recentré horizontalement
  (`align: "center"`) au lieu d'un alignement à gauche.

## [Matières/Affectations] — Ergonomie du parcours d'affectation d'une matière — 2026-08-06

Retour du porteur du projet : le parcours Matières → Affectations était trop éclaté sur deux écrans
séparés, et le rejet d'une affectation en double (`assertNoDuplicateScope`, MODULE-02.1) n'expliquait
pas assez clairement pourquoi. Trois correctifs, sans toucher aux données existantes ni au modèle
(le principe "portée immuable après création, Subject vs SubjectOffering" reste inchangé) :

- **Bouton "Affecter"** directement sur chaque ligne de `SubjectsScreen.tsx` (matières) — ouvre
  `CreateSubjectOfferingDialog` pré-rempli avec la matière choisie (`initialSubjectId`), pour éviter
  d'aller chercher l'écran Affectations pour démarrer.
- **Filtre Semestre** ajouté sur `SubjectOfferingsScreen.tsx` (cascade Année → Semestre, même schéma
  que `CreateSubjectOfferingDialog`) — le schéma Zod `listSubjectOfferingsInputSchema` acceptait déjà
  `periodId`, seul le câblage écran manquait. Permet de vérifier en un coup d'œil ce qui est déjà
  affecté avant de retenter.
- **Message d'erreur explicite** dans `assertNoDuplicateScope` (`subjectOfferingService.ts`) — nomme
  désormais la matière, l'année, le semestre, le niveau et la filière de l'affectation déjà existante,
  et oriente vers la liste des affectations (avec le nouveau filtre Semestre) pour la désactiver si
  besoin avant d'en recréer une.

## [Emploi du temps] — Constructeur par filière/niveau/module + grille imprimable + notification enseignant — 2026-08-06

Nouveau, à la suite de la maquette validée (`emploi_du_temps_propositions.html`, style "Grille colorée
par activité") : un onglet **"Constructeur"** dans le module Emploi du temps (MODULE-05.2) qui relie
les affectations enregistrées (Module 5) au créneau hebdomadaire (jour/heure/salle) qu'elles doivent
recevoir.

- **`checkRecurrenceConflicts`** (`seanceRecurrenceTemplateService.ts`) — même principe que
  `checkSeanceConflicts` (§1.4) mais au niveau des modèles de récurrence actifs plutôt que des séances
  datées : bloque la création/modification d'un créneau si l'enseignant, la salle ou une classe est
  déjà pris ce jour-là sur un horaire chevauchant. Auparavant, `createSeanceRecurrenceTemplate` ne
  faisait aucun contrôle — un vrai manque, maintenant comblé.
- **`scheduleBuilderService.ts`** — pour une combinaison Année × Filière (optionnelle) × Niveau ×
  Module (= Période/Semestre, confirmé équivalent par le porteur du projet), liste les affectations via
  la classe réellement affectée (plus précis que le `filiereId` nullable de la `subject_offering`), avec
  le créneau déjà posé le cas échéant.
- **`emploiDuTemps.ts` (générateur PDF)** — nouveau mode grille (paysage forcé, une carte colorée par
  matière — couleur jamais recyclée en cours de document, jamais par jour/case) en plus du mode liste
  historique (classe/enseignant, conservé). Cadre de signature et QR du moteur partagé désactivés :
  bloc à deux signatures "Le Directeur des Études" / "Le Directeur" dessiné par le générateur, quel que
  soit le mode.
- Écran `ScheduleBuilderScreen.tsx` : filtres Année/Filière/Niveau/Module, liste des affectations avec
  statut du créneau ("À définir" en rouge sinon jour/heure/salle), dialogue de pose du créneau (jamais
  de suppression des classes déjà couvertes par un modèle existant partagé/mutualisé — seuls jour/heure/
  salle sont modifiables depuis ce constructeur), bouton "Générer l'emploi du temps".

**Notification automatique** (Module 12) : nouvel événement `AFFECTATION_ENSEIGNANT_CREEE`, même
mécanisme que `CHANGEMENT_EMPLOI_DU_TEMPS`/`SANCTION_ENREGISTREE` — dès qu'une affectation pédagogique
est créée (Module 5), l'enseignant concerné reçoit un message (SMS/E-mail, configurable dans
Paramètres → Communication). Fire-and-forget, n'échoue jamais bruyamment.

Vérification : migration `20260806180000_emploi_du_temps_notification`, typecheck propre
(`shared`/`api`/`desktop`), 117/117 tests unitaires.

---

## [Personnel] — Contrats de travail (CDD administratif / CDD enseignant / vacation) — 2026-08-06

Nouveau : 3 types de documents Tier 1 dans le moteur PDF centralisé (Module 9), à la suite de la
revue en deux passes des brouillons proposés à l'artefact `contrats_travail_exemples.html`. Point de
départ de la conception (retour du porteur du projet) : l'établissement ne fonctionne **jamais en
CDI**, uniquement en CDD.

- **`CONTRAT_CDD_ADMINISTRATIF`** — personnel de direction/administratif à salaire fixe, durée = une
  année scolaire (dates de début/fin saisies à la génération), renouvelable par accord écrit.
- **`CONTRAT_CDD_ENSEIGNANT`** — enseignant recruté directement pour un module d'enseignement précis
  (intitulé + dates saisis à la génération), **sans période d'essai**, rémunéré au taux horaire
  (modifiable d'un contrat à l'autre), renouvelable module par module.
- **`CONTRAT_VACATION`** — engagement plus léger, sans lien de subordination permanent, durée = une
  année scolaire, volume horaire mensuel prévisionnel + taux horaire.

Clauses communes aux trois : cessation naturelle au terme sans indemnité, rupture anticipée possible
en cas de non-respect des engagements par l'une ou l'autre partie sous réserve d'un **préavis écrit de
15 jours**, et une clause **"Avance sur salaire"** (le remboursement d'une avance est déduit du salaire
selon un échéancier convenu — se relie au module Avances déjà existant). **Réserve explicite,
communiquée au porteur du projet** : ces textes sont une base rédactionnelle, non validée par un
juriste — deux points signalés spécifiquement (absence d'indemnité de fin de CDD ; requalification
possible en cas de renouvellements répétés) doivent être vérifiés avant tout usage réel.

- `packages/db/prisma/schema.prisma` : `DocumentType`/`NumberingPurpose` étendus (3 valeurs chacun) ;
  `CONTRAT_TRAVAIL` (Tier 2, jamais implémenté) retiré côté application — la valeur reste présente,
  orpheline, dans l'enum Postgres existant (Postgres ne permet pas de retirer une valeur d'enum en
  place sans reconstruire le type). `Employee` gagne `birthDate`/`birthPlace`/`nationality`/`idNumber`
  (absents jusqu'ici, aucun document n'en avait besoin) ; `Teacher` gagne `idNumber` (les trois autres
  champs existaient déjà). Migration `20260806120000_contrats_travail`.
- `packages/api/src/services/documents/generators/` : 3 nouveaux générateurs bespoke (style "Sobre
  Contrasté" repris de `ficheEmargementEnseignant.ts`), chacun dessinant son propre bloc "SIGNATURES"
  à deux parties (Employeur/Salarié) — cadre de signature institutionnel et QR code du moteur partagé
  désactivés pour ces trois types (contrat bilatéral, pas de vérification externe par QR).
  `contratCddAdministratif.ts`/`contratCddEnseignant.ts` réutilisent `getEmployeeById`/`getTeacherById`
  (identité déjà résolue) plutôt que d'interroger Prisma directement.
- Génération : onglet "Contrats" sur la fiche enseignant (sélecteur CDD module / Vacation,
  `TeacherContractsTab.tsx`), onglet "Contrat" sur la fiche employé (`EmployeeContractTab.tsx`) —
  mêmes formulaires de fiche employé/enseignant complétés des nouveaux champs d'identité.

Vérification : typecheck propre (`shared`/`api`/`desktop`) + 117/117 tests unitaires. Testé manuellement
par le porteur du projet dans l'application (2026-08-06) — confirmé fonctionnel après les ajustements
de mise en page (cadre d'en-tête, interligne, position du bloc de signature).

### Corrigé — Ligne `document_templates` orpheline après retrait de CONTRAT_TRAVAIL — 2026-08-06

Bug constaté immédiatement après livraison : `prisma.documentTemplate.findMany()` (utilisé par
`brandingService.listDocumentTemplates()`, appelé à chaque génération de document) levait
`Value 'CONTRAT_TRAVAIL' not found in enum 'DocumentType'`. Cause : Postgres ne permet pas de retirer
une valeur d'enum en place — la valeur `CONTRAT_TRAVAIL` restait donc dans l'enum `DocumentType` côté
base, et la ligne `document_templates` créée pour elle par les seeds précédents (avant ce retrait)
restait en base ; le client Prisma régénéré (qui ne connaît plus `CONTRAT_TRAVAIL`, retiré du
`schema.prisma`) plantait en tentant de désérialiser cette ligne. Corrigé en supprimant la ligne
orpheline par SQL brut (`$queryRawUnsafe`/`$executeRawUnsafe`, seul moyen d'atteindre une valeur
d'enum absente du client généré) — vérifié aussi `official_stamp.applicable_document_types` (0
référence) et `generated_documents` (0 ligne, aucun document n'ayant jamais pu être généré avec ce
type Tier 2 jamais implémenté). Aucun changement de code, uniquement une correction de données.

---

## [Paie] — Saisie manuelle des heures travaillées (source MANUEL) — 2026-08-05

Depuis l'abandon du pointage numérique (voir "[Pointage → Émargement]" ci-dessous), le calcul
automatique du salaire des enseignants payés à l'heure (ou en heures supplémentaires) n'avait plus
aucune source d'heures fiable — `calculatePayrollLine` restait entièrement dépendant des anciennes
données `Seance`/`TeacherMonthlyTimesheet`. Ajout d'un pont explicite : un champ éditable
"Heures travaillées" sur le détail d'un bulletin (`PayrollLineDetailDialog.tsx`), pour saisir la
valeur lue à la main sur la fiche d'émargement mensuelle signée.

- `HoursSource` (Prisma + Zod) : nouvelle valeur `MANUEL`, aux côtés de `POINTAGE`/`PLANIFIE`.
- `payrollLineService.ts` : nouvelle fonction `updatePayrollLineHours` (même garde-fous que
  `addPayrollLineComponent` — période modifiable, bulletin non validé) ; `computeBaseSalary` extrait
  de `calculatePayrollLine` pour rester la seule règle de calcul du salaire de base, réutilisée par
  les deux chemins. `calculatePayrollLine` ne réécrit plus les heures d'une ligne déjà marquée
  `MANUEL` — un "Recalculer" ultérieur ne peut plus effacer une saisie manuelle.
- Nouvel endpoint `payrollLines.updateHours` (permission `PAIE_BULLETINS:MODIFICATION`, identique aux
  autres mutations de la ligne).
- Migration `20260805120000_payroll_hours_source_manuel`.

Vérification : typecheck propre (`shared`/`api`/`desktop`) + 117/117 tests unitaires.

### Ajouté — Dévalidation d'un bulletin — 2026-08-06

Cas rencontré : un bulletin déjà validé avec 0 heure / 0 salaire de base (avant la mise en place de la
saisie manuelle ci-dessus) était figé — aucun moyen de le corriger. Ajout de `unvalidatePayrollLine`
(`PayrollLine.status` VALIDEE → CALCULEE, sur une période non clôturée uniquement), bouton "Dévalider"
dans `PayrollLineDetailDialog.tsx` (permission `PAIE_BULLETINS:VALIDATION`, confirmation requise).
Contre-passe l'écriture comptable liée si elle existait. **Limite connue** : ne réajuste pas le statut
des avances sur salaire déjà marquées "déduite" par ce bulletin — `SalaryAdvance` ne conserve aucun lien
vers le bulletin qui les a déduites, donc aucune reprise fiable n'est possible automatiquement ; à
vérifier manuellement dans l'onglet Avances si un montant semble incohérent après dévalidation.

Vérification : typecheck propre + 117/117 tests unitaires.

---

## [Bulletins] — Refonte visuelle "Relevé officiel" + photo de l'étudiant — 2026-08-03

Retour du porteur du projet, après validation de la mention de régularité : le bulletin (période et
annuel) devait "ressembler à un vrai document professionnel", avec la photo de l'étudiant. Trois
maquettes proposées (Fiche institutionnelle / Relevé officiel / Bulletin synthèse) — "Relevé officiel"
retenue : composition centrée façon acte administratif, filets fins, tableau des notes à grille
complète, décision imprimée en cachet incliné.

### Ajouté
- `studentPhotoPath` (`packages/shared/schemas/bulletin.ts`) sur `BulletinPeriodeDto`/`BulletinAnnuelDto`, alimenté depuis `Student.photoPath` (champ déjà existant, aucune migration nécessaire) dans `bulletinPeriodeService.ts`/`bulletinAnnuelService.ts`.
- `decisionLabels.ts` (`apps/desktop/screens/evaluation`) : libellés français de `EnrollmentDecision` (`Admis`/`Redoublant`/`Ajourné`/`Abandon`/`En cours`), déjà utilisés ailleurs (`StudentHistoryTab.tsx`) mais jusqu'ici affichés en code brut sur le bulletin.
- `InstitutionalHeaderPrint.tsx` (nouveau, `apps/desktop/components/print`) : réplique en React l'en-tête institutionnelle obligatoire des documents PDF (République/devise nationale tricolore/nom de l'école/institut/slogan, logo de l'école à gauche, logo(s) République/Ministère/campus/partenaire à droite — voir `renderInstitutionalHeader` dans `pdfEngine.ts`) pour les documents HTML/CSS imprimables. Retour du porteur du projet, 2026-08-03 : le bulletin n'affichait jusqu'ici qu'un logo et le nom de l'établissement, sans le reste de l'en-tête présent sur tous les autres documents officiels. Entièrement piloté par `institutionalHeaderSettings` (déjà existant, aucun nouveau champ) — réutilisable par tout futur document HTML imprimable.

### Modifié
- `BulletinPeriodeView.tsx`/`BulletinAnnuelView.tsx` : nouvelle mise en page — en-tête institutionnelle complète (`InstitutionalHeaderPrint`) au lieu du simple logo+nom, filet double puis titre en petites capitales espacées, photo de l'étudiant (ou silhouette de repli) à côté de l'identité, tableau des notes à grille complète, bloc de résultat (moyenne/rang/mention/régularité) avec la décision imprimée en cachet, signature + cachet institutionnel, pied de page avec n° de dossier et code de vérification. Couleurs exclusivement via les classes `.print-*` existantes (thème piloté depuis Paramètres → Thème d'impression) — aucune couleur codée en dur, cohérent avec tous les autres documents imprimables.

Typecheck/lint propres sur `@isac-erp/shared`/`@isac-erp/api`/`@isac-erp/desktop`. Aucune migration de base de données requise (champs `photoPath`/`institutionalHeaderSettings` déjà existants).

### Étendu — Classement par mérite — 2026-08-03
Même traitement appliqué à `ClassementScreen.tsx` (retour du porteur du projet : "maintenant ce document classement par mérite") — en-tête institutionnelle (`InstitutionalHeaderPrint`, réutilise les réglages du modèle BULLETIN faute de type de document dédié pour ce classement jamais stocké), tableau à grille complète, libellés de décision en français (`DECISION_LABELS`), signature et cachet institutionnel en pied de page.

Retour du porteur du projet (2026-08-03, suite) : colonne "Étudiant" trop étroite (risque de débordement des noms) et espace de signature manquant pour le Directeur des Études et le Directeur.
- Tableau passé en largeurs de colonnes fixes (`<colgroup>`, `table-fixed`) — "Étudiant" élargie à 38 % (contre une largeur auto-calculée trop resserrée par les autres colonnes), les 5 autres colonnes réduites en proportion ; rang 1 à 3 mis en gras.
- Deux signatures désormais réservées (au lieu d'une seule, générique) : "Le Directeur des Études" (nom jamais imprimé, même règle que sur `FICHE_INSCRIPTION_COMPLETEE`) et "Le Directeur" (signataire configuré sous le rôle "Directeur de Campus", nom affiché) — recherchées directement par `roleCode` (`DIRECTEUR_ETUDES`/`DIRECTEUR_CAMPUS`) plutôt que via le signataire unique du modèle BULLETIN.
- Titre et sous-titre agrandis/espacés, séparateurs plus marqués sous l'en-tête et sous la ligne de titres du tableau.

Typecheck/lint `@isac-erp/desktop` propres.

---

## [Étudiants] — Identifiant National (INA) + export canevas national — 2026-08-03

Retour du porteur du projet : besoin d'un champ INA (Identifiant National, distinct du matricule interne) sur la fiche étudiant, filtrable dans la liste, et d'un export Excel dédié au format d'un gabarit externe (INA/Nom/Prénom/Sexe/Date et lieu de naissance/Nom du père/Nom de la mère/Institution/Programme/Région/E-mail — Région toujours "Kindia", Institution et E-mail toujours ceux de l'établissement, confirmé par le porteur du projet).

### Ajouté
- `Student.ina` (`String?`, unique) — champ optionnel (rempli au fur et à mesure), distinct du `matricule` généré automatiquement.
- Colonne "INA" dans le tableau Étudiants (`StudentsListScreen.tsx`) et champ de saisie dans "Identité" (création et fiche étudiant) — recherche/filtre déjà en place étendue pour matcher aussi l'INA.
- Nouveau bouton "Exporter (canevas INA)" — `students.listForInaExport` (`packages/api`), résout Nom du père/de la mère via `GuardianRelationship.PERE`/`MERE` et la filière via l'inscription la plus récente ; Institution/Région/E-mail ajoutés côté écran comme valeurs par défaut (pas des colonnes par étudiant), respecte les mêmes filtres que la liste (filière/niveau/classe/année/recherche).
- INA ajouté à l'identification de `FICHE_INSCRIPTION_COMPLETEE` (juste après le matricule) — présent à la fois sur la fiche étudiant et sur le document imprimé, comme demandé.

Typecheck/lint propres sur `@isac-erp/shared`/`@isac-erp/api`/`@isac-erp/desktop`, 117 tests API toujours au vert. Migration `20260803180000_student_ina` appliquée, client Prisma régénéré. Aucune nouvelle permission (réutilise `ETUDIANTS:EXPORT`).

### Corrigé — Programme distinct de la Filière — 2026-08-03
Retour du porteur du projet : "PROGRAMME" (utilisé plus haut comme la filière de l'étudiant) et "Filière" sont deux notions distinctes — le programme est le type de diplôme préparé (5 valeurs fixes : DQP/CAP/BEP/BT/BTS), indépendant du domaine d'étude.
- `Student.programme` (`ProgrammeType?`, nouvel enum Prisma) — combo box dans "Identité" (création et fiche étudiant), et ajouté à la section SCOLARITÉ de `FICHE_INSCRIPTION_COMPLETEE` (juste après Filière).
- Canevas INA corrigé : la colonne PROGRAMME utilise désormais `Student.programme` (et non plus la filière par erreur) ; nouvelle colonne FILIERE ajoutée séparément.
- Migration `20260803190000_student_programme` appliquée.

### Corrigé — QR code masquant la zone de signature de l'étudiant — 2026-08-03
Signalé par le porteur du projet (capture d'écran) : sur `FICHE_INSCRIPTION_COMPLETEE`, le QR code (toujours placé en bas à gauche de la page par `renderQrCode`, voir `pdfEngine.ts`) chevauchait la première cellule ("L'étudiant(e)") de la rangée de signatures propre à ce document, sur un contenu assez court pour que les deux atterrissent dans la même bande verticale. Corrigé en réservant l'angle bas-gauche (largeur du QR + marge, ~95pt) : toute la rangée de signatures est décalée vers la droite, bord droit inchangé.

---

## [Pointage → Émargement] — Abandon du suivi numérique, fiche mensuelle papier — 2026-08-03

Retour du porteur du projet, sur capture d'écran d'une fiche papier déjà en usage à l'établissement : le volet "Pointage" numérique (Module 5.1/5.2 — planning de séances, validation, grille cochable) n'était pas compris/adopté. Décision explicite du porteur du projet : abandonner ce suivi numérique et le remplacer par la génération d'une "Fiche d'émargement mensuelle des enseignants" — document à remplir et signer à la main chaque mois, pour tout enseignant actif.

### Retiré (de la navigation uniquement — rien supprimé en base)
- Section "Emploi du temps" du menu principal (`SeancesScreen.tsx`, `CreateSeanceDialog.tsx`, `SeanceRecurrenceTemplatesScreen.tsx`) — délié de `AppShell.tsx`.
- Onglets "Pointage des enseignants" et "Contrôle avant paie" du module Paie (`PointageScreen.tsx`, `PayrollControlSummaryScreen.tsx`) — déliés de `PayrollModuleScreen.tsx` (la génération de paie elle-même, `PayPeriodsScreen.tsx`, ne dépendait déjà d'aucune donnée de séance — aucun impact).
- Onglet "Pointage" de la fiche enseignant (`TeacherPointageTab.tsx`) — remplacé par un nouvel onglet "Émargement".
- Les fichiers `.tsx` eux-mêmes ne sont pas supprimés (pas de contrôle de version sur ce projet — suppression non réversible), ni les tables Prisma sous-jacentes (séances, feuilles de temps) : simplement retirés de tout point d'entrée de navigation.

### Ajouté
- Nouveau type de document Tier 1 `FICHE_EMARGEMENT_ENSEIGNANT` (distinct de `FICHE_EMARGEMENT`, l'émargement étudiants d'une séance, resté inchangé) — `ficheEmargementEnseignant.ts` : formulaire à remplir à la main, style "Sobre Contrasté" identique à `ficheInscription.ts` (noir pur), cadre de signature et QR code du moteur partagé désactivés (bloc VALIDATION propre : Enseignant/Chef de département/Direction des Études — le nom de l'enseignant est le seul pré-rempli, comme pour l'étudiant sur `FICHE_INSCRIPTION_COMPLETEE`).
- Champs choisis à la génération (pas liés à une entité stockée) : enseignant, année scolaire, mois, matière (facultative), volume horaire prévu — **validé entre 12 et 15 heures**. Le document imprimé reprend ces informations dans son en-tête (mois/nom enseignant/matière/volume horaire), ainsi que le nom du campus et l'année scolaire ; Filière/Niveau/Classe restent à compléter à la main (non demandées à la génération).
- `TeacherEmargementTab.tsx` (nouvel onglet "Émargement" de la fiche enseignant) : formulaire de génération individuelle + historique des fiches déjà générées pour cet enseignant, même principe que `FicheInscriptionTab.tsx`.
- `BulkEmargementScreen.tsx` (nouvel onglet "Émargement (mensuel)" du module Enseignants) : génère la fiche du mois pour **tous les enseignants actifs** en une seule action (matière laissée vide sur chaque fiche, différente par enseignant — à compléter à la main), avec suivi de progression et récapitulatif des échecs éventuels.

Typecheck/lint propres sur `@isac-erp/shared`/`@isac-erp/api`/`@isac-erp/desktop`, 117 tests API toujours au vert. Migration `20260803200000_fiche_emargement_enseignant` appliquée (nouvelles valeurs d'enum `DocumentType`/`NumberingPurpose`), client Prisma régénéré, seed relancé (42 modèles de documents, 22 séries de numérotation). Aucune nouvelle permission (réutilise `DOCUMENTS:LECTURE`/`DOCUMENTS:CREATION`).

### Corrigé — Nombre d'interventions prévues dépendant du volume horaire — 2026-08-03
Retour du porteur du projet, après premier essai réel du document : le "Nombre d'interventions prévues" (et le nombre de lignes du tableau d'émargement) était fixé à 5 quel que soit le volume horaire choisi. Une séance dure 3 heures (12h → 4 séances, 15h → 5 séances) — désormais calculé (`Math.round(volumeHorairePrevu / 3)`) plutôt que codé en dur, dans `ficheEmargementEnseignant.ts`. Typecheck/lint/117 tests API toujours au vert.

---

## [Sessionnaires] — Nouveau module (sessions de rattrapage) — 2026-08-03

Retour du porteur du projet : besoin d'identifier, par niveau/filière/année universitaire, les étudiants n'ayant pas obtenu la moyenne dans une ou plusieurs matières ("sessionnaires"), avec une liste imprimable énumérant les matières concernées, les étudiants en échec dans chacune, et la date/heure/salle de la session de rattrapage. Deux points validés par le porteur du projet avant développement : seuil de passage par matière fixé à 10/20 (non configurable) et planification (date/heure/salle) saisie via un écran dédié.

### Ajouté
- Nouveau modèle Prisma `RattrapageSession` (table `rattrapage_sessions`) — planification uniquement (date/heure/salle, liée à `Filiere`/`Level`/`AcademicYear`/`Subject`/`Room`), une session par combinaison (filière, niveau, année, matière). La liste des étudiants en échec elle-même n'est **jamais stockée** : recalculée à la demande depuis les notes, exactement comme le classement par mérite (`classementService.ts`).
- `rattrapageService.ts` (`packages/api`) : `getEchecsRattrapage` — reprend le périmètre étudiants du classement (classes de la filière/niveau/année), calcule pour chaque matière la moyenne annuelle de chaque étudiant (réutilise `calculerMoyenneAnnuelle` du Module 6) et retient ceux sous 10/20, avec la session déjà programmée le cas échéant. `upsertRattrapageSession`/`deleteRattrapageSession` pour la planification.
- `routers/rattrapageSessions.ts` : `getEchecs`/`upsertSession`/`deleteSession`, permissions `SESSIONNAIRES:LECTURE`/`SESSIONNAIRES:CREATION`/`SESSIONNAIRES:SUPPRESSION`.
- `SessionnairesScreen.tsx` (nouvel onglet du module Évaluation, entre "Classement" et "Feuille de saisie") : sélection filière/niveau/année, une carte par matière en échec avec la liste des étudiants concernés et un formulaire (date/heure début/heure fin/salle — `Room` existant du Module 5.2) pour programmer ou modifier sa session ; liste imprimable en dessous, même traitement "Relevé officiel" que le bulletin et le classement (`InstitutionalHeaderPrint`, tableau à grille, signatures Directeur des Études/Directeur, cachet).

Typecheck/lint propres sur `@isac-erp/shared`/`@isac-erp/api`/`@isac-erp/desktop`, 117 tests API toujours au vert (pas de nouvelle logique pure isolable — `getEchecsRattrapage` réutilise des fonctions déjà testées). Client Prisma régénéré, migration `20260803160000_rattrapage_sessions` appliquée, seed relancé (214 permissions).

---

## [Présences] — Nouveau module (absences uniquement) — 2026-08-03

Retour du porteur du projet : contrairement à un système de pointage quotidien (calendrier coché case par case pour chaque étudiant chaque jour), le besoin réel est plus simple — l'étudiant est présumé présent par défaut, et l'onglet "Présences" ne sert qu'à enregistrer une absence ponctuelle (date + motif + justifiée ou non) quand elle survient. Le bulletin doit ensuite porter une mention "Régulier"/"Irrégulier" selon le nombre d'absences non justifiées. Seuil précisé par le porteur du projet : 5 absences non justifiées.

### Ajouté
- Nouveau modèle Prisma `StudentAbsence` (table `student_absences`) — `studentId`/`date`/`motif`/`justifiee` (booléen, défaut `false`)/`createdBy`, lié à `Student` (`onDelete: Cascade`) et à `User` (`createdBy`, relation `StudentAbsenceCreatedBy`). Pas de pointage positif : seules les absences sont enregistrées.
- Nouveau champ configurable `EvaluationSettings.seuilAbsencesIrregulier` (`Int`, défaut `5`) — au-delà de ce nombre d'absences non justifiées sur la période (semestre) ou l'année, la mention "Irrégulier" remplace "Régulier". Réglable depuis Paramètres → Évaluation, nouvelle section "Régularité".
- Nouveau champ `regularite` (`String`, comme `mention`, pas d'enum) sur `BulletinPeriode` et `BulletinAnnuel` — calculé une seule fois à la génération du bulletin (`countUnjustifiedAbsences` sur la plage de la période/année), jamais recalculé dynamiquement. Affiché sur `BulletinPeriodeView.tsx`/`BulletinAnnuelView.tsx` et dans le résumé de `StudentNotesTab.tsx`.
- `studentAbsenceService.ts`/`routers/studentAbsences.ts` (`packages/api`) : `listByStudent`/`create`/`delete`, permissions `ABSENCES:LECTURE`/`ABSENCES:CREATION`/`ABSENCES:SUPPRESSION`. Suppression physique autorisée ici (contrairement aux sanctions/bulletins/cartes) — une absence saisie par erreur n'a pas vocation à rester comme "annulée" dans l'historique officiel de l'étudiant.
- `StudentAbsencesTab.tsx` (nouvel onglet, `apps/desktop/screens/students`) : formulaire d'enregistrement (date/motif/case "absence justifiée") + liste des absences enregistrées avec suppression. `StudentDetailScreen.tsx` : onglet "Présences" ajouté après "Sanctions".
- Aucune notification automatique déclenchée par l'enregistrement d'une absence (non demandé par le porteur du projet, contrairement aux sanctions).

### Corrigé au passage (dette du module Sanctions, 2026-08-03)
- `SANCTION_ENREGISTREE` manquait dans `notificationEventTypeSchema` (`packages/shared`) et dans la table de libellés de `CommunicationSettingsScreen.tsx` (`apps/desktop`) — présent côté Prisma (`enum NotificationEventType`) mais oublié côté schéma Zod partagé et écran de configuration, ce qui cassait `pnpm --filter @isac-erp/api typecheck` et `pnpm --filter @isac-erp/desktop typecheck`. Corrigé ici, sans changement de comportement (l'événement était déjà seedé et fonctionnel côté base).

Vérification complète cette fois : `pnpm --filter @isac-erp/shared typecheck`, `pnpm --filter @isac-erp/api typecheck`/`lint`/`test` (117 tests, inchangé), `pnpm --filter @isac-erp/desktop typecheck`/`lint` — tous au vert. `pnpm --filter @isac-erp/db exec prisma generate` reste bloqué par un verrou de fichier (`query_engine-windows.dll.node`, processus Node du porteur du projet probablement encore actifs) — le client Prisma existant contenait déjà les symboles nécessaires (générés lors d'une régénération antérieure), donc aucun blocage de typecheck n'en a résulté, mais le porteur du projet doit fermer son `pnpm dev` puis lancer `prisma generate` + `prisma migrate deploy` + `prisma db seed` pour que la nouvelle table `student_absences`, la nouvelle colonne `seuil_absences_irregulier` et les nouvelles permissions `ABSENCES:*` soient effectivement appliquées en base.

---

## [Sanctions disciplinaires] — Nouveau module — 2026-08-03

Retour du porteur du projet : contrairement à "Communications", l'onglet "Sanctions" de la fiche étudiant n'avait aucune base existante (ni table, ni service, ni router) — `docs/ROADMAP.md` le mentionnait explicitement comme "à clarifier". Portée validée par le porteur du projet : 5 types de sanction fixes (Avertissement/Blâme/Retenue/Exclusion temporaire/Exclusion définitive, + Autre), avis PDF officiel imprimable, notification automatique au parent/tuteur et à l'étudiant dès l'enregistrement.

### Ajouté
- Nouveau modèle Prisma `Sanction` (table `sanctions`) + enum `SanctionType` — lié à `Student` (`onDelete: Cascade`) et à `User` pour `issuedBy`/`annuleBy` (relations `SanctionIssuedBy`/`SanctionAnnuleBy`). Aucun `numeroDossier` propre : l'avis PDF (voir ci-dessous) porte sa propre numérotation via le moteur Module 9, pas de duplication.
- Nouveau type de document Tier 1 `SANCTION` (`DocumentType`/`NumberingPurpose`, gabarit `SANC-{COMPTEUR}-{AA}`) — `avisSanction.ts` (nouveau générateur) : utilise le cadre de signature institutionnel partagé (`renderSignatureAndStamp`), contrairement à `FICHE_INSCRIPTION`/`FICHE_INSCRIPTION_COMPLETEE` qui le désactivent — cet avis est bien signé par l'établissement, pas par l'étudiant/le parent.
- Nouvel événement de notification automatique `SANCTION_ENREGISTREE` (Module 12) — `sanctionNotificationService.ts` notifie l'étudiant et tous ses tuteurs marqués contact principal dès l'enregistrement (même principe que `notifyPayment`), avant même la génération de l'avis PDF. Gabarit de message et configuration (SMS + E-mail) seedés par défaut.
- `sanctionService.ts`/`routers/sanctions.ts` (`packages/api`) : `listByStudent`/`create`/`annuler`, permissions `SANCTIONS:LECTURE`/`SANCTIONS:CREATION`/`SANCTIONS:ADMINISTRATION`. Annulation jamais destructive (comme les bulletins/cartes) — `annule`/`annuleReason`/`annuleBy`/`annuleLe`.
- `StudentSanctionsTab.tsx` (nouvel onglet, `apps/desktop/screens/students`) : liste des sanctions, formulaire d'enregistrement (type/date/motif/description/durée si retenue ou exclusion temporaire), génération de l'avis PDF par sanction, annulation avec motif. `StudentDetailScreen.tsx` : "sanctions" retiré de `COMING_SOON_TABS`.

**Vérification technique incomplète cette fois** : le client Prisma n'a pas pu être régénéré dans cet environnement (fichier `query_engine-windows.dll.node` verrouillé par un processus Node existant, `pnpm dev` du porteur du projet probablement encore ouvert) — `pnpm --filter @isac-erp/api typecheck` n'a donc pas pu être relancé après l'ajout du modèle `Sanction`. Le code suit scrupuleusement les patterns déjà vérifiés cette session (bulletins, cartes, communications) ; à confirmer par le porteur du projet après `prisma generate` + `prisma migrate deploy` + `prisma db seed`.

---

## [Fiche étudiant] — Onglet "Communications" activé — 2026-08-03

Retour du porteur du projet : le Module 12 (Centre de Communication) est livré et validé depuis plusieurs jours, mais l'onglet "Communications" de la fiche étudiant restait sur son placeholder "à venir". Sur les 3 onglets encore en attente (Sanctions/Présences/Communications), seul celui-ci a un module existant à relier — Sanctions et Présences n'ont aucune base dans le système (ni table, ni service) et restent à concevoir dans une conversation dédiée.

### Ajouté
- `listCommunicationMessagesInputSchema`/`communicationMessageSchema` (`packages/shared`) : ajout des champs `recipientType`/`recipientId` (filtre) et `recipientId` (DTO) — la donnée existait déjà en base (`CommunicationMessage.recipientId`, déjà indexée) mais n'était filtrable ni exposée. Extension additive, aucun champ retiré.
- `communicationMessageService.ts` : `listCommunicationMessages` filtre désormais par `recipientType`/`recipientId` quand fournis.
- `StudentCommunicationsTab.tsx` (nouvel onglet, `apps/desktop/screens/students`) : historique des communications de l'étudiant (canal, contact, contenu, campagne, statut), réutilisant le même `DataTable` que `CommunicationHistoryScreen.tsx` (Module 12), filtré côté serveur sur `recipientType: "ETUDIANT"`. Lecture seule — l'envoi se fait depuis le Centre de Communication, hors de la fiche étudiant.
- `StudentDetailScreen.tsx` : "communications" retiré de `COMING_SOON_TABS`, onglet réel ajouté après "Paiements".

Typecheck/lint propres sur `@isac-erp/shared`/`@isac-erp/api`, 117 tests API toujours au vert, typecheck propre sur `@isac-erp/desktop`.

---

## [Fiche étudiant] — Onglet "Notes / Bulletins" activé — 2026-08-03

Retour du porteur du projet : le Module 6 (Évaluation — notes, bulletins, classement) est livré et validé depuis plusieurs jours, mais l'onglet "Notes / Bulletins" de la fiche étudiant restait sur son placeholder "à venir" d'origine.

### Ajouté
- `StudentNotesTab.tsx` (nouvel onglet, `apps/desktop/screens/students`) : sélecteur Année universitaire (présélectionnée sur l'année active) / Semestre, avec présélection automatique du semestre du bulletin le plus récemment généré. Les notes obtenues (matière, coefficient, orale/écrite/composition, note finale, moyenne, rang, mention, décision) s'affichent directement en lecture seule dès l'accès à l'onglet — retour du porteur du projet, 2026-08-03 : "dès que j'y accède toutes les notes obtenues par l'étudiant s'affichent comme dans saisie de notes". La modification des notes reste exclusivement réservée à l'écran "Saisie de notes", hors de la fiche étudiant. Génération/annulation de bulletin (`StudentBulletinsDialog`) et aperçu imprimable (`BulletinPeriodeView`) réutilisés tels quels depuis le Module 6, sans dupliquer leur logique.
- `StudentDetailScreen.tsx` : "notes" retiré de `COMING_SOON_TABS`, onglet réel ajouté juste après "Fiche d'inscription".

Typecheck et lint propres sur `@isac-erp/desktop`. Aucun changement côté `@isac-erp/api`/`@isac-erp/db` — réutilisation intégrale de l'API et des composants déjà livrés avec le Module 6.

---

## [Fiche d'inscription complétée] — Nouveau document, style "Vert Institution" — 2026-08-03

Retour du porteur du projet, à la suite de la fiche vierge livrée la veille : besoin d'une seconde fiche, cette fois **remplie automatiquement** depuis le dossier réel d'un étudiant déjà inscrit/réinscrit — identité et photo, scolarité, parent/tuteur, pièces effectivement déposées, montant réellement payé — avec zones de signature pour l'étudiant, le Directeur des Études et le Directeur. Maquette à 2 styles (Ruban et Sceau / Vert Institution), "Vert Institution" retenu ; le nom du Directeur des Études n'est jamais imprimé (seul le libellé du poste), celui du Directeur est le signataire configuré sous le rôle "Directeur de Campus".

### Ajouté
- Nouveau type de document Tier 1 `FICHE_INSCRIPTION_COMPLETEE` — lié à un étudiant (`studentId`), distinct de `FICHE_INSCRIPTION` (formulaire vierge, sans entité). Câblé de bout en bout : schémas Zod (`packages/shared`), enums Prisma `DocumentType`/`NumberingPurpose` + migration dédiée, seed (modèle de document, gabarit de numérotation `FIC-{COMPTEUR}-{AA}`), catalogue de documents, écrans Génération/Historique/Modèles de documents/Cachet officiel (`apps/desktop`).
- `ficheInscriptionCompletee.ts` (nouveau générateur) : style "Vert Institution" (émeraude `#1F4B3F` / laiton `#B8863A`) — bandeau NOUVELLE INSCRIPTION/RÉINSCRIPTION déterminé automatiquement (nombre d'inscriptions du dossier), carte d'identification avec photo de l'étudiant sur le bord droit, scolarité (filière/niveau/classe/régime), parent ou tuteur responsable (contact principal), pièces effectivement déposées (`StudentDocument`), montant payé à ce jour (`feeSummaryService.getStudentFeeSummary`), paragraphe d'engagement, et rangée à trois signatures (étudiant, Directeur des Études sans nom, Directeur = signataire "Directeur de Campus" configuré dans Paramètres → Signataires).
- `documentEngineService.ts` : cadre de signature institutionnel générique désactivé pour ce type aussi (même principe que `FICHE_INSCRIPTION`), au profit de la rangée à trois signatures dessinée par le générateur.
- `FicheInscriptionTab.tsx` (nouvel onglet, `apps/desktop`) : bouton "Générer la fiche" dans l'espace dédié de l'étudiant, juste après les onglets "Carte d'étudiant" et "Carte de paiement" (retour explicite du porteur du projet sur l'emplacement) — génère un nouveau document archivé à chaque clic (comme le certificat de scolarité) et affiche le dernier PDF généré plus l'historique.

### Modifié (retours après premier essai réel, 2026-08-03)
- Titre imprimé simplifié en "FICHE D'INSCRIPTION" (au lieu de "FICHE D'INSCRIPTION COMPLÉTÉE") — le nom complet reste utilisé dans le catalogue/l'historique/les réglages pour distinguer les deux types côté administration.
- Interligne augmenté dans toutes les sections (bandeaux de section, grille de champs, liste des pièces, paragraphe d'engagement, rangée de signatures) — de la place restait disponible en bas de page.
- Couleur d'encre du cadre d'identification (photo + infos) alignée sur celle de la section Scolarité (libellé gris, valeur noire) plutôt que la couleur d'accent émeraude/or de la première version.

Typecheck/lint/tests propres sur `@isac-erp/shared`, `@isac-erp/api` (117 tests) et `@isac-erp/desktop`. Client Prisma régénéré. Aucun rendu PDF ni migration appliquée à une base réelle dans cet environnement (pas de Postgres disponible) — à confirmer par le porteur du projet, qui devra appliquer la migration (`prisma migrate deploy`) et relancer le seed (`prisma db seed`) avant la première utilisation, comme pour `FICHE_INSCRIPTION` la veille.

---

## [Fiche d'inscription et de réinscription] — Nouveau document, style "Sobre Contrasté" — 2026-08-02

Retour du porteur du projet : besoin d'un formulaire vierge à remplir à la main par les étudiants venant s'inscrire ou se réinscrire, avec le maximum de détails pour faciliter son remplissage sans assistance. Ce type de document n'existait nulle part dans le système (ni Tier 1, ni catalogue Tier 2) — contrairement aux redesigns précédents de cette session, il s'agit d'un ajout complet, pas d'une refonte visuelle. Maquette à 2 styles (Indigo Moderne / Sobre Contrasté), "Sobre Contrasté" retenu, avec plusieurs allers-retours de contenu (liste des pièces à fournir précisée, section "Frais et articles inclus" ajoutée, cadre photo supprimé, interlignage augmenté, formule d'engagement/non-remboursement rédigée).

### Ajouté
- Nouveau type de document Tier 1 `FICHE_INSCRIPTION` — sans entité liée (aucun étudiant n'existe encore au moment d'une nouvelle inscription), même principe que `RAPPORT_CAISSE`/`ETAT_RECETTES`. Câblé de bout en bout : `documentTypeSchema`/`TIER1_DOCUMENT_TYPES` (`packages/shared`), `generateDocumentInputSchema` (aucun champ, formulaire toujours vierge), enums Prisma `DocumentType`/`NumberingPurpose` + migration dédiée, seed (modèle de document, gabarit de numérotation `FI-{COMPTEUR}-{AA}`), catalogue de documents, écrans Génération/Historique/Modèles de documents/Cachet officiel (`apps/desktop`).
- `ficheInscription.ts` (nouveau générateur) : style "Sobre Contrasté" (monochrome `#1E2430`), tenu sur une seule page — cases Nouvelle inscription/Réinscription, section Informations de l'étudiant(e) (sans photo, à la demande du porteur du projet), section Scolarité souhaitée (filière/niveau/programme/régime en pointillés, l'établissement ayant 18 filières impossibles à toutes lister), section Parent ou tuteur responsable, section Pièces fournies (acte de naissance, copie du dernier diplôme, 4 photos, certificat de scolarité, attestation de niveau), section Frais et articles inclus (montant payé + badge/tenue pratique/assurance/veste à cocher), paragraphe d'engagement (non-remboursement des frais + consentement au règlement intérieur), rangée de signature dédiée (date/étudiant/parent) et encadré "Réservé à l'administration" (matricule attribué, classe affectée, agent, date de réception). Année universitaire résolue dynamiquement depuis l'année active, jamais codée en dur.
- `documentEngineService.ts` : le cadre de signature institutionnel du moteur partagé (`renderSignatureAndStamp`) est désactivé spécifiquement pour ce type — le générateur dessine sa propre rangée de signature (étudiant/parent), plus pertinente qu'un signataire de l'établissement sur un formulaire vierge signé par l'étudiant lui-même ; les autres types de documents ne sont pas affectés.

Typecheck/lint/tests propres sur `@isac-erp/shared`, `@isac-erp/api` (117 tests) et `@isac-erp/desktop`. Client Prisma régénéré avec les nouvelles valeurs d'enum. Aucun rendu PDF ni migration appliquée à une base réelle dans cet environnement (pas de Postgres disponible) — à confirmer par le porteur du projet, qui devra aussi appliquer la migration (`prisma migrate deploy`) avant la première utilisation.

---

## [Liste des étudiants] — Paysage + tableau redessiné — 2026-08-02

Retour du porteur du projet : la colonne Matricule manquait de place en portrait (les matricules longs passaient à la ligne), et souhait des lignes "qui ressemblent à celles d'un document comptable bien fait" comme les rapports comptables déjà redessinés cette session.

### Ajouté
- `documentEngineService.ts` : override d'orientation propre à `LISTE_ETUDIANTS` — le document est désormais généré en paysage. `printTheme` est un réglage global partagé par tous les documents ; un objet dérivé est substitué juste pour ce type plutôt que modifié en place, pour ne jamais affecter les autres documents (attestations, certificats, bulletins... restent en portrait).
- `listeEtudiants.ts` : tableau redessiné (`drawStudentTable`, en-tête gris ardoise, lignes zébrées) à la place du `drawTable` générique — colonne Matricule élargie (22 % de la largeur, disponible en plus grâce au paysage) et mise en gras pour rester lisible même avec des matricules longs.

Typecheck/lint/tests propres sur `@isac-erp/api` (117 tests). Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à confirmer par le porteur du projet.

---

## [Certificat de scolarité] — Style "Diplôme Marine & Or" — 2026-08-02

Retour du porteur du projet sur maquette (options Marine & Or / Émeraude Impériale, "Marine & Or" retenu) : demande explicite d'un document qui "épate son lecteur" — double cadre façon diplôme, effet dégradé, filigrane du logo de l'école, fiche d'identité aussi complète que possible.

### Ajouté
- `drawDoubleFrame` — double cadre façon diplôme (liseré fin doré à l'extérieur, cadre épais marine à l'intérieur), en marge de la page.
- `drawWatermark` — logo de l'école (`EstablishmentSettingsDto.logoPrimaryPath`) en filigrane très pâle, centré.
- `drawNameBanner` — bandeau en dégradé marine → or portant le nom de l'étudiant en majuscules.
- `drawIdentitySection` — photo toujours réservée (même principe que l'attestation d'inscription) + fiche d'identité étendue à tous les champs réellement disponibles : matricule, sexe, date et lieu de naissance, nationalité, adresse, téléphone, filière, niveau, classe, **régime d'inscription** (nouveau — la requête Prisma inclut désormais la relation `regime`, absente jusqu'ici de ce générateur), année universitaire, numéro et date d'inscription.
- Formule d'ouverture alignée sur l'attestation de travail : *« Je soussigné, M. le Directeur de l'Institut... »* (même nom légal que les autres documents).

Typecheck/lint/tests propres sur `@isac-erp/api` (117 tests). Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à confirmer par le porteur du projet, idéalement sur un étudiant avec et sans photo/régime renseigné.

---

## [Attestation de travail] — Formule d'ouverture et cadre de signature — 2026-08-02

Retour du porteur du projet après lecture du document redessiné : le poste du responsable de l'établissement manquait dans la formule d'ouverture, et le cadre de signature affichait le titre du signataire configuré alors que seul son nom est souhaité sur ce document.

### Modifié
- Formule d'ouverture fixée : *« Je soussigné, M. le Directeur de l'Institut Privé de Formation Technique et Professionnelle YOUNGOU MALIANNDO (IPFTP YMA), atteste que : »* — remplace l'ancien texte dynamique basé sur `ctx.signatory?.title`. Reprend le nom légal déjà utilisé sur `attestationInscription.ts` pour rester identique d'un document à l'autre.
- Cadre de signature (`renderSignatureAndStamp`, moteur partagé) : le titre du signataire est vidé avant le rendu partagé, propre à ce générateur — seul le nom complet du signataire configuré apparaît désormais, pas l'intitulé de son poste. Les autres documents (attestation d'inscription, bulletins...) continuent d'afficher le titre normalement, le moteur partagé n'a pas été modifié.

**Non couvert par ce correctif — réglage, pas du code** : le porteur du projet souhaite que le signataire utilisé sur ce document soit le rôle "Directeur des Campus" plutôt que "Directeur Général". Ce choix se fait déjà dans Paramètres → Modèles de documents → Attestation de travail (champ "Signataire"), sans modification de code nécessaire.

Typecheck/lint/tests propres sur `@isac-erp/api` (117 tests). Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à confirmer par le porteur du projet.

---

## [Attestation de travail] — Style "Ruban Tricolore" — 2026-08-02

Retour du porteur du projet sur maquette (options Sceau Doré / Ruban Tricolore, "Ruban Tricolore" retenu après deux allers-retours sur le placement du drapeau) : le document était jusqu'ici du texte centré sans identité visuelle propre.

### Ajouté
- `drawTopRibbon` — ruban aux couleurs du drapeau guinéen (rouge-jaune-vert, bandes verticales) pleine largeur, tout en haut de la page. Positionné entre le bord physique de la page et le haut de l'entête institutionnelle (zone toujours vide), donc jamais superposé aux logos.
  - Itération 1 : petit drapeau isolé en médaillon, superposé au logo du ministère (bug signalé) → supprimé.
  - Itération 2 : petit drapeau isolé en haut à gauche, sans superposition mais jugé insuffisant → remplacé par le ruban pleine largeur final.
- `drawWatermark` — logo de l'école (`EstablishmentSettingsDto.logoPrimaryPath`, pas le logo du ministère) en filigrane très pâle (opacité 6 %), centré sur le corps du document.
- `drawIdentityCard` — encadré d'identité à liseré tricolore vertical (bord gauche), nom en majuscules, "Matricule : ... • Fonction : ..." — le libellé "Catégorie" devient **"Fonction"** (retour du porteur du projet), plus naturel pour une attestation de travail bien que la donnée sous-jacente (`employee.categoryLabel`) reste inchangée.

Typecheck/lint/tests propres sur `@isac-erp/api` (117 tests). Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à confirmer par le porteur du projet.

---

## [Journal de caisse] — Style "Violet Élégant" — 2026-08-02

Retour du porteur du projet sur maquette (options Cyan Sessions / Violet Élégant, "Violet Élégant" retenu) : même refonte visuelle que les trois autres rapports comptables, cette fois pour le journal de caisse — jusqu'ici toujours rendu par le `drawTable` générique.

### Modifié
- `journalCaisse.ts` entièrement réécrit (`drawSessionStrip`, `drawJournalTable`, `drawClosingBalanceBox`, `drawAmountInWordsBox`) — violet profond + liseré doré, quatrième identité visuelle distincte parmi les rapports comptables (émeraude/ambre/vert-rouge-marine/violet-or).
- Bandeau session avec badge **EN COURS**/**CLÔTURÉE** selon `closedAt`.
- Tableau des mouvements : en-tête violet à liseré doré, recette en vert / dépense en rouge (même convention que le grand livre), lignes zébrées.
- Solde de clôture et encadré "montant en lettres" (ajouté au tour précédent) restylés en violet/or pour rester cohérents avec le reste du document.

Typecheck/lint/tests propres sur `@isac-erp/api` (117 tests). Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à confirmer par le porteur du projet.

---

## [Journal de caisse] — Montant en toutes lettres — 2026-08-02

Retour du porteur du projet : un journal de caisse professionnel comporte toujours une mention du solde de clôture en toutes lettres ("Arrêté le présent journal de caisse à la somme de : ..."), absente jusqu'ici.

### Ajouté
- `amountToFrenchWords`/`amountToFrenchWordsWithCurrency` (`pdfEngine.ts`, partagé — réutilisable par tout futur document comptable) : conversion d'un montant entier en toutes lettres, orthographe rectifiée 1990 (tirets systématiques), avec les irrégularités correctement gérées : "soixante-et-onze" mais "quatre-vingt-onze" (pas de "et" à 91) ; "quatre-vingts" (avec s) mais "quatre-vingt-un" (sans s, rien après) ; "cent"/"cents" accordé seulement s'il est multiplié et non suivi d'un autre nombre ; "mille" invariable et jamais précédé de "un", contrairement à "un million"/"un milliard" ; "de" ajouté avant la devise uniquement quand million/milliard est le dernier élément du nombre (montant rond).
- 9 tests unitaires couvrant ces irrégularités.
- `journalCaisse.ts` : encadré "Arrêté le présent journal de caisse à la somme de : {montant en lettres}" sous le solde de clôture.

Typecheck/lint/tests propres sur `@isac-erp/api` (117 tests, dont les 9 nouveaux). Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à confirmer par le porteur du projet, idéalement avec un solde de clôture à plusieurs tranches (ex. 4.350.000) pour vérifier l'enchaînement million/mille.

---

## [Rapport de caisse] — Style "Balance visuelle détaillée" — 2026-08-02

Retour du porteur du projet sur maquette (options "Trois cartes" / "Balance visuelle", puis demande explicite d'une version plus détaillée) : le document ne montrait que 3 chiffres à plat (`renderIdentificationBox`, cadre gris générique).

### Modifié
- `rapportCaisse.ts` entièrement réécrit (`drawComparisonBars`, `drawSoldeBox`, `drawDetailPanels`) — style dédié comme les autres rapports comptables (vert = recettes, rouge = dépenses, marine = solde, cohérent avec le rapport de caisse mais distinct de l'émeraude du grand livre et de l'ambre de l'état des recettes).
- Barres comparatives recettes/dépenses à la même échelle, bandeau solde avec pastille Excédentaire/Déficitaire/Équilibré selon le signe.
- **Version détaillée** (ajoutée à la demande du porteur du projet, avant l'insertion finale) : deux panneaux de répartition sous le solde — *recettes par caisse* et *dépenses par catégorie* — alimentés par `getReportByCashRegister`/`getReportByCategory` (déjà utilisés ailleurs dans l'appli, jamais affichés sur ce document jusqu'ici). Chaque panneau affiche un message "Aucune recette/dépense…" si vide sur la période ; toute la section disparaît si les deux le sont.

Typecheck/lint/tests propres sur `@isac-erp/api` (111 tests). Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à confirmer par le porteur du projet, notamment sur une période avec plusieurs caisses/catégories mouvementées pour vérifier le rendu des deux panneaux.

---

## [État des recettes] — Style "Ambre & Or" — 2026-08-02

Retour du porteur du projet sur maquette (deux options proposées, "Ambre & Or" retenu, volontairement distinct du vert du grand livre de caisse) : même constat que le grand livre — rendu jusqu'ici par le `drawTable` générique, aucune mise en valeur du total ni de la répartition.

### Modifié
- `etatRecettes.ts` entièrement réécrit avec ses propres fonctions de dessin (`drawHero`, `drawFeeTypeBars`) — même principe d'identité visuelle dédiée que les autres documents personnalisés, n'affecte pas `drawTable`/`ctx.printTheme`.
- Bandeau total en dégradé doré, avec le nombre de paiements validés à droite.
- Répartition par type de frais en **barres horizontales proportionnelles** (dégradé doré, longueur = part du total, pourcentage affiché) au lieu d'un tableau à deux colonnes — plus lisible d'un coup d'œil pour ce type de résumé.

Typecheck/lint/tests propres sur `@isac-erp/api` (111 tests). Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à confirmer par le porteur du projet.

---

## [Grand livre de caisse] — Style "Registre Émeraude" — 2026-08-02

Retour du porteur du projet sur maquette (deux options proposées, "Registre Émeraude" retenu) : rendre le document plus professionnel et plus coloré — jusqu'ici rendu par le `drawTable` générique du moteur PDF (bandeau bleu plat, aucune couleur sur les montants).

### Modifié
- `grandLivreCaisse.ts` entièrement réécrit avec ses propres fonctions de dessin (`drawAccountStrip`, `drawLedgerTable`, `drawClosingBalanceBox`), sur le même principe que les autres documents à identité visuelle dédiée (bulletin de paie, attestation, carte d'étudiant) — n'affecte ni `drawTable` ni `ctx.printTheme`, toujours utilisés par les autres rapports comptables (Journal, État des recettes...).
- Bandeau compte/solde d'ouverture en dégradé vert (période du relevé affichée seulement si `dateFrom`/`dateTo` sont fournis).
- Tableau des écritures : en-tête vert plein, lignes zébrées, **débit en rouge et crédit en vert** (convention comptable), solde en gras.
- Solde de clôture dans un encadré vert au lieu d'une simple ligne de texte en gras.

Typecheck/lint/tests propres sur `@isac-erp/api` (111 tests). Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à confirmer par le porteur du projet.

---

## [Global] — Texte des fenêtres calculé automatiquement selon le contraste — 2026-08-02

Retour du porteur du projet avec captures d'écran de l'entête d'application, de la sous-navigation Paramètres et de la liste des Rôles : toujours le même symptôme (texte blanc illisible), cette fois sur des zones qui n'avaient pas encore été corrigées. Root cause identifiée : `--window-foreground` (et `--primary-foreground`/`--button-foreground`) étaient **figés en blanc** dans `globals.css`, en supposant que la couleur de fenêtre/principale/bouton choisie par l'établissement serait toujours assez foncée — ce qui casse dès qu'un établissement (comme celui-ci) choisit une teinte claire dans Paramètres → Apparence.

### Ajouté
- `contrastForeground(hex)` (`apps/desktop/src/renderer/src/lib/color.ts`) — calcule un texte sombre ou blanc selon la luminosité perçue de la couleur fournie (formule YIQ, seuil 155/255), avec tests unitaires.
- `applyThemeColors()` calcule désormais aussi `--window-foreground`, `--primary-foreground` et `--button-foreground` à partir des couleurs choisies par l'établissement (`windowColor`/`primaryColor`/`buttonColor`), au lieu de laisser ces trois textes figés en blanc. Appliqué à la fois au chargement de l'app (`App.tsx`) et à l'aperçu en direct dans Paramètres → Apparence.

Corrige d'un coup, sans réglage supplémentaire à faire dans Paramètres, l'entête d'application, la sous-navigation Paramètres (`SettingsShell.tsx`, boutons "ghost"), la liste des Rôles (`RolesScreen.tsx`) et tout autre texte qui reposait sur ces trois couleurs.

### Corrigé (régression découverte pendant ce correctif)
- **Menu latéral catégorisé devenu illisible** (`AppShell.tsx`) — le menu latéral est volontairement toujours sombre (`--menu`), indépendant de la couleur de fenêtre. Ses boutons de navigation passent `className="text-menu-foreground"` par-dessus le variant `Button` "ghost", qui pose déjà `text-window-foreground` en interne — deux classes de couleur concurrentes que `cn()` (sans tailwind-merge) ne départage pas de façon fiable. Tant que `--window-foreground` valait blanc partout, la collision était invisible ; une fois `--window-foreground` recalculé en sombre pour cet établissement, elle est devenue un vrai bug (texte noir sur fond bleu marine). Corrigé avec `!text-menu-foreground`/`hover:!bg-white/10` pour forcer la couleur du menu à gagner à coup sûr.

Typecheck/lint/tests propres (`@isac-erp/desktop`, 9 tests dont 4 nouveaux sur `contrastForeground`). Aucune vérification visuelle possible dans cet environnement (pas de Postgres local) — à reconfirmer par le porteur du projet, notamment sur les écrans qui n'ont pas encore refait surface dans les captures.

---

## [Global] — Titres de pages, onglets et filtres forcés en noir — 2026-08-02

Retour du porteur du projet avec captures d'écran : plusieurs mentions (titres de page "Frais de scolarité"/"Paie", onglets horizontaux "Tarifs/Types de frais/...", "Employés/Enseignants sans profil de paie/...", et les libellés de filtres "Année universitaire/Semestre/Niveau/Matière/Classe") restent blanches/pâles sur un fond de fenêtre clair — illisibles. Ce round complète l'entrée précédente (`Card` "static") en couvrant deux nouvelles familles de composants.

### Corrigé
- **Titres de page** — 54 écrans utilisaient `<h2 className="text-lg font-semibold">` sans couleur explicite, héritant du blanc de `body` (`text-window-foreground`). `text-foreground` (couleur sombre fixe, jamais liée à `--window`) ajouté systématiquement à ce même gabarit sur les 54 fichiers.
- **`Tabs.tsx`** (`packages/ui`) — le texte de l'onglet actif utilisait `text-primary` (personnalisable depuis Paramètres → Apparence, donc potentiellement clair) ; passé à `text-foreground` (fixe). Seul le soulignement de l'onglet actif reste `border-primary` (couleur de marque, pas du texte).
- **Filtres restants** — même traitement `Card variant="static"` que l'entrée précédente, étendu à 4 écrans du module Évaluation : `NoteSaisieScreen.tsx`, `FeuilleSaisieScreen.tsx`, `ClassementScreen.tsx`, `BulletinsScreen.tsx`.

Typecheck/lint/tests propres sur `@isac-erp/ui` et `@isac-erp/desktop`. Toujours aucune vérification visuelle possible dans cet environnement (pas de Postgres local) — à reconfirmer par le porteur du projet.

---

## [Global] — Titres de filtres illisibles (blanc sur fond clair) — 2026-08-02

Retour du porteur du projet : les libellés (`Label`) au-dessus des filtres/comboboxes de plusieurs écrans de liste (Niveau, Filière, Année universitaire, Statut, Catégorie...) restent en blanc (`text-window-foreground`, pensé pour le fond bleu `--window`) alors que leur encadré n'a pas de fond propre — potentiellement peu lisible selon la couleur de fenêtre retenue par l'établissement.

### Corrigé
- `Card.tsx` (`packages/ui`) : la variante `static` (fond fixe `--background`, déjà utilisée pour les cartes de répartition des tableaux de bord) reconfine désormais aussi `--window-foreground` en local sur une teinte sombre fixe — même mécanisme déjà en place pour la variante `form`. Un `<Label>` posé dans une carte `static` devient donc lisible quelle que soit la couleur de fenêtre de l'établissement.
- Bandeaux de filtres remplacés par `<Card variant="static">` (au lieu d'un simple `<div className="... border border-border ...">` sans fond) sur : `StudentsListScreen.tsx`, `EnrollmentsListScreen.tsx`, `TeachersListScreen.tsx`, `EmployeesListScreen.tsx`, `FeeTariffsScreen.tsx`.

Typecheck/lint propres sur `@isac-erp/ui` et `@isac-erp/desktop`. D'autres écrans de filtres pourraient présenter le même souillage visuel avec une couleur de fenêtre différente — signaler les cas restants pour un second passage ciblé.

---

## [Fiche élève] — Rail de profil "Contraste marine" — 2026-08-02

Retour du porteur du projet sur un exemple externe (capture d'écran d'une autre application "SchoolApp") : remplacer la barre d'onglets horizontale de la fiche élève par une navigation façon profil (photo + menu vertical), avec des cartes de synthèse regroupées en haut de chaque onglet et un tableau plus visuel — "selon le besoin", en réutilisant uniquement les données déjà disponibles dans l'appli. Trois maquettes de style proposées (Aurore / Contraste marine / Verre) ; le porteur du projet a laissé le choix, retenu "Contraste marine" car le plus proche de la charte déjà en place (`--primary` navy déjà utilisé dans la coquille applicative).

### Ajouté
- `StudentProfileRail.tsx` (nouveau, `apps/desktop/.../screens/students/`) : rail vertical sticky — photo de l'étudiant (`student.photoPath` via `resolveUploadUrl`, avec halo animé en `--secondary`, repli sur une icône générique si aucune photo), matricule, filière/niveau/classe/année (inscription active, `studentEnrollments.listByStudent`), puis navigation verticale (icônes lucide-react) remplaçant l'ancienne barre `<Tabs>` horizontale de `StudentDetailScreen.tsx`.
- `CountUpAmount.tsx` (nouveau) : montant qui s'incrémente à l'affichage (anime chaque changement de valeur), utilisé sur les nouvelles cartes de synthèse.
- `.animate-avatar-glow` (`globals.css`) : halo pulsé autour de l'avatar, en `--secondary` (suit la personnalisation d'établissement).
- `StudentFeesTab.tsx` : tableau d'échéancier ajouté sous le détail par type de frais — exploite un champ déjà présent côté API (`studentFeeLineSchema.installments`, alimenté par `tariff.installmentPlan`) mais jusqu'ici jamais affiché à l'écran ; n'apparaît que si au moins une échéance existe pour l'étudiant.

### Modifié
- `StudentDetailScreen.tsx` : mise en page à deux colonnes (rail + contenu) au lieu d'onglets horizontaux ; en-tête simplifié (nom/matricule désormais affichés dans le rail, plus dans le titre de page).
- `StudentFeesTab.tsx` : les 5 blocs de synthèse à plat remplacés par 2 cartes regroupées ("Tarification", "Situation") en `Card variant="static"` (fond fixe, indépendant de la couleur de fenêtre — même principe que les cartes de répartition des tableaux de bord), montants animés.
- `StudentPaymentsTab.tsx` : ajout de 2 cartes de synthèse en tête (Suivi : statut global + reste à payer ; Situation financière : total payé + net à payer, réutilise la requête déjà chargée par l'onglet Frais) ; actions de ligne (Reçu/Annuler) converties en boutons icône seule.

Typecheck/lint/tests propres sur `@isac-erp/ui` et `@isac-erp/desktop`. Aucune base Postgres locale disponible dans cet environnement pour lancer l'appli Electron complète : pas de vérification visuelle possible ici — à tester par le porteur du projet sur la fiche d'un élève réel (photo présente et absente, élève avec/sans échéancier configuré).

---

## [Carte d'étudiant] — Corrections après deuxième tirage réel — 2026-08-02

Retour du porteur du projet après un nouveau tirage (voir entrée précédente) : la police de l'année universitaire au recto reste trop petite, le filigrane du ministère reste trop transparent, et le QR code — bien que moins dense — ne scanne toujours pas correctement.

### Corrigé
- **Police de l'année universitaire trop petite** (`renderFront`, `studentCardEngine.ts`) — portée de `3.8 × 1.2` à `3.8 × 1.2 × 2` (police grasse également, pour plus de lisibilité sur le bandeau bleu foncé).
- **Filigrane du ministère toujours trop transparent** (`drawMinistryWatermark`) — opacité relevée une nouvelle fois, de 0,15 à 0,32.
- **QR code toujours illisible au scan** (`studentCardService.ts`, `generateQrImageBuffer` dans `pdfEngine.ts`) — diagnostic affiné : au-delà du volume de données, le format JSON (`{"nom":"...","prenom":"...","classe":"..."}`) ajoute des caractères de structure (accolades, guillemets, deux-points) qui alourdissent l'encodage sans rien apporter à la lecture humaine. `generateQrImageBuffer` accepte désormais soit un objet (encodé en JSON, comportement inchangé pour tous les autres documents), soit une chaîne brute encodée telle quelle. La carte d'étudiant encode maintenant un texte brut sur 3 lignes, sans étiquette : nom, prénom, puis **filière** (remplace la classe, à la demande du porteur du projet).

Typecheck/lint propres sur `@isac-erp/api` ; suite de tests (111 tests) toujours au vert. Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à reconfirmer par le porteur du projet en réimprimant une carte et en rescannant le QR.

---

## [Carte d'étudiant] — Corrections après premier tirage réel — 2026-07-31

Retour du porteur du projet après impression d'une carte réelle (voir entrée "Style 'Carte bombée'" ci-dessous) : le bandeau "CARTE ÉTUDIANT" déborde sur le bandeau tricolore, le filigrane du ministère est trop transparent, l'année universitaire est absente du recto, le QR code est trop dense pour scanner correctement.

### Corrigé
- **Bandeaux de titre/validité chevauchant le bandeau tricolore** (`renderFront`/`renderBack`, `studentCardEngine.ts`) — les rectangles du bandeau de titre et du bandeau du bas démarraient à `x` (le bord gauche de la carte, où commence aussi la bande tricolore) sur toute la largeur `w`, peignant le bleu marine par-dessus les bandes de couleur sur cette hauteur. Corrigé : les deux bandeaux démarrent désormais à `x + stripeWidth` sur une largeur `w - stripeWidth`, avec le texte repositionné en conséquence.
- **Filigrane du ministère trop transparent** (`drawMinistryWatermark`) — opacité portée de 6 % à 15 % pour rester discret tout en étant réellement visible.
- **QR code trop dense pour scanner** (`studentCardService.ts`) — le contenu encodé (numéro, matricule, nom complet, campus, année universitaire, date d'expiration) faisait grimper la version du QR et donc la finesse des modules, illisible une fois imprimé en petit format sur la carte. Le payload est réduit au strict minimum : nom, prénom et classe uniquement. Le numéro de carte et le code de vérification restent imprimés en clair sous le QR pour une vérification manuelle sans scanner.

### Ajouté
- `academicYearLabel` sur `StudentCardRenderData` (`studentCardEngine.ts`) — l'année universitaire de l'inscription active est désormais affichée sur le bandeau du bas du recto ("Année scolaire XXXX-XXXX"), à la demande du porteur du projet.

Typecheck/lint propres sur `@isac-erp/api` ; suite de tests (111 tests) toujours au vert. Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à reconfirmer par le porteur du projet en réimprimant une carte réelle, notamment en rescannant le QR code.

---

## [Carte d'étudiant] — Style "Carte bombée" — 2026-07-31

Retour du porteur du projet sur maquette (options A à D, "Carte bombée" retenue) : donner plus de relief/profondeur à la carte d'étudiant, puis affiner (logo/photo déjà de même taille et bien positionnés — aucun changement nécessaire), cadre de signature épais et asymétrique, QR redescendu, bandeau du bas étiré, filigrane du ministère, police des informations agrandie.

### Ajouté
- `studentCardEngine.ts` (`packages/api/src/services/documents/`) : `drawBombedBackground` — dégradé radial clair + vignette marine très translucide sur les deux faces, pour l'effet "carte plastique légèrement bombée" retenu sur la maquette.
- `drawMinistryWatermark` — filigrane très discret (opacité 6%) du logo du ministère (`EstablishmentSettingsDto.ministryLogoPath`) au dos de la carte ; silencieux si aucun logo n'est configuré.
- `strokeDiagonalRoundedRect` — tracé manuel (pdfkit ne supporte qu'un rayon unique via `.roundedRect()`) pour un cadre à coins asymétriques : haut-droit et bas-gauche arrondis à 40 % de la plus petite dimension, haut-gauche et bas-droit nets.

### Modifié
- Cadre de signature du verso : `lineWidth(0.5)` gris-bleu → `lineWidth(2)` `#0B1F44` (même bleu que les deux bandeaux d'entête, déjà identiques entre recto et verso — pas de changement nécessaire sur ce point), coins asymétriques via `strokeDiagonalRoundedRect`.
- QR code : centré dans l'espace restant → collé juste au-dessus du bandeau de validité.
- Bandeau de validité (bas) : hauteur multipliée par 1,3 supplémentaire.
- Police des champs d'identité (recto) : multipliée par 1,15 supplémentaire.
- Photo et logo de l'école (recto) étaient déjà de même taille et positionnés aux deux extrémités (gauche/droite) depuis la refonte du 2026-07-30 — vérifié, aucun changement nécessaire sur ce point malgré la demande initiale.

Typecheck/lint propres sur `@isac-erp/api` ; suite de tests (111 tests) toujours au vert. Aucun rendu PDF généré/inspecté visuellement dans cet environnement — à confirmer par le porteur du projet en imprimant une carte réelle.

---

## [Attestation d'inscription] — Photo à droite, carte agrandie et centrée — 2026-07-31

Retour du porteur du projet sur maquette (validée avant implémentation cette fois) : déplacer le cadre photo du bord gauche vers le bord droit de la carte d'identification, agrandir l'ensemble en le centrant, augmenter les polices pour mieux occuper la page.

### Modifié
- `drawIdentificationCard` (`packages/api/src/services/documents/generators/attestationInscription.ts`) : cadre photo déplacé du bord gauche au bord droit de la carte (agrandi 62 → 85px) ; carte légèrement rentrée par rapport aux marges du corps de texte (8pt de chaque côté) plutôt qu'en pleine largeur ; hauteur de ligne 26 → 32px ; libellés 6 → 7pt, valeurs 8,5 → 10pt.
- Corps du texte (introduction + les trois paragraphes de conclusion) porté de 10,5pt à 12pt. La carte plus grande et le texte plus grand tiennent tout de même sur une seule page (marge de reste estimée ~150pt) grâce à l'espace récupéré par ailleurs.

Typecheck/lint propres sur `@isac-erp/api` ; suite de tests (111 tests) toujours au vert.

---

## [Attestation d'inscription] — Corrections après premier essai réel — 2026-07-31

Retour du porteur du projet après génération d'une attestation réelle (voir entrée précédente) : cadre photo invisible en l'absence de photo renseignée, interligne trop serré dans la carte d'identification, QR code chevauchant la zone de signature.

### Corrigé
- **Cadre photo invisible sans photo renseignée** — l'espace n'était réservé que si `student.photoPath` existait (largeur nulle sinon), donc rien ne signalait la présence de cette zone. Corrigé : le cadre (bordure dorée, coins arrondis) est désormais **toujours** dessiné, avec la mention "Photo" en filigrane s'il n'y a pas d'image — même principe que l'encadré de signature (`renderSignatureAndStamp`), toujours réservé même vide.
- **Interligne insuffisant entre les champs de la carte d'identification** — hauteur de ligne portée de 20 à 26px. Pour compenser sur une seule page, le corps du texte (introduction + les trois paragraphes de conclusion) passe de 13pt à 10.5pt, et les libellés/valeurs de la carte de 6.5/9pt à 6/8.5pt.
- **QR code chevauchant la zone de signature** (`renderQrCode`, `packages/api/src/services/documents/pdfEngine.ts`) — déplacé du coin bas-droit vers le coin bas-gauche, naturellement libre sur tous les types de documents. Ce changement est global (fonction partagée par tous les documents du moteur centralisé, pas seulement l'attestation) : `renderSignatureAndStamp` place aussi sa zone à droite sans être ancrée au bas de page, donc tout document au contenu long risquait le même chevauchement, pas seulement celui-ci.

Typecheck/lint propres sur `@isac-erp/api` ; suite de tests (111 tests) toujours au vert. À reconfirmer sur un nouveau rendu réel — idéalement un étudiant avec et un étudiant sans photo renseignée, pour vérifier les deux cas du cadre.

---

## [Attestation d'inscription] — Style "Ruban et sceau" + photo de l'étudiant — 2026-07-31

Retour du porteur du projet, sur une capture de l'attestation générée : améliorer le style ("très joli", "élégant"), enrichir le cadre d'identification, allonger la conclusion, ajouter la photo de l'étudiant. Choix arrêté après maquette (options A à E) sur "Ruban et sceau" — palette marine/or, titre en serif, carte d'identification à liseré doré.

### Ajouté
- `renderDocumentTitle` (`packages/api/src/services/documents/pdfEngine.ts`) accepte un paramètre optionnel `titleFont` (`"Helvetica-Bold"` par défaut, inchangé pour tous les documents existants). `documentEngineService.ts` le passe à `"Times-Bold"` (police standard PDFKit, aucun fichier à intégrer) uniquement pour `ATTESTATION_INSCRIPTION` — seul ce document a un titre en serif ; tous les autres restent en Helvetica-Bold.
- Photo de l'étudiant (`Student.photoPath`, même mécanisme que la carte d'étudiant/de paiement — `resolveUploadPath` + `doc.image`) affichée dans le cadre d'identification lorsqu'elle est renseignée ; le cadre s'adapte automatiquement en son absence (pas d'espace vide réservé).

### Modifié
- `generateAttestationInscription` (`packages/api/src/services/documents/generators/attestationInscription.ts`) : le cadre d'identification générique (`renderIdentificationBox`, gris, partagé avec d'autres documents administratifs) est remplacé par une carte dédiée à liseré doré sur le côté gauche, propre à ce document — mêmes 11-12 champs qu'avant (nom, matricule, n° d'inscription, sexe, naissance, nationalité si renseignée, filière, niveau, classe, année universitaire, campus, date d'inscription), seul l'habillage change.
- Conclusion développée de 2 à 3 paragraphes : le premier (inchangé dans l'esprit) reprend l'inscription et l'assiduité ; un second, nouveau, précise que l'attestation ne remplace pas une pièce d'identité et n'engage l'établissement que sur le statut d'inscription ; le troisième reprend la formule de délivrance, complétée ("... pour servir et valoir ce que de droit auprès de qui il/elle appartiendra").
- Le ruban/sceau décoratif de la maquette n'a pas été repris tel quel dans le PDF réel : il risquait de chevaucher les logos déjà positionnés par l'en-tête institutionnel partagé (`renderInstitutionalHeader`, utilisé par tous les documents) — l'identité "élégante" du document repose donc sur le titre en serif, la carte à liseré doré et la photo, sans élément graphique supplémentaire en coin de page.

Typecheck/lint propres sur `@isac-erp/api` ; suite de tests (111 tests) toujours au vert. Comme pour le bulletin de salaire, aucun rendu PDF n'a pu être généré et inspecté visuellement dans cet environnement — à confirmer par le porteur du projet en générant une attestation réelle (idéalement pour un étudiant avec photo renseignée, pour vérifier ce cas).

---

## [Bulletin de salaire] — Refonte de la mise en page (structure enrichie + palette verte) — 2026-07-31

Retour du porteur du projet, sur un exemple de bulletin fourni (`Bulletin_contractuel_587719C_202607.pdf` — vraisemblablement un export de l'ancien écran `window.print()`, avant la migration au moteur PDF centralisé du 2026-07-30, à en juger par sa numérotation `BS-124-26` déjà conforme à la convention actuelle) : structure jugée plus complète que le rendu actuel du moteur PDF (identification en encart simple + liste d'éléments). Proposition validée après deux itérations de maquette (première version neutre, puis palette adoucie à dominante verte, plus équilibrée et moderne — "il s'agit d'une paye").

### Ajouté
- `PayrollLineDto` (`packages/shared/src/schemas/payrollLine.ts`) : 4 nouveaux champs — `employeeAddress`, `employeePhone` (repris de `EmployeeDto`, aucune nouvelle saisie), `payPeriodStartDate`, `payPeriodEndDate` (bornes calendaires dérivées de `PayPeriod.year`/`month`, réutilise la fonction pure `monthRange` déjà utilisée pour le calcul des heures enseignant). Aucune migration Prisma : ces champs sont calculés à la volée dans `payrollLineService.ts`, pas stockés.

### Modifié
- `generateBulletinSalaire` (`packages/api/src/services/documents/generators/bulletinSalaire.ts`) — réécriture complète : bandeau période/émission en pastilles vertes, cadre "Informations de l'employé" (nom, matricule, poste, département, adresse, téléphone, période, mode de paiement) en grille 2 colonnes teintée, tableaux GAINS (description/heures/taux/total/observation) et DÉDUCTIONS à coins arrondis et entêtes vert clair, net à payer en encadré à liseré vert, mention "en cas de litige" ancrée en bas de page. Palette dédiée à ce document (constantes locales, pas le thème d'impression générique) — vert doux, cohérent avec la nature du document ("il s'agit d'une paye").
- Branchements de données confirmés par le porteur du projet : coordonnées du bandeau/pied de page lues depuis Paramètres → Établissement (adresse/téléphone) et Campus (téléphone de la mention litige) — jamais codées en dur ; colonne "Obs." reliée au statut réel (mode de paiement enregistré → "Payé", sinon statut de validation) ; colonnes Heures/Taux remplies uniquement pour le personnel payé à l'heure (heures réellement exécutées + taux configuré), vides pour un salaire fixe.
- Signature "Le Comptable" : aucun changement de code — reprend le signataire déjà configurable (Paramètres → Documents → Signataires, rôle Comptable), rendu automatiquement par le moteur centralisé après ce générateur. **À vérifier côté réglages** : si le gabarit "Bulletin de salaire" (Paramètres → Documents → Modèles) n'a pas encore de signataire de rôle Comptable assigné, le cadre s'affichera vide (comportement volontaire du moteur, pas un bug) jusqu'à configuration.

Typecheck/lint propres sur `@isac-erp/shared` et `@isac-erp/api` ; suite de tests `@isac-erp/api` (111 tests) toujours au vert. Comme pour les changements de thème précédents, aucun rendu PDF n'a pu être généré et inspecté visuellement dans cet environnement (nécessite une ligne de paie VALIDEE réelle) — à confirmer par le porteur du projet en générant un bulletin réel.

---

## [Personnalisation graphique] — "Carte blanche, badge coloré" pour le tableau de bord principal — 2026-07-31

Retour du porteur du projet sur le tableau de bord principal (accueil) : les cartes chiffrées à fond plein coloré jugées à revoir. Choix arrêté après maquette (options A à E, spécifiquement pour cet écran — les tableaux de bord de module gardent leur style "anneau" retenu séparément) : carte blanche, seule l'icône garde sa couleur.

### Modifié
- `StatCard` (`packages/ui/src/components/StatCard.tsx`, tableau de bord d'accueil uniquement — refonte UI/UX Phase 3, distincte de `StatRingCard`) : fond passé de plein coloré à blanc (`--background`/`--foreground`, coins arrondis 16px, ombre douce qui s'accentue au survol) ; la couleur (sémantique `accent` ou décorative `color`) ne colore plus que le badge d'icône (44px).
- Correction au passage : les graphiques du tableau de bord (`ChartCard`, protégés depuis le 2026-07-30 pour rester sur fond blanc pur quelle que soit la couleur des fenêtres) laissaient transparaître le halo violet/rose ajouté juste avant (`--background-color` seul ne neutralise pas `--background-image`, propriété CSS distincte) — `backgroundImage: "none"` ajouté explicitement à leur style inline.

Typecheck/lint propres sur `@isac-erp/ui` et `@isac-erp/desktop`.

---

## [Personnalisation graphique] — Expérimentation "Bleu profond + halo" pour les fenêtres — 2026-07-31

Expérimentation demandée par le porteur du projet sur maquette (option D, parmi 5 propositions) : le fond plat des fenêtres (`--window`) reçoit deux halos diffus violet/rose en dégradés radiaux, pour donner de la profondeur — sans changer la couleur de base réglable depuis Paramètres.

### Ajouté
- `.window-surface` (`packages/ui/src/styles/globals.css`) : classe dédiée (couleur `--window` + deux `radial-gradient` violet/rose). Une classe séparée plutôt qu'un cumul `bg-window` + image de fond en `className`, pour la même raison que d'habitude : `cn()` n'a pas `tailwind-merge`, deux classes de fond concurrentes sur un même élément ne se fondent pas de façon fiable (voir `ChartCard`).

### Modifié
- Reçoivent `.window-surface` (remplace `bg-window`) : `body`, `Card` (variante par défaut), `Dialog`, et les 4 panneaux de dialogue ad hoc (`EnrollmentImportWizard`, `SubjectImportWizard`, `StudentImportWizard`, `UsersScreen`).
- L'entête de l'application (`AppShell.tsx`) reste volontairement en bleu plat (`bg-window`, inchangé) — repère "chrome" stable, distinct du contenu.

Typecheck/lint propres sur `@isac-erp/ui` et `@isac-erp/desktop`. Expérimentation explicitement demandée comme telle par le porteur du projet — à confirmer sur l'application réelle avant de la considérer définitive.

---

## [Personnalisation graphique] — Cartes "anneau de progression" des tableaux de bord de module — 2026-07-31

Retour du porteur du projet sur le tableau de bord "Inscriptions" (et par extension les tableaux de bord de module similaires) : les petites cartes chiffrées à bordure colorée, dupliquées dans 10 écrans, jugées peu lisibles sur le fond bleu des fenêtres. Choix arrêté après maquette (options A à E) : badge circulaire coloré ("anneau") portant le chiffre, à côté du libellé.

### Ajouté
- `StatRingCard` (`packages/ui/src/components/StatRingCard.tsx`, nouvel export) : carte `label`/`value`/`color` (bleu/violet/ciel/rose/émeraude/ambre) sur fond blanc fixe (`--background`, indépendant de `--window`). Les valeurs longues (montants formatés, ex. "1 250 000") ne tiennent pas dans l'anneau compact (44px) : au-delà de 3 caractères, l'anneau reste un simple repère de couleur et la valeur s'affiche en texte à côté, plutôt que de déborder. Distincte de `StatCard` (même dossier), qui reste la carte pleine et animée du tableau de bord d'accueil (refonte Phase 3) — non concernée par ce changement.
- `Card` accepte une nouvelle valeur `variant="static"` : fond blanc fixe (`--background`/`--foreground`), pour les cartes qui doivent rester lisibles quelle que soit la couleur des fenêtres réglée (retour explicite : "elles doivent être indépendantes des couleurs des fenêtres"). Appliquée à toutes les cartes de répartition/liste/graphique des mêmes tableaux de bord (sous les cartes chiffrées), qui héritaient jusque-là du bleu `--window` et devenaient peu lisibles.

### Modifié
- 10 écrans remplacent leur `StatCard` local dupliqué (`type StatColor` + `STAT_COLOR_CLASSES`/`STAT_VALUE_COLOR_CLASSES` + fonction, jusque-là copiés-collés à l'identique ou presque dans chaque fichier) par un simple import `StatRingCard as StatCard` — code de rendu inchangé côté appelant : Inscriptions, Comptabilité, Paie, Frais, Caisse, Pédagogie, Enseignants (tableau de bord + onglet Affectations), Pointage, Communication.

Typecheck/lint propres sur `@isac-erp/ui` et `@isac-erp/desktop`.

---

## [Personnalisation graphique] — Style "verre nacré" pour les sections de formulaire — 2026-07-31

Retour du porteur du projet sur l'écran "Nouvel enseignant" : les sections de formulaire (Card + entête + grille de champs) jugées trop plates. Choix arrêté après plusieurs allers-retours sur maquette (options A à E, puis approfondissement "Verre dépoli" D1 à D5 retenu, avec libellés passés en noir et accent en dégradé sur le bord gauche).

### Ajouté
- `Card` (`packages/ui/src/components/Card.tsx`) accepte désormais une prop `variant` : `"default"` (fenêtre bleue `--window`, comportement inchangé) ou `"form"` (nouveau — verre nacré : fond translucide dégradé blanc/rose/doré avec flou d'arrière-plan, voile diagonal nacré, bordure claire, accent plein en dégradé violet → rose sur toute la hauteur à gauche).
- Appliqué (`<Card variant="form">`) aux sections de formulaire de 16 écrans qui suivent le motif harmonisé de la refonte Phase 5 (`Card > CardHeader > CardTitle > CardContent` contenant des `FormField`) : fiches Étudiant/Enseignant/Employé (identité, coordonnées, situation), assistants d'import (Étudiants/Inscriptions/Matières), et plusieurs écrans de Paramètres (Établissement, Campus, En-tête institutionnel, Régionalisation, Numérotation inscriptions/étudiants, Gabarit carte étudiant).
- Les formulaires en boîte de dialogue (ex. rôles, salles, statuts enseignant...) restent inchangés — ils n'utilisaient pas `Card` pour leurs champs et ne correspondent pas au motif démontré sur la maquette ; hors périmètre de cette passe.

### Note technique
- L'accent latéral et le voile nacré sont peints via `background`/un vrai enfant flex, jamais un pseudo-élément `position:absolute` : un enfant positionné — même sans `z-index` explicite — passe toujours au-dessus d'un contenu en flux normal dans l'ordre d'empilement CSS, ce qui avait rendu les libellés illisibles sur la première version de la maquette. Cette version réécrite pour le composant réel n'a plus ce risque par construction.
- `Label`/`FormField` (texte des libellés/indications) lisent la variable `--window-foreground` (blanc, pensée pour la fenêtre bleue `--window`) : reconfinée localement à un ton quasi noir (`266 29% 9%`) sur le sous-arbre de la carte "form", sans toucher `Label.tsx`, `FormField.tsx` ni aucun des 16 écrans — même mécanisme de variable CSS scopée que `--window` lui-même.

Typecheck/lint propres sur `@isac-erp/ui` et `@isac-erp/desktop`. Comme pour les changements de thème précédents, aucun aperçu visuel pixel-par-pixel n'est possible dans cet environnement — à confirmer par le porteur du projet sur l'application en conditions réelles.

---

## [Personnalisation graphique] — Style "carte" pour toutes les lignes de tableau — 2026-07-31

Retour du porteur du projet sur le journal d'audit (Paramètres → Journal) : la présentation en lignes zébrées classique jugée trop plate. Choix arrêté après plusieurs allers-retours sur maquette (options nommées A à F, puis approfondissements C1 à C5 de l'option "Cartes empilées" retenue) : chaque ligne devient une carte blanche arrondie séparée, avec une bordure en dégradé violet → rose épaissie en accent sur le bord gauche ; entête inchangé (bandeau `--secondary` bleu plein, texte blanc).

### Modifié
- `DataTable`/`ServerDataTable` (`packages/ui/src/components/`) : table passée en `border-collapse: separate` avec un espacement vertical de 10px entre lignes (`style` inline — garanti, indépendant de la disponibilité de l'utilitaire `border-spacing` de Tailwind) ; nouvelles classes `table-head-card` (entête) et `table-row-card` (chaque ligne du corps), définies dans `packages/ui/src/styles/globals.css` sous un nouveau `@layer components`.
- Chaque ligne : fond blanc (impaires légèrement teintées violet très pâle `#FAF8FE`), liseré violet doux (`rgba(91,63,160,0.12)`) haut/bas, ombre portée douce qui s'accentue et se soulève légèrement au survol (`translateY(-2px)`), coins arrondis (14px) sur la première et la dernière cellule. Première cellule : accent en dégradé violet → rose (7px de large) sur toute la hauteur, via un pseudo-élément `::before`.
- Entête : coins arrondis (12px) sur la première et la dernière cellule, pour former un bandeau visuellement détaché des cartes en dessous (petit espace grâce au `border-spacing`).

### Note technique
- Le dégradé "carte" complet de la maquette (contour entier en dégradé) ne peut pas s'étendre proprement sur un `<table>` HTML natif à colonnes indépendantes et redimensionnables (chaque `<td>` est une boîte séparée) : seul le bord gauche (une cellule unique) porte le vrai dégradé ; le reste du contour est un liseré uni. Fidèle au rendu validé sur la maquette (artifact partagé en cours de session), sans sacrifier le redimensionnement de colonnes, le tri ou l'export.
- Padding gauche volontairement laissé au défaut Tailwind (`px-3`, 12px) plutôt que surchargé en CSS : une classe utilitaire de la couche `utilities` gagne toujours sur une règle de la couche `components`, quelle que soit sa spécificité — même limite déjà rencontrée avec `cn()` sans `tailwind-merge` (voir `ChartCard`). 12px laisse de toute façon assez d'air après la barre de 7px.

Typecheck/lint propres sur `@isac-erp/ui` et `@isac-erp/desktop`.

---

## [Personnalisation graphique] — Deuxième adoucissement des couleurs + zone de recherche globale — 2026-07-30

Deuxième retour du porteur du projet, sur une capture d'écran du tableau de bord réellement rendu : la première palette adoucie de `CARD_DECORATIVE` (entrée précédente) restait jugée trop marquée. Repéré à cette occasion que les cartes vertes/rouges/oranges du même écran utilisent les tons sémantiques `--destructive`/`--success`/`--warning`, valables sur toute l'application (boutons, alertes, badges) — adoucis en cohérence plutôt que de laisser un écart de ton entre le tableau de bord et le reste de l'app. Un troisième retour, hors capture, a signalé la zone de recherche globale de l'entête illisible (fond bleu foncé, texte gris clair).

### Modifié
- Palette décorative des cartes statistiques neutres (`CARD_DECORATIVE`, `HomeDashboardScreen.tsx`) adoucie une seconde fois : `#4A80B5 / #469171 / #947238 / #BA5E7D / #7860A9` — teintes nettement désaturées par rapport à l'essai précédent, contraste texte blanc toujours vérifié (valeur ≥ 3.5:1, libellé `text-white/80` ≥ 3:1).
- Tons sémantiques par défaut `--destructive`/`--success`/`--warning` (`packages/ui/src/styles/globals.css`) adoucis dans le même esprit : `#DC2626→#C24747`, `#15803D→#3A8857`, `#D97706→#BE7F37` (contraste texte blanc vérifié ≥ 3.3:1 sur chacun). Ces tons restent réglables individuellement depuis Paramètres → Apparence (voir entrée précédente) ; `DEFAULT_COLORS` de `ThemeScreen.tsx` synchronisé sur les mêmes nouvelles valeurs.

### Corrigé
- **Zone de recherche globale illisible** (`GlobalSearchBox.tsx`, entête de l'application) : fond `bg-muted/40` (gris très clair semi-transparent) posé sur le nouveau fond bleu de l'entête (`--window`) donnait un bleu foncé peu contrasté avec son texte gris clair. Passée en fond blanc plein (`bg-background`) et texte noir explicite (`text-foreground`) en permanence, cohérent avec les autres zones de saisie de l'application.

Typecheck/lint propres sur `@isac-erp/desktop`.

---

## [Tableau de bord] — Protection contre "Couleur des fenêtres" + palette adoucie — 2026-07-30

Retour du porteur du projet : le tableau de bord d'accueil (graphiques + petites cartes statistiques) ne doit **jamais** changer d'apparence sous l'effet de la "Couleur des fenêtres" (voir entrées précédentes), quelle que soit la couleur réglée — et la palette des petites cartes, assombrie la veille, est jugée trop agressive.

### Corrigé
- **Régression** : `ChartCard` (les 8 panneaux de graphiques du tableau de bord) utilise le composant `Card` partagé, devenu bleu — ses graphiques `recharts` (grille, axes, légendes, couleurs de séries) sont conçus pour un fond clair et ont hérité du bleu par effet de bord. Forcé en fond blanc/texte sombre **par style inline** plutôt qu'une classe Tailwind : `cn()` (`packages/ui/src/lib/cn.ts`) ne fait qu'un `clsx`, sans fusion `tailwind-merge` — deux classes de couleur de fond en conflit sont départagées par l'ordre du CSS compilé, pas par l'ordre des classes dans le JSX, donc une classe `bg-background` ajoutée en `className` n'aurait pas garanti de gagner sur le `bg-window` du composant `Card`. Un style inline gagne toujours, indépendamment de cet ordre. Correction structurelle de `cn()` (ajout de `tailwind-merge`) proposée en tâche séparée.
- Les cartes statistiques (`StatCard`) elles-mêmes ne sont pas concernées par cette régression : composant autonome, indépendant de `Card`.

### Modifié
- Palette décorative des cartes statistiques neutres (`CARD_DECORATIVE`, `HomeDashboardScreen.tsx`) adoucie : `#3E6FA0 / #2F8D6E / #A87B1F / #C15A82 / #6E5C9E` (contraste texte blanc vérifié ≥ 3.8:1, seuil WCAG large-texte 3:1) — remplace la version assombrie de la veille ("plus de couleurs (plus foncé)"), jugée trop agressive à l'usage. Palette des graphiques (`CATEGORICAL`/`SEQUENTIAL_BLUE`/`SEQUENTIAL_ORANGE`) inchangée, non concernée par ce retour.

Typecheck/lint propres sur les 5 packages.

---

## [Personnalisation graphique] — Corrections de lisibilité + couleurs par bouton — 2026-07-30

Retour du porteur du projet après un premier essai en conditions réelles de la "Couleur des fenêtres" (voir entrée précédente) : régression critique repérée (texte saisi invisible) plus deux demandes de réglages supplémentaires.

### Corrigé (régressions introduites par la "Couleur des fenêtres")
- **Texte saisi invisible dans les zones de saisie** — `Input`/`Select`/tous les `<textarea>` de saisie libre n'avaient pas de couleur de texte propre : ils héritaient désormais du blanc (`text-window-foreground`) porté par leur `Card` ancêtre, sur un fond lui-même resté blanc (`bg-background`) → texte blanc sur blanc, invisible. Corrigé par un `text-foreground` explicite sur chacun, indépendant du contexte.
- **Libellés des champs peu visibles** — `Label` utilisait `text-foreground` (marine foncé), pensé pour un fond blanc, désormais posé sur le fond bleu des cartes → contraste faible. Passé à `text-window-foreground` (blanc). Le texte d'aide de `FormField` (`text-muted-foreground`, gris) avait le même problème, passé à `text-window-foreground/70`.
- **Bouton "ghost"** (ex. "← Retour à la liste", cloche de notifications) — fond transparent + texte marine foncé, désormais illisible sur le fond bleu qui transparaît. Passé à `text-window-foreground` + survol assorti (`bg-window-foreground/10`).

### Ajouté
- **Couleur réglable par bouton** : jusqu'ici seuls les boutons "principal"/"secondaire" étaient personnalisables (success/destructive/warning étaient des tons sémantiques délibérément fixes, voir refonte UI/UX Phase 1). À la demande explicite du porteur du projet, 3 nouveaux réglages dans Paramètres → Apparence : "Couleur des boutons de suppression/annulation", "...de validation", "...d'avertissement" — nouveaux champs `ThemeSettings.destructiveColor/successColor/warningColor`, mappés sur `--destructive`/`--success`/`--warning`.

### Connu — limite non résolue (réduite, pas éliminée)
- Le texte secondaire gris (`text-muted-foreground`) posé directement sur une carte bleue reste à faible contraste **partout où il n'est pas encore passé en revue** — corrigé ponctuellement sur `FormField`/`ThemeScreen.tsx` (les zones directement en cause dans ce retour), mais pas dans un balayage systématique de tout le reste de l'application (aucun jeton unique ne peut résoudre ça d'un coup : `--muted-foreground` doit rester lisible aussi bien sur blanc — cas encore majoritaire — que sur bleu). Signaler au fur et à mesure les endroits gênants plutôt que d'attendre une passe complète.

Typecheck/lint propres sur les 5 packages ; 111 tests `packages/api` + 14 tests `packages/shared` + 5 tests `apps/desktop` toujours au vert.

---

## [Personnalisation graphique] — Couleur des fenêtres — 2026-07-30

Retour du porteur du projet : passer le fond de "toutes les fenêtres" du blanc au bleu des entêtes de tableau, en gardant les zones de saisie et le contenu des tableaux inchangés, et rendre cette couleur réglable (comme la couleur des boutons, déjà réglable).

### Ajouté
- Nouveau jeton `--window`/`--window-foreground` (`packages/ui/src/styles/globals.css`), distinct de `--background` : fond de `body`, `Card`, `Dialog`, l'entête de `AppShell`, et des boîtes de dialogue "maison" (assistants d'import, fenêtre de réinitialisation de mot de passe) — valeur par défaut = le même bleu que `--secondary` (celui des entêtes de tableau), recopiée en dur pour rester indépendante si `--secondary` change un jour. `--background` reste inchangé (blanc), toujours utilisé par `Input`/`Select`/les `<textarea>` et par le conteneur propre des tableaux (nouveau `bg-background text-foreground` explicite sur `DataTable`/`ServerDataTable`, pour qu'ils restent blancs même imbriqués dans une `Card` désormais bleue).
- `ThemeSettings.windowColor` (nouveau champ, migration appliquée) + nouveau sélecteur "Couleur des fenêtres" dans Paramètres → Apparence, au même endroit que Couleur principale/secondaire/boutons/menu — modifiable à volonté, aperçu en direct comme les autres couleurs.
- Bordure des zones de saisie (`Input`, `Select`, tous les `<textarea>` de saisie libre — motifs d'annulation, contenu de message, mentions légales...) passée en blanc (`border-white`), pour qu'elles apparaissent comme un encadré blanc net sur le nouveau fond bleu. Les menus déroulants flottants (recherche globale, notifications) restent blancs, inchangés — pas des "fenêtres" ni des zones de saisie à proprement parler.

### Connu — limite non résolue
- Le texte secondaire (`text-muted-foreground`, utilisé pour les indications/sous-titres) garde sa couleur grise habituelle, pensée pour un fond blanc — son contraste sur le nouveau fond bleu n'a pas pu être vérifié visuellement dans cet environnement (pas d'aperçu graphique disponible pour cette appli Electron ici). Si un texte secondaire est difficile à lire une fois l'appli ouverte, c'est un ajustement rapide et isolé (un seul jeton à revoir), à signaler.

Typecheck/lint propres sur les 5 packages ; 111 tests `packages/api` + 14 tests `packages/shared` + 5 tests `apps/desktop` toujours au vert.

---

## [Emploi du temps + Pointage] — Correction semestre, grille cochable par enseignant — 2026-07-30

Suite immédiate au chapitre précédent (retour du porteur du projet, même jour) : clarification du fonctionnement réel de l'établissement — **enseignement modulaire/semestriel**, pas annuel continu (2 semestres d'environ 4 mois et demi = 9 mois, école d'octobre à juin). Un enseignant n'est pas forcément reconduit d'un semestre à l'autre (charge de 2 à 10 cours/semestre, variable). Deux conséquences concrètes :

### Corrigé
- **Génération de séances recentrée sur le semestre** : le bouton "Reconduire..." du dialogue de génération de séances utilisait par erreur les dates de l'année universitaire entière — corrigé pour utiliser les dates du **semestre (`AcademicPeriod`)** de la matière (`subjectOffering`) du modèle de récurrence, seule période sur laquelle un modèle est réellement valide. `SeanceRecurrenceTemplateDto` gagne `periodId`/`periodLabel`/`periodStartDate`/`periodEndDate`.

### Ajouté
- **Onglet "Pointage" sur la fiche enseignant** : nouvelle grille cochable, mois en cours par défaut (sélecteur mois/année), une ligne par séance réelle de son emploi du temps déjà renseigné (toujours basée sur le calendrier réel, jamais une grille abstraite) — coché = heures exécutées, décoché = pas encore, enregistrement en une fois via "Enregistrer le pointage". Les séances reportées/annulées/remplacées (motif requis) restent réservées au dialogue "Qualifier" existant, en dehors de la grille simple. Nouvelle mutation `seances.saveMonthlyPointage` (bascule EFFECTUEE ⇄ PROGRAMMEE dans les deux sens, ignore les fiches clôturées).
- Ce pointage alimente directement la paie sans étape supplémentaire : `getTeacherPayrollHours` (Module 8, déjà existant) lit les mêmes séances EFFECTUEE — ouvrir Paie → Périodes de paie sur le mois correspondant après enregistrement affiche le total, payable une fois le bulletin calculé/validé.

Typecheck/lint propres sur les 5 packages ; 111 tests `packages/api` + 14 tests `packages/shared` + 5 tests `apps/desktop` toujours au vert.

---

## [Emploi du temps + Pont Enseignant → Paie] — Ergonomie, retour du porteur du projet — 2026-07-30

Suite à un premier cycle de tests réels par le porteur du projet (voir reset de données ciblé documenté séparément) : deux confusions identifiées, l'une sur l'emploi du temps (récurrence 100 % manuelle, plage de dates à ressaisir à chaque fois), l'autre sur la paie des enseignants (aucun moyen de repérer les enseignants affectés à des matières mais sans profil de paie créé — invisibles dans "Calculer tous les bulletins"). Diagnostic précis avant tout développement (voir rapport d'investigation) ; aucune régression, uniquement de l'existant complété.

### Ajouté
- **Pont Enseignant → Paie** : bouton "Ajouter à la paie" sur la fiche enseignant (visible seulement si aucun Employé n'est encore lié) — ouvre directement la création d'un Employé, enseignant présélectionné, sans passer par le menu déroulant caché de Paie → Employés. Nouveau champ `TeacherDto.payrollEmployeeId`.
- **Nouvel onglet "Enseignants sans profil de paie"** (module Paie) : liste tous les enseignants ayant au moins une matière affectée sur l'année universitaire active — y compris ceux sans Employé, jusqu'ici invisibles partout dans la Paie — avec accès direct à la création du profil manquant. Nouvelle fonction `listTeachersPayrollStatus` (part de `TeacherAssignment`, le référentiel réel "qui enseigne quoi", pas de `Employee`).
- **Génération de séances sur tout le semestre** : bouton "Reconduire sur tout le semestre" dans le dialogue de génération de séances (module Emploi du temps) — préremplit Du/Au avec les dates du semestre de la matière du modèle, en un clic. **Corrigé le même jour** (voir entrée suivante) : d'abord livré sur toute l'année universitaire, ce qui ne correspond pas au fonctionnement réel de l'établissement (enseignement modulaire/semestriel).
- **Qualification groupée des séances** (Pointage) : les séances passées encore PROGRAMMEE sont présélectionnées comme "effectuées" par défaut à l'ouverture d'une fiche ouverte ; l'admin ne décoche que les exceptions (absence, cours annulé, report) avant de valider en un clic, plutôt que de qualifier séance par séance. Nouvelle mutation `seances.qualifyBulk`, ignore silencieusement les séances déjà qualifiées ou dont la fiche est clôturée.

Typecheck/lint propres sur les 5 packages ; 111 tests `packages/api` + 14 tests `packages/shared` + 5 tests `apps/desktop` toujours au vert.

---

## [Reçu de paiement / Bulletin de paie] — Migration vers le moteur PDF Module 9 — 2026-07-30

Dernier chantier du lot "reste à construire" identifié fin de chapitre "Rapports comptables/de caisse" (voir plus bas) : `ReceiptView.tsx`/`PayslipView.tsx` généraient jusqu'ici un rendu HTML imprimé via `window.print()`, hors du moteur PDF centralisé — désormais migrés.

### Ajouté
- `DocumentType.RECU_PAIEMENT` et `BULLETIN_SALAIRE` gradués du Tier 2 (catalogue seul) au Tier 1 (génération réelle) — `generators/recuPaiement.ts` et `generators/bulletinSalaire.ts`, reprenant fidèlement le contenu/calculs déjà affichés par les anciens écrans, sans changement de logique métier.
- **Reçu de paiement** : réutilise `Payment.receiptNumber` déjà attribué à l'encaissement (Module 4.3) comme numéro du document archivé — **aucune nouvelle série de numérotation**, pour éviter deux numéros différents désignant le même reçu.
- **Bulletin de paie** : nouvelle série `BULLETIN_SALAIRE` (`BS-{COMPTEUR}-{AA}`), uniquement proposé pour les lignes de paie `VALIDEE` (données figées, comme avant). Le double exemplaire Employé/Administration reste absent (retiré précédemment à la demande du porteur du projet).
- **Idempotence** (nouvelle règle, propre à ces deux types) : `documentEngineService.generateDocument` renvoie le document déjà archivé au lieu d'en générer un nouveau si un `RECU_PAIEMENT`/`BULLETIN_SALAIRE` existe déjà pour ce paiement/cette ligne de paie — contrairement aux autres types Tier 1 (certificat, attestation...) où une réémission délibérée reste possible à chaque clic. Nécessaire ici car ces deux écrans se rouvrent librement (historique, fiche étudiant/employé) sans qu'il s'agisse d'une nouvelle demande de document.
- `resolveRelatedEntityLabel` centralisé dans `documentEngineService.ts` (déplacé depuis `generatedDocumentService.ts`, qui l'importe désormais) pour être réutilisable par la vérification d'idempotence sans import circulaire ; gagne les cas `Payment`/`PayrollLine`.
- `ReceiptView.tsx`/`PayslipView.tsx` réécrits : génèrent (ou récupèrent) le PDF officiel à l'ouverture, proposent un lien "Voir / imprimer le PDF" — `window.print()` et le rendu HTML/CSS `data-print-area` associés supprimés pour ces deux écrans.

Typecheck/lint propres sur les 5 packages ; 111 tests `packages/api` + 14 tests `packages/shared` + 5 tests `apps/desktop` toujours au vert.

**Chantier "reste à construire" du chapitre Rapports comptables/de caisse maintenant clos.**

---

## [Refonte UI/UX] — Phase 1 : Fondations — 2026-07-30

Périmètre validé avec le porteur du projet (2026-07-30) : refonte complète de l'interface (charte graphique, coquille applicative, tableau de bord, tableaux, formulaires, recherche globale, centre de notifications), livrée phase par phase. Contrainte explicite du porteur du projet, à respecter sur tout le chapitre : **ne modifier aucune logique métier déjà développée — uniquement l'apparence, l'ergonomie et l'expérience utilisateur**, en conservant toutes les fonctionnalités existantes. Bibliothèques retenues (validées via question structurée) : `lucide-react` (icônes) et `recharts` (graphiques).

### Ajouté
- Jeton `--warning` (orange, HSL, `packages/ui/src/styles/globals.css`) — réservé exclusivement aux avertissements (le rouge reste pour les alertes, le vert pour les validations), mappé dans `tailwind-preset.ts` et propagé à `Button` (variante `warning`) et `Badge` (variante `warning`).
- `lucide-react` ajouté à `packages/ui` et `apps/desktop` ; `recharts` ajouté à `apps/desktop` (graphiques du futur tableau de bord, Phase 3).
- `Button` : support d'une icône (`icon`/`iconPosition`), animation au clic (`active:scale-97`), ombre au survol ; variantes `outline`/`ghost` désormais visuellement distinctes de `secondary` (bordure seule / transparent, au lieu d'un alias).
- `Dialog` : icône + teinte de titre selon la nature de l'action (`variant`), bouton de fermeture (×), fermeture au clic sur l'overlay, animation d'ouverture (fondu + léger zoom), hauteur maximale avec défilement interne du corps (`max-h-[90vh]`) pour les grands formulaires. Structure interne désormais scindée en en-tête (`data-dialog-header`) et corps (`data-dialog-body`) — surcharges d'impression (`globals.css`) mises à jour en conséquence pour que les reçus/bulletins imprimés (Dialog + `[data-print-area]`) restent inchangés.

### Modifié
- `--primary`/`--button`/`--menu` : bleu marine légèrement plus foncé et plus désaturé (220 65% 18%, au lieu de 217 91% 24%).
- `--muted` : gris très clair neutre (220 14% 96%, au lieu d'un gris-bleuté provisoire) — fond des surfaces secondaires, lignes alternées, zones désactivées.
- `--radius` : 10px (au lieu de 8px) — coins plus arrondis sur tous les composants partagés (boutons, champs, cartes, dialogues).

**Reste à construire (phases suivantes, cf. `ROADMAP.md`)** : coquille applicative (barre du haut + menu latéral catégorisé), tableau de bord unifié, tableaux avancés (redimensionnement, menu contextuel, export PDF...), harmonisation des formulaires module par module, recherche globale, centre de notifications.

**Retour du porteur du projet** : texte du menu latéral illisible (noir sur fond bleu marine) après l'introduction de la variante `ghost` (transparente par défaut, alors que les onglets du menu reposaient jusque-là sur l'ancien alias `ghost = secondary`). Corrigé en forçant `text-menu-foreground` (blanc) + un survol `hover:bg-white/10` adapté au fond sombre sur les 15 boutons de navigation (`AppShell.tsx`).

---

## [Refonte UI/UX] — Phase 2 : Coquille applicative — 2026-07-30

### Ajouté
- `AppShell.tsx` réécrit : barre du haut enrichie (logo + nom de l'établissement, campus, année académique active en badge, horloge en direct, utilisateur connecté + rôle, bouton de déconnexion avec icône) ; menu latéral regroupé en **8 catégories** (Administration, Étudiants, Scolarité, Finances, Personnel, Communication, Documents, Paramètres — icônes `lucide-react`), avec une recherche de module en direct et un mode replié (icônes seules, infobulles). Périmètre fonctionnel strictement inchangé : mêmes 15 sections, mêmes permissions, mêmes écrans affichés.
- Données live du bandeau : `trpc.establishment.get` (logo/nom), `trpc.campus.get` (campus de l'installation), `trpc.academicYears.list` filtré sur `isActive` (année académique active), horloge cliente (`setInterval` 1s).

**Reste à construire (phases suivantes, cf. `ROADMAP.md`)** : tableau de bord unifié, tableaux avancés, harmonisation des formulaires, recherche globale, centre de notifications.

---

## [Refonte UI/UX] — Phase 3 : Tableau de bord unifié — 2026-07-30

### Ajouté
- Nouvel écran d'accueil `HomeDashboardScreen` (épinglé en haut du menu latéral, hors des 8 catégories, devenu l'écran par défaut au démarrage) : 16 cartes statistiques animées (`StatCard`, nouveau composant partagé `packages/ui`, compteur qui s'anime de l'ancienne à la nouvelle valeur) et 8 graphiques `recharts` (évolution des inscriptions, des recettes, des dépenses, historique des encaissements, paiements mensuels, répartitions par filière/niveau/sexe). Palette de graphiques choisie et validée avec le script de la compétence `dataviz` (séparation CVD ≥ 8, contraste ≥ 3:1), volontairement distincte des couleurs de statut (rouge/vert/orange) de la charte.
- Nouveau point d'entrée `trpc.homeDashboard.get` (`packages/api/src/routers/homeDashboard.ts` + `services/homeDashboardService.ts`) : **compose** les tableaux de bord de module déjà existants (inscriptions, paiements, finances, enseignants, pédagogique) plutôt que de dupliquer leur logique métier ; calcule quelques agrégats légers et nouveaux là où c'était un vrai manque (inscrits du jour, étudiants débiteurs, séances de la semaine, séries mensuelles/journalières). Chaque section n'est calculée que si l'utilisateur possède déjà la permission de lecture du module correspondant (même principe que partout ailleurs dans l'ERP : jamais de donnée calculée puis simplement masquée côté client).
- Nouveau schéma partagé `packages/shared/src/schemas/homeDashboard.ts`.

### Modifié (retour du porteur du projet, même jour)
- `StatCard` : passage d'un liseré/icône teintés à un **fond plein coloré** (une teinte franche par carte, texte blanc) — retour "apporte de la couleur au tableau de bord" puis "plus de couleurs (plus foncé)". Cartes neutres (comptages sans statut) : nouvelle palette décorative foncée dédiée (`CARD_DECORATIVE`), distincte des jetons sémantiques. Cartes à statut réel (encaissé = succès, débiteurs/alertes = alerte, en attente = avertissement) : gardent les jetons `--success`/`--destructive`/`--warning` déjà très saturés, désormais aussi en fond plein.
- Palette des 8 graphiques assombrie (nouvelles valeurs hex) et **revalidée** avec le script de la compétence dataviz (mêmes seuils : lightness band, chroma, CVD ΔE ≥ 8, contraste ≥ 3:1) — tous les contrôles passent. En-tête de chaque graphique enrichi d'un liseré supérieur et d'un point coloré reprenant la teinte de sa série.

### Substitutions transparentes (aucune entité réelle correspondante dans le modèle de données)
- **« Examens »** (cahier des charges) → nombre de périodes d'évaluation actives à la date du jour (le Module 6 gère des notes/bulletins par période, pas des examens distincts).
- **« Alertes importantes »** → composite messages de communication échoués + cartes d'étudiant expirées, en attendant un vrai centre d'alertes (voir phase finale).

**Reste à construire (phases suivantes, cf. `ROADMAP.md`)** : tableaux avancés, harmonisation des formulaires, recherche globale, centre de notifications.

---

## [Refonte UI/UX] — Phase 4 : Tableaux avancés — 2026-07-30

### Ajouté
- `tableExport.ts` : nouvelles fonctions `exportRowsToPdf` (import dynamique `jspdf`+`jspdf-autotable`, chargées seulement quand un export PDF est réellement déclenché) et `copyRowsToClipboard` (format TSV, collable directement dans Excel/Sheets). `jspdf`/`jspdf-autotable` ajoutés à `packages/ui`.
- `useColumnWidths` (nouveau hook) : redimensionnement de colonnes par glissement, partagé entre `DataTable` et `ServerDataTable`.
- `useMultiSort` (nouveau hook, `DataTable` uniquement) : clic = tri sur une seule colonne, Maj+clic = ajoute/retire un critère de tri secondaire sans perdre les précédents (numéro de priorité affiché en exposant). `ServerDataTable` garde un tri mono-colonne — son contrat de tri est délégué au serveur et ne porte qu'une seule clé.
- `TableContextMenu`/`useTableContextMenu` (nouveaux, partagés) : menu contextuel au clic droit sur une ligne, via le nouveau prop `rowContextActions`.
- `DataTable`/`ServerDataTable` : nouveau prop `onRowDoubleClick` (ouvrir une fiche détaillée) ; menu "Exporter" unifié (Excel/CSV/PDF/Copier) remplaçant le bouton CSV seul de `DataTable` et les slots `onExportCsv`/`onExportExcel` optionnels de `ServerDataTable` (conservés en tant que callbacks pour exporter le jeu de données complet — sinon l'export porte sur la page affichée, précisé dans le menu).

**Rétrocompatibilité** : tous les nouveaux props sont optionnels — aucun écran existant (~90 utilisations de `DataTable`/`ServerDataTable`) n'a eu besoin d'être modifié ; typecheck/lint propres sur `packages/ui` et `apps/desktop`.

**Reste à construire (phases suivantes, cf. `ROADMAP.md`)** : harmonisation des formulaires, recherche globale, centre de notifications.

---

## [Refonte UI/UX] — Phase 5 : Harmonisation des formulaires (fondations + pilote) — 2026-07-30

### Ajouté
- `FormField` (nouveau composant partagé) : libellé + astérisque rouge optionnel (`required`, une décision d'UX explicite par écran, jamais déduite automatiquement du schéma Zod) + message d'erreur élégant (icône + texte) + texte d'aide optionnel. Injecte automatiquement `aria-invalid` sur son unique enfant (`Input`/`Select`).
- `Input`/`Select` : nouveau prop `icon` (lucide-react, affichée à gauche du champ) et bordure/anneau de focus rouges automatiques via `aria-invalid` — un seul jeton visuel de validation, cohérent partout où `FormField` est utilisé.
- **Déploiement complet** : les 32 formulaires `react-hook-form`+Zod du projet (validation en temps réel déjà en place partout, seul le patron d'affichage manquait d'harmonisation) convertis vers `FormField` — Utilisateurs, Rôles, Authentification (connexion/bootstrap/réglages techniques), Étudiants (fiche/identité/tuteur lié/imports), Enseignants (fiche/identité), Paie (fiche employé/onglet paie), et la quasi-totalité des écrans Paramètres (établissement, campus, en-tête institutionnelle, années, filières, niveaux, classes, salles, régionalisation, régimes/numérotations, matières, statuts/types de contrat enseignants, catégories employés/composants de paie, modèle de carte étudiant). Champs marqués `required` un par un contre leur schéma Zod (jamais déduits automatiquement — un champ optionnel en mise à jour partielle peut rester présenté comme obligatoire à la saisie, ex. nom/prénom). Trois blocs local `function Field(...)` dupliqués supprimés au passage (Étudiants, Enseignants, Établissement).

Typecheck/lint propres sur `packages/ui` et `apps/desktop` après chaque lot ; aucune régression sur les 111 tests `packages/api` ni les 14 tests `packages/shared`.

---

## [Refonte UI/UX] — Phase finale : Recherche globale + centre de notifications — 2026-07-30

Seule phase du chapitre nécessitant de la logique métier nouvelle (recherche cross-entités, événements de notification) — écart assumé avec la consigne "aucune logique métier" du chapitre, validé explicitement par le porteur du projet lors du cadrage.

### Recherche globale
- Nouveau routeur `trpc.globalSearch.search` + `globalSearchService.ts` : composite en lecture seule sur Étudiants/Enseignants/Classes/Filières/Documents/Paiements, même principe que `homeDashboard` (une catégorie calculée seulement si l'utilisateur a déjà la permission de lecture du module correspondant). « Facture » et « examens » du cahier des charges omis — aucune entité réelle correspondante (déjà établi lors de la Phase 3).
- `GlobalSearchBox` (nouveau, barre du haut) : recherche instantanée avec délai (200 ms), résultats groupés par catégorie.
- Ouverture directe de la fiche pour Étudiants (mécanisme `openStudentId` déjà existant) et **Enseignants** (nouveau : `openTeacherId`/`onOpenTeacherIdConsumed` sur `TeachersModuleScreen`/`TeachersScreen`, exactement la même convention). Classes et Filières : nouveau `initialSection` sur `SettingsShell` (bascule vers le bon onglet Paramètres, pas la ligne exacte — aucune fiche détaillée dédiée aujourd'hui). Documents et Paiements : bascule vers le bon écran seulement (idem, pas de fiche détaillée).

### Centre de notifications
- `NotificationBell` enrichi : bouton "Tout marquer comme lu" (nouvelle mutation `internalNotifications.markAllRead`), écran "Voir toutes les notifications" (Dialog, liste complète), clic sur une notification qui navigue vers l'écran concerné via son `linkType` (`payment`/`document`/`settings-backup`).
- 3 nouveaux points d'appel `createInternalNotification()` (fonction déjà existante, réutilisée telle quelle) : paiement enregistré (`paymentService.createPayment`), document généré (`documentEngineService.generateDocument`), paramètres restaurés (`routers/settingsBackup.ts`, sur `import` uniquement — l'export seul, en lecture, est trop fréquent pour justifier une notification).
- **Catégories non couvertes** (reconnues par l'écran mais sans déclencheur automatique) : Étudiants débiteurs, alertes système, mises à jour — nécessiteraient un mécanisme de tâche planifiée/périodique qui n'existe pas dans ce projet (application desktop, pas de cron serveur). SMS/e-mails envoyés étaient déjà couverts par `campaignService.ts` avant ce chapitre.

Typecheck/lint propres sur `packages/shared`/`packages/api`/`apps/desktop` ; 111 tests `packages/api` + 14 tests `packages/shared` toujours au vert.

**Chapitre "Refonte UI/UX" terminé** — les 6 phases (Fondations, Coquille applicative, Tableau de bord, Tableaux avancés, Formulaires, Recherche/Notifications) sont livrées.

---

## [Rapports comptables/de caisse] — Migrations préalables — 2026-07-30

Périmètre validé avec le porteur du projet (2026-07-30) : Journal de caisse, Grand livre de caisse, Situation de caisse journalière, Rapports de caisse quotidien/mensuel/annuel, État des recettes, Bilan mensuel/semestriel/annuel — en plus de la migration vers le vrai moteur PDF du reçu de paiement et du bulletin de paie (actuellement des vues `window.print()`). Un audit du modèle de données a précédé tout développement — voir ADR-053.

### Ajouté
- `AccountType.CAPITAUX_PROPRES` (6e valeur du plan comptable) — rend un Bilan correct calculable (Actif = Passif + Capitaux propres), auparavant impossible à distinguer du Passif.
- `Expense.cashRegisterSessionId` (facultatif) — attribue une dépense à la caisse/session précise dont elle est sortie ; sélecteur ajouté à l'écran de saisie des dépenses (caisses actuellement ouvertes uniquement).

### Décidé
- Bilan annuel sur **année civile** (référentiel comptable OHADA/SYSCOHADA), pas sur l'année académique (oct.–juin) utilisée partout ailleurs dans l'application — voir ADR-053.
- Journal de caisse et Situation de caisse journalière seront **par caisse physique**, pas seulement au niveau global.

### Ajouté (suite — 3 premiers générateurs)
- **Grand livre de caisse** (`GRAND_LIVRE_CAISSE`) : mouvements d'un compte de trésorerie choisi, avec solde d'ouverture/courant/clôture — réutilise `getGeneralLedger` (déjà existant, Module 7) sans nouvelle logique.
- **État des recettes** (`ETAT_RECETTES`) : paiements validés sur une période, répartis par type de frais — réutilise `getRevenueSummary`.
- **Rapport de caisse** (`RAPPORT_CAISSE`, gradué du Tier 2 au Tier 1) : recettes/dépenses/solde sur une période journalière/mensuelle/annuelle, titre dynamique selon la période choisie — réutilise `getReportByPeriod` et le nouveau `renderIdentificationBox`.
- Écran "Documents → Générer" étendu (sélecteur de compte de trésorerie, dates, période).

### Ajouté (suite — Journal de caisse et Situation de caisse journalière)
- **Journal de caisse** (`JOURNAL_CAISSE`) : mouvements espèces chronologiques d'**une session de caisse précise** (une ouverture → fermeture), recettes et dépenses confondues (via le nouveau lien `Expense.cashRegisterSessionId`), solde courant depuis le solde d'ouverture déclaré — nouvelle fonction `getCashRegisterJournal`.
- **Situation de caisse journalière** (`SITUATION_CAISSE_JOURNALIERE`) : position d'**une caisse physique précise** pour un jour donné (ouverture/recettes/dépenses/solde théorique, écart si une session a été fermée ce jour-là) — par opposition au Rapport de caisse quotidien (toutes caisses confondues) — nouvelle fonction `getDailyCashPosition`.

### Ajouté (suite — Bilan, dernier élément du périmètre)
- **Bilan mensuel/semestriel/annuel** (`BILAN`) : Actif = Passif + Capitaux propres + Résultat de l'exercice, sur année civile (OHADA/SYSCOHADA) — nouvelle fonction `getBilan`, qui réutilise `getTrialBalance` (déjà existant, Module 7) pour les soldes Actif/Passif/Capitaux propres, cumulés depuis l'origine du plan comptable jusqu'à la date de clôture demandée (comme une balance) ; le Résultat de l'exercice, lui, est recalculé séparément depuis le 1er janvier de l'année civile de cette date (comptes de produits/charges = comptes de flux, remis à zéro chaque exercice), via le même helper `sumLinesByAccountType` utilisé par le tableau de bord financier.
- Écran "Documents → Générer" étendu (sélecteur période Mensuel/Semestriel/Annuel + date de clôture facultative).

**Chapitre "Rapports comptables/de caisse" terminé** — les 6 rapports validés le 2026-07-30 sont tous livrés (Grand livre de caisse, État des recettes, Rapport de caisse, Journal de caisse, Situation de caisse journalière, Bilan). **Reste à construire** (hors périmètre de ce chapitre) : la migration du reçu de paiement/bulletin de paie vers le moteur PDF Module 9 (actuellement des vues `window.print()`).

---

## [Carte de paiement] — Nouveau document, validé — 2026-07-30

Extension hors Module 9.1, "même modèle" que la carte d'étudiant (recto/verso 54×86mm, `paymentCardEngine.ts`/`paymentCardService.ts`, documentType `CARTE_PAIEMENT`, série de numérotation dédiée `CP-{COMPTEUR}-{AA}`). **Design validé par le porteur du projet le 2026-07-30** après un round d'ajustements.

### Ajouté
- Face A : identité (nom/prénom/matricule/filière/niveau) + montants SCOLARITÉ et INSCRIPTION (ce dernier cumulant frais d'inscription + carte d'étudiant + assurance, tous résolus via `getStudentFeeSummary`/`FeeTariff` — MODULE-04.2 §1.3). Fond vert clair, bandeaux verts (au lieu du bleu marine de la carte d'étudiant), mention « Tout paiement effectué est non remboursable » dans le bandeau bas.
- Face B : tableau d'échéancier (TRANCHE/MONTANT/SIGNATURE, colonne Signature volontairement vide pour signature manuscrite à chaque tranche payée), nombre de lignes piloté par l'échéancier réellement configuré (`FeeInstallmentPlan`/`FeeInstallment`) — remplace le cadre de signature du Directeur de la carte d'étudiant. Mention « LE SERVICE SCOLARITÉ » en rouge sous le bandeau du campus. Bandeau bas affiche l'année universitaire.
- Aucun cycle de vie propre (contrairement à `StudentCard`) : chaque génération est simplement archivée dans `GeneratedDocument`, la carte physique étant ensuite signée à la main au fil des paiements réels.
- Nouvelle valeur `NumberingPurpose.CARTE_PAIEMENT` ; router `paymentCards` (`generate`, permission `DOCUMENTS:CREATION`).

### Décidé
- Pas de QR code sur cette carte (retiré sur demande) — le tableau d'échéancier occupe tout l'espace ainsi libéré.
- Le contour rouge de la carte est explicitement redessiné par-dessus tous les bandeaux (fin de rendu) pour ne jamais être masqué par leur remplissage pleine largeur.
- Écrans desktop (génération individuelle/par lot) non encore construits — prévus après validation du contenu, sur le même modèle que la carte d'étudiant.

---

## [Module 9.1] — Écrans desktop, contenu enrichi de l'attestation d'inscription, corrections diverses — 2026-07-30

### Ajouté
- **Module 9.1 — écrans desktop** : onglet "Carte d'étudiant" sur la fiche étudiant (génération, réémission, annulation avec motif, réimpression, historique complet des cartes) ; même parcours accessible directement depuis Documents → "Carte d'étudiant" (sélection d'un étudiant, génération individuelle) ; écran "Cartes d'étudiant par lot" (Documents → filtres année/classe/niveau/filière) ; écran "Modèle carte d'étudiant" (Paramètres → Documents). La carte d'étudiant a désormais son propre parcours dédié, distinct du générateur générique Tier 1.
- `pdfEngine.ts` — `renderIdentificationBox()` : cadre d'identification réutilisable à libellés en gras sur deux colonnes (attestations/certificats), et `formatAmount()` : formatage de montant avec séparateur de milliers "." fiable en PDF (voir Corrigé).

### Modifié
- **Attestation d'inscription** : contenu enrichi — formulation d'introduction officielle, cadre d'identification complet (nom, matricule, n° d'inscription, sexe, date/lieu de naissance, nationalité, filière, niveau, classe, année universitaire, campus, date d'inscription), paragraphes administratifs. L'en-tête institutionnelle n'a pas été modifiée.
- **Règle générale — signature/cachet (tous les documents officiels)** : la zone de signature est désormais toujours entourée d'un cadre, que le signataire soit configuré ou non — le cadre reste vide (jamais de mention "Signature non configurée") pour permettre une signature manuscrite sur le document imprimé.
- **QR code (tous les documents officiels)** : le numéro du document — déjà unique — est désormais imprimé sous le QR comme code de vérification manuelle.
- **"Fait à ..." (tous les documents officiels)** : cite désormais la ville réelle ("Conakry") plutôt que le libellé administratif interne du campus (`CampusSettingsDto` n'a pas de champ ville dédié).
- Ancien générateur générique "Carte d'étudiant" (Tier 1, `generators/carteEtudiant.ts`) retiré du sélecteur de l'écran "Documents → Générer" — code et données historiques conservés, mais non plus accessible depuis l'UI.

### Corrigé
- **Historique des paiements — séparateur de milliers** : `toLocaleString("fr-FR")` insère un espace fine insécable (U+202F) absent de l'encodage WinAnsi de la police Helvetica standard de `pdfkit`, ce qui l'affichait comme un "/" à l'impression. Remplacé par `formatAmount()` (séparateur ".", ex. 3.230.000).

---

## [Moteur PDF centralisé] — Corrections transversales — 2026-07-30

Retour du porteur du projet après premiers tests du Module 9 : anomalies de mise en page communes à tous les documents (liste des classes, listes d'étudiants, attestations, certificats...). Toutes les corrections ont été apportées **une seule fois** dans `pdfEngine.ts`, s'appliquant automatiquement à tous les documents actuels et futurs — aucun document n'a été corrigé individuellement.

### Corrigé
- **Bug majeur — pages blanches** : chaque document généré comportait une page fantôme en tête (`createDocument` combiné à `renderDocumentToBuffer` créait deux pages 1, `autoFirstPage` par défaut de `pdfkit` puis un `addPage()` explicite) **et** une page blanche supplémentaire par page existante lors du tamponnage du pied de page (`renderFooterOnAllPages` plaçait le texte au-delà de `page.height - margins.bottom`, ce qui déclenche silencieusement une pagination automatique chez `pdfkit`). Une liste à un seul étudiant produisait ainsi 4 pages dont 3 vides. Corrigé par `autoFirstPage: false` et par la mise à zéro temporaire de `margins.bottom` le temps du seul appel `.text()` du pied de page. Vérifié empiriquement (script jetable) et par un audit dédié de `pdfkit` avant correction — voir ADR-051.
- **Logos de l'entête regroupés à gauche** : le logo de l'école reste à gauche, tout logo secondaire (République/Ministère/campus/partenaire) passe désormais complètement à droite — les deux logos encadrent l'entête, jamais du même côté.
- **Texte de l'entête coupé sur deux lignes** ("ÉCOLE DE COMMERCE ET DE GESTION ISAC", "INSTITUT YOUNGOU MALIANNDO (I.Y.M.A.)") : chaque ligne de l'entête est désormais dessinée avec un `x`/`width` explicites calculés depuis l'empreinte réelle des logos, au lieu de laisser `pdfkit` déduire la position du texte de l'appel précédent (la devise tricolore, positionnée à un `x` non standard, rétrécissait silencieusement la zone de texte des lignes suivantes).
- **Centrage de l'entête** : les lignes (République, devise, école, institut, slogan) sont désormais centrées entre les deux blocs de logos, jamais décalées vers la droite ni centrées sur la page entière.
- **Titre des documents décalé à droite** : `renderDocumentTitle` centre désormais le titre sur toute la largeur utile de la page (marge à marge), avec un `x`/`width` explicites.

### Décidé
- Toutes les corrections centralisées dans `pdfEngine.ts` (aucune correction par document) — voir ADR-051.
- Police et interlignage augmentés pour les tableaux (`drawTable`, dorénavant paramétrable) et le texte des attestations/certificats, afin de mieux répartir le contenu sur la page — explicitement **hors** en-tête institutionnelle et hors futures cartes d'étudiant/de paiement, qui suivent une mise en page compacte dédiée.
- `ficheEmargement.ts` refactorisé pour réutiliser `drawTable` au lieu de dupliquer sa propre logique de tableau — élimine une seconde source potentielle des mêmes anomalies.

**Vérifié le** 2026-07-30 par un script de bout en bout jetable (compteur de pages réel sur les PDF générés contre PostgreSQL réel : 1 page pour une liste courte, 2 pages exactement pour un double exemplaire) puis par l'envoi de deux échantillons réels au porteur du projet pour confirmation visuelle.

---

## [Module 9] — Moteur Centralisé de Documents Officiels — 2026-07-29

### Ajouté
- Nouvelles tables : `institutional_header_settings` (singleton — bloc République/devise nationale/école/institut/slogan, entièrement configurable), `generated_documents` (archive — un fichier PDF réel par génération, numéro unique, QR code, jamais modifié après coup). Extensions additives : `campus_settings.logo_path` ; `document_template.show_campus_logo`/`show_qr_code`/`allow_double_exemplaire`/`secondary_copy_label` ; `print_theme_settings.footer_color`/`border_width_pt`/`margin_mm`/`paper_format`/`orientation` ; `document_type` et `NumberingPurpose` étendus (10 nouvelles valeurs Tier 1 chacun, 15 valeurs Tier 2 supplémentaires pour `document_type`).
- 4 nouvelles permissions (`DOCUMENTS:LECTURE`/`CREATION`, `PARAMETRES_DOCUMENTS:LECTURE`/`MODIFICATION`).
- `packages/api` : moteur PDF centralisé (`pdfkit`+`qrcode`) — `pdfEngine.ts` (en-tête institutionnelle tricolore, signature/cachet, QR, tableaux, pied de page multi-pages) et `documentEngineService.ts` (orchestrateur unique : numérotation par série indépendante, archivage sur disque, double exemplaire). 10 générateurs de contenu Tier 1 (Certificat de scolarité, Attestation d'inscription, Carte d'étudiant, Attestation de travail, Listes des étudiants/enseignants/classes, Fiche d'émargement, Emploi du temps, Historique des paiements), réutilisant les services existants (`employeeService.getEmployeeById`, `matriculeService.generateNumber`). Routers `documents`/`institutionalHeaderSettings`.
- `apps/desktop` : nouvel écran "Documents officiels" (génération par type + historique/téléchargement) ; Paramètres → En-tête institutionnelle (nouvel écran) ; Modèles de documents étendu (badge Disponible/Bientôt disponible sur les 33 types du catalogue, QR/logo campus/double exemplaire) ; Thèmes d'impression étendu (format papier, orientation, marges, épaisseur des bordures, couleur du pied de page) ; champ logo ajouté à l'écran Campus.
- 8 tests unitaires supplémentaires (payload QR, formatage de date, union discriminée par type de document avec rejet des types Tier 2 non implémentés) + vérification de bout en bout contre PostgreSQL réel (script jetable, supprimé après usage) confirmant des PDF réellement écrits sur disque et une numérotation indépendante par série.

### Décidé
- Moteur PDF réel via `pdfkit` (dessin natif, sans navigateur headless), capacité nouvelle et parallèle au moteur d'impression HTML/CSS existant — les 3 documents déjà validés (bulletin de paie, reçus, bulletins/relevés de notes) ne sont **pas** migrés dans cette livraison, pour ne prendre aucun risque de régression sur des fonctionnalités déjà testées — voir ADR-047.
- Réutilisation intégrale de l'infrastructure déjà posée par le Module 2 (`DocumentType`, `DocumentTemplate`, `DocumentSignatory`, `OfficialStamp`, `PrintThemeSettings`, `EstablishmentSettings`, `CampusSettings`) et du moteur de numérotation générique (`matriculeService.generateNumber`) — voir ADR-048.
- Portée de livraison à 10 types pleinement implémentés (Tier 1) sur un catalogue complet de 33 types enregistrés — les types déjà couverts par un écran HTML/CSS validé, ceux exigeant un contenu légal/RH non spécifié par le chapitre, et ceux nécessitant une mise en page de rapport dédiée restent au catalogue sans génération ("Bientôt disponible") — voir ADR-049.
- Double exemplaire (§15) rendu comme deux pages pleines successives dans le même fichier PDF plutôt qu'une mise en page à deux volets sur une seule feuille A4 physique, pour rester fiable avec un moteur de flux de texte générique partagé par 10 générateurs — voir ADR-050.
- "La devise" (§4 du chapitre) interprétée comme la devise nationale ("Travail – Justice – Solidarité"), pas la devise monétaire (déjà couverte sans rapport par `CurrencySettings`).

### Corrigé / appris
- Aucune anomalie signalée — développé, testé (typecheck/lint/tests unitaires propres sur les trois packages) et vérifié de bout en bout contre PostgreSQL réel avant toute mise à disposition.

**Livré sous autonomie complète le 2026-07-29** — le porteur du projet a explicitement autorisé un développement de bout en bout sans validation intermédiaire pour ce module ("je t'autorise à travailler de manière autonome jusqu'à son achèvement"). Conception, développement, tests et documentation réalisés en une seule session ; en attente du retour du porteur du projet après usage réel.

---

## [Module 12] — Centre de Communication Intelligent — 2026-07-29

### Ajouté
- Nouvelles tables : `communication_settings`, `sms_gateway_accounts` (comptes multiples, un seul `is_default`), `whatsapp_gateway_settings`, `email_gateway_settings`, `message_templates` (11 gabarits système), `notification_event_configs`, `campaigns`, `communication_messages` (historique dénormalisé), `internal_notifications`. Extension additive : `employees.whatsapp`.
- 11 nouvelles permissions (`COMMUNICATION*`/`CAMPAGNES*`/`MODELES_COMMUNICATION*`/`PARAMETRES_COMMUNICATION*`).
- `packages/api` : interface `ChannelAdapter` indépendante du fournisseur (`EmailAdapter` SMTP fonctionnel, `SmsAdapter` ciblant une passerelle Android locale générique, génération de lien `wa.me` pour WhatsApp) ; `communicationContactService` (carnet d'adresses transverse, aucune nouvelle table de contacts) ; `messageTemplateService` (moteur de substitution de variables) ; `campaignService` (audience résolue à la demande, planification récurrente, boucle de vérification périodique) ; `paymentNotificationService` et hooks additionnels dans les Modules 4.1 (inscription), 6 (bulletins) et 5.2 (changement de séance).
- `apps/desktop` : section "Communication" complète (tableau de bord, envoi rapide, campagnes, carnet d'adresses, modèles, historique avec file WhatsApp), sous-section Paramètres → Communication (Super Administrateur), cloche de notifications internes.
- 10 tests unitaires supplémentaires (substitution de variables, règle "reste à payer"/"solde soldé", exclusion de WhatsApp des canaux automatiques dès le schéma Zod).

### Décidé
- Carnet d'adresses transverse sans nouvelle table de contacts — lecture à la demande sur `Student`/`Guardian`/`Teacher`/`Employee`, jamais de copie synchronisée — voir ADR-044.
- Canal SMS ciblant une passerelle locale (téléphone Android dédié) via un adaptateur HTTP générique, faute de contrat SMS API cloud (le porteur du projet ne dispose que d'une puce prépayée Orange) — voir ADR-045.
- WhatsApp Business limité à un flux "cliquer pour envoyer" (lien `wa.me`, clic humain obligatoire) — l'application classique du porteur du projet n'a pas d'API, et une automatisation non officielle violerait les CGU WhatsApp (risque de bannissement du numéro). Conséquence structurelle : WhatsApp n'est jamais un canal éligible pour une notification automatique — voir ADR-046.
- Notification automatique de paiement (fonction obligatoire du chapitre) branchée sur la validation définitive du Module 4.3, envoi simultané à l'étudiant et à tous ses tuteurs marqués contact principal, jamais bloquante pour le paiement lui-même.

### Corrigé / appris
- Aucune anomalie signalée lors du test manuel — validé directement.

**Validé le** : 2026-07-29 — conception validée le même jour par le porteur du projet ("oui") après clarification des passerelles SMS (puce prépayée + téléphone Android dédié, pas de contrat Orange SMS API) et WhatsApp (application classique, automatisation écartée pour risque de bannissement), développement complet, parcours des écrans testé manuellement et confirmé ("OUI IL N'Y A AUCUN PROBLEME A CE NIVEAU").

---

## [Module 6] — Évaluation — 2026-07-29

### Ajouté
- Nouvelles tables : `evaluation_settings` (singleton — pondérations orale/écrite/composition, seuils de mention/admission), `notes` (référence directe `SubjectOffering`, note finale toujours calculée), `bulletins_periode`/`bulletins_annuels` (instantané figé, index unique **partiel** `WHERE annule = false` autorisant la régénération après annulation explicite) + `NumberingPurpose.BULLETIN_PERIODE`/`BULLETIN_ANNUEL`.
- 8 nouvelles permissions (`NOTES*`/`BULLETINS*`/`CLASSEMENT*`/`EVALUATION*`).
- `packages/api` : `noteService` (note finale/moyennes/mention/décision, fonctions pures testées séparément), `classementService` (classement par mérite avec ex-æquo façon classement sportif : 1, 1, 3), `bulletinPeriodeService`/`bulletinAnnuelService` (verrouillage des notes à la génération, alimentation de `student_enrollments.annual_average`/`mention`/`decision`), `feuilleSaisieService`, `evaluationSettingsService`.
- `apps/desktop` : section "Évaluation" (saisie des notes, bulletins de période/annuel imprimables, classement, feuille de saisie imprimable) et sous-section Paramètres → Évaluation.
- 16 tests unitaires supplémentaires (note finale, moyennes, mention/décision, classement avec ex-æquo).

### Décidé
- Bulletins rendus en écran HTML/CSS imprimable, **aucun fichier PDF stocké** — élimine la classe de bug de ligne orpheline identifiée dans le rapport d'analyse du système existant (`gestion_scolaire_NOUVEAU`) — voir ADR-041.
- `notes` référence directement `SubjectOffering` (Module 2.1) plutôt que de dupliquer matière/année/semestre/niveau/filière comme le système existant analysé — voir ADR-041.
- `decision` réutilise directement l'enum `EnrollmentDecision` (Module 4.1) plutôt qu'un enum dédié ; `student_enrollments.annual_average`/`mention`/`decision` (Module 4.1) attendaient précisément ce module pour être alimentés — réutilisation découverte en cours de développement, pas anticipée dans l'analyse initiale.
- Un seul bulletin **actif** par (étudiant, période/année) via un index unique partiel plutôt qu'une contrainte `@@unique` classique — permet la régénération après annulation explicite sans jamais perdre l'historique des bulletins annulés.

### Corrigé / appris
- Feuille de saisie imprimable : le champ "Classe" restait inaccessible — une seule affectation correspondant aux critères n'était jamais présélectionnée (même correctif déjà appliqué à l'écran Saisie des notes, oublié ici lors du développement initial).
- Découvert via le script de vérification de bout en bout (avant tout retour du porteur du projet) : une contrainte `@@unique` classique sur (étudiant, période) bloquait toute régénération d'un bulletin même après son annulation — corrigé par un index unique partiel (`WHERE annule = false`).

**Validé le** : 2026-07-29 — conception validée le 2026-07-28 par le porteur du projet ("oui"), développement complet, parcours des écrans testé manuellement et confirmé ("OUI") après correction de l'anomalie de la feuille de saisie.

---

## [Module 8] — Paie des enseignants et du personnel — 2026-07-28

### Ajouté
- Nouvelles tables : `employees` (sujet de paie unique, identité propre optionnelle sinon lue en direct depuis `teachers`), `employee_categories`, `pay_periods` (cycle OUVERT→EN_COURS→CLOTURE), `payroll_component_types`, `salary_advances`, `payroll_lines`, `payroll_line_components`, `payroll_settings` (singleton) + `NumberingPurpose.EMPLOYE`.
- 17 nouvelles permissions (`PAIE*`).
- `packages/api` : `employeeService` (résolution d'identité depuis `Teacher` quand lié, jamais dupliquée), `payPeriodService`, `payrollLineService` (moteur de calcul : intersection de dates pour les heures planifiées faute de suivi réel — voir ADR-035 —, brut/net, avances déduites), `salaryAdvanceService`, `payrollSettingsService` ; `journalEntryService` étendu (`recordPayrollValidationEntry`, intégration comptable conditionnelle et simplifiée — voir ADR-036).
- `apps/desktop` : section "Paie" (tableau de bord, employés, périodes de paie, bulletins, avances) et sous-section Paramètres (catégories d'employés, composants de paie, réglages).
- 7 tests unitaires supplémentaires (intersection de dates, heures planifiées, calcul brut/net).

### Décidé
- `Employee` conçu comme le **sujet de paie unique** pour le personnel administratif et les enseignants rémunérés, avec FK optionnelle vers `Teacher` plutôt qu'une duplication d'identité — voir ADR-034.
- Heures "réellement exécutées" approximées par les heures planifiées (affectations du Module 5), faute de tout mécanisme de suivi de présence réel dans l'ERP à ce stade — voir ADR-035. Explicitement provisoire, en attente d'un futur module de pointage dédié.
- Intégration comptable simplifiée : une seule écriture débit/crédit sur le salaire net, conditionnée à la configuration des comptes — voir ADR-036.
- Clôture d'une période de paie bloquée tant que tous les bulletins ne sont pas validés (règle métier ajoutée, cohérente avec le cycle décrit par le chapitre).

### Corrigé / appris
- Test manuel par le porteur du projet : création d'un employé silencieusement bloquée (catégorie obligatoire laissée vide sans erreur assez visible) — corrigé par présélection automatique de la première catégorie active et message Zod plus explicite.
- Recherche d'un employé par le matricule de l'enseignant lié ne fonctionnait pas — ajoutée au filtre de recherche (`buildListWhere`).
- Création d'une période de paie déjà existante renvoyait une erreur brute (500 Prisma) au lieu d'un message clair — pré-vérification ajoutée avec message en français.

**Validé le** : 2026-07-28 — conception validée le 2026-07-27 par le porteur du projet ("je suis ok"), développement complet, parcours des écrans testé manuellement et confirmé ("oui c'est bon") après correction des trois anomalies ci-dessus.

---

## [Module 5] — Gestion des enseignants — 2026-07-28

### Ajouté
- Nouvelles tables : `teachers`, `teacher_statuses`, `teacher_contract_types`, `teacher_assignments` (réutilise `SubjectOffering`/`Class` du Module 2.1/2), `teacher_weekly_availabilities`, `teacher_leaves`, `teacher_trainings`, `teacher_documents` + `NumberingPurpose.ENSEIGNANT`.
- 15 nouvelles permissions (`ENSEIGNANTS*`).
- `packages/api` : `teacherAssignmentService` (charge horaire, plafond, heures disponibles calculés à la volée via des fonctions pures `computeWeeksInRange`/`computeWorkloadFromPeriods`, réutilisées telles quelles par le Module 8), dossier numérique (documents, formations, disponibilités hebdomadaires, congés), tableau de bord.
- `apps/desktop` : section "Enseignants" (liste, fiche à onglets, tableau de bord) et sous-section Paramètres (Statuts, Types de contrat).
- 5 tests unitaires supplémentaires (calcul de charge horaire).

### Décidé
- Aucun moteur d'emploi du temps/de créneaux/de détection de conflits construit à ce stade : hors périmètre du chapitre, restera hors périmètre jusqu'à une demande explicite dédiée (documenté en §0 du module).
- Charge horaire calculée à la volée depuis les affectations actives plutôt que stockée, pour rester toujours cohérente avec les `SubjectOffering` réellement actives.

### Corrigé / appris
- Aucune anomalie de code détectée lors du développement ou de la vérification technique de bout en bout. Deux anomalies liées ont été détectées lors du test manuel du Module 8 (formulaire de création d'employé et recherche par matricule d'enseignant lié) — voir l'entrée [Module 8] ci-dessus.

**Validé le** : 2026-07-28 — conception validée le 2026-07-27 par le porteur du projet ("OUI"), développement complet, parcours des écrans de la section "Enseignants" testé manuellement et confirmé ("oui c'est bon").

---

## [Moteur de thèmes d'impression] — Extension transversale — 2026-07-28

### Ajouté
- `print_theme_settings` (singleton, 10 couleurs configurables), 2 thèmes prédéfinis (Noir administratif, Bleu institutionnel) + personnalisé — voir ADR-037.
- Nouvelle rubrique Paramètres → Apparence → Thèmes d'impression.
- Hook `usePrintThemeStyle()` et classes utilitaires `.print-*` (`packages/ui/src/styles/globals.css`), décorrélées du thème d'affichage de l'application (Module 2 §3.15) pour rester lisibles en impression noir et blanc quel que soit le thème visuel choisi.
- Appliqué au bulletin de paie (Module 8) et au reçu de paiement (Module 4.3) sans modifier leur structure, leurs calculs, leurs emplacements ou leurs dimensions.
- Bulletin de paie : double exemplaire automatique (Employé / Administration) séparé par une ligne pointillée, chaque exemplaire protégé d'une coupure de page (`break-inside: avoid`), bascule naturelle sur 2 pages si nécessaire.

### Décidé
- Architecture entièrement générique et transversale (variables CSS + classes utilitaires + un seul hook) : aucun document ne gère ses propres couleurs, tout futur document imprimable réutilise les mêmes classes sans développement spécifique — voir ADR-037.

### Corrigé / appris
- Aucune anomalie : livré et vérifié dans la fenêtre d'autonomie de 30 minutes accordée par le porteur du projet.

**Validé le** : 2026-07-28 — réalisé en autonomie complète et sans validation intermédiaire, sur autorisation explicite et détaillée (11 points) du porteur du projet avant son absence. Confirmé fonctionnel à son retour ("oui tout est en ordre").

---

## [Module 2.1] — Structure pédagogique — 2026-07-27

### Ajouté
- Nouvelles tables : `subjects` (matière, identité partagée entre filières), `teaching_units` (unités d'enseignement, total de crédits jamais stocké), `subject_offerings` (affectation d'une matière à un contexte année/semestre/niveau/filière optionnelle — coefficient, volumes horaires, obligatoire).
- 9 nouvelles permissions (`MATIERES*`/`MATIERES_IMPORT*`) ; ajout additif `EXPORT`/`IMPRESSION` aux catalogues déjà existants `ANNEES`/`FILIERES`/`NIVEAUX`/`CLASSES` du Module 2 (aucune permission existante modifiée).
- `packages/api` : `subjectService`, `teachingUnitService` (total de crédits et nombre de matières calculés à la volée), `subjectOfferingService` (résolution par spécificité — réutilise le modèle `FeeType`/`FeeTariff` du Module 4.2 — et contrôle de doublon de portée), `pedagogicalValidationService` (diagnostic informationnel : matière obligatoire manquante, volume horaire incohérent, coefficient manquant), `pedagogicalDashboardService`, `subjectImportService` (import Excel/CSV en 2 temps, sur le modèle de l'import étudiants).
- `apps/desktop` : nouvelle sous-section "Structure pédagogique" dans Paramètres (Matières, Unités d'enseignement, Affectations, Validation pédagogique, Tableau de bord pédagogique, assistant d'import).
- Design system (`packages/ui`), à la demande du porteur du projet une fois le module livré : en-têtes de tableaux recolorés (fond bleu, texte blanc) sur `DataTable`/`ServerDataTable` et les tableaux "faits main" restants ; nouvelle variante `Button` `success` (verte) ; boutons `outline`/`ghost` désormais colorés (texte blanc) au lieu de transparents ; recoloration sémantique d'une partie des boutons d'action existants (vert pour réactiver/activer/restaurer, rouge pour désactiver/supprimer/annuler une opération) — menu latéral volontairement laissé inchangé sur demande explicite.

### Décidé
- Aucune table du Module 2 reconstruite : années/semestres/filières/niveaux/classes du Chapitre 9 existaient déjà intégralement — périmètre réduit à ce qui manquait réellement, documenté en §0 de `MODULE-02.1-structure-pedagogique.md`.
- Modèle de spécificité de `FeeType`/`FeeTariff` (Module 4.2) réutilisé pour `Subject`/`SubjectOffering`, avec une fonction de résolution dédiée plus simple (une seule dimension optionnelle) plutôt que de forcer l'abstraction à 4 dimensions existante.
- Validation pédagogique conçue comme diagnostic informationnel, pas un verrou bloquant : aucun module consommateur (Emploi du temps, Notes) n'existe encore.

### Corrigé / appris
- Aucune anomalie détectée lors du développement ou de la vérification de bout en bout (typecheck/lint/build propres du premier coup sur les 5 packages).

**Validé le** : 2026-07-27 — conception validée par le porteur du projet ("OUI"), développement complet, 4 tests unitaires supplémentaires (62 au total sur `packages/api`), vérification de bout en bout contre PostgreSQL réel (résolution par spécificité, doublon de portée bloqué, total de crédits calculé, diagnostic pédagogique, import Excel/CSV) et démarrage réel du serveur API confirmés par l'assistant. Parcours des écrans testé manuellement et validé par le porteur du projet.

---

## [Module 7] — Comptabilité générale et gestion financière — 2026-07-27

### Ajouté
- Nouvelles tables : `chart_accounts` (plan comptable configurable, 7 comptes par défaut), `accounting_periods` (verrouillage par mois/année civile), `journal_entries`/`journal_entry_lines` (comptabilité en partie double), `expense_categories`, `suppliers`, `expenses`, `expense_documents` (pièces justificatives), `budgets`/`budget_lines`.
- Colonnes additives : `payment_methods.linked_account_id`, `fee_types.revenue_account_id` (Modules 4.2/4.3, nullables) — relient les référentiels existants au plan comptable.
- 27 nouvelles permissions (`COMPTABILITE*`/`ECRITURES*`/`DEPENSES*`/`FOURNISSEURS*`/`BUDGET*`/`RAPPORTS_FINANCIERS*`).
- `packages/api` : `chartAccountService`, `accountingPeriodService`, `journalEntryService` (équilibre débit/crédit vérifié à l'insertion, contre-passation, hooks de génération automatique `recordPaymentEntry`/`recordPaymentCancellationEntry`/`recordExpenseApprovalEntry`), `expenseCategoryService`, `supplierService`, `expenseService` (workflow d'approbation BROUILLON→EN_ATTENTE_APPROBATION→APPROUVEE/REJETEE), `budgetService` (écart calculé à la volée), `financialReportService` (Grand livre, Balance, tableau de bord, rapports par période/catégorie/utilisateur/caisse) ; `paymentService` étendu pour déclencher automatiquement la comptabilisation d'un paiement/de son annulation ; `matriculeService` étendu (`generateJournalEntryNumber`/`generateExpenseNumber`, 5ᵉ/6ᵉ réutilisations du moteur de numérotation, désormais généralisé avec filière/année universitaire optionnelles).
- `apps/desktop` : section "Comptabilité" (Tableau de bord financier, Plan comptable, Journal avec verrouillage de périodes, Grand livre, Balance, Recettes, Dépenses avec pièces jointes et approbation, Fournisseurs, Budget, Rapports).
- `packages/ui` : mécanisme `[data-print-area]` réutilisé (introduit au Module 4.3).
- 10 tests unitaires (équilibre débit/crédit, calculs de dates de période).

### Décidé
- Comptabilité en **partie double** (plan comptable/journal/lignes débit-crédit) plutôt qu'un journal de mouvements à sens unique — voir ADR-027.
- Génération automatique des écritures **conditionnée à un rattachement de compte explicitement configuré** — aucune écriture partielle/déséquilibrée n'est jamais créée — voir ADR-028.
- Généralisation du moteur de numérotation pour accepter filière/année universitaire optionnelles — voir ADR-029.
- Aucune bibliothèque de graphiques (barres CSS), cohérent avec le reste de l'ERP — voir ADR-030.

### Corrigé / appris
- La vérification de bout en bout a révélé que le Grand livre/la Balance/le tableau de bord filtraient à tort les écritures `ANNULEE`, laissant un solde fantôme égal à la seule contre-passation après annulation d'un paiement comptabilisé. Une écriture annulée reste un mouvement historiquement posté ; c'est la **paire** {originale + contre-passation} qui doit se neutraliser à zéro. Corrigé en retirant le filtre de statut des cinq requêtes d'agrégation concernées.

**Validé le** : 2026-07-27 — développement, tests et vérification de bout en bout contre PostgreSQL réel (avec correction de l'anomalie ci-dessus) réalisés en autonomie complète par l'assistant, sur autorisation explicite du porteur du projet avant son absence (Chapitre 8 — l'en-tête de l'autorisation mentionnait "Module 6" par décalage de copier-coller, traité comme portant sur le chapitre réellement joint). Validation finale reçue à son retour ("JE VALIDE").

---

## [Module 4.3] — Paiements et gestion de la caisse — 2026-07-27

### Ajouté
- Nouvelles tables : `payment_methods` (5 modes système + personnalisés), `cash_registers`, `cash_register_sessions` (ouverture/fermeture, solde initial/final/écart), `payments` (numéro de reçu, statut, annulation), `payment_allocations` (répartition d'un paiement entre types de frais/échéances).
- 10 nouvelles permissions (`PAIEMENTS*`/`CAISSE*`).
- `packages/api` : `paymentMethodService`, `cashRegisterService`, `cashRegisterSessionService` (ouverture/fermeture, calcul d'écart de caisse — fonctions pures testées séparément), `paymentService` (contexte d'encaissement, création avec répartition, annulation sécurisée, historique paginé/exportable, tableau de bord temps réel) ; `feeSummaryService` étendu pour calculer un vrai payé/reste à payer/excédent par type de frais et par échéance, et pour recalculer automatiquement `student_enrollments.payment_status` ; `matriculeService` étendu (`generateReceiptNumber`, 3ᵉ réutilisation du moteur de numérotation généralisé).
- `apps/desktop` : section "Paiements" (Encaissement avec recherche étudiant/sélection des frais à régler, Caisse avec tableau de bord et historique des sessions, Historique des paiements filtrable/exportable), reçu imprimable réutilisant logo/coordonnées/signataire/cachet du Module 2, onglet "Paiements" activé et onglet "Frais de scolarité" mis à jour (vrai payé/reste) sur la fiche étudiant.
- `packages/ui` : mécanisme générique d'impression ciblée (`[data-print-area]` dans `globals.css`), réutilisable par tout futur document imprimable.
- 11 tests unitaires (statut de paiement calculé, solde/écart de caisse).

### Décidé
- Le Module 4.3 devient la **référence unique des montants réellement payés**, symétrique du Module 4.2 pour les montants dus — voir ADR-023.
- Modes de paiement modélisés comme référentiel configurable plutôt qu'un enum figé — voir ADR-024.
- Troisième réutilisation du moteur de numérotation généralisé pour les numéros de reçu — voir ADR-025.
- Reçu v1 = écran HTML/CSS imprimable réutilisant les données du Module 2, pas de second moteur PDF avant le Module 9 — voir ADR-026.
- `student_enrollments.payment_status` (saisie manuelle depuis le Module 4.1) devient calculé automatiquement à chaque paiement/annulation.
- Écart de caisse calculé sur les espèces uniquement ; une session fermée est un instantané figé, jamais recalculé a posteriori.

### Corrigé / appris
- Un plantage a été signalé au test manuel : l'écran Encaissement affichait une page blanche à l'ouverture, obligeant à relancer l'application. Cause : `selectedStudent!.id` était évalué à chaque rendu (y compris avant toute sélection d'étudiant, où `selectedStudent` vaut `null`) — l'assertion non-null TypeScript (`!`) ne protège qu'à la compilation, pas à l'exécution. Corrigé par `selectedStudent?.id ?? ""`, combiné à `enabled: Boolean(selectedStudent)` pour ne jamais envoyer la requête tant qu'aucun étudiant n'est sélectionné. Point de vigilance retenu pour les prochains modules : ne jamais utiliser `!.` sur une valeur d'état pouvant être `null`/`undefined` au premier rendu, même derrière un `enabled: false`.

**Validé le** : 2026-07-27 — conception validée par le porteur du projet ("JE VALIDE"), développement complet, vérification de bout en bout contre PostgreSQL réel (ouverture de caisse, encaissement par échéance, excédent isolé sans solde négatif, annulation journalisée, fermeture avec écart nul, blocages d'encaissement) et démarrage réel du serveur API confirmés par l'assistant. Parcours des écrans testé manuellement par le porteur du projet, plantage de l'écran Encaissement signalé puis corrigé sur-le-champ, confirmé fonctionnel ("OUI SA FONCTIONNE").

---

## [Module 4.2] — Frais de scolarité — 2026-07-27

### Ajouté
- Nouvelles tables : `fee_types` (12 types par défaut, extensible), `fee_tariffs` (dimensions optionnelles : filière/niveau/classe/statut d'étudiant), `fee_installment_plans`/`fee_installments` (échéanciers avec pénalité de retard), `fee_reductions` (bourses/remises/exonérations par étudiant, jamais supprimées).
- 11 nouvelles permissions (`FRAIS*`/`FRAIS_REDUCTIONS*`).
- `packages/api` : `feeTariffService` (résolution du tarif le plus spécifique — fonctions pures `matchesContext`/`selectMostSpecificTariff` testées séparément —, contrôle du doublon de portée, échéanciers), `feeTypeService`, `feeReductionService`, `feeSummaryService` (coût de la scolarité d'un étudiant, tableau de bord).
- `apps/desktop` : nouvelle section "Frais" (tableau de bord coloré, tarifs avec échéancier, types de frais, réductions par étudiant, historique des tarifs — vue filtrée du journal d'audit), nouvel onglet "Frais de scolarité" sur la fiche étudiant (détail par type de frais, réductions, total net ; "payé"/"reste à payer" explicitement en attente du futur module Paiements).
- 6 tests unitaires (correspondance de contexte, sélection du tarif le plus spécifique, égalité départagée par date de modification).

### Décidé
- Le Module 4.2 devient la **référence unique des tarifs** de l'ERP — aucun autre module ne doit les redéfinir, consigne explicite du porteur du projet — voir ADR-021.
- Tarifs à dimensions optionnelles avec résolution par spécificité, et historique des tarifs porté par `audit_log` existant plutôt qu'une table dédiée — voir ADR-022.
- "Type d'étudiant" du tarif réutilise l'enum `EnrollmentStatus` du Module 4 ; "boursier" traité comme une réduction (type `BOURSE`), pas comme une dimension de tarif.
- "Payé"/"reste à payer" restent des placeholders explicites tant que le Module Paiements n'existe pas — aucun calcul inventé.
- **Développement autonome intégral** : le porteur du projet a explicitement autorisé le développement de bout en bout sans validation intermédiaire avant de s'absenter ("N'attends de moi aucune validation pour ce module, travail sans me demander, je vais faire une petite sieste") — les étapes de conception/développement/tests ont donc été enchaînées sans point de blocage, avec la même rigueur de vérification (lint/typecheck/build/tests + vérification de bout en bout contre PostgreSQL réel) que pour les modules précédents.

### Corrigé / appris
- Une contrainte unique PostgreSQL composite sur des colonnes nullables ne détecte pas fiablement les doublons de "portée" d'un tarif (NULL n'est jamais égal à NULL) — le contrôle de doublon exact est fait côté service plutôt qu'en base.

**Validé le** : 2026-07-27 — vérification de bout en bout contre PostgreSQL réel effectuée par l'assistant (résolution de spécificité, doublon de portée bloqué, échéancier, modification de tarif avec justification, réduction, calcul du coût de scolarité), démarrage réel du serveur API confirmé sans erreur. Validation reçue par avance du porteur du projet pour ce module spécifiquement, puis parcours des écrans testé manuellement et confirmé par lui-même à son retour ("tout s'affiche correctement et fonctionne comme attendu").

---

## [Module 4.1] — Inscriptions et réinscriptions — 2026-07-27

### Ajouté
- `student_enrollments` étendue (colonnes additives) : `regime_id`, `registration_number` (numéro d'inscription unique, distinct du matricule), `fee_amount_expected`/`payment_status`, `cancelled_at`/`cancelled_reason`/`cancelled_by`.
- Nouvelles tables : `enrollment_regimes` (référentiel configurable, seedé avec Normal/Professionnel), `enrollment_settings` (activation du contrôle de capacité), `enrollment_document_requirements` (documents obligatoires par type, configurable).
- Généralisation du moteur de numérotation du Module 4 (`purpose` MATRICULE/INSCRIPTION sur `student_number_sequences`/`student_numbering_settings`) pour porter aussi le numéro d'inscription.
- 9 nouvelles permissions (`INSCRIPTIONS*`/`INSCRIPTIONS_IMPORT*`).
- `packages/api` : `enrollmentService` (contrôle des conditions — capacité/documents/doublon d'année —, création d'inscription/réinscription, annulation réversible, liste transverse paginée côté serveur, tableau de bord), `enrollmentRegimeService`, `enrollmentSettingsService`, `enrollmentImportService` ; `createEnrollmentRow` factorisée et réutilisée par la création d'étudiant (Module 4) et les nouvelles inscriptions.
- `apps/desktop` : bouton "Réinscrire" sur la fiche étudiant, historique académique enrichi (régime, n° d'inscription, paiement modifiable, annulation), module "Inscriptions" (tableau de bord coloré, liste transverse, assistant de nouvelle inscription/réinscription avec contrôle des conditions en direct, assistant d'import), section "Inscriptions" dans Paramètres.
- Zébrage coloré (toutes lignes paires) ajouté aux composants partagés `DataTable`/`ServerDataTable` (`packages/ui`) — rétroactif sur tous les tableaux déjà livrés, automatique pour tous les tableaux futurs — et jeu de couleurs par pertinence sur le tableau de bord des inscriptions, à la demande du porteur du projet.

### Décidé
- Extension additive de `student_enrollments` plutôt qu'une table `inscriptions` séparée — voir ADR-018.
- Généralisation du moteur de numérotation (matricule + numéro d'inscription) plutôt qu'une infrastructure dupliquée — voir ADR-019.
- Régimes d'inscription modélisés comme référentiel configurable plutôt qu'un enum figé — voir ADR-020.
- Contrôle de capacité de classe et documents obligatoires désactivés par défaut, pour ne rien casser sur les données déjà créées au Module 4.
- Frais/statut de paiement = champs d'affichage manuels, aucun calcul, en attendant le Module 7 (Finances).
- "Reçu d'inscription" indisponible tant que le Module 7 n'existe pas ; rendu PDF réel reporté au Module 9, comme au Module 4.

### Corrigé / appris
- La création d'une migration Prisma non interactive (avertissements sur ajout de contraintes uniques) bloque `prisma migrate dev` même avec `--create-only` en environnement non interactif — contournement via `prisma migrate diff` (génération du SQL) puis `prisma migrate deploy` (application non interactive), sans toucher aux données existantes.

**Validé le** : 2026-07-27 — vérification de bout en bout contre PostgreSQL réel effectuée par l'assistant (régime + numéro d'inscription, capacité, documents obligatoires, réinscription vers une nouvelle année, doublon bloqué, annulation, tableau de bord), puis parcours des écrans confirmé par le porteur du projet ("OUI"), après ajustement des couleurs.

---

## [Module 4] — Gestion complète des étudiants — 2026-07-26

### Ajouté
- Schéma Prisma : `students`, `guardians`, `student_guardians`, `student_documents`, `student_enrollments`, `student_number_sequences`, `student_numbering_settings` (4 nouveaux enums : `Gender`, `MaritalStatus`, `GuardianRelationship`, `StudentDocumentType`, `EnrollmentStatus`, `EnrollmentDecision`, `NumberingResetPolicy`) — référentiel principal utilisé par tous les futurs modules métier.
- Index unique partiel PostgreSQL garantissant un seul contact officiel par étudiant (migration SQL brute, non modélisable directement en Prisma).
- 13 nouvelles permissions (`ETUDIANTS*`, `ETUDIANTS_DOCUMENTS*`, `ETUDIANTS_IMPORT*`), ligne singleton `student_numbering_settings`.
- `packages/api` : génération de matricule via gabarit configurable et compteur atomique (`matriculeService`), CRUD étudiant avec liste paginée/triée/recherchée côté serveur et export (`studentService`), historique académique et changement de classe tracé (`studentEnrollmentService`), gestion des parents/tuteurs avec contact officiel unique (`guardianService`), documents administratifs (`studentDocumentService`), assistant d'import Excel/CSV en deux temps — validation puis exécution (`studentImportService`). Nouvelle route REST `/uploads/documents` (images + PDF, sans redimensionnement, 10 Mo max).
- `packages/ui` : `ServerDataTable` (pagination/tri/recherche côté serveur, colonnes personnalisables, export CSV/Excel), `Tabs`, utilitaires `exportRowsToCsv`/`exportRowsToXlsx`/`parseSpreadsheetFile` (nouvelle dépendance `xlsx`).
- `apps/desktop` : écran tableau étudiants, formulaire de création (page dédiée avec alerte de doublon), fiche complète à onglets (identité, parents/tuteurs, documents, historique académique + onglets réservés Paiements/Notes/Sanctions/Présences/Communications pour les modules futurs), assistant d'import 3 étapes, écran de configuration de la numérotation du matricule (intégré au `SettingsShell` du Module 2).
- 15 tests unitaires (rendu de gabarit de matricule, zéro-padding, extraction d'année, normalisation des valeurs d'import).

### Décidé
- Historique académique modélisé par une seule table `student_enrollments` (une ligne = un étudiant × une année universitaire), source unique de l'affectation courante et de l'historique — voir ADR-014.
- Génération du matricule via gabarit textuel configurable plutôt que format figé en dur — voir ADR-015.
- Pagination/tri/recherche côté serveur pour le tableau des étudiants (nouveau `ServerDataTable`, réutilisable par les futurs modules à gros volume) — voir ADR-016.
- Documents étudiants (PDF + images) uploadés via une route REST dédiée distincte de celle des images du Module 2 — voir ADR-017.
- Doublons détectés par avertissement non bloquant (téléphone/email/nom+date de naissance), jamais par contrainte unique stricte en base.
- Suppression d'un document administratif autorisée (fichier joint), contrairement à l'étudiant et à son historique académique qui ne sont jamais supprimables (archivage réversible uniquement).
- Numérotation `ROADMAP.md` conservée : ce module reste "Module 4" en interne malgré le "Module 3" du cahier des charges (l'emplacement Module 3 avait déjà été fusionné dans le Module 2).

### Corrigé / appris
- Le compteur de matricule doit être verrouillé en transaction (`SELECT ... FOR UPDATE`) et son identifiant généré côté application (`randomUUID()`) plutôt que délégué à Postgres, `@default(uuid())` de Prisma n'installant aucune fonction côté base.
- Les mutations à gros payload (validation d'import jusqu'à 2000 lignes, vérification de doublons) doivent être des `mutation` tRPC plutôt que des `query` : `httpBatchLink` sérialise les query en paramètres d'URL, ce qui dépasserait vite une limite pratique.

**Validé le** : 2026-07-26 — vérification de bout en bout contre PostgreSQL réel effectuée par l'assistant (matricule, doublons, contact officiel, document, historique, archivage/restauration), puis parcours des écrans confirmé par le porteur du projet ("j'ai accès et tout marche bien").

---

## [Module 2] — Paramètres généraux & configuration établissement — 2026-07-26

### Ajouté
- Schéma Prisma (13 tables) : `establishment_settings`, `campus_settings`, `document_signatory`, `official_stamp`, `academic_year`, `academic_period`, `filiere`, `level`, `class`, `currency_settings`, `regional_settings`, `theme_settings`, `document_template` — en remplacement de `establishment_display` (Module 1).
- Seed : 34 permissions PARAMETRES, 5 rôles de signataires, 9 types de documents, niveaux L1..M2 par défaut, création des lignes singleton (sécurité, établissement, campus, devise, régional, thème, cachet).
- Upload de fichiers dédié hors tRPC : route REST Fastify (`@fastify/multipart`), redimensionnement via `sharp` (max 1200px), servi via `@fastify/static` (ADR-012).
- `packages/api` : services et routers `establishment`, `campus`, `branding` (signataires/cachet/thème/modèles de documents), `academicYears` (transaction garantissant une seule année active), `academicPeriods`, `filieres`, `levels`, `schoolClasses`, `localization`, `settingsBackup` (export/import de configuration en transaction).
- `packages/ui` : composants `ImageUpload`, `ColorPicker`.
- `apps/desktop` : 12 écrans Paramètres (identité établissement, campus, signataires, cachet, années/semestres, filières, niveaux, classes, régional/devise, apparence avec thème appliqué à chaud, modèles de documents, sauvegarde de configuration), nouvelle entrée de navigation "Paramètres" (permission `ETABLISSEMENT:LECTURE`).
- Jetons de thème dédiés `--button`/`--button-foreground`, `--menu`/`--menu-foreground`, et assombrissement de `--muted`/`--muted-foreground`, conformément à la directive du porteur du projet sur le fond des nouvelles fenêtres.
- Tests unitaires : conversion hex→HSL (`color.test.ts`), en complément des tests hérités.

### Décidé
- Portée réduite du gestionnaire de "modèles de documents" à un registre de configuration ; le moteur de rendu PDF réel est reporté au futur Module 9 — Documents officiels.
- Personnalisation graphique appliquée à chaud (sans redémarrage), via mise à jour directe des CSS custom properties côté client.
- Sauvegarde des paramètres (export/import JSON) traitée comme fonctionnalité distincte de la sauvegarde complète de la base de données, cette dernière reportée au futur Module 11 — Sauvegarde.
- Ancien Module 3 (Référentiels pédagogiques) fusionné dans le Module 2, conformément au Chapitre 3 du cahier des charges.

### Corrigé / appris
- Upload de fichiers exclu du pipeline tRPC (superjson ne gère pas les payloads binaires/multipart) — route REST dédiée à la place (ADR-012).
- Violation "hooks dans une boucle" détectée dans `SettingsShell.tsx` (appel de `useHasPermission()` dans un `.map()`) — corrigée en extrayant une fonction pure `hasPermission()` du store d'authentification, utilisable hors composant React.
- CSP `img-src` de `index.html` trop restrictive pour les images uploadées servies en local — élargie à `http://localhost:*`/`http://127.0.0.1:*`.
- Export CSV (`DataTable`) : le caractère BOM ne doit pas être injecté comme caractère littéral dans une chaîne (déclenchait une erreur ESLint `no-irregular-whitespace` et se corrompait selon l'encodage) — résolu en le préfixant comme `Uint8Array` séparé dans le `Blob`.

**Validé le** : 2026-07-26 — parcours complet des écrans testés manuellement par le porteur du projet ("tout fonctionne") : identité, structure académique, régional/devise, apparence, modèles de documents, sauvegarde.

---

## [Module 1] — Identité, Authentification et Gestion des Accès — 2026-07-26

### Ajouté
- Schéma Prisma : `users`, `roles`, `user_roles`, `permissions`, `role_permissions`, `user_sessions`, `audit_log`, `establishment_display`, `security_settings`.
- Seed (`packages/db/prisma/seed.ts`) : 12 rôles système, catalogue de 16 permissions IDENTITE, paramètres de sécurité et affichage établissement par défaut.
- `packages/api` : authentification (bootstrap premier administrateur, connexion, déconnexion, vérification admin technique), sessions serveur (jeton haché, expiration glissante), verrouillage de compte après échecs, autorisation par permission vérifiée systématiquement côté serveur (`permissionProcedure`, court-circuitée pour SUPER_ADMIN), journal d'audit transversal, gestion des utilisateurs/rôles/permissions.
- `packages/ui` : composants `Select`, `Label`, `Checkbox`, `Badge`, `Dialog`, et `DataTable` (recherche, tri, pagination, export CSV, impression) réutilisables par tous les futurs écrans à tableau.
- `apps/desktop` : écrans Bootstrap (première installation), Connexion (avec accès technique admin-gated), coquille applicative, Utilisateurs, Rôles & permissions (matrice), Journal d'audit. Store d'authentification (Zustand, jeton en mémoire uniquement).
- superjson ajouté comme transformer tRPC (client + serveur) pour préserver correctement les types `Date` de bout en bout.
- 21 tests unitaires (verrouillage de compte, vérification de permission, hachage de mot de passe, génération de mot de passe temporaire, + tests hérités).

### Décidé
- Sessions stockées côté serveur plutôt que JWT stateless (ADR-009), pour permettre déconnexion par inactivité et révocation à distance.
- Bouton "Paramètres" de l'écran de connexion : comportement conditionnel (bootstrap si aucun admin, sinon accès technique minimal admin-gated) — jamais les écrans Paramètres métier du Module 2.
- Suppression d'utilisateur : logique (`deleted_at`), jamais physique, pour préserver l'intégrité du journal d'audit.
- Paramètre "Langue" (Module 2 à venir) : champ préparatoire, pas d'internationalisation complète pour cette version (ADR-008).

### Corrigé / appris
- **PostgreSQL installé nativement** (ADR-010) : Docker Desktop indisponible sur la machine de développement (virtualisation matérielle non détectée). Implication à trancher pour le déploiement en production sur les campus.
- Résolution de modules TypeScript : uniformisée sur `Bundler` partout (un package l'avait surchargé en `NodeNext`, cassant la consommation de `packages/shared`).

**Validé le** : 2026-07-26 — parcours complet (bootstrap → premier administrateur → connexion → Utilisateurs/Rôles/Journal d'audit) vérifié avec une vraie base PostgreSQL.

---

## [Module 0] — Socle technique & design system — 2026-07-26

### Ajouté
- Monorepo pnpm workspaces + Turborepo (`apps/`, `packages/`, `infra/`).
- `apps/desktop` : shell Electron (main + preload isolé, `contextIsolation: true`) + React + Vite (`electron-vite`), CSP stricte.
- `packages/api` : backend local Fastify + tRPC, route `health.check`, écoute sur `0.0.0.0` (accessible depuis le réseau local du campus, conformément à ADR-007).
- `packages/db` : schéma Prisma minimal (`SystemHealth`), PostgreSQL local via Docker Compose (`infra/docker/docker-compose.yml`).
- `packages/ui` : design system de base (tokens Tailwind, `Button`, `Input`, `Card`).
- `packages/shared` : schémas Zod partagés front/back, constantes globales.
- Outillage qualité : ESLint (flat config) + Prettier + TypeScript strict, Vitest (unitaire), Playwright (E2E Electron), CI GitHub Actions (lint/typecheck/test).
- Documents de référence du projet : `ARCHITECTURE_MASTER.md`, `ROADMAP.md`, `DECISIONS.md`, `CHANGELOG.md` (ce fichier), et le rapport d'analyse de l'ancien projet Python (`RAPPORT_ANALYSE_ISAC_ERP.md`).
- Dépôt Git initialisé.

### Décidé
- Architecture mono-campus autonome (ADR-005) : chaque campus a sa propre installation indépendante, sans communication réseau entre campus, sans dépendance Internet.
- Serveur local partagé par campus (ADR-007, adopté par défaut) : un backend + PostgreSQL par campus, accessible aux postes clients via le réseau local (LAN), pas d'Internet requis.

### Connu / reporté
- La connexion PostgreSQL réelle (badge "Connectée" dans l'app) n'a pas pu être vérifiée sur la machine de développement (Docker Desktop en panne, problème d'environnement local sans rapport avec le code). L'application se dégrade proprement en affichant "Indisponible" — ce comportement a été vérifié. La vérification de la connexion réelle est reportée à l'ouverture du Module 1.
- Aucun commit Git n'a encore été fait sur le scaffolding de ce module.

**Validé le** : 2026-07-26.
