# Module 9 — Moteur Centralisé de Documents Officiels (PDF)

**Statut** : ✅ **Terminé — livré sous autonomie complète le 2026-07-29, en attente du retour du porteur du projet après usage réel.** Conception, schéma, seed, backend, interface, tests et vérification de bout en bout réalisés dans une seule session (voir §7) ; les décisions d'architecture ci-dessous sont actées par moi, documentées pour traçabilité, et pourront être ajustées sur simple demande après usage réel.
**Dépend de** : Module 2 (`EstablishmentSettings`/`CampusSettings`/`DocumentSignatory`/`OfficialStamp`/`DocumentTemplate`/`PrintThemeSettings`, tous réutilisés — voir §0.1), Module 4 (`Student`), Module 4.3 (`Payment`), Module 5 (`Teacher`), Module 5.2 (`Seance`, emploi du temps), Module 6 (notes/bulletins — non repris dans le périmètre Tier 1, voir §1.2), Module 7 (`ChartAccount` — non repris dans le périmètre Tier 1), Module 8 (`Employee`, `PayrollLine` — non repris dans le périmètre Tier 1).
**Source** : Chapitre "MOTEUR CENTRALISÉ DE DOCUMENTS OFFICIELS (PDF)" du cahier des charges (reçu le 2026-07-29), sections §1 à §16 plus une "Consigne finale" accordant l'autonomie complète. Numérotation sans collision : correspond exactement à l'emplacement déjà réservé "Module 9 — Documents officiels" dans `ROADMAP.md`.

---

## 0. Notes de cadrage — À LIRE EN PREMIER

### 0.1 Réutilisation massive d'une infrastructure déjà anticipée par le Module 2

Le Module 2 avait délibérément construit, en anticipation de ce chapitre, une part importante de ce qui est demandé ici :
- `DocumentType` (enum), `DocumentTemplate` (un enregistrement par type : logos à afficher, cachet, signataire, pied de page personnalisé) — exactement "chaque document devra posséder son propre modèle" (§9).
- `DocumentSignatory` — cinq rôles de signature (`DIRECTEUR_GENERAL`, `DIRECTEUR_CAMPUS`, `DIRECTEUR_ETUDES`, `COMPTABLE`, `RESPONSABLE_ADMINISTRATIF`) — **correspondance exacte, mot pour mot**, avec la liste demandée en §10.
- `OfficialStamp` — cachet officiel avec image, taille/position en mm, et types de documents concernés — exactement §11.
- `PrintThemeSettings` — 11 couleurs déjà configurables (bordures, séparateurs, titres, en-têtes, tableaux, textes, cadres, totaux) — couvre l'essentiel de §8, complété par les champs manquants (épaisseur des bordures, marges, format du papier, orientation, couleur des pieds de page).
- `EstablishmentSettings` — nom officiel, logo principal, logo secondaire, **logo du ministère** (déjà présent) — couvre l'essentiel de §6, seul le logo de campus manque (ajouté à `CampusSettings`).
- Le moteur de numérotation générique (`matriculeService.generateNumber`, `NumberingPurpose`, déjà réutilisé 9 fois depuis le Module 4) — réutilisé tel quel pour §14, chaque nouveau type de document reçoit son propre `NumberingPurpose` (série indépendante, comme demandé).

Je n'ai donc **pas reconstruit** ce qui existait déjà : j'étends ces tables et ce moteur plutôt que de créer un système parallèle — cohérent avec le principe "réutiliser au maximum" appliqué à chaque module de cet ERP.

### 0.2 Autonomie accordée — portée de mes décisions

Le porteur du projet a explicitement autorisé un développement autonome jusqu'à l'achèvement du module, sans validation intermédiaire. Je documente néanmoins chaque décision d'interprétation ci-dessous (comme un ADR), pour que le porteur du projet puisse les revoir a posteriori — l'autonomie ne change pas la discipline de traçabilité déjà appliquée à chaque module de ce projet, seulement le moment où le retour est donné (après livraison plutôt qu'avant).

### 0.3 Un vrai moteur PDF, pas une extension du moteur d'impression HTML/CSS existant — décision structurante

Les documents déjà migrés (bulletin de paie, reçus, bulletins de notes — ADR-037/041) utilisent un moteur d'impression **HTML/CSS + `window.print()`**, choisi précisément pour éviter la classe de bug "ligne orpheline si génération PDF échouée" identifiée dans le système existant analysé. Ce chapitre demande explicitement l'inverse : un **fichier PDF réellement généré, archivé, téléchargeable et envoyable** ("Les utilisateurs autorisés pourront : consulter, réimprimer, télécharger, envoyer", §15) — une page HTML imprimée par le navigateur ne peut être ni stockée telle quelle, ni jointe automatiquement à un e-mail, ni redemandée identique plus tard si les données source ont changé entre-temps.

Je construis donc un **véritable moteur de génération PDF** (bibliothèque `pdfkit`, aucune dépendance à Chromium/Puppeteer — cohérent avec la prudence déjà observée sur la stabilité du registre npm sur cette machine, voir ADR-030), qui produit un fichier binaire réel, stocké (`uploads/generated-documents/`, réutilisant le mécanisme de stockage déjà en place pour les logos/documents étudiants), archivé dans une nouvelle table `generated_documents`, et servi via la route statique `/uploads/` déjà existante.

**Ce moteur ne remplace pas rétroactivement l'écran HTML/CSS déjà validé** du bulletin de paie/reçus/bulletins de notes (risque de régression sur des fonctionnalités déjà testées et validées par vous) — voir §1.2 pour le périmètre exact retenu pour cette livraison.

### 0.4 Périmètre de cette livraison — tous les types enregistrés, un sous-ensemble pleinement implémenté

Le chapitre liste environ 25 types de documents. Je distingue :
- **Tier 1 — pleinement implémentés** (génération réelle, données réelles, numérotation, archivage, QR, signature, cachet) : Certificat de scolarité, Attestation d'inscription, Carte d'étudiant, Attestation de travail, Liste des étudiants, Liste des enseignants, Liste des classes, Fiche d'émargement, Emploi du temps, Historique des paiements — soit **10 types**. Ce sous-ensemble couvre volontairement 5 archétypes de mise en page différents (texte+cachet, carte compacte avec photo, tableau, grille de signatures, grille horaire hebdomadaire) et 4 domaines (étudiants, personnel, RH/emploi du temps, finances) ; les trois listes tabulaires (étudiants/enseignants/classes) partagent le même archétype de mise en page mais couvrent chacune un domaine de données distinct, ce qui prouve que le moteur fonctionne réellement de façon transverse plutôt que de dupliquer la même attestation à peine reformulée.
- **Catalogue complet enregistré, non implémenté** (`document_templates` créé pour chaque type restant, visible dans l'écran de configuration, marqué "Bientôt disponible", aucune génération possible pour l'instant) : Carte de paiement (signification ambiguë dans le chapitre), Attestation de réussite/de stage, Diplôme (le chapitre demande lui-même "prévoir le support même si le module sera développé plus tard"), Attestation de salaire, Contrat de travail et Décision d'affectation (contenu juridique/RH non spécifié par le chapitre — je ne peux pas inventer un texte de contrat de travail ou une décision administrative sans risquer une erreur légale), Reçu de paiement/Bulletin de salaire/Bulletin et relevé de notes (déjà des écrans HTML/CSS validés — voir §0.3), Rapports de caisse/financiers/statistiques et procès-verbaux (nécessitent une conception de mise en page dédiée par rapport, hors périmètre de cette itération).

Cette architecture reste **évolutive sans modification des types déjà livrés** ("Les modèles devront être évolutifs afin de permettre l'ajout de nouveaux documents sans modifier les anciens", §16) : chaque nouveau type ajoute une valeur d'enum + un générateur de contenu, jamais une modification du moteur central.

### 0.5 "La devise" (§4) = la devise nationale (motto), pas la monnaie

Le chapitre demande la configurabilité de "la devise" parmi les propriétés de l'en-tête institutionnelle — dans le contexte d'une en-tête officielle affichant "Travail – Justice – Solidarité", il s'agit de la **devise nationale** (terme officiel guinéen), pas de la devise monétaire (déjà couverte par `CurrencySettings`, Module 2, sans rapport ici).

---

## 1. Analyse fonctionnelle

### 1.1 En-tête institutionnelle (§3/§4)

Nouveau singleton `institutional_header_settings`, entièrement configurable (texte, couleurs, police, taille, espacement, alignement — §4), seedé avec les valeurs exactes du chapitre : "RÉPUBLIQUE DE GUINÉE" (une couleur), la devise nationale en 3 segments colorés indépendamment (rouge/jaune/vert, couleurs du drapeau : `#CE1126`/`#FCD116`/`#009460`), le nom de l'école (gras, bleu foncé, plus grand), le nom de l'institut (rouge/bordeaux), la citation (italique, centrée, couleur discrète). Rendu par le moteur PDF en tête de **chaque** document généré, sans exception.

### 1.2 Charte graphique unique et apparence des documents (§2/§8)

`PrintThemeSettings` (Module 2, ADR-037) déjà porteur de 11 couleurs, étendu avec : `footerColor`, `borderWidthPt`, `marginMm`, `paperFormat` (A4/LETTRE), `orientation` (PORTRAIT/PAYSAGE). Un seul écran "Apparence des documents" pilote la totalité — aucun document ne définit sa propre couleur.

### 1.3 Logos, campus, signatures, cachet (§5/§6/§7/§10/§11)

`EstablishmentSettings.logoPrimaryPath`/`logoSecondaryPath`/`ministryLogoPath` déjà existants, réutilisés tels quels. `CampusSettings` étendu d'un `logoPath` (nouveau — "logo du campus" absent jusqu'ici). `CampusSettings.name` déjà affiché automatiquement (mono-campus par installation, ADR-005 — un changement de campus ne peut survenir qu'en modifiant ces réglages, ce qui met à jour tous les documents suivants immédiatement, comme demandé). `DocumentSignatory`/`OfficialStamp` déjà construits, réutilisés sans modification.

### 1.4 Modèles de document (§9)

`DocumentTemplate` (existant) étendu avec : `showCampusLogo`, `showQrCode` (défaut `true`), `allowDoubleExemplaire`, `secondaryCopyLabel` (ex. "Exemplaire Étudiant"/"Exemplaire Employé", éditable). Un enregistrement par type de document du catalogue complet (Tier 1 + catalogue enregistré, voir §0.4).

### 1.5 QR Code (§12)

Généré à la volée à chaque document (bibliothèque `qrcode`, aucune dépendance externe), encodant un JSON minimal (numéro du document, matricule si pertinent, nom complet, campus, année universitaire, date de génération — exactement les champs listés) — jamais une URL externe (l'ERP est un système local/LAN sans exposition Internet, voir ADR-007). La vérification d'authenticité se fait donc par lecture directe du contenu encodé (comparaison avec le numéro archivé), pas par un site de vérification en ligne, hors périmètre de cet ERP local.

### 1.6 Numérotation automatique (§13)

Réutilise le moteur générique (`NumberingPurpose`) — un nouveau purpose par type Tier 1 (`CERTIFICAT_SCOLARITE`, `ATTESTATION_INSCRIPTION`, `CARTE_ETUDIANT`, `ATTESTATION_TRAVAIL`, `LISTE_ETUDIANTS`, `LISTE_ENSEIGNANTS`, `LISTE_CLASSES`, `FICHE_EMARGEMENT`, `EMPLOI_DU_TEMPS`, `HISTORIQUE_PAIEMENTS`), chaque série strictement indépendante (déjà la sémantique du moteur existant).

### 1.7 Archivage automatique (§14)

Nouvelle table `generated_documents` : type, numéro, entité liée (polymorphe, sans FK — même principe que `communication_messages.recipient_id`, Module 12), chemin du fichier, contenu QR, indicateur double exemplaire, auteur, date. Écran de consultation avec actions Consulter/Réimprimer (= retélécharger le même fichier déjà généré, jamais régénéré différemment)/Télécharger/Envoyer (ce dernier renvoie vers le Module 12 — joindre le document existant à un message, non construit dans cette livraison faute de demande explicite de pièce jointe dans le Module 12 déjà livré ; le fichier reste téléchargeable manuellement en attendant).

### 1.8 Double exemplaire intelligent (§15)

Option par type de document (`allowDoubleExemplaire`), déclenchée à la génération : deux copies sur une même page A4, mention "Exemplaire Administration" (fixe) / mention configurable par type (`secondaryCopyLabel`). **Ne s'applique qu'aux nouveaux documents Tier 1** compacts (attestations courtes) — non applicable à la Liste des étudiants/Fiche d'émargement/Emploi du temps (documents déjà pleine page).

### 1.9 Notifications automatiques (§16, section tronquée dans le chapitre reçu)

Le texte du chapitre s'interrompt avant de préciser le contenu exact de cette section ("Le moteur documentaire devra communiquer avec le module" — phrase incomplète). Interprétation retenue : le Module 12 (Communication) pourra à l'avenir joindre un `GeneratedDocument` existant à une notification automatique (ex. "votre certificat de scolarité est prêt") — non câblé dans cette livraison, faute de spécification exploitable, mais l'archive (`generated_documents`) est prête à être référencée par un futur hook, exactement comme les événements `ABSENCE`/`CERTIFICAT_DISPONIBLE`/`ATTESTATION_DISPONIBLE` du Module 12 restent définis sans déclencheur actif.

## 2. Conception de la base de données

```
institutional_header_settings (singleton — voir §1.1)
├── republic_line, republic_line_color
├── motto_part1/2/3 (texte + couleur indépendante par segment)
├── school_name_line, school_name_color, school_name_bold, school_name_font_size
├── institute_name_line, institute_name_color
├── tagline_line, tagline_color, tagline_italic
├── font_family, line_spacing, alignment (GAUCHE/CENTRE/DROITE)

print_theme_settings (Module 2, étendu — voir §1.2)
├── ... champs existants
├── footer_color, border_width_pt, margin_mm, paper_format, orientation

campus_settings (Module 2, étendu — voir §1.3)
├── ... champs existants
└── logo_path (nouveau)

document_templates (Module 2, étendu — voir §1.4)
├── ... champs existants (show_logo_primary, show_logo_secondary, show_stamp, signatory_role_code, custom_footer_text)
└── show_campus_logo, show_qr_code, allow_double_exemplaire, secondary_copy_label

generated_documents (archivage — voir §1.7)
├── id, document_type, document_number (unique)
├── related_entity_type, related_entity_id (nullable, sans FK — polymorphe)
├── file_path, qr_payload, double_exemplaire
├── generated_by_user_id, generated_at, created_at
```

`document_type` (enum, Module 2) étendu de 9 nouvelles valeurs Tier 1 (`CARTE_ETUDIANT` déjà existant est réutilisé tel quel) + 15 valeurs du catalogue Tier 2 non implémenté (voir §0.4). `NumberingPurpose` étendu de 10 nouvelles valeurs (une par type Tier 1, y compris `CARTE_ETUDIANT` qui n'avait pas encore de série de numérotation dédiée).

## 3. Règles métier

1. Un document généré n'est jamais modifié après coup — une "réimpression" retélécharge le fichier déjà archivé, jamais une régénération avec des données potentiellement différentes (même principe que les bulletins/bulletins de paie déjà livrés).
2. Chaque type de document possède sa propre série de numérotation, jamais partagée (§13).
3. L'en-tête institutionnelle apparaît sur tous les documents Tier 1 sans exception, jamais codée en dur.
4. Aucun module ne doit appeler une bibliothèque PDF directement — toute génération passe par `documentEngineService.generateDocument(...)`.
5. Un type de document non implémenté (catalogue Tier 2) refuse explicitement la génération avec un message clair, jamais une erreur technique brute.

## 4. UI/UX

- **Documents officiels** (nouvelle section) : générer un document (sélection du type + de l'entité concernée), historique/archive (recherche, consulter, réimprimer, télécharger).
- **Paramètres → Documents** : En-tête institutionnelle, Apparence des documents (étendu), Modèles de documents (catalogue complet, statut implémenté/à venir), Logo de campus (dans Paramètres → Campus, déjà existant).

## 5. Permissions

- `DOCUMENTS:LECTURE`, `DOCUMENTS:CREATION`
- `PARAMETRES_DOCUMENTS:LECTURE`, `PARAMETRES_DOCUMENTS:MODIFICATION`

## 6. Développement et tests

- **Schéma/migration** : `NumberingPurpose` (+10), `DocumentType` (+24 : 9 Tier 1 nouveaux + `CARTE_ETUDIANT` réutilisé + 15 Tier 2), `CampusSettings.logoPath`, `DocumentTemplate` (+4 champs), `PrintThemeSettings` (+5 champs, 2 nouveaux enums `PaperFormat`/`PageOrientation`), nouveaux modèles `InstitutionalHeaderSettings` et `GeneratedDocument`. Migration `20260729193358_module_9_documents_officiels`, appliquée avec succès sur PostgreSQL réel.
- **Seed** : 4 permissions, 33 lignes `DocumentTemplate` (dont 3 avec `allowDoubleExemplaire` par défaut : Certificat de scolarité, Attestation d'inscription, Attestation de travail), `InstitutionalHeaderSettings` avec les valeurs exactes du chapitre (couleurs du drapeau pour la devise nationale, texte par défaut de chaque ligne), 10 séries de numérotation Tier 1.
- **packages/shared** : `institutionalHeaderSettings.ts`, `generatedDocument.ts` (union Zod discriminée par `documentType`, une entrée par type Tier 1 avec ses propres références obligatoires), extensions de `branding.ts` (`TIER1_DOCUMENT_TYPES`, catalogue), `printThemeSettings.ts`, `studentNumbering.ts`, `establishment.ts`.
- **packages/api** : `services/documents/pdfEngine.ts` (primitives de rendu `pdfkit` — en-tête institutionnelle tricolore avec logos, titre, tableau générique, signature+cachet, QR via `qrcode`, pied de page multi-pages) ; `documentEngineService.ts` (orchestrateur unique — construit le contexte de rendu depuis les réglages existants, génère le numéro via `matriculeService.generateNumber` réutilisé tel quel, archive le PDF via `saveGeneratedDocument`, gère le double exemplaire en deux pages pleines) ; 10 générateurs de contenu dans `services/documents/generators/` ; `documentCatalogService.ts` (catalogue combinant `DocumentTemplate` et le statut Tier 1/Tier 2) ; `institutionalHeaderSettingsService.ts`, `generatedDocumentService.ts` (lecture seule, résolution du libellé de l'entité liée par type) ; routers `documents`/`institutionalHeaderSettings`.
- **apps/desktop** : écran "Documents officiels" (génération par type avec formulaire de références dynamique, historique filtrable avec téléchargement) ; Paramètres → En-tête institutionnelle (nouvel écran, tous les champs du chapitre éditables) ; Modèles de documents étendu (badge Disponible/Bientôt disponible, nouveaux champs Tier 1) ; Thèmes d'impression étendu (mise en page) ; champ logo sur l'écran Campus.
- **Tests** : `pdfEngine.test.ts` (5 tests — payload QR minimal sans URL, formatage de date), `generatedDocument.test.ts` (5 tests — union discriminée, rejet explicite d'un type Tier 2 comme `DIPLOME`). Suite complète des trois packages exécutée après chaque étape (`packages/shared` : 14 tests, `packages/api` : 111 tests, `apps/desktop` : typecheck web+node propre) — aucune régression.
- **Vérification de bout en bout** : script jetable (créé, exécuté contre PostgreSQL réel, données nettoyées, supprimé — convention établie du projet) confirmant pour 8 types Tier 1 : génération réelle d'un PDF écrit sur disque (`uploads/generated-documents/`), numérotation strictement croissante et indépendante par série (ex. `CS-1-26` puis `CS-2-26`), double exemplaire produisant deux pages, payload QR complet après le refactor `buildQrPayload`. Fichiers PDF de test (jusqu'à ~1,8 Mo chacun, du fait des logos établissement haute résolution déjà téléversés au Module 2, encodés sans compression par `pdfkit`) supprimés après vérification.
- **Écart non bloquant constaté** : les PDF générés sont plus volumineux que nécessaire (logos non recompressés spécifiquement pour l'intégration PDF) — sans impact fonctionnel pour un usage local/LAN, noté ici pour une optimisation future si la taille devient un problème réel.

## 7. Validation

Développement réalisé de bout en bout sous l'autonomie complète accordée par le porteur du projet pour ce module ("je t'autorise à travailler de manière autonome jusqu'à son achèvement... sans demander de validation intermédiaire"). Aucune étape de validation intermédiaire n'a donc été requise avant la mise à disposition. Conception, schéma, seed, backend, interface, tests et vérification de bout en bout contre PostgreSQL réel ont été menés dans une seule session, avec traçabilité complète (ADR-047 à ADR-050, `ROADMAP.md`, `CHANGELOG.md`).

**Statut** : livré le 2026-07-29, en attente du retour du porteur du projet après usage réel — les décisions de portée prises sous autonomie (périmètre Tier 1/Tier 2, non-migration des documents HTML/CSS existants, double exemplaire en deux pages) restent ouvertes à ajustement sur simple demande, sans coût de réécriture du moteur central.
