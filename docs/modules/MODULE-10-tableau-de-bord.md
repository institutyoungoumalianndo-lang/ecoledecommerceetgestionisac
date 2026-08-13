# Module 10 — Tableau de bord & Rapports décisionnels

**Statut** : ✅ **Terminé — validé (2026-08-06)** par le porteur du projet ("OUI TOUT MARCHE BIEN") après test manuel réel des deux écrans (Rapports décisionnels, Alertes).
**Dépend de** : Module 6 (Évaluation — notes/bulletins/classement), Module 7 (Comptabilité — journal/grand livre/balance), Module 8 (Paie), tous **terminés — validés**. Lit aussi Module 4/4.1/4.3 (étudiants/inscriptions/paiements) et Module 5/5.2 (enseignants/charge horaire), déjà utilisés par le tableau de bord d'accueil.
**Source** : pas de chapitre dédié du cahier des charges — la seule mention existante est la ligne `ROADMAP.md` du Module 10 ("KPI, graphiques, statistiques, alertes") et une ligne du rapport d'analyse du projet Python existant (`RAPPORT_ANALYSE_ISAC_ERP.md`) : *"Rapports & tableau de bord | KPI, graphiques (barres/camembert), taux de réussite, activité récente, alertes"*, avec la note que ce domaine reste "à étoffer" au-delà du taux de réussite déjà présent dans l'ancien système. Cette analyse est donc une **proposition de périmètre**, pas l'interprétation d'un texte détaillé — voir §3 pour les points à valider avant tout développement.

---

## 0. Point bloquant à trancher en premier : ce qui existe déjà

Avant de proposer quoi que ce soit de nouveau, il faut être précis sur ce qui **existe déjà et fonctionne**, pour ne pas reconstruire en double :

- **`HomeDashboardScreen.tsx`** (+ `homeDashboardService.ts`) est déjà un tableau de bord transverse à l'accueil de l'application : étudiants actifs/inscrits du jour, encaissements jour/mois, étudiants débiteurs, professeurs/classes/filières, séances de la semaine, SMS/WhatsApp/e-mails envoyés, notifications non lues, **"alertes importantes"** (aujourd'hui un simple total messages échoués + cartes expirées), et des graphiques (évolution des inscriptions, paiements mensuels, historique 14 jours, recettes/dépenses, répartition étudiants par filière/niveau/sexe).
- Chaque module métier a déjà **son propre tableau de bord local** (Comptabilité, Paie, Pédagogie, Communication, Frais, Inscriptions, Enseignants) avec ses propres compteurs.
- `packages/ui` a déjà `StatCard`/`StatRingCard` (réutilisables) ; le composant de graphique (`ChartCard`) existe mais est **défini localement dans `HomeDashboardScreen.tsx`**, pas encore extrait en composant partagé.
- Le **centre de notifications internes** (`NotificationBell.tsx`, canal `INTERNE` du Module 12, table `internal_notifications`) est déjà une infrastructure générique : titre/corps/lien de navigation, marquage lu/non lu. Il n'est pas limité aux événements de communication — rien n'empêche d'y publier une alerte métier.
- **Rien n'existe** en revanche pour : un **moteur d'alertes configurables** (seuils définissables sans coder), une **analyse de tendance sur une période choisie** (l'existant est figé sur "aujourd'hui"/"ce mois"/"14 derniers jours"), un **rapport de performance pédagogique** (taux de réussite, moyennes par filière/niveau, évolution — c'était pourtant le seul vrai KPI "décisionnel" de l'ancien système Python), et des **rapports imprimables/exportables** propres à ce module (les 6 rapports comptables déjà livrés au Module 7 — Bilan, Journal, Grand livre... — restent des rapports **comptables**, pas des rapports de pilotage global).

**Proposition de périmètre du Module 10** (à valider, §3) : ne pas dupliquer les compteurs "aujourd'hui" déjà couverts par le tableau de bord d'accueil et les tableaux de bord par module. Se concentrer sur ce qui manque réellement :
1. un **rapport de performance pédagogique** (le KPI hérité de l'ancien système),
2. des **tendances financières/RH sur période configurable** (pas figées sur "ce mois"),
3. un **moteur d'alertes** générique et configurable, publiant dans le centre de notifications déjà existant,
4. des **rapports imprimables/exportables** dédiés au pilotage (pas des doublons des rapports comptables du Module 7).

---

## 1. Analyse fonctionnelle

### 1.1 Rapport de performance pédagogique

Reprend le seul KPI "décisionnel" hérité de l'ancien système (taux de réussite). Lit `bulletinPeriodeService`/`bulletinAnnuelService`/`classementService` (Module 6) sans redéfinir leurs calculs — même principe que partout ailleurs dans ce projet ("jamais de copie synchronisée, toujours une lecture à la demande"). Filtrable par année universitaire/période/filière/niveau/classe. Contenu proposé : taux de réussite (moyenne ≥ seuil configuré au Module 6), moyenne générale, distribution des mentions, évolution d'une période à l'autre, comparaison entre filières/niveaux/classes.

### 1.2 Tendances financières et RH sur période configurable

Le tableau de bord d'accueil et le tableau de bord Comptabilité montrent déjà "aujourd'hui"/"ce mois". Ce module ajoute une vue **sur plage de dates choisie** (ex. "l'année universitaire en cours", "les 12 derniers mois", une plage personnalisée) : évolution recettes/dépenses/trésorerie (Module 7), masse salariale et coût d'enseignement (Module 8), coût par étudiant (dépenses totales / effectif), taux de recouvrement des frais de scolarité (Module 4.2/4.3). Tout calculé à la demande sur les tables existantes — aucune nouvelle table de données financières.

### 1.3 Moteur d'alertes configurables (nouveau concept)

**Absent aujourd'hui du système** (vérifié : aucun modèle `Alert`, aucun moteur de seuil dans `packages/api/src/services`). Proposition :
- Un référentiel `AlertRule` (configurable sans coder, même principe que `NotificationEventConfig` du Module 12) : type de métrique (ex. `TRESORERIE_DISPONIBLE`, `IMPAYES_EN_RETARD`, `TAUX_OCCUPATION_CLASSE`, `MASSE_SALARIALE_MENSUELLE`), opérateur de comparaison, seuil, portée (globale ou par filière/campus selon le type), actif/inactif.
- Une boucle de vérification périodique côté serveur (`packages/api` est déjà un serveur persistant par campus, voir Module 12 §1.7 — même mécanisme de vérification à intervalle réutilisable) qui évalue les règles actives et publie une `InternalNotification` (canal `INTERNE`, réutilise le centre de notifications déjà construit) quand un seuil est franchi.
- Une table `AlertEvent` minimale pour éviter de renotifier en boucle le même franchissement (ex. ne notifier qu'au passage sous le seuil, pas à chaque vérification tant qu'on y reste) et pour garder un historique consultable des alertes passées.
- **Question ouverte** : les alertes critiques doivent-elles aussi partir par SMS/e-mail (réutilisant les canaux du Module 12) à des destinataires configurés, ou rester strictement internes à l'application en v1 ? Voir §3.

### 1.4 Rapports imprimables/exportables

Écrans imprimables (même pattern que les bulletins du Module 6 — pas de fichier PDF physique nécessaire, `window.print()`) plutôt que de nouveaux `DocumentType` dans le moteur PDF du Module 9, sauf si le porteur du projet a besoin d'un document officiel archivé avec numérotation — voir §3. Contenu : synthèse pédagogique (§1.1) et synthèse financière/RH (§1.2) sur la période choisie, dans le même esprit que les rapports comptables déjà livrés mais du côté pilotage plutôt que comptabilité pure.

### 1.5 Composants réutilisables

Extraction de `ChartCard` (aujourd'hui local à `HomeDashboardScreen.tsx`) vers `packages/ui`, pour être réutilisé par ce module sans dupliquer le code de rendu des graphiques. Toute nouvelle visualisation suit les principes déjà appliqués (palette catégorielle fixe, légende, libellés directs sélectifs, mode sombre).

---

## 2. Conception de la base de données (proposée)

Cohérent avec le principe déjà appliqué à 100% de ce projet : **aucune donnée dupliquée**. Les rapports (§1.1, §1.2, §1.4) restent des requêtes à la demande sur les tables déjà existantes (Module 4, 4.2, 4.3, 5, 5.2, 6, 7, 8) — **aucune nouvelle table nécessaire** pour cette partie.

Seul le moteur d'alertes (§1.3, concept réellement nouveau) nécessite un schéma :

```prisma
model AlertRule {
  id          String   @id @default(uuid())
  code        String   @unique          // ex. "TRESORERIE_BASSE"
  label       String                    // libellé affiché à l'admin
  metricType  String                    // clé identifiant le calcul serveur à exécuter
  comparator  String                    // "LT" | "LTE" | "GT" | "GTE"
  threshold   Decimal
  scope       String?                   // ex. filiereId, campusId — selon metricType, nullable = global
  channels    String[]                  // ex. ["INTERNE"], plus tard ["INTERNE","SMS","EMAIL"] si validé
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  events AlertEvent[]
}

model AlertEvent {
  id          String   @id @default(uuid())
  ruleId      String
  triggeredAt DateTime @default(now())
  resolvedAt  DateTime?                 // renseigné quand la métrique repasse sous/au-dessus du seuil
  value       Decimal                   // valeur mesurée au déclenchement
  notificationId String?                // lien vers l'InternalNotification publiée

  rule AlertRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)
}
```

Permissions proposées (même schéma que les autres modules) : `RAPPORTS_DECISIONNELS:LECTURE` (consultation des rapports/tendances), `ALERTES:MODIFICATION` (configuration des règles d'alerte, réservé à un rôle administratif).

---

## 3. Décisions validées (2026-08-06)

1. **Périmètre** : confirmé tel que proposé au §0 — rapport de performance pédagogique, tendances sur période configurable, moteur d'alertes, rapports imprimables dédiés au pilotage, sans dupliquer le tableau de bord d'accueil ni les tableaux de bord par module.
2. **Canal des alertes** : centre de notifications interne uniquement en v1 (canal `INTERNE`, réutilise `NotificationBell.tsx`/`internal_notifications` déjà construit) — pas de SMS/e-mail pour les alertes à ce stade.
3. **Rapports** : écrans imprimables (`window.print()`, même principe que les bulletins du Module 6) — pas de nouveau `DocumentType` dans le moteur PDF du Module 9.
4. **Règles d'alerte de départ** (seedées à titre d'exemple, modifiables sans coder comme tout `AlertRule`) : trésorerie disponible sous un seuil, impayés en retard au-delà d'un délai, taux d'occupation d'une classe dépassé, masse salariale mensuelle au-delà d'un seuil. Ajustables/complétables à tout moment depuis l'écran de configuration, aucune valeur codée en dur.

---

## 4. Hors périmètre (sauf demande explicite contraire)

- Intelligence artificielle / analyse prédictive (Module 17, non commencé, dépend de ce module).
- Toute donnée agrégée dupliquée/mise en cache — cohérent avec le principe "jamais de copie synchronisée" appliqué partout ailleurs dans ce projet.
- Refonte des tableaux de bord par module déjà livrés et validés.
