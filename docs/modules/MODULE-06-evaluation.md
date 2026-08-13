# Module 6 — Évaluation (notes, bulletins, classement)

**Statut** : 🟠 **Développé (2026-07-28) — en attente du test manuel des écrans par le porteur du projet** (conception validée le 2026-07-28, "oui").
**Dépend de** : Module 2 (structure académique — années/semestres/niveaux/filières/classes), Module 2.1 (`Subject`/`SubjectOffering`), Module 4 (`Student`), Module 5 (`TeacherAssignment`, pour la feuille de saisie).
**Source** : pas un chapitre du cahier des charges cette fois — vous m'avez demandé de porter le domaine "bulletin de notes" du **projet existant** (`gestion_scolaire_NOUVEAU`, l'application PySide6/MySQL déjà analysée en profondeur au tout début de ce projet, voir `docs/RAPPORT_ANALYSE_ISAC_ERP.md`). Cette analyse relit directement son code (`services/notes_service.py`, `services/bulletin_service.py`, `services/bulletin_annuel_service.py`, `services/classement_service.py`, `services/feuille_saisie_service.py` et les migrations SQL correspondantes) plutôt qu'un texte de cahier des charges — voir §0.

---

## 0. Note de source et de numérotation

**Numérotation.** L'emplacement **"Module 6 — Évaluation"** (Notes, bulletins, classement — dépend de 4, 5, 2.1) est déjà réservé dans `ROADMAP.md` pour exactement ce domaine, sans collision à résoudre cette fois (aucun numéro proposé par vous).

**Nature de la source.** Contrairement aux modules précédents (chapitres numérotés du cahier des charges), cette analyse part du **code réel** du système existant plutôt que d'un texte de spécification. Le RAPPORT_ANALYSE_ISAC_ERP.md (§ "Notes", "Bulletins", "Classement") en donne déjà la synthèse ; j'ai relu le code source pour en extraire les règles de calcul exactes, les schémas de données et les patterns identifiés comme problématiques (§0.1). Cette lecture directe du code remplace ici la relecture d'un chapitre — les mêmes principes de la méthodologie s'appliquent : rien n'est développé avant votre validation explicite (§6).

### 0.1 Ce qui est repris tel quel, ce qui est corrigé

**Repris tel quel (logique métier déjà correcte et testée par l'usage réel)** :
- Note finale d'une matière = moyenne des composantes **renseignées** (orale, écrite, composition) — si une seule composante est saisie, elle sert seule de note finale.
- Barème de mention et règle de décision (Admis si ≥ 10, jamais de "Redoublant" décidé automatiquement).
- Classement par mérite avec gestion des ex-æquo façon "classement sportif" (deux étudiants à égalité partagent le même rang, le rang suivant saute — ex. 1, 1, 3).
- Classement calculé sur **toutes les classes** d'une même filière/niveau réunies, jamais une seule classe isolée.

**Corrigé par rapport au système existant, en réutilisant l'architecture déjà en place dans l'ERP (voir §6 pour validation)** :
1. **Duplication de la matière/du contexte** — la table `notes` du système existant stocke `matiere_id` + `annee_scolaire_id` + `module` (1 ou 2) + `coefficient` **en plus** d'une table `matieres` séparée : c'est exactement la duplication que `SubjectOffering` (Module 2.1) a déjà éliminée pour ce projet. Une note doit référencer directement une `SubjectOffering` existante (qui porte déjà matière + année + semestre + niveau + filière + coefficient), jamais redupliquer ces champs.
2. **"Module 1 ou 2" figé en dur** — le système existant code en dur exactement deux "modules" par an. Le Module 2 de cet ERP autorise un nombre quelconque de semestres (`AcademicPeriod`) par année universitaire ; une note doit donc simplement référencer la période de la `SubjectOffering` associée, et la moyenne annuelle doit se généraliser à N périodes plutôt que d'être figée à "(module1 + module2) / 2".
3. **Pattern "ligne provisoire puis finalisation" avec fichier PDF sur disque** — le rapport d'analyse a identifié ce pattern comme la cause d'un **bug bloquant réel en production** (ligne orpheline `'EN_COURS'` si la génération PDF échoue, protégé seulement dans 2 modules sur 9). Cet ERP n'a d'ailleurs jamais reproduit ce pattern : les documents (bulletin de paie, reçu) sont des écrans HTML/CSS imprimables nativement (`window.print()`), sans fichier PDF physique ni étape de finalisation à deux temps. Les bulletins/classements suivront le même principe déjà validé.
4. **Pondérations et seuils codés en dur** (poids des 3 composantes = 1/1/1, seuils de mention 10/12/14/16) — cohérent avec le principe déjà appliqué à chaque module de cet ERP ("aucune valeur codée en dur"), ces valeurs deviennent configurables plutôt que figées dans le code.

## 1. Analyse fonctionnelle

### 1.1 Note — un couple (étudiant, affectation de matière), jamais de duplication — **[interprétation]**

`notes` référence directement `students.id` + `subject_offerings.id` (Module 2.1) — cette dernière porte déjà matière, année, semestre, niveau, filière et coefficient. Trois composantes nullables (`note_orale`, `note_ecrite`, `note_composition`), une note finale **calculée, jamais saisie manuellement** (`note_finale = moyenne pondérée des composantes renseignées`), un indicateur `verrouillee`.

### 1.2 Pondération des composantes — configurable — **[interprétation]**

Le système existant pondère les 3 composantes à 1/1/1 (moyenne simple) en dur dans le code. Je propose un singleton `evaluation_settings` (même esprit que `payroll_settings`) portant `poids_orale`/`poids_ecrite`/`poids_composition` (défaut 1/1/1), modifiable depuis Paramètres → Évaluation, sans jamais devoir toucher au code pour ajuster une pondération.

### 1.3 Verrouillage d'une note (§1.6 du système existant)

Une note se verrouille automatiquement à la génération du bulletin de la période pour cet étudiant (§1.7). Une note verrouillée ne peut être modifiée que par un utilisateur disposant d'une permission d'administration dédiée — reprend exactement la règle du système existant (`NOTE_MODIFIER_VERROUILLEE`).

### 1.4 Moyenne de période (généralise le "moyenne de module" du système existant) — **[interprétation]**

Moyenne pondérée par coefficient des `SubjectOffering` de la période pour cet étudiant — identique au calcul existant, simplement recalée sur `AcademicPeriod` (Module 2) plutôt que sur un entier "module" 1/2 figé.

### 1.5 Moyenne annuelle — généralisée à N périodes — **[interprétation]**

Le système existant fait `(moyenne_module_1 + moyenne_module_2) / 2`. Je généralise : moyenne des moyennes de **toutes les périodes de l'année universitaire** pour lesquelles une moyenne est calculable (ignore les périodes sans note), pondération égale entre périodes — comportement identique au système existant dans le cas à 2 semestres, mais fonctionne aussi avec 1, 3 ou davantage de périodes définies au Module 2.

### 1.6 Barème de mention et décision — configurable — **[interprétation]**

Repris tel quel : `< 10` Ajourné, `[10, 12)` Passable, `[12, 14)` Assez Bien, `[14, 16)` Bien, `≥ 16` Très Bien ; décision `ADMIS` si moyenne ≥ seuil d'admission (10 par défaut), `AJOURNE` sinon — jamais `REDOUBLANT` décidé automatiquement (reste une correction manuelle possible, comme le système existant). Seuils portés sur `evaluation_settings` plutôt que codés en dur.

### 1.7 Bulletin de période — sans fichier PDF physique — **[interprétation, point clé]**

`bulletin_periode` : un enregistrement par (étudiant, période), capturant l'instantané du calcul au moment de la génération (moyenne, mention, décision, rang, effectif de la classe) + un numéro de dossier unique (moteur de numérotation généralisé, nouvelle réutilisation) + un `verification_code` (même principe que les bulletins de paie). Rendu à l'écran en HTML/CSS imprimable (comme `PayslipView`/`ReceiptView`), **aucun fichier PDF stocké sur disque** — élimine structurellement le bug de ligne orpheline identifié dans le système existant (§0.1 point 3). Générer le bulletin verrouille toutes les notes de la période pour cet étudiant.

### 1.8 Bulletin annuel

`bulletin_annuel` : même principe, un enregistrement par (étudiant, année universitaire), agrège les moyennes de toutes les périodes par matière, moyenne générale annuelle (§1.5), rang **annuel** calculé sur la filière/niveau (toutes classes confondues, §1.9) — reprend exactement la logique du système existant.

### 1.9 Classement — jamais stocké, recalculé à la demande

Comme le système existant : aucune nouvelle table, le classement se recalcule à chaque consultation à partir des notes déjà en base — réunit tous les étudiants d'une filière/niveau (toutes classes confondues) pour une année donnée, calcule leur moyenne (d'une période donnée, ou annuelle), trie par mérite, attribue un rang "façon classement sportif" (ex-æquo partagent le même rang, le suivant saute).

### 1.10 Feuille de saisie — écran imprimable, aucune donnée stockée

Liste les étudiants d'un contexte (filière/niveau/année/matière) avec des colonnes vierges pour saisie manuscrite hors-ligne, préremplissant le nom/téléphone de l'enseignant affecté à cette matière quand il n'y en a qu'un seul (réutilise `TeacherAssignment`, Module 5) — même mécanisme d'impression que les autres documents, sans aucune nouvelle table.

### 1.11 Permissions

`NOTES:LECTURE`/`NOTES:SAISIE`/`NOTES:ADMINISTRATION` (déverrouiller), `BULLETINS:LECTURE`/`BULLETINS:GENERATION`, `CLASSEMENT:LECTURE`, `EVALUATION:CONFIGURATION` (pondérations/seuils) — noms alignés sur la convention déjà en place dans l'ERP.

### 1.12 Hors périmètre de cette version

| Élément | Traitement |
|---|---|
| Génération PDF avec mise en page identique aux gabarits `reportlab` du système existant | Non reprise — écran HTML/CSS imprimable réutilisant le design system de l'ERP, comme tous les autres documents déjà migrés (voir §6 point 8) |
| QR code réellement scannable (image générée) | `verification_code` réservé, pas de génération d'image QR — même traitement que les bulletins de paie/reçus, en attendant le futur Module 9 |
| Bilan de fin d'année, décision de redoublement automatisée, éligibilité aux attestations | Hors périmètre de ce chapitre — mentionné pour mémoire dans le rapport d'analyse, non demandé ici |
| Évaluations par compétences / référentiels autres que note chiffrée sur 20 | Non demandé, hors périmètre |

---

## 2. Conception de la base de données

```
evaluation_settings (singleton configurable — voir §1.2/§1.6)
├── id
├── poids_orale, poids_ecrite, poids_composition (décimal, défaut 1.0 chacun)
├── seuil_admission (décimal, défaut 10.0)
├── seuil_passable, seuil_assez_bien, seuil_bien, seuil_tres_bien (décimaux, défauts 10/12/14/16)
└── updated_at

notes (un étudiant × une affectation de matière — jamais de duplication de matière/contexte)
├── id, student_id → students.id
├── subject_offering_id → subject_offerings.id (porte déjà matière/année/semestre/niveau/filière/coefficient)
├── note_orale, note_ecrite, note_composition (décimal 0-20, nullable)
├── note_finale (décimal, calculée — jamais saisie directement)
├── verrouillee (bool, défaut false)
├── saisie_par → users.id (nullable), saisie_le
└── unique(student_id, subject_offering_id)

bulletin_periode (un étudiant × une période — instantané figé à la génération)
├── id, student_id → students.id, academic_period_id → academic_periods.id
├── numero_dossier (unique, moteur de numérotation généralisé)
├── moyenne, mention, decision
├── rang, effectif_classe
├── verification_code
├── genere_par → users.id (nullable), genere_le
└── unique(student_id, academic_period_id)

bulletin_annuel (un étudiant × une année universitaire — instantané figé à la génération)
├── id, student_id → students.id, academic_year_id → academic_years.id
├── numero_dossier (unique)
├── moyenne_annuelle, mention, decision
├── rang, effectif (filière/niveau, toutes classes confondues)
├── verification_code
├── genere_par → users.id (nullable), genere_le
└── unique(student_id, academic_year_id)
```

Aucune table du Module 2/2.1/4/5 reconstruite : `notes` référence `SubjectOffering` (matière/contexte) et `Student` déjà existants ; le classement et la feuille de saisie n'introduisent aucune table, recalculés à la demande.

## 3. Règles métier

1. `note_finale` n'est jamais saisie directement — toujours recalculée à partir des composantes renseignées et des pondérations de `evaluation_settings`.
2. Une note verrouillée (bulletin de sa période déjà généré) ne peut être modifiée que par un utilisateur disposant de `NOTES:ADMINISTRATION`.
3. Générer un bulletin de période verrouille automatiquement toutes les notes de cette période pour l'étudiant concerné.
4. Un bulletin (période ou annuel) ne peut être généré que si au moins une note existe pour le contexte demandé (comme le système existant : pas de bulletin totalement vide).
5. Le classement ne considère que les étudiants ayant une moyenne calculable (au moins une note) — un étudiant sans aucune note n'apparaît pas dans le classement plutôt que d'y figurer avec un rang faussé.
6. Aucune suppression physique de `notes`/`bulletin_periode`/`bulletin_annuel` — un bulletin déjà généré reste consultable et réimprimable indéfiniment (il est lui-même l'archive, comme les bulletins de paie).
7. Un bulletin/une note reste immuable dans le temps : régénérer un bulletin déjà existant pour le même (étudiant, période) écrase l'instantané précédent uniquement si aucune règle de non-régression n'a été explicitement violée — **point ouvert, voir §6**.

## 4. UI/UX

- **Saisie des notes** : tableau par classe + matière + période (préremplit les notes existantes), reprend le fonctionnement déjà validé du système existant (une ligne par étudiant, 3 colonnes de saisie, note finale affichée en lecture seule).
- **Bulletins** : depuis la fiche étudiant ou un écran dédié, génération d'un bulletin de période ou annuel, aperçu/impression immédiate (écran HTML), historique des bulletins déjà générés pour un étudiant.
- **Classement** : filière + niveau + année + période (ou annuel), tableau trié par rang avec gestion des ex-æquo, imprimable.
- **Feuille de saisie** : filière + niveau + année + matière, liste des étudiants avec colonnes vierges, imprimable.
- **Paramètres → Évaluation** : pondérations des composantes, seuils de mention/admission.

## 5. Permissions

- `NOTES:LECTURE`, `NOTES:SAISIE`, `NOTES:ADMINISTRATION`
- `BULLETINS:LECTURE`, `BULLETINS:GENERATION`
- `CLASSEMENT:LECTURE`
- `EVALUATION:CONFIGURATION`

## 6. Points ouverts — merci de valider avant les migrations

1. Réutiliser `SubjectOffering` (Module 2.1) comme contexte direct d'une note, plutôt que reconstruire une table matière/contexte séparée comme le système existant (§1.1/§0.1 point 1). D'accord ?
2. Généraliser la moyenne annuelle à N périodes plutôt que "(module1+module2)/2" figé (§1.5/§0.1 point 2). D'accord ?
3. Rendre configurables les pondérations des composantes et les seuils de mention/admission, plutôt que de reprendre les valeurs codées en dur du système existant (§1.2/§1.6). D'accord ?
4. **[bloquant]** Bulletins (période et annuel) rendus comme écran HTML/CSS imprimable, sans fichier PDF stocké sur disque ni pattern "ligne provisoire" — même principe que le bulletin de paie/reçu déjà en place, qui élimine le bug de ligne orpheline identifié dans le système existant (§1.7/§0.1 point 3). D'accord, ou souhaitez-vous conserver un fichier PDF physique par bulletin (nécessiterait de réintroduire une gestion de fichiers pas encore présente ailleurs dans l'ERP) ?
5. Classement jamais stocké, recalculé à la demande (comme le système existant). D'accord ?
6. Réutilisation du moteur de numérotation généralisé pour les numéros de dossier de bulletin (2 nouveaux usages : bulletin de période / bulletin annuel, ou un seul avec un préfixe différent selon le type). D'accord, et quel(s) préfixe(s) souhaitez-vous (ex. `BUL-` / `BULAN-` comme le système existant) ?
7. Règle 7 (§3) : régénérer un bulletin déjà existant pour le même (étudiant, période/année) — faut-il l'autoriser librement (écrase l'instantané précédent, comme aujourd'hui dans le système existant qui ne semble pas l'empêcher), ou faut-il l'interdire une fois le bulletin généré (comme une ligne de paie validée, immuable) et exiger une action explicite d'administration pour le régénérer ?
8. Mise en page des bulletins/classements/feuilles de saisie : reprendre le design system déjà en place dans l'ERP (comme tous les documents déjà migrés), plutôt que de reproduire fidèlement la mise en page `reportlab` du système existant. Cela inclut la réutilisation directe du moteur de thèmes d'impression (Module 5.1/ADR-037) pour les couleurs. D'accord ?
9. Le système existant ne prévoyait qu'une permission de saisie et une de déverrouillage (`NOTE_SAISIR`/`NOTE_MODIFIER_VERROUILLEE`) — aucune permission séparée pour générer un bulletin ou consulter un classement (probablement inclus dans des rôles génériques). Les 6 permissions proposées ici (§1.11/§5), plus fines, vous conviennent-elles ?

## 7. Développement et tests

Développement réalisé le 2026-07-28 après validation de la conception ("oui") :

- **Migrations** : `evaluation_settings` (singleton), `notes` (student × subjectOffering, contrainte unique), `bulletins_periode`, `bulletins_annuels`. `NumberingPurpose` gagne `BULLETIN_PERIODE`/`BULLETIN_ANNUEL` (8ᵉ/9ᵉ réutilisations du moteur de numérotation généralisé). Un seul bulletin **actif** par (étudiant, période/année) appliqué via un **index unique partiel** (`WHERE annule = false`) — non exprimable en `@@unique` Prisma classique, ajouté à la main dans la migration (voir §3 règle 7).
- **Réutilisation découverte en cours de développement** : `student_enrollments.annual_average`/`mention`/`decision` (Module 4.1) existaient déjà, en attente d'un futur module d'évaluation pour les alimenter — la génération du bulletin annuel les renseigne désormais. `decision` réutilise directement l'enum `EnrollmentDecision` (Module 4.1, `EN_COURS`/`ADMIS`/`REDOUBLANT`/`AJOURNE`/`ABANDON`) plutôt qu'un enum dédié initialement esquissé en conception — corrigé avant tout développement de service, aucun impact sur les points validés en §6.
- **`packages/shared`** : schémas Zod (notes, bulletins de période/annuel, classement, feuille de saisie, réglages d'évaluation).
- **`packages/api`** : `noteService` (calcul de note finale/moyennes — fonctions pures — et verrouillage), `classementService` (`attribuerRangs`, fonction pure pour les ex-æquo), `bulletinPeriodeService`/`bulletinAnnuelService` (génération immuable, annulation, jamais de fichier PDF stocké), `feuilleSaisieService`, `evaluationSettingsService` ; 8 permissions `NOTES*`/`BULLETINS*`/`CLASSEMENT*`/`EVALUATION*`.
- **`apps/desktop`** : nouvelle section "Évaluation" (Saisie des notes, Bulletins, Classement, Feuille de saisie imprimables) et sous-section Paramètres → Évaluation (pondérations, seuils).
- **Tests** : 16 tests unitaires supplémentaires (note finale, moyennes pondérée/annuelle, mention/décision, classement avec ex-æquo). Vérification de bout en bout contre PostgreSQL réel (note finale calculée sur 3 composantes, moyenne de période pondérée par coefficient, mention/décision, rang avec ex-æquo dans la classe et dans le classement filière/niveau, verrouillage des notes après génération d'un bulletin — bloqué sans permission d'administration, autorisé avec —, immuabilité d'un bulletin déjà généré et régénération après annulation, moyenne annuelle généralisée à 2 périodes, alimentation de `student_enrollments`, feuille de saisie), script temporaire supprimé après usage. Lint/typecheck/build tous verts sur les 5 packages.

Décisions actées suite aux points ouverts §6 : réutilisation de `SubjectOffering` comme contexte de note, moyenne annuelle généralisée à N périodes, pondérations/seuils configurables, bulletins sans fichier PDF physique, classement jamais stocké, réutilisation du moteur de numérotation (préfixes `BUL-`/`BULAN-`), régénération d'un bulletin bloquée tant qu'il n'est pas explicitement annulé, mise en page reprenant le design system existant, 8 permissions dédiées.

## 8. Validation

Conception validée le 2026-07-28 ("oui"). Développement terminé et vérifié techniquement (§7) le 2026-07-28. **En attente du test manuel des écrans par le porteur du projet** avant validation finale du module.
