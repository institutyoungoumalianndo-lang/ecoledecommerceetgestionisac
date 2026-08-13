# Module 14 — Inventaire

**Statut** : ✅ **Terminé — validé (2026-08-07)** par le porteur du projet après test manuel réel ("ÇA FONCTIONNE"). Schéma Prisma + migration, seed (permissions INVENTAIRE, 5 catégories de départ, gabarit de numérotation `BIEN_INVENTAIRE`), packages/shared, packages/api (assetService/assetLocationService/assetCategoryService/assetMaintenanceService + routers) et apps/desktop (écrans Biens/Catégories/Lieux, fiche détaillée avec historique de mouvements et de maintenance, réforme à double confirmation) livrés. Typecheck (shared/api/desktop) et 145 tests unitaires (dont 9 nouveaux) passent. Périmètre validé (2026-08-06) : registre de biens + suivi de maintenance dès la v1, module indépendant de la comptabilité, référentiel de lieux dédié (bâtiments/étages), responsable = employé/enseignant existant.
**Dépend de** : Module 1 (Identité & Accès), **terminé — validé**. Module 5 (Enseignants) et Module 8 (Employés) pour le responsable d'un bien — tous deux **terminés — validés**.
**Source** : `ROADMAP.md` ne donne qu'une ligne de périmètre : *"Gestion des biens/matériel de l'établissement"*. Le rapport d'analyse du système Python existant (`RAPPORT_ANALYSE_ISAC_ERP.md` §7.4, ligne 185) confirme qu'il s'agit d'un module **entièrement nouveau** — aucune fonctionnalité d'inventaire n'existait dans l'ancien système, donc aucun pattern UX à reprendre ni migration de données à prévoir.

---

## 0. Ce qui existe déjà — à ne pas reconstruire

Recherche exhaustive du dépôt (aucune supposition) :

- **Aucun concept de bien/matériel/équipement/stock nulle part** — ni dans le schéma Prisma, ni dans `packages/api/src/services`, ni dans les écrans desktop. C'est un module entièrement à construire.
- **`Room`** (Module 5.2, `packages/db/prisma/schema.prisma`) — existe déjà pour l'emploi du temps, avec seulement `label`/`capacity` (nombre d'étudiants)/`isActive`. Aucun champ de localisation détaillée (bâtiment, étage) ni de liste d'équipements. Réutilisable comme **localisation possible d'un bien** (ex. "Vidéoprojecteur situé en Salle 12"), sans le modifier.
- **Comptabilité (Module 7)** — `ExpenseCategory`/`Expense`/`Supplier`/`ChartAccount` existent déjà et gèrent complètement le circuit "achat → dépense approuvée → écriture comptable". Aucun concept d'**immobilisation** (bien à valeur durable, amortissement) n'existe dans `AccountType` (`ACTIF, PASSIF, TRESORERIE, CHARGE, PRODUIT, CAPITAUX_PROPRES`) — la comptabilisation actuelle traite un achat de matériel comme une charge ponctuelle, jamais comme un actif à suivre dans le temps.
- **Moteur de numérotation générique** (`NumberingPurpose`, réutilisé par Matricule/Inscription/Reçu/Écriture/Dépense/Enseignant/Employé/Bulletins/Documents Module 9) — directement réutilisable pour générer un numéro d'inventaire unique par bien, sans réinventer de compteur.
- **Upload de fichiers avec redimensionnement** (`sharp`, Module 2 — logos, photos de documents) — directement réutilisable pour une photo de bien.

**Périmètre validé du Module 14** (2026-08-06) :
1. **Registre des biens** — fiche par bien : catégorie, localisation (référentiel dédié bâtiments/étages), responsable (employé/enseignant existant), état, valeur d'acquisition, photo, numéro d'inventaire unique.
2. **Historique de mouvements** — changement de localisation/responsable/état, jamais de suppression physique (cohérent avec le reste du projet : annulation de paiement, désactivation d'étudiant, etc. — toujours tracé).
3. **Suivi de maintenance/réparations** — historique des interventions par bien, avec coûts, dès la v1.
4. **Réforme/mise au rebut** — un bien hors d'usage passe par un statut de fin de vie explicite, avec justification, jamais supprimé.
5. **Indépendant de la comptabilité** (Module 7) — aucun lien avec `Expense`/`Supplier` en v1, saisie autonome (valeur/coûts en simple champ numérique informatif, pas de génération d'écriture comptable).

---

## 1. Analyse fonctionnelle

### 1.1 Registre des biens

Chaque bien a une fiche avec :
- **Numéro d'inventaire** — généré automatiquement via le moteur de numérotation existant (gabarit configurable, comme le matricule étudiant).
- **Catégorie** — référentiel configurable par l'établissement (ex. "Mobilier", "Informatique", "Matériel pédagogique", "Véhicule", "Matériel de sécurité") — même principe que `ExpenseCategory`/`FeeType` : aucune catégorie codée en dur.
- **Désignation/description**, **photo** (optionnelle, réutilise l'upload existant).
- **Localisation** — référentiel dédié `AssetLocation` (bâtiment, étage, désignation du lieu — ex. "Bâtiment principal / 1er étage / Salle 12"), indépendant des `Room` du Module 5.2 (celles-ci restent réservées à la planification de l'emploi du temps).
- **Responsable** — un employé ou enseignant existant (Module 5/8), optionnel.
- **État physique** — Bon / Moyen / Mauvais.
- **Statut d'usage** — En service / En panne / En réparation / Réformé / Perdu-volé.
- **Valeur d'acquisition** (champ numérique informatif, sans lien comptable), **date d'acquisition**.

### 1.2 Historique de mouvements

Toute modification de localisation, responsable, état ou statut génère une ligne d'historique horodatée (auteur, ancien/nouveau valeur) — même principe que le journal d'audit déjà systématique (`auditService.ts`), mais dédié au parcours de vie du bien pour un affichage chronologique dans la fiche (comme l'historique académique d'un étudiant, Module 4).

### 1.3 Suivi de maintenance/réparations

Chaque bien peut avoir un historique d'interventions (`AssetMaintenance`) : date, description de l'intervention, coût, intervenant (texte libre — un prestataire externe n'est pas nécessairement un fournisseur du Module 7, cohérent avec la décision d'indépendance comptable), statut (planifiée/terminée). Affiché chronologiquement dans la fiche du bien, jamais supprimé une fois enregistré.

### 1.4 Réforme / mise au rebut

Un bien "Réformé" ou "Perdu/volé" n'est jamais supprimé — son statut change avec une justification obligatoire (texte libre), consultable dans l'historique. Cohérent avec l'annulation de paiement (Module 4.3) et la désactivation d'étudiant/utilisateur : aucune suppression physique de données métier dans tout le projet.

### 1.5 Tableau de bord et recherche

- Liste paginée/triée/recherchée (mêmes composants `ServerDataTable` déjà utilisés partout), filtrable par catégorie/statut/localisation/responsable.
- Compteurs simples : nombre de biens par catégorie, par statut, valeur totale du parc (somme des valeurs d'acquisition en service), coût total de maintenance sur une période.
- Export CSV/Excel (comme tous les modules précédents).

### 1.6 Documents imprimables

- **Fiche d'inventaire** d'un bien (écran imprimable simple, dans l'esprit des fiches déjà produites ailleurs — sans passer par le moteur centralisé du Module 9 en v1).
- **Liste d'inventaire imprimable** par catégorie/localisation, utile pour un contrôle physique périodique.

---

## 2. Conception de la base de données (proposée)

```prisma
enum AssetCondition {
  BON
  MOYEN
  MAUVAIS
}

enum AssetStatus {
  EN_SERVICE
  EN_PANNE
  EN_REPARATION
  REFORME
  PERDU_VOLE
}

enum AssetMaintenanceStatus {
  PLANIFIEE
  TERMINEE
}

/** Référentiel de lieux dédié à l'inventaire — indépendant de `Room` (Module 5.2, réservée à
 * l'emploi du temps) : un bien peut se trouver hors salle de classe (bureau, entrepôt...). */
model AssetLocation {
  id        String   @id @default(uuid())
  building  String                     // bâtiment, ex. "Bâtiment principal"
  floor     String?                    // étage, ex. "Rez-de-chaussée", "1er étage"
  label     String                     // désignation du lieu, ex. "Salle 12", "Bureau du Directeur"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  assets    Asset[]

  @@unique([building, floor, label])
}

model AssetCategory {
  id        String   @id @default(uuid())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  assets    Asset[]
}

model Asset {
  id                  String          @id @default(uuid())
  inventoryNumber     String          @unique   // généré via le moteur de numérotation existant
  label               String
  description         String?
  photoPath           String?
  categoryId          String
  category            AssetCategory   @relation(fields: [categoryId], references: [id])
  locationId          String?
  location             AssetLocation? @relation(fields: [locationId], references: [id])
  responsibleEmployeeId String?                 // responsable administratif existant (Module 8), optionnel
  responsibleEmployee   Employee?     @relation(fields: [responsibleEmployeeId], references: [id])
  responsibleTeacherId  String?                 // responsable enseignant existant (Module 5), optionnel
  responsibleTeacher    Teacher?      @relation(fields: [responsibleTeacherId], references: [id])
  condition           AssetCondition  @default(BON)
  status              AssetStatus     @default(EN_SERVICE)
  acquisitionValue    Decimal?
  acquisitionDate     DateTime?
  reformJustification String?                   // obligatoire si status = REFORME/PERDU_VOLE
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  movements           AssetMovement[]
  maintenances        AssetMaintenance[]
}

model AssetMovement {
  id          String   @id @default(uuid())
  assetId     String
  asset       Asset    @relation(fields: [assetId], references: [id])
  changedBy   String                        // utilisateur auteur du changement
  field       String                        // "LOCALISATION" | "RESPONSABLE" | "ETAT" | "STATUT"
  oldValue    String?
  newValue    String?
  note        String?
  createdAt   DateTime @default(now())
}

model AssetMaintenance {
  id           String                  @id @default(uuid())
  assetId      String
  asset        Asset                   @relation(fields: [assetId], references: [id])
  description  String
  cost         Decimal?
  performedBy  String?                            // intervenant, texte libre (interne ou prestataire externe)
  status       AssetMaintenanceStatus  @default(PLANIFIEE)
  scheduledAt  DateTime?
  completedAt  DateTime?
  createdBy    String                             // utilisateur ayant enregistré l'intervention
  createdAt    DateTime                @default(now())
}
```

*(`Employee.assetsResponsibleFor Asset[]` et `Teacher.assetsResponsibleFor Asset[]` seraient les relations inverses ajoutées à ces modèles existants — extension additive, aucun champ existant modifié.)*

Permissions proposées (même principe que tous les modules précédents — 5 actions) : `INVENTAIRE:LECTURE`, `INVENTAIRE:CREATION`, `INVENTAIRE:MODIFICATION`, `INVENTAIRE:SUPPRESSION` (utilisée uniquement pour la réforme, jamais une suppression physique), `INVENTAIRE:ADMINISTRATION` (gestion des catégories et des lieux).

Un nouveau `NumberingPurpose` (`BIEN_INVENTAIRE`) serait ajouté à l'énumération existante.

---

## 3. Décisions (validées le 2026-08-06)

1. **Périmètre** : registre de biens **+ suivi de maintenance/réparations avec coûts dès la v1** (historique dédié par bien, §1.3).
2. **Lien comptabilité** : le module reste **indépendant** du Module 7 — aucune relation avec `Expense`/`Supplier`, valeurs/coûts en champs numériques informatifs uniquement.
3. **Localisation** : **référentiel de lieux dédié** (`AssetLocation` : bâtiment/étage/désignation), distinct des `Room` du Module 5.2.
4. **Responsable** : **employé/enseignant existant** (Module 5/8) — pas de champ texte libre.
5. **Documents imprimables** : écran imprimable simple en v1 (§1.6), pas d'intégration au moteur centralisé du Module 9 pour l'instant — à revoir si vous en exprimez le besoin après usage réel.

---

## 4. Hors périmètre (sauf demande explicite contraire)

- Suivi d'amortissement comptable des immobilisations (calcul de dépréciation, valeur nette comptable dans le temps) — chantier comptable distinct, non demandé dans le périmètre "gestion des biens/matériel".
- Gestion de stock/consommables avec entrées-sorties de quantités (fournitures de bureau, produits périssables) — un bien d'inventaire ici est une unité identifiable et durable (mobilier, informatique...), pas un stock consommable. À proposer séparément si besoin confirmé.
- Codes-barres/QR code physiques à imprimer et coller sur chaque bien — envisageable en extension du numéro d'inventaire si demandé, pas dans le périmètre de départ.
