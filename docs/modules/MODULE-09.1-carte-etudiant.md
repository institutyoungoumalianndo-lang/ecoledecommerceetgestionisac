# Module 9.1 — Carte d'étudiant officielle (version définitive)

**Statut** : ✅ **Livré et vérifié (2026-08-08).** Le porteur du projet a tranché les deux points bloquants (§6) : (1) aucune évolution de la gestion multi-campus, les réglages actuels restent inchangés (pas de nouvelle table par campus) ; (2) le QR code affiche uniquement les informations de l'étudiant (payload informatif, comme tous les autres documents du Module 9 — jamais une URL, cohérent avec ADR-007) ; (3) "pour le reste, applique ce qui se trouve sur la capture d'écran" — la maquette du §1.4 fait foi pour la mise en page, et mes recommandations pour les points non bloquants (§6, points restants) sont retenues par défaut. Schéma Prisma, seed, `packages/shared`, `packages/api` (services + routeurs) et les écrans desktop étaient déjà livrés ; la vérification finale (2026-08-08) a couvert :
- **Tests unitaires** (`packages/api/src/services/documents/studentCardEngine.test.ts`, 7 tests) sur les deux fonctions pures du moteur de rendu — `generateVerificationCode()` (format `XXXX-XXXX`, alphabet sans caractères ambigus 0/O/1/I, entropie) et `computeCardLayout()` (dimensions 54×86mm converties en points, centrage horizontal de la paire recto/verso, position de la ligne de pliage, placement dans la première moitié de la page) — même convention que le reste du dépôt (fonctions pures uniquement, aucun mock Prisma, aucune base de test — voir `pdfEngine.test.ts`).
- **Index unique partiel** "une seule carte ACTIVE par étudiant" (`student_cards_one_active_per_student`, MODULE-09.1 §3 règle 1) confirmé présent dans la migration `20260730010614_module_9_1_student_card`.
- **Coexistence avec l'ancien générateur `CARTE_ETUDIANT`** (Module 9, carte compacte recto seul) confirmée intentionnelle et déjà gérée côté UI : `GenerateDocumentScreen.tsx` exclut explicitement `CARTE_ETUDIANT` de la liste des types sélectionnables depuis le générateur générique ("ne produit plus l'ancien archétype simplifié", 2026-07-30) — seuls les écrans dédiés du Module 9.1 (`StudentCardIndividualScreen`/`StudentCardsBatchScreen`/`StudentCardTab`) créent des cartes désormais. Le code du générateur historique reste dans `generators/carteEtudiant.ts` sans être atteignable depuis l'interface.
- **Suite de tests complète** (176 tests, 30 fichiers) exécutée sans régression, `typecheck` + `build` de `packages/api` propres.

**Dépend de** : Module 9 (moteur PDF centralisé, `InstitutionalHeaderSettings`, `DocumentSignatory`/`OfficialStamp`/`DocumentTemplate`, `NumberingPurpose.CARTE_ETUDIANT` déjà réservé), Module 2 (`EstablishmentSettings`/`CampusSettings`), Module 4 (`Student`), Module 4.1 (`StudentEnrollment`), Module 2 (`AcademicYear`).

**Source** : Chapitre "Carte d'étudiant officielle (Version définitive)" du cahier des charges (reçu le 2026-07-30), sans collision de numérotation — ce chapitre ne se réclame d'aucun numéro et prolonge directement le type de document `CARTE_ETUDIANT` déjà enregistré au catalogue Tier 1 du Module 9 (actuellement une version "carte compacte" simplifiée — voir `MODULE-09-documents-officiels.md` §1). Numéroté **9.1** en tant qu'extension du Module 9, suivant la convention déjà appliquée aux chapitres 4.1/4.2/4.3/2.1/5.1/5.2 de ce projet.

## 0. Pourquoi ce chapitre attend une validation (pas d'autonomie accordée)

Le chapitre précédent (Module 9, moteur PDF) contenait une phrase d'autorisation explicite ("je t'autorise à travailler de manière autonome jusqu'à son achèvement..."). **Ce chapitre n'en contient aucune.** Je respecte donc la méthodologie normale du projet : analyse + conception ci-dessous, points ouverts numérotés au §6, puis attente de votre validation avant tout développement (schéma, seed, code, écrans).

Plusieurs points de ce chapitre touchent à des principes déjà actés du projet (architecture mono-campus par installation — ADR-005 ; QR code jamais une URL, application hors-ligne — ADR-007) ou nécessitent un choix de conception qui aurait un impact durable sur le moteur — je préfère vous les soumettre plutôt que trancher seul.

## 1. Analyse fonctionnelle

### 1.1 Réutilisation déjà en place (aucune de ces briques n'est recréée)

- **En-tête institutionnelle** : `InstitutionalHeaderSettings` (Module 9) — République/devise nationale/école/institut/slogan déjà configurables, déjà rendus par `pdfEngine.renderInstitutionalHeader`.
- **Logos, signature, cachet** : `EstablishmentSettings.logoPrimaryPath/logoSecondaryPath/ministryLogoPath`, `CampusSettings.logoPath`, `DocumentSignatory`/`SignatoryRole`, `OfficialStamp` — déjà configurables depuis Paramètres, déjà rendus par `pdfEngine.renderSignatureAndStamp`.
- **Données étudiant** : `Student` (photo, nom, prénom, date de naissance, téléphone), `StudentEnrollment` (matricule via `Student.matricule`, filière, niveau, date d'inscription, année universitaire).
- **Numérotation** : `NumberingPurpose.CARTE_ETUDIANT` déjà réservé et déjà utilisé par la version compacte actuelle (`matriculeService.generateNumber`).
- **Année académique / date de fin** : `AcademicYear.endDate` déjà présent — source de la date d'expiration automatique (§1.9 du chapitre).
- **Moteur PDF** : `documentEngineService`/`pdfEngine` (Module 9, corrigé le 2026-07-30 — voir `MODULE-09-documents-officiels.md` et le CHANGELOG) — aucun autre moteur de rendu PDF n'est créé, cette carte passe par le même point d'entrée unique.

### 1.2 Ce qui est réellement nouveau par rapport à la version actuelle du Module 9

La version `CARTE_ETUDIANT` déjà livrée au Module 9 est une **carte compacte recto seul, une page**, sans sécurité au-delà d'un QR informatif, sans historique, sans annulation. Ce chapitre en demande une version **structurellement différente** :

1. **Recto/verso sur une même feuille A4** avec ligne de pliage et repères de découpe calculés automatiquement — nouvel archétype de mise en page (aucun document Tier 1 actuel n'a deux faces).
2. **QR "sécurisé contre la falsification"** qui, scanné, **ouvre la fiche officielle de l'étudiant dans l'application** — différent du QR "payload JSON minimal, jamais une URL" utilisé partout ailleurs au Module 9 (voir §6 point 1, bloquant).
3. **Cycle de vie de la carte** : annulation, réémission, invalidation automatique de l'ancienne carte, historique des réimpressions, journal d'audit dédié — la carte devient un **objet avec un état**, alors que `GeneratedDocument` (Module 9) est un simple journal d'archivage immuable, jamais "annulé" ni "remplacé". Nécessite une nouvelle table (§2).
4. **Impression par lot** (classe/niveau/filière/campus) — premier document Tier 1 à être généré en masse plutôt qu'à l'unité.
5. **Aperçu avant impression** (recto, verso, rendu plié, rendu après découpe) — première exigence d'aperçu interactif du Module 9.
6. **Personnalisation "sans programmation" incluant la position des éléments** — portée de personnalisation plus large que `DocumentTemplate` actuel (qui expose des cases à cocher, pas un positionnement libre).

### 1.3 Charte graphique

Bleu institutionnel / blanc / rouge dominants, touches de jaune, traits verticaux évoquant le drapeau guinéen en option — cohérent avec l'en-tête déjà codé en couleurs nationales (Module 9 §1.1). Nouveauté : un fond de carte (couleur ou image) et un style graphique plus élaboré qu'un document texte classique — traité comme un gabarit dédié (§2), jamais codé en dur.

### 1.4 Maquette de référence fournie le 2026-07-30

Le porteur du projet a fourni une maquette visuelle précise (image annotée, les annotations et le texte hors des deux faces de la carte ne sont **pas** à reproduire — seules les deux faces le sont). Cette maquette **répond déjà** à une partie des points ouverts du §6 et **remplace** le point 6 (portée de la personnalisation) : il ne s'agit plus de construire un éditeur positionnel libre, mais de reproduire fidèlement cette mise en page fixe et professionnelle, avec son contenu (textes/couleurs/champs affichés) piloté par les réglages du gabarit, jamais codé en dur.

**Format carte** : 54 mm (largeur) × 86 mm (hauteur) — format portrait, distinct du format standard CR-80 (qui est normalement en paysage) : confirmé par la maquette (`Orientation : Portrait` explicitement annoté) et par le rendu (chaque face est nettement plus haute que large). Les deux faces sont placées côte à côte sur une feuille A4 portrait avec un repère de pliage central (ciseaux) — cohérent avec le chapitre initial.

**Face A (recto)** — mise en page différente de l'en-tête institutionnel générique du Module 9 (`renderInstitutionalHeader`) : ici le texte de l'en-tête (République/devise/école/institut/slogan) est **aligné à gauche**, un seul logo (I.Y.M.A.) **à droite**, et une **bande verticale multicolore** (couleurs du drapeau guinéen) court sur toute la hauteur du bord gauche de la carte — une mise en page compacte propre à la carte, pas une réutilisation telle quelle du composant d'en-tête des autres documents. Sous l'en-tête : photo à gauche, puis en libellé/valeur : Nom complet, Matricule, Classe (ex. "CP1 — Cuisine pâtisserie", classe et filière combinées sur une ligne), Année scolaire, Téléphone, Campus. Bandeau bleu foncé : numéro de carte (ex. `CE-3-26-000123`, compteur sur 6 chiffres) à gauche, QR code à droite. En dessous : date d'émission et date d'expiration (avec icônes calendrier), cachet officiel en filigrane en bas à gauche. Bandeau bleu foncé final : *« Cette carte est strictement personnelle et incessible »*.

**Face B (verso)** : bandeau bleu foncé pleine largeur avec le nom du campus en grand (ex. « CAMPUS PRINCIPAL »). Bloc contact avec icônes (adresse, téléphone, e-mail, site web facultatif). Cadre arrondi « SIGNATURE DU DIRECTEUR DU CAMPUS » avec le cachet officiel en filigrane au centre — réutilise le signataire déjà existant `SignatoryRole.DIRECTEUR_CAMPUS` (aucune nouvelle table de signataire nécessaire, voir point 2 révisé ci-dessous). Section « MENTIONS IMPORTANTES » (titre rouge) avec la liste : *« Cette carte demeure la propriété de l'École de Commerce et de Gestion ISAC. En cas de perte, veuillez contacter immédiatement l'administration. Toute personne trouvant cette carte est priée de la déposer au secrétariat du campus ou d'appeler au numéro ci-dessus. Cette carte est valable pour l'année scolaire indiquée. »* Bandeau bleu foncé final : *« Votre avenir commence ici »*.

**Écart constaté avec le texte du chapitre initial** : la maquette n'affiche ni la date de naissance ni la date d'inscription sur la Face A (le chapitre texte les demandait toutes les deux). Je retiens la maquette comme référence prioritaire (c'est la version que vous avez validée visuellement) et je retire ces deux champs du recto, sauf si vous souhaitez les réintégrer.

**Point 2 (multi-campus) — élément de réponse apporté par la maquette** : la maquette réutilise le signataire `DIRECTEUR_CAMPUS` déjà existant et affiche simplement le nom du campus de l'installation — cela n'exige pas de nouvelles tables "par campus" et est cohérent avec l'architecture mono-campus déjà actée (ADR-005). Cela ne répond cependant pas complètement à la formulation du chapitre initial ("chaque campus... ses couleurs, ses modèles de cartes") — je vous propose une clarification ciblée ci-dessous plutôt que de trancher seul.

## 2. Conception de la base de données (proposition, à valider)

```
student_cards (nouveau — cycle de vie de la carte, distinct de generated_documents)
├── id, student_id (FK Student)
├── card_number (unique — série NumberingPurpose.CARTE_ETUDIANT déjà réservée)
├── verification_code (unique, aléatoire haute entropie — distinct du numéro séquentiel, saisie manuelle possible sans scanner)
├── qr_token (identifiant opaque signé/aléatoire, jamais l'ID interne de l'étudiant en clair — voir §6 point 1)
├── status (ACTIVE | CANCELLED | EXPIRED | SUPERSEDED)
├── issued_at, expires_at (calculé depuis AcademicYear.endDate — §6 point 5 sur la règle exacte)
├── cancelled_at, cancelled_by, cancelled_reason (nullable)
├── superseded_by_card_id (nullable — pointe vers la carte de réémission, pour tracer la chaîne)
├── file_path (PDF recto/verso archivé, réutilise saveGeneratedDocument)
├── generated_document_id (FK optionnelle vers generated_documents — conserve l'archive/audit déjà en place au Module 9)
└── generated_by_user_id, created_at

student_card_reprints (nouveau — historique des réimpressions, MODULE-09.1 §"Sécurité")
├── id, student_card_id (FK)
├── reprinted_at, reprinted_by_user_id
└── reason (nullable — motif de réimpression, saisi par l'utilisateur)

student_card_template (nouveau, singleton — OU une ligne par campus, voir §6 point 2 reformulé)
├── background_color / background_image_path
├── accent colors, show_guinea_stripes (bool) — bande verticale multicolore de la maquette (§1.4)
├── legal_text (mentions importantes du verso), personal_use_text (bandeau "strictement personnelle et incessible")
└── font_family, base_font_size — mise en page par ailleurs fixe (fidèle à la maquette §1.4)
```

**Un seul index unique partiel réutilisable** (même technique que les bulletins — Module 6) : `WHERE status = 'ACTIVE'` sur `(student_id)` pour empêcher deux cartes actives simultanées pour un même étudiant (§ "Empêcher les doublons") — la réémission bascule l'ancienne à `SUPERSEDED` avant de créer la nouvelle, dans la même transaction.

## 3. Règles métier (proposition)

1. Un étudiant n'a jamais plus d'une carte au statut `ACTIVE` à la fois (index unique partiel).
2. Réémettre une carte invalide automatiquement l'ancienne (`SUPERSEDED`) — l'ancien PDF reste archivé et consultable, mais n'est plus présenté comme valide (statut visible sur consultation/scan).
3. Annuler une carte (perte, vol) la fait passer à `CANCELLED` sans en émettre automatiquement une nouvelle — un geste explicite distinct de la réémission.
4. Une réimprimeion (retélécharger le même PDF déjà archivé) n'incrémente jamais le numéro de carte ni ne change le QR — elle ajoute une ligne à `student_card_reprints`, cohérent avec la règle "un document généré n'est jamais modifié après coup" déjà actée au Module 9.
5. La date d'expiration est recalculée uniquement à la génération, jamais mise à jour rétroactivement si l'année universitaire est modifiée après coup (cohérent avec le principe "jamais recalculé après coup" du Module 6/Module 9).

## 4. UI/UX (esquisse)

- **Étudiants → fiche étudiant** : nouvel onglet ou section "Carte d'étudiant" (générer, aperçu recto/verso/plié/découpé, annuler, réémettre, historique des réimpressions).
- **Documents officiels → Cartes d'étudiant** (ou sous-écran dédié) : génération par lot (classe/niveau/filière/campus), export PDF groupé.
- **Paramètres → Documents → Carte d'étudiant** : personnalisation (couleurs, fond, textes légaux, police) — portée exacte à confirmer selon §6 point 6.

## 5. Permissions (proposition)

Réutilise `DOCUMENTS:LECTURE`/`DOCUMENTS:CREATION` (Module 9) pour la génération/consultation. Nouvelle action pour le cycle de vie : `DOCUMENTS:ADMINISTRATION` (annuler/réémettre une carte) — `PermissionAction` a déjà cette valeur, utilisée ailleurs dans le projet pour les actions de gestion de cycle de vie (ex. `INSCRIPTIONS:ADMINISTRATION`).

## 6. Points ouverts — décisions actées le 2026-07-30

Tous les points sont désormais tranchés. Réponse du porteur du projet : *"maintient tes paramètres actuel pour la gestion des campus sans rien y changé quand au qr code affiche juste les infos de l'étudiant comme convenu initialement pour le reste tu peux appliquer ce qui se trouve sur la capture décran"*.

1. **QR code** → **payload informatif simple** (nom, matricule, filière, campus, année universitaire, date de génération — même famille que les autres documents du Module 9), **jamais une URL**, aucune ouverture de fiche en ligne. Cohérent avec ADR-007 (application hors-ligne) : aucune nouvelle route publique n'est créée.
2. **Multi-campus** → **aucun changement de l'architecture actuelle**. Pas de nouvelle table "par campus" : `CampusSettings`, `DocumentSignatory`, `OfficialStamp` restent des singletons par installation (ADR-005 non révisée). La face verso affiche simplement le nom du campus de l'installation et réutilise le signataire `DIRECTEUR_CAMPUS` déjà existant.
3. **Personnalisation** → mise en page **fixe**, fidèle à la maquette du §1.4 ("applique ce qui se trouve sur la capture d'écran"). Le contenu (textes légaux, activation des champs, couleurs de bande) reste piloté par un gabarit, jamais codé en dur.
4. **Texte légal du verso** → texte exact de la maquette (§1.4), retenu tel quel.
5. **Génération par lot** → une page par étudiant (recto+verso côte à côte, comme la maquette), conformément à ma recommandation (aucune objection soulevée).
6. **Réimpression** → retélécharge strictement le PDF déjà archivé, même règle que le reste du Module 9 ("jamais modifié après coup") — ma recommandation retenue.
7. **Date d'expiration** → calculée depuis l'année universitaire de l'inscription active de l'étudiant au moment de la génération — ma recommandation retenue.
8. **Champs du recto** → date de naissance et date d'inscription retirées, conformément à la maquette.

Le développement démarre à partir de cette conception, sans validation intermédiaire supplémentaire pour les choix déjà actés ci-dessus.
