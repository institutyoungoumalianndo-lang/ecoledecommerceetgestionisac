# Module 12 — Centre de Communication Intelligent

**Statut** : ✅ **Terminé — validé (2026-07-29)** par le porteur du projet ("OUI IL N'Y A AUCUN PROBLEME A CE NIVEAU") après test manuel des écrans.
**Dépend de** : Module 1 (RBAC, journal d'audit), Module 2 (`EstablishmentSettings`/`CampusSettings` pour le nom officiel, le logo, les coordonnées), Module 4 (`Student`/`Guardian`), Module 4.1 (déclenchement à l'inscription validée), Module 4.3 (déclenchement obligatoire au paiement — voir §1.9), Module 5 (`Teacher`), Module 5.2 (déclenchement au changement de séance), Module 6 (déclenchement à la disponibilité d'un bulletin/de notes), Module 8 (`Employee`).
**Source** : Chapitre "CENTRE DE COMMUNICATION INTELLIGENT" du cahier des charges (reçu le 2026-07-29), sous-sections §13.1 à §13.15 plus une "Instruction finale". Toutes les sous-sections ont été transmises.

---

## 0. Note de numérotation — À LIRE EN PREMIER

Le chapitre est auto-numéroté "13.x" par vous, mais **"Module 13" est déjà réservé à la Bibliothèque** dans `ROADMAP.md` (gestion des ouvrages/emprunts — un domaine sans rapport). En revanche, **"Module 12" est réservé depuis le début du projet exactement à ce domaine** : *"Communication — Email, WhatsApp, SMS, notifications internes (dégradation propre si hors-ligne)"*. Je numérote donc ce chapitre **Module 12**, sans cascade sur aucun autre module déjà numéroté. La numérotation "13.x" de votre document semble suivre l'ordre de votre propre cahier des charges, indépendant de l'ordre interne du ROADMAP de ce projet — cohérent avec ce qui s'est déjà produit pour le Chapitre 12 de votre document, devenu Module 5.2 ici.

---

## 1. Analyse fonctionnelle

### 1.1 Objectif général et architecture indépendante des fournisseurs (§13.14 et l'introduction)

Un service central de communication, appelé par tous les autres modules (notifications automatiques) et utilisable directement (envoi manuel, campagnes). Techniquement : une interface `ChannelAdapter` par canal (SMS/WhatsApp/E-mail), un moteur de gabarits (templates + variables), un moteur d'envoi/planification, et une historisation systématique — le tout indépendant de l'implémentation concrète d'un fournisseur donné, cohérent avec votre demande explicite ("changement de prestataire sans modifier le fonctionnement de l'ERP").

**Point clé, voir §6.1 (bloquant)** : aucun fournisseur SMS ni WhatsApp Business n'est nommé dans le chapitre ("le fournisseur SMS", termes génériques). Le canal E-mail (SMTP, protocole standard, sans fournisseur propriétaire) est intégralement réalisable dès cette version. SMS et WhatsApp Business reposent sur des API propriétaires (Twilio, Africa's Talking, Orange/MTN, Meta Cloud API, 360dialog...) dont le contrat technique (authentification, format de requête/réponse) diffère d'un fournisseur à l'autre — je ne peux pas en inventer un sans risquer de livrer une intégration qui ne fonctionnera avec aucun vrai compte.

### 1.2 Tableau de bord (§13.1)

Chaque compteur listé est soit un comptage direct sur une table existante (contacts par type, réutilisant les fiches déjà en base — voir §1.2 ci-dessous "carnet d'adresses"), soit un comptage sur les nouvelles tables `communication_messages`/`campaigns` de ce module (SMS/WhatsApp/e-mails envoyés, campagnes créées/programmées, notifications automatiques envoyées, messages échoués/en attente). Le "solde SMS disponible" provient du compte SMS actif (§1.10) — lu depuis le fournisseur si son API le permet, sinon un champ renseigné manuellement par l'administrateur.

### 1.3 Carnet d'adresses intelligent (§13.2) — **aucune nouvelle table de contacts**

"Aucune ressaisie ne devra être nécessaire" — j'interprète cela comme la confirmation du principe déjà appliqué à chaque module de cet ERP (charge horaire, moyennes, classement, contrôle avant paie...) : **jamais de copie synchronisée**, toujours une lecture à la demande depuis les tables déjà existantes. Le carnet d'adresses est donc un **écran de recherche/filtre transverse**, pas une table `contacts` : il interroge `Student` (+ `StudentEnrollment` pour la classe/filière courante), `Guardian` (parents/tuteurs, via `StudentGuardian`), `Teacher`, `Employee` — jamais de duplication, jamais de désynchronisation possible.

Tous les champs demandés (nom, prénom, téléphone principal/secondaire, WhatsApp, e-mail, classe, filière, fonction, statut) existent déjà exactement sous cette forme sur `Student`/`Guardian`/`Teacher` (`phonePrimary`/`phoneSecondary`/`whatsapp`/`email` — trois de ces quatre modèles ont **déjà** les champs "téléphone principal/secondaire" utilisés littéralement par le chapitre). Seul `Employee` n'a pas de champ `whatsapp` dédié (correction possible en points ouverts, voir §6.3). Le champ "Campus" est une constante (`CampusSettings`, singleton mono-campus — voir ADR-005) tant qu'une seconde installation n'existe pas.

### 1.4 Envoi individuel (§13.3) et 1.5 Envoi groupé (§13.4)

Recherche réutilisant le carnet d'adresses (§1.3). L'envoi groupé résout une "audience" (classe(s)/filière(s)/campus/tous les étudiants/tous les enseignants/tous les parents/tout le personnel) en une liste de contacts résolue **au moment de l'envoi**, jamais figée à la création — cohérent avec le principe "jamais de copie" déjà retenu. "Un campus" reste équivalent à "tous" tant que l'installation est mono-campus (ADR-005) ; le champ est conservé pour ne pas bloquer une future extension multi-campus, sans être fonctionnellement significatif aujourd'hui.

### 1.6 Campagnes (§13.5) et 1.7 Planification (§13.12)

Une campagne porte : canal, gabarit ou contenu personnalisé, audience (comme §1.5), statut (`BROUILLON`/`PLANIFIEE`/`EN_COURS`/`SUSPENDUE`/`TERMINEE`/`ANNULEE`), et un mode de planification (`IMMEDIAT`/`DIFFERE`/`QUOTIDIEN`/`HEBDOMADAIRE`/`MENSUEL`).

**Point d'architecture important (non bloquant, voir §6.2)** : ce projet n'a aujourd'hui **aucun mécanisme de tâche planifiée** (vérifié : aucun cron, aucun `setInterval` de fond nulle part dans le code actuel). Cependant, `packages/api` est déjà conçu (ADR-007) comme **un serveur persistant partagé sur le réseau du campus**, distinct des postes clients Electron — ce n'est pas un serveur qui ne vit que pendant qu'une fenêtre est ouverte. Je propose donc d'ajouter au démarrage de ce serveur une **boucle de vérification périodique** (`setInterval`, aucune dépendance externe) qui traite les campagnes/envois différés arrivés à échéance. Si le serveur est éteint au moment prévu, l'envoi part dès son prochain démarrage — exactement la "dégradation propre si hors-ligne" déjà annoncée dans `ROADMAP.md` pour ce module avant même la réception de ce chapitre.

### 1.8 Bibliothèque de modèles (§13.6) et 1.9 Variables automatiques (§13.7)

Référentiel `message_templates` (11 modèles d'exemple seedés, modifiables sans programmation comme demandé, jamais codés en dur — même principe que `DEFAULT_PAYMENT_METHODS`/`DEFAULT_FEE_TYPES`). Un moteur de substitution pur (`{Nom}` → valeur réelle), fonction testable indépendamment, appliqué à l'envoi. Les variables `{MontantTotal}`/`{MontantPayé}`/`{ResteÀPayer}`/`{NuméroReçu}` proviennent directement du Module 4.3 au moment de l'événement, jamais recalculées a posteriori.

**Interprétation (non bloquante)** : parmi les 11 modèles listés, certains correspondent à des notifications **automatiques** (Paiement enregistré/en retard, Solde restant, Nouvelle inscription, Bulletin disponible, Nouvelle note — tous repris en §13.8), d'autres semblent purement **manuels** (Convocation, Réunion des parents, Changement d'emploi du temps, Anniversaire, Félicitations — aucun déclencheur automatique de ce type n'existe dans l'ERP pour "convocation"/"anniversaire"/"félicitations"). Je traite donc les 11 comme un référentiel unique de gabarits réutilisables à la fois en envoi manuel/campagne et, pour le sous-ensemble listé en §13.8, en notification automatique.

### 1.10 Notifications automatiques (§13.8) — voir points ouverts §6.4/§6.5

Chaque type d'événement (`NotificationEventConfig`) porte : le gabarit à utiliser, les canaux activés, et un interrupteur actif/inactif — configurable sans toucher au code, cohérent avec "aucune intervention manuelle ne devra être nécessaire" une fois configuré. Déclencheurs identifiés dans le code déjà construit :

| Événement du chapitre | Déclencheur technique existant |
|---|---|
| Inscription validée | `enrollmentService` (Module 4.1), création d'une `StudentEnrollment` |
| Paiement (partiel/complet) + reçu émis | `paymentService` (Module 4.3) — voir §1.11, fonction obligatoire |
| Bulletin disponible | `bulletinPeriodeService`/`bulletinAnnuelService` (Module 6), génération d'un bulletin |
| Nouvelles notes | à préciser — voir §6.4 (bloquant sur l'interprétation, pas sur la technique) |
| Changement d'emploi du temps | `seanceService.qualifySeance`/`updateSeance` (Module 5.2), statut `REPORTEE`/`ANNULEE`/`REMPLACEE` |
| Absence | **aucun module de suivi des absences des étudiants n'existe dans l'ERP** — voir §6.5 (bloquant) |
| Convocation | pas de déclencheur automatique identifiable — traité comme gabarit manuel (§1.9) |
| Certificat/Attestation disponible | **le Module 9 (Documents officiels), qui générerait ces documents, n'est pas encore construit** — voir §6.5 (bloquant) |

### 1.11 Notification automatique des paiements — fonction obligatoire (§13.9)

Traitée comme un cas dédié et prioritaire, pas seulement une entrée de plus dans `NotificationEventConfig` : un service `paymentNotificationService` branché sur la validation définitive d'un paiement (Module 4.3, après émission du reçu — dans cet ERP, l'émission du reçu fait partie du même geste que la validation, voir MODULE-04.3 §1.2, il n'y a pas de second geste manuel à attendre). Envoi **simultané** au numéro de l'étudiant (`Student.phonePrimary`) et à celui de son tuteur/parent (`Guardian.phonePrimary`, via `StudentGuardian` — si plusieurs tuteurs, tous ceux marqués `isPrimaryContact` reçoivent le message, voir §6.6). Les 13 variables listées par le chapitre sont toutes déjà disponibles au moment de l'événement (nom/classe/filière/campus depuis l'inscription courante, montant/date/heure/numéro de reçu/mode de paiement depuis le `Payment`, montant total/payé/reste à payer depuis le calcul déjà existant du Module 4.2/4.3, année universitaire depuis `AcademicYear`). Le texte "reste à payer" vs "totalité soldée" est une règle métier pure (`resteAPayer > 0`), testable indépendamment.

### 1.12 Configuration des passerelles — fonction obligatoire (§13.10)

Trois singletons/référentiels de configuration, réservés à une permission dédiée (`PARAMETRES_COMMUNICATION:*`, accordée par défaut au seul rôle Super Administrateur au seed — même mécanisme RBAC que `PARAMETRES_SECURITE:*`, pas un contrôle de rôle codé en dur) :

- **SMS** : plusieurs comptes possibles ("principal et secours" explicitement demandé) → référentiel `sms_gateway_accounts` (pas un singleton), un seul marqué `isDefault` à la fois. Chaque compte porte fournisseur, identifiants, clé API, numéro d'expédition, Sender ID, solde, statut de connexion, horodatage du dernier test.
- **WhatsApp Business** : un seul compte officiel demandé → singleton `whatsapp_gateway_settings`.
- **E-mail** : un seul compte SMTP demandé → singleton `email_gateway_settings`.
- **Signature et identité visuelle** : le logo et le nom officiel de l'établissement, ainsi que les coordonnées (adresse/téléphone/e-mail), **existent déjà** sur `EstablishmentSettings`/`CampusSettings` (Module 2) — réutilisés en lecture, jamais dupliqués. Seuls la signature des e-mails et le pied de page des messages sont propres à ce module (`communication_settings`, singleton).
- Toute modification de ces réglages passe par le journal d'audit déjà systématique (Module 1), comme demandé explicitement.

**Point de sécurité (non bloquant, recommandation §6.7)** : les clés/jetons API et le mot de passe SMTP seront stockés en base, éditables uniquement par le Super Administrateur (c'est littéralement ce que demande le chapitre : "configurer... sans modifier le code", donc en base plutôt qu'en variable d'environnement). Aucun mécanisme de chiffrement au repos n'existe dans cet ERP à ce jour pour ce type de secret. Je recommande a minima : ne jamais renvoyer la valeur complète au client une fois enregistrée (champ masqué, ressaisie complète pour modifier — même logique que "mot de passe" ailleurs dans l'app), et ne jamais journaliser la valeur elle-même dans le détail d'audit (seul le fait qu'une modification a eu lieu est tracé).

### 1.13 Historique (§13.11)

Table `communication_messages` — un enregistrement par message individuel réellement envoyé (pas par campagne). Contenu, destinataire et statut **figés au moment de l'envoi** (dénormalisés : nom/téléphone/e-mail du destinataire recopiés à cet instant), pour que l'historique reste lisible même si la fiche source est ensuite modifiée ou archivée — même principe que les bulletins de paie/notes (jamais recalculé après coup).

### 1.14 Interface utilisateur (§13.13)

Nouvelle section "Communication" dans `AppShell` (tableau de bord, envoi rapide, campagnes, carnet d'adresses, modèles, historique, planification intégrée aux campagnes) + sous-section Paramètres → Communication (réservée au Super Administrateur, §1.12).

---

## 2. Conception de la base de données

```
communication_settings (singleton — réglages génériques de ce module, voir §1.12)
├── id, email_signature, message_footer

sms_gateway_accounts (plusieurs comptes possibles — "principal et secours", voir §1.12)
├── id, provider_name, label, api_identifier, api_key, sender_id, official_phone_number (nullable)
├── balance (nullable), is_default, is_active
├── connection_status (CONNECTE/DECONNECTE/INCONNU), last_tested_at (nullable)

whatsapp_gateway_settings (singleton)
├── id, business_phone_number, api_identifier, access_token
├── connection_status, last_tested_at (nullable)

email_gateway_settings (singleton)
├── id, official_email, smtp_host, smtp_port, smtp_username, smtp_password, use_tls
├── connection_status, last_tested_at (nullable)

message_templates (référentiel configurable, 11 modèles seedés — voir §1.9)
├── id, code (unique), label, content, is_system (non supprimable), is_active

notification_event_configs (un par type d'événement automatique, voir §1.10)
├── id, event_type (enum), template_id → message_templates, channels (String[]), is_active

campaigns (voir §1.6/§1.7)
├── id, name, description, channel, template_id (nullable) → message_templates, custom_content (nullable)
├── audience_type (enum), audience_filter (JSON — ids concernés selon audience_type)
├── status (BROUILLON/PLANIFIEE/EN_COURS/SUSPENDUE/TERMINEE/ANNULEE)
├── schedule_type (IMMEDIAT/DIFFERE/QUOTIDIEN/HEBDOMADAIRE/MENSUEL)
├── scheduled_for (nullable), recurrence_end_date (nullable)
├── created_by_user_id → users, created_at, updated_at

communication_messages (historique — un enregistrement par envoi individuel réel, voir §1.13)
├── id, channel, recipient_type (ETUDIANT/PARENT/ENSEIGNANT/PERSONNEL/AUTRE), recipient_id (nullable, sans FK — polymorphe)
├── recipient_name, recipient_phone (nullable), recipient_email (nullable) — dénormalisés au moment de l'envoi
├── content (texte final, variables déjà substituées)
├── template_id (nullable) → message_templates, campaign_id (nullable) → campaigns
├── status (EN_ATTENTE/ENVOYE/LIVRE/LU/ECHOUE), error_message (nullable)
├── sent_by_user_id (nullable — vide pour un envoi automatique), scheduled_for (nullable), sent_at (nullable)
├── created_at

internal_notifications (notifications internes — voir §13.8, in-app uniquement)
├── id, user_id → users, title, content, is_read, link_type (nullable), link_id (nullable), created_at
```

Aucune extension de `NumberingPurpose` n'est nécessaire : aucun document de ce module ne porte de numéro séquentiel officiel (pas de "reçu de communication").

## 3. Règles métier

1. Un message n'est jamais envoyé sans passerelle configurée et active pour son canal — statut `ECHOUE`, motif "Passerelle non configurée", jamais une exception qui bloquerait l'événement déclencheur (même principe que l'intégration comptable conditionnelle, ADR-028/036 : le paiement/l'inscription/le bulletin reste valide même si la notification échoue).
2. La notification de paiement (§1.11) part à l'étudiant et à tous ses tuteurs marqués contact principal, jamais avant l'émission du reçu.
3. Un gabarit système (`is_system = true`) reste modifiable mais jamais supprimable — même principe que les modes de paiement système (Module 4.3).
4. Une seule passerelle SMS peut être `is_default` à la fois (bascule transactionnelle, même logique que tout "un seul actif à la fois" déjà appliqué ailleurs).
5. L'audience d'une campagne est résolue au moment de chaque envoi (immédiat ou différé), jamais figée à la création — un étudiant qui change de classe entre la création et l'envoi reçoit le message pour sa classe à l'instant de l'envoi.
6. Historique jamais modifié rétroactivement — un renvoi après échec crée un nouvel enregistrement, ne réécrit pas l'ancien.
7. **WhatsApp n'est jamais un canal éligible pour une notification automatique** (voir §6.1) : `notification_event_configs.channels` ne peut contenir que SMS et E-mail. Un message WhatsApp est toujours créé avec le statut `EN_ATTENTE` et un lien `wa.me`, jamais envoyé par le système lui-même — seul un clic humain explicite ("Marquer comme envoyé") le fait passer à `ENVOYE`.

## 4. UI/UX

- **Communication** (nouvelle section `AppShell`) : Tableau de bord, Envoi rapide (individuel/groupé), Campagnes (liste + création/édition/planification/duplication), Carnet d'adresses (recherche transverse), Modèles, Historique.
- **Paramètres → Communication** (Super Administrateur uniquement) : Comptes SMS, WhatsApp Business, E-mail (SMTP), Signature & pied de page, chacun avec un bouton "Tester l'envoi".
- Notifications internes : cloche/compteur dans l'en-tête de `AppShell`, déjà présent pour l'utilisateur connecté.

## 5. Permissions

- `COMMUNICATION:LECTURE`, `COMMUNICATION:CREATION` (envoi individuel/groupé rapide — action `ENVOI` inexistante dans le catalogue `PermissionAction` du Module 1, `CREATION` réutilisée comme pour tout autre enregistrement créé, ex. `PAIEMENTS:CREATION`)
- `CAMPAGNES:LECTURE`, `CAMPAGNES:CREATION`, `CAMPAGNES:MODIFICATION`, `CAMPAGNES:SUPPRESSION`, `CAMPAGNES:VALIDATION` (planifier/suspendre/reprendre)
- `MODELES_COMMUNICATION:LECTURE`, `MODELES_COMMUNICATION:MODIFICATION`
- `PARAMETRES_COMMUNICATION:LECTURE`, `PARAMETRES_COMMUNICATION:MODIFICATION` (accordées uniquement au rôle Super Administrateur par défaut au seed)

## 6. Points ouverts — merci de valider avant les migrations

1. **[bloquant]** Aucun fournisseur SMS ni WhatsApp Business n'est nommé (§1.1). Avez-vous déjà un contrat avec un fournisseur SMS précis (Twilio, Africa's Talking, un agrégateur local guinéen, Orange/MTN...) et un accès WhatsApp Business (Meta Cloud API directe, ou via un prestataire comme 360dialog/Twilio/Gupshup) ? Si oui, merci de me donner le(s) nom(s) — je n'ai besoin d'aucun identifiant réel pour construire l'adaptateur, seulement de savoir quel contrat technique implémenter. Si non encore décidé, je propose de livrer cette version avec : le canal E-mail pleinement fonctionnel (SMTP, aucun fournisseur propriétaire) ; les canaux SMS/WhatsApp avec toute l'infrastructure (configuration, historique, gabarits, déclencheurs) prête, mais l'envoi réel marqué "passerelle non configurée" jusqu'à ce qu'un fournisseur soit choisi et l'adaptateur correspondant branché dans une itération de suivi rapide.
2. Boucle de vérification périodique (`setInterval`, aucune dépendance externe) ajoutée au serveur `packages/api` pour traiter les campagnes/envois différés à échéance (§1.6/§1.7) — d'accord avec cette approche, cohérente avec l'architecture serveur persistant déjà actée (ADR-007) ?
3. `Employee` n'a pas de champ `whatsapp` dédié (contrairement à `Student`/`Guardian`/`Teacher`) — j'ajoute ce champ par extension additive, ou le personnel administratif est-il notifié uniquement par SMS/e-mail pour l'instant ?
4. "Nouvelles notes" (§13.8) : notification à chaque saisie individuelle de note (potentiellement très fréquent — jusqu'à des dizaines par classe et par jour), ou seulement quand les notes deviennent définitives (verrouillage à la génération du bulletin, déjà couvert par "Bulletin disponible") ? Je recommande la seconde option pour éviter un flot de notifications lors de la saisie.
5. **[bloquant sur la portée, pas sur la technique]** "Absence" et "Certificat/Attestation disponible" (§13.8) n'ont aucun déclencheur possible aujourd'hui : aucun module de suivi des absences des étudiants n'existe dans l'ERP (le Module 5.2 ne suit que le pointage des **enseignants**), et le Module 9 (Documents officiels, qui génèrerait certificats/attestations) n'est pas construit. Je propose de définir ces deux types d'événement dans le modèle dès maintenant (prêts à être câblés plus tard) mais sans aucun déclencheur actif tant que les modules sources n'existent pas — d'accord, ou préférez-vous les retirer complètement de cette version ?
6. Si un étudiant a plusieurs tuteurs marqués contact principal (`isPrimaryContact`), la notification de paiement part-elle à tous, ou seulement au premier ? Je recommande "à tous" (aucune perte d'information), sauf préférence contraire.
7. Stockage en clair des clés/jetons API et du mot de passe SMTP en base (voir §1.12, recommandation de masquage à l'affichage + exclusion de l'audit détaillé) — cette approche vous convient-elle, ou souhaitez-vous une autre protection (à préciser, je ne peux pas improviser un système de chiffrement sans votre validation d'un choix technique) ?
8. Canaux activés par type d'événement automatique configurables individuellement (`notification_event_configs.channels`, §1.10) plutôt qu'un seul canal par défaut global pour toutes les notifications automatiques — d'accord avec cette flexibilité ?
9. Numérotation proposée : **Module 12**. D'accord ?

### 6.1 Décisions actées suite à la discussion (2026-07-29)

- **SMS** : le porteur du projet dispose d'une puce prépayée Orange (paiement marchand), **pas** d'un contrat Orange SMS API (Orange Developer Center, OAuth2) — cette dernière nécessite un contrat entreprise séparé, inexistant ici. Impossible d'envoyer un SMS par API cloud depuis une simple puce grand public. Solution retenue : un **téléphone Android dédié** (disponible chez le porteur du projet), avec la puce insérée, faisant tourner une application de passerelle SMS tierce et open source exposant une API HTTP locale (type "SMS Gateway for Android") — le serveur `packages/api` appelle cette API locale pour envoyer chaque SMS. Cette application est installée et maintenue par le porteur du projet lui-même, hors du périmètre de ce développement ; `sms_gateway_accounts.provider_name` porte une valeur dédiée pour ce type de passerelle (adaptateur générique HTTP : URL de base + identifiants, configurable sans toucher au code, cohérent avec l'architecture indépendante des fournisseurs de §1.1).
- **WhatsApp Business** : le porteur du projet dispose de l'**application classique** (gratuite), pas de la Cloud API de Meta — aucune automatisation officielle n'est donc possible. Une automatisation non officielle (pilotage de l'application comme un humain) violerait les conditions d'utilisation de WhatsApp et exposerait le numéro à un bannissement — **écartée**. Solution retenue : un flux **"Cliquer pour envoyer" semi-manuel**, via un lien `wa.me` officiel pré-rempli avec le message — un membre du personnel doit cliquer "Ouvrir WhatsApp" puis "Envoyer" lui-même pour chaque message, et confirmer l'envoi dans l'ERP. **Conséquence structurelle** : WhatsApp ne peut donc jamais porter l'exigence "aucune intervention manuelle" des notifications automatiques (§1.10/§1.11) — seuls SMS et E-mail assurent réellement les notifications automatiques (dont la notification de paiement obligatoire, §1.11) ; WhatsApp reste disponible pour l'envoi individuel et, avec les réserves d'usage pratique déjà signalées (un clic par destinataire), pour de petites campagnes ciblées.
- Points 2 à 9 : tous acceptés tels que proposés (boucle de vérification périodique en process pour les campagnes planifiées ; ajout du champ `whatsapp` à `Employee` ; "Nouvelles notes" notifié à la disponibilité du bulletin, pas à chaque saisie ; "Absence"/"Certificat-Attestation disponible" définis mais inactifs faute de modules sources ; notification de paiement envoyée à tous les tuteurs contact principal ; clés API stockées en clair, masquées à l'affichage, exclues de l'audit détaillé ; canaux configurables individuellement par type d'événement automatique ; numérotation Module 12).

Conception et points ouverts validés le 2026-07-29 par le porteur du projet ("oui").

## 7. Développement et tests

### 7.1 Schéma Prisma et migration

Une migration (`20260729094741_module_12_communication`) : `communication_settings`, `sms_gateway_accounts`, `whatsapp_gateway_settings`, `email_gateway_settings`, `message_templates`, `notification_event_configs`, `campaigns`, `communication_messages`, `internal_notifications` + enums associés, extension additive `employees.whatsapp`. Aucune extension de `NumberingPurpose` (aucun document séquentiel dans ce module).

### 7.2 Seed

11 permissions `COMMUNICATION*`/`CAMPAGNES*`/`MODELES_COMMUNICATION*`/`PARAMETRES_COMMUNICATION*` (ces dernières réservées de fait au Super Administrateur via RBAC, sans contrôle de rôle codé en dur — même mécanisme que `PARAMETRES_SECURITE:*`). 11 gabarits système (`is_system=true`). 4 configurations de notification automatique (inscription validée, paiement, bulletin disponible, changement d'emploi du temps) — les seuls événements avec un déclencheur réel dans le code ; `ABSENCE`/`CERTIFICAT_DISPONIBLE`/`ATTESTATION_DISPONIBLE` restent définis dans l'enum sans ligne de configuration, prêts à être câblés quand leurs modules sources existeront.

### 7.3 packages/shared

Schémas Zod pour le carnet d'adresses transverse, les réglages de passerelles (clés/tokens jamais renvoyés en clair au client — `hasApiKey`/`hasSmtpPassword` booléens uniquement), les gabarits, la configuration des événements automatiques (`automaticCommunicationChannelSchema` restreint à SMS/EMAIL — WhatsApp rejeté au niveau du schéma, pas seulement par convention), les campagnes, l'historique, les notifications internes, le tableau de bord.

### 7.4 packages/api

- **Adaptateurs de canal** (`communicationChannels/`) : `EmailAdapter` (SMTP via `nodemailer`, fonctionnel), `SmsAdapter` (passerelle Android locale, adaptateur HTTP générique — URL de base + en-tête d'autorisation configurables), `buildWhatsAppLink` (génère un lien `wa.me`, jamais un envoi réel).
- `communicationContactService.ts` : carnet d'adresses résolu à la demande sur `Student`/`Guardian`/`Teacher`/`Employee`, jamais de copie.
- `messageTemplateService.ts` : CRUD + `substituteTemplateVariables` (fonction pure, testée).
- `communicationGatewaySettingsService.ts` : comptes SMS (bascule transactionnelle du compte par défaut), réglages WhatsApp/E-mail/génériques, tests de connexion.
- `communicationMessageService.ts` : cœur de l'envoi (`dispatchAutomaticNotification`, envoi individuel/groupé rapide) — un message n'est jamais envoyé sans passerelle configurée et active, statut `ECHOUE` explicite plutôt qu'une exception qui bloquerait l'appelant.
- `campaignService.ts` : CRUD, audience résolue à la demande à chaque exécution (`resolveCampaignAudience`), planification/suspension/reprise, campagnes récurrentes (calcul de la prochaine échéance, terminaison à la date de fin).
- `paymentNotificationService.ts` : notification de paiement (fonction obligatoire), `buildSoldeMessage` (fonction pure, testée) pour la règle "reste à payer" vs "totalité soldée".
- `enrollmentNotificationService.ts`/`bulletinNotificationService.ts`/`seanceNotificationService.ts` : hooks pour les 3 autres événements automatiques.
- `communicationScheduler.ts` : boucle `setInterval` (60 s) démarrée dans `packages/api/src/index.ts`, traite les campagnes planifiées/récurrentes à échéance.
- Hooks non intrusifs dans `paymentService.createPayment` (Module 4.3), `enrollmentService.createEnrollment` (Module 4.1), `bulletinPeriodeService`/`bulletinAnnuelService` (Module 6), `seanceService.qualifySeance` (Module 5.2) — un seul appel `void notifyXxx(...)` ajouté après le geste métier existant, aucune logique de ces services modifiée.
- Routers tRPC : `communicationContacts`, `messageTemplates`, `notificationEventConfigs`, `campaigns`, `communicationMessages`, `internalNotifications` (accessible à tout utilisateur connecté, indépendant des permissions du module), `communicationGatewaySettings`, `communicationDashboard`.

### 7.5 apps/desktop

Nouvelle section **Communication** (Tableau de bord, Envoi rapide, Campagnes, Carnet d'adresses, Modèles, Historique — incluant la file "cliquer pour envoyer" WhatsApp). Nouvelle sous-section **Paramètres → Communication** (Super Administrateur : Comptes SMS, WhatsApp Business, E-mail, Signature & pied de page, Notifications automatiques). Cloche de notifications internes dans l'en-tête de `AppShell`, indépendante des permissions du module Communication.

### 7.6 Tests

10 tests unitaires (`substituteTemplateVariables` : 5 tests, `buildSoldeMessage` : 2 tests, `automaticCommunicationChannelSchema` : 3 tests confirmant le rejet de WhatsApp/Interne). Vérification de bout en bout contre PostgreSQL réel (script créé puis supprimé, conformément à la convention du projet) : substitution de variables de bout en bout via un envoi réel, dégradation propre sans passerelle configurée (statut `ECHOUE`, aucune exception), flux WhatsApp "cliquer pour envoyer" avec confirmation manuelle, notification automatique de paiement déclenchée sans bloquer (4 messages générés : étudiant + tuteur contact principal × SMS/e-mail), campagne "tous les étudiants" exécutée avec le bon nombre de destinataires. Toutes les données créées par le script ont été nettoyées. 106 tests `packages/api` (96 précédents + 10 nouveaux) et 9 tests `packages/shared` (6 précédents + 3 nouveaux) passent ; `packages/shared`/`packages/api`/`apps/desktop` typechecks et lint verts.

## 8. Validation

Validé le 2026-07-29 par le porteur du projet ("OUI IL N'Y A AUCUN PROBLEME A CE NIVEAU") après test manuel des écrans.
