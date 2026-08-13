import {
  PrismaClient,
  PermissionAction,
  SignatoryRole,
  DocumentType,
  StudentDocumentType,
  PayrollComponentKind,
  NumberingPurpose,
} from "@prisma/client";

/**
 * Seed du projet : rôles système (non supprimables), catalogue de
 * permissions, et lignes singleton pour que l'application ne parte jamais
 * sur un état vide incohérent.
 *
 * Idempotent : peut être relancé sans dupliquer (upsert sur les clés uniques).
 */
const prisma = new PrismaClient();

const SYSTEM_ROLES = [
  { code: "SUPER_ADMIN", label: "Super Administrateur" },
  { code: "DIRECTEUR_GENERAL", label: "Directeur Général" },
  { code: "DIRECTEUR_CAMPUS", label: "Directeur de Campus" },
  { code: "DIRECTEUR_ETUDES", label: "Directeur des Études" },
  { code: "RESPONSABLE_SCOLARITE", label: "Responsable Scolarité" },
  { code: "COMPTABLE", label: "Comptable" },
  { code: "CAISSIER", label: "Caissier" },
  { code: "ENSEIGNANT", label: "Enseignant" },
  { code: "BIBLIOTHECAIRE", label: "Bibliothécaire" },
  { code: "RESPONSABLE_RH", label: "Responsable RH" },
  { code: "SECRETAIRE", label: "Secrétaire" },
  { code: "AGENT_ADMINISTRATIF", label: "Agent administratif" },
] as const;

type PermissionSeed = { module: string; action: PermissionAction; label: string };

/** Catalogue de permissions du module IDENTITE (Module 1). */
const IDENTITE_PERMISSIONS: PermissionSeed[] = [
  { module: "UTILISATEURS", action: "LECTURE", label: "Consulter les utilisateurs" },
  { module: "UTILISATEURS", action: "CREATION", label: "Créer un utilisateur" },
  { module: "UTILISATEURS", action: "MODIFICATION", label: "Modifier un utilisateur (dont réinitialiser le mot de passe)" },
  { module: "UTILISATEURS", action: "SUPPRESSION", label: "Supprimer un utilisateur" },
  { module: "UTILISATEURS", action: "ADMINISTRATION", label: "Administrer les utilisateurs (activer/désactiver)" },
  { module: "ROLES", action: "LECTURE", label: "Consulter les rôles" },
  { module: "ROLES", action: "CREATION", label: "Créer un rôle" },
  { module: "ROLES", action: "MODIFICATION", label: "Modifier un rôle" },
  { module: "ROLES", action: "SUPPRESSION", label: "Supprimer un rôle personnalisé" },
  { module: "ROLES", action: "ADMINISTRATION", label: "Attribuer les permissions d'un rôle" },
  { module: "PERMISSIONS", action: "LECTURE", label: "Consulter le catalogue de permissions" },
  { module: "AUDIT", action: "LECTURE", label: "Consulter le journal d'audit" },
  { module: "AUDIT", action: "EXPORT", label: "Exporter le journal d'audit" },
  { module: "AUDIT", action: "IMPRESSION", label: "Imprimer le journal d'audit" },
  { module: "PARAMETRES_SECURITE", action: "LECTURE", label: "Consulter la politique de sécurité" },
  { module: "PARAMETRES_SECURITE", action: "MODIFICATION", label: "Modifier la politique de sécurité" },
];

/** Catalogue de permissions du Module 2 (Paramètres généraux). */
const PARAMETRES_PERMISSIONS: PermissionSeed[] = [
  { module: "ETABLISSEMENT", action: "LECTURE", label: "Consulter les paramètres établissement" },
  { module: "ETABLISSEMENT", action: "MODIFICATION", label: "Modifier les paramètres établissement" },
  { module: "CAMPUS", action: "LECTURE", label: "Consulter les paramètres campus" },
  { module: "CAMPUS", action: "MODIFICATION", label: "Modifier les paramètres campus" },
  { module: "SIGNATURES", action: "LECTURE", label: "Consulter les signatures" },
  { module: "SIGNATURES", action: "MODIFICATION", label: "Modifier les signatures" },
  { module: "CACHET", action: "LECTURE", label: "Consulter le cachet officiel" },
  { module: "CACHET", action: "MODIFICATION", label: "Modifier le cachet officiel" },
  { module: "ANNEES", action: "LECTURE", label: "Consulter les années universitaires" },
  { module: "ANNEES", action: "CREATION", label: "Créer une année universitaire" },
  { module: "ANNEES", action: "MODIFICATION", label: "Modifier une année universitaire" },
  { module: "ANNEES", action: "ADMINISTRATION", label: "Clôturer/réouvrir/activer une année universitaire" },
  { module: "ANNEES", action: "EXPORT", label: "Exporter les années universitaires" },
  { module: "ANNEES", action: "IMPRESSION", label: "Imprimer les années universitaires" },
  { module: "FILIERES", action: "LECTURE", label: "Consulter les filières" },
  { module: "FILIERES", action: "CREATION", label: "Créer une filière" },
  { module: "FILIERES", action: "MODIFICATION", label: "Modifier une filière" },
  { module: "FILIERES", action: "SUPPRESSION", label: "Désactiver une filière" },
  { module: "FILIERES", action: "EXPORT", label: "Exporter les filières" },
  { module: "FILIERES", action: "IMPRESSION", label: "Imprimer les filières" },
  { module: "NIVEAUX", action: "LECTURE", label: "Consulter les niveaux d'études" },
  { module: "NIVEAUX", action: "CREATION", label: "Créer un niveau d'études" },
  { module: "NIVEAUX", action: "MODIFICATION", label: "Modifier un niveau d'études" },
  { module: "NIVEAUX", action: "SUPPRESSION", label: "Désactiver un niveau d'études" },
  { module: "NIVEAUX", action: "EXPORT", label: "Exporter les niveaux d'études" },
  { module: "NIVEAUX", action: "IMPRESSION", label: "Imprimer les niveaux d'études" },
  { module: "CLASSES", action: "LECTURE", label: "Consulter les classes" },
  { module: "CLASSES", action: "CREATION", label: "Créer une classe" },
  { module: "CLASSES", action: "MODIFICATION", label: "Modifier une classe" },
  { module: "CLASSES", action: "SUPPRESSION", label: "Désactiver une classe" },
  { module: "CLASSES", action: "EXPORT", label: "Exporter les classes" },
  { module: "CLASSES", action: "IMPRESSION", label: "Imprimer les classes" },
  { module: "DEVISE", action: "LECTURE", label: "Consulter les paramètres de devise" },
  { module: "DEVISE", action: "MODIFICATION", label: "Modifier les paramètres de devise" },
  { module: "REGIONAL", action: "LECTURE", label: "Consulter les paramètres régionaux" },
  { module: "REGIONAL", action: "MODIFICATION", label: "Modifier les paramètres régionaux" },
  { module: "THEME", action: "LECTURE", label: "Consulter la personnalisation graphique" },
  { module: "THEME", action: "MODIFICATION", label: "Modifier la personnalisation graphique" },
  { module: "MODELES_DOCUMENTS", action: "LECTURE", label: "Consulter les modèles de documents" },
  { module: "MODELES_DOCUMENTS", action: "MODIFICATION", label: "Modifier les modèles de documents" },
  { module: "PARAMETRES_SAUVEGARDE", action: "LECTURE", label: "Exporter la configuration" },
  { module: "PARAMETRES_SAUVEGARDE", action: "VALIDATION", label: "Importer/restaurer la configuration" },
];

/** Catalogue de permissions du Module 4 (Étudiants). */
const ETUDIANTS_PERMISSIONS: PermissionSeed[] = [
  { module: "ETUDIANTS", action: "LECTURE", label: "Consulter le tableau et les fiches étudiants" },
  { module: "ETUDIANTS", action: "CREATION", label: "Créer un étudiant" },
  { module: "ETUDIANTS", action: "MODIFICATION", label: "Modifier un étudiant (dont changer de classe)" },
  { module: "ETUDIANTS", action: "SUPPRESSION", label: "Archiver/restaurer un étudiant" },
  { module: "ETUDIANTS", action: "IMPRESSION", label: "Imprimer le tableau ou une fiche étudiant" },
  { module: "ETUDIANTS", action: "EXPORT", label: "Exporter la liste des étudiants" },
  { module: "ETUDIANTS", action: "ADMINISTRATION", label: "Configurer la génération du matricule" },
  { module: "ETUDIANTS_DOCUMENTS", action: "LECTURE", label: "Consulter/télécharger les documents administratifs" },
  { module: "ETUDIANTS_DOCUMENTS", action: "CREATION", label: "Importer un document administratif" },
  { module: "ETUDIANTS_DOCUMENTS", action: "MODIFICATION", label: "Remplacer un document administratif" },
  { module: "ETUDIANTS_DOCUMENTS", action: "SUPPRESSION", label: "Supprimer un document administratif" },
  { module: "ETUDIANTS_IMPORT", action: "CREATION", label: "Lancer l'assistant d'import Excel/CSV" },
  { module: "ETUDIANTS_IMPORT", action: "VALIDATION", label: "Confirmer l'exécution d'un import" },
];

/** Catalogue de permissions du Module 4.1 (Inscriptions et réinscriptions). */
const INSCRIPTIONS_PERMISSIONS: PermissionSeed[] = [
  { module: "INSCRIPTIONS", action: "LECTURE", label: "Consulter les inscriptions et le tableau de bord" },
  { module: "INSCRIPTIONS", action: "CREATION", label: "Nouvelle inscription ou réinscription" },
  { module: "INSCRIPTIONS", action: "MODIFICATION", label: "Modifier une inscription (régime, statut de paiement...)" },
  { module: "INSCRIPTIONS", action: "SUPPRESSION", label: "Annuler une inscription" },
  { module: "INSCRIPTIONS", action: "IMPRESSION", label: "Imprimer la fiche ou le tableau des inscriptions" },
  { module: "INSCRIPTIONS", action: "EXPORT", label: "Exporter la liste des inscriptions" },
  { module: "INSCRIPTIONS", action: "ADMINISTRATION", label: "Configurer régimes, numérotation, capacité, documents obligatoires" },
  { module: "INSCRIPTIONS_IMPORT", action: "CREATION", label: "Lancer l'assistant d'import Excel/CSV" },
  { module: "INSCRIPTIONS_IMPORT", action: "VALIDATION", label: "Confirmer l'exécution d'un import" },
];

/** Catalogue de permissions du Module 4.2 (Frais de scolarité). */
const FRAIS_PERMISSIONS: PermissionSeed[] = [
  { module: "FRAIS", action: "LECTURE", label: "Consulter les types de frais, tarifs et échéanciers" },
  { module: "FRAIS", action: "CREATION", label: "Créer un tarif ou un échéancier" },
  { module: "FRAIS", action: "MODIFICATION", label: "Modifier un tarif ou un échéancier" },
  { module: "FRAIS", action: "SUPPRESSION", label: "Désactiver un type de frais ou un tarif" },
  { module: "FRAIS", action: "EXPORT", label: "Exporter les tarifs" },
  { module: "FRAIS", action: "IMPRESSION", label: "Imprimer les tarifs" },
  { module: "FRAIS", action: "ADMINISTRATION", label: "Créer de nouveaux types de frais" },
  { module: "FRAIS_REDUCTIONS", action: "LECTURE", label: "Consulter les bourses/remises/exonérations" },
  { module: "FRAIS_REDUCTIONS", action: "CREATION", label: "Accorder une bourse/remise/exonération" },
  { module: "FRAIS_REDUCTIONS", action: "MODIFICATION", label: "Modifier une bourse/remise/exonération" },
  { module: "FRAIS_REDUCTIONS", action: "SUPPRESSION", label: "Mettre fin à une bourse/remise/exonération" },
];

/** Catalogue de permissions du Module 4.3 (Paiements et caisse). */
const PAIEMENTS_PERMISSIONS: PermissionSeed[] = [
  { module: "PAIEMENTS", action: "LECTURE", label: "Consulter l'historique et le tableau de bord des paiements" },
  { module: "PAIEMENTS", action: "CREATION", label: "Encaisser un paiement" },
  { module: "PAIEMENTS", action: "SUPPRESSION", label: "Annuler un paiement" },
  { module: "PAIEMENTS", action: "EXPORT", label: "Exporter l'historique des paiements" },
  { module: "PAIEMENTS", action: "IMPRESSION", label: "Imprimer/réimprimer un reçu" },
  { module: "PAIEMENTS", action: "ADMINISTRATION", label: "Gérer le référentiel des modes de paiement" },
  { module: "CAISSE", action: "LECTURE", label: "Consulter le tableau de bord et l'historique des sessions de caisse" },
  { module: "CAISSE", action: "CREATION", label: "Ouvrir une session de caisse" },
  { module: "CAISSE", action: "VALIDATION", label: "Fermer (clôturer) une session de caisse" },
  { module: "CAISSE", action: "ADMINISTRATION", label: "Gérer le référentiel des caisses" },
];

/** Catalogue de permissions du Module 7 (Comptabilité générale et gestion financière). */
const COMPTABILITE_PERMISSIONS: PermissionSeed[] = [
  { module: "COMPTABILITE", action: "LECTURE", label: "Consulter le plan comptable" },
  { module: "COMPTABILITE", action: "CREATION", label: "Créer un compte comptable" },
  { module: "COMPTABILITE", action: "MODIFICATION", label: "Modifier un compte comptable" },
  { module: "COMPTABILITE", action: "SUPPRESSION", label: "Désactiver un compte comptable" },
  { module: "ECRITURES", action: "LECTURE", label: "Consulter le journal, le grand livre et la balance" },
  { module: "ECRITURES", action: "CREATION", label: "Créer une écriture manuelle" },
  { module: "ECRITURES", action: "SUPPRESSION", label: "Annuler une écriture (contre-passation)" },
  { module: "ECRITURES", action: "VALIDATION", label: "Verrouiller/déverrouiller une période comptable" },
  { module: "ECRITURES", action: "EXPORT", label: "Exporter le journal, le grand livre ou la balance" },
  { module: "ECRITURES", action: "IMPRESSION", label: "Imprimer le journal, le grand livre ou la balance" },
  { module: "DEPENSES", action: "LECTURE", label: "Consulter les dépenses" },
  { module: "DEPENSES", action: "CREATION", label: "Enregistrer une dépense" },
  { module: "DEPENSES", action: "MODIFICATION", label: "Modifier une dépense non approuvée" },
  { module: "DEPENSES", action: "SUPPRESSION", label: "Rejeter/annuler une dépense" },
  { module: "DEPENSES", action: "VALIDATION", label: "Approuver une dépense" },
  { module: "DEPENSES", action: "EXPORT", label: "Exporter les dépenses" },
  { module: "DEPENSES", action: "IMPRESSION", label: "Imprimer les dépenses" },
  { module: "FOURNISSEURS", action: "LECTURE", label: "Consulter les fournisseurs" },
  { module: "FOURNISSEURS", action: "CREATION", label: "Créer un fournisseur" },
  { module: "FOURNISSEURS", action: "MODIFICATION", label: "Modifier un fournisseur" },
  { module: "FOURNISSEURS", action: "SUPPRESSION", label: "Désactiver un fournisseur" },
  { module: "BUDGET", action: "LECTURE", label: "Consulter le budget" },
  { module: "BUDGET", action: "CREATION", label: "Créer un budget annuel" },
  { module: "BUDGET", action: "MODIFICATION", label: "Modifier une ligne budgétaire" },
  { module: "BUDGET", action: "SUPPRESSION", label: "Supprimer une ligne budgétaire" },
  { module: "RAPPORTS_FINANCIERS", action: "LECTURE", label: "Consulter les rapports et le tableau de bord financier" },
  { module: "RAPPORTS_FINANCIERS", action: "EXPORT", label: "Exporter les rapports financiers" },
  { module: "RAPPORTS_FINANCIERS", action: "IMPRESSION", label: "Imprimer les rapports financiers" },
];

/** Catalogue de permissions du Module 2.1 (Structure pédagogique). */
const MATIERES_PERMISSIONS: PermissionSeed[] = [
  { module: "MATIERES", action: "LECTURE", label: "Consulter les matières et leurs affectations" },
  { module: "MATIERES", action: "CREATION", label: "Créer une matière ou une affectation (coefficient/volumes horaires)" },
  { module: "MATIERES", action: "MODIFICATION", label: "Modifier une matière ou une affectation" },
  { module: "MATIERES", action: "SUPPRESSION", label: "Désactiver une matière ou une affectation" },
  { module: "MATIERES", action: "EXPORT", label: "Exporter les matières" },
  { module: "MATIERES", action: "IMPRESSION", label: "Imprimer les matières" },
  { module: "MATIERES", action: "ADMINISTRATION", label: "Gérer les unités d'enseignement" },
  { module: "MATIERES_IMPORT", action: "CREATION", label: "Lancer l'assistant d'import Excel/CSV des matières" },
  { module: "MATIERES_IMPORT", action: "VALIDATION", label: "Confirmer l'exécution d'un import" },
];

/** Catalogue de permissions du Module 5 (Gestion des enseignants). */
const ENSEIGNANTS_PERMISSIONS: PermissionSeed[] = [
  { module: "ENSEIGNANTS", action: "LECTURE", label: "Consulter les enseignants" },
  { module: "ENSEIGNANTS", action: "CREATION", label: "Créer un enseignant" },
  { module: "ENSEIGNANTS", action: "MODIFICATION", label: "Modifier un enseignant" },
  { module: "ENSEIGNANTS", action: "SUPPRESSION", label: "Archiver un enseignant" },
  { module: "ENSEIGNANTS", action: "EXPORT", label: "Exporter les enseignants" },
  { module: "ENSEIGNANTS", action: "IMPRESSION", label: "Imprimer les enseignants" },
  { module: "ENSEIGNANTS", action: "ADMINISTRATION", label: "Gérer les statuts et types de contrat" },
  { module: "ENSEIGNANTS_AFFECTATIONS", action: "LECTURE", label: "Consulter les affectations, disponibilités et congés" },
  { module: "ENSEIGNANTS_AFFECTATIONS", action: "CREATION", label: "Créer une affectation, une disponibilité ou un congé" },
  { module: "ENSEIGNANTS_AFFECTATIONS", action: "MODIFICATION", label: "Modifier une affectation, une disponibilité ou un congé" },
  { module: "ENSEIGNANTS_AFFECTATIONS", action: "SUPPRESSION", label: "Retirer une affectation, une disponibilité ou un congé" },
  { module: "ENSEIGNANTS_DOCUMENTS", action: "LECTURE", label: "Consulter le dossier numérique et les formations" },
  { module: "ENSEIGNANTS_DOCUMENTS", action: "CREATION", label: "Ajouter un document ou une formation" },
  { module: "ENSEIGNANTS_DOCUMENTS", action: "MODIFICATION", label: "Modifier un document ou une formation" },
  { module: "ENSEIGNANTS_DOCUMENTS", action: "SUPPRESSION", label: "Supprimer un document ou une formation" },
];

/** Catalogue de permissions du Module 8 (Paie). */
const PAIE_PERMISSIONS: PermissionSeed[] = [
  { module: "PAIE", action: "LECTURE", label: "Consulter le tableau de bord et les réglages de la paie" },
  { module: "PAIE", action: "ADMINISTRATION", label: "Modifier les réglages de la paie, une paie après clôture de sa période" },
  { module: "PAIE_EMPLOYES", action: "LECTURE", label: "Consulter les employés et catégories" },
  { module: "PAIE_EMPLOYES", action: "CREATION", label: "Créer un employé ou une catégorie" },
  { module: "PAIE_EMPLOYES", action: "MODIFICATION", label: "Modifier un employé ou une catégorie" },
  { module: "PAIE_EMPLOYES", action: "SUPPRESSION", label: "Archiver un employé ou désactiver une catégorie" },
  { module: "PAIE_EMPLOYES", action: "EXPORT", label: "Exporter les employés" },
  { module: "PAIE_EMPLOYES", action: "IMPRESSION", label: "Imprimer les employés" },
  { module: "PAIE_BULLETINS", action: "LECTURE", label: "Consulter les périodes de paie et bulletins" },
  { module: "PAIE_BULLETINS", action: "CREATION", label: "Ouvrir une période de paie, calculer un bulletin" },
  { module: "PAIE_BULLETINS", action: "MODIFICATION", label: "Modifier un bulletin non validé, gérer les composants de paie" },
  { module: "PAIE_BULLETINS", action: "VALIDATION", label: "Valider un bulletin, clôturer une période de paie" },
  { module: "PAIE_BULLETINS", action: "IMPRESSION", label: "Imprimer un bulletin de paie" },
  { module: "PAIE_AVANCES", action: "LECTURE", label: "Consulter les avances sur salaire" },
  { module: "PAIE_AVANCES", action: "CREATION", label: "Accorder une avance sur salaire" },
  { module: "PAIE_AVANCES", action: "MODIFICATION", label: "Modifier une avance sur salaire" },
  { module: "PAIE_AVANCES", action: "SUPPRESSION", label: "Annuler une avance sur salaire" },
];

/** Catalogue de permissions du Module 5.1 (Pointage des enseignants) — réutilisées telles quelles par le Module 5.2 (MODULE-05.2 §5). */
const POINTAGE_PERMISSIONS: PermissionSeed[] = [
  { module: "POINTAGE", action: "LECTURE", label: "Consulter les fiches de pointage" },
  { module: "POINTAGE", action: "MODIFICATION", label: "Gérer les réglages de rémunération par défaut" },
  { module: "POINTAGE", action: "VALIDATION", label: "Qualifier une séance (effectuée, reportée, annulée, remplacée)" },
  { module: "POINTAGE", action: "ADMINISTRATION", label: "Modifier une séance ou une fiche déjà clôturée" },
];

/** Catalogue de permissions du Module 5.2 (Emploi du temps et pointage pédagogique). */
const EMPLOI_DU_TEMPS_PERMISSIONS: PermissionSeed[] = [
  { module: "EMPLOI_DU_TEMPS", action: "LECTURE", label: "Consulter l'emploi du temps (classe, enseignant, salle, filière, niveau, semestre)" },
  { module: "EMPLOI_DU_TEMPS", action: "MODIFICATION", label: "Créer, déplacer, reporter, annuler ou remplacer une séance ; gérer les modèles de récurrence" },
  { module: "EMPLOI_DU_TEMPS", action: "ADMINISTRATION", label: "Modifier une séance déjà qualifiée ou une fiche de pointage déjà clôturée" },
  { module: "SALLES", action: "LECTURE", label: "Consulter le référentiel des salles" },
  { module: "SALLES", action: "MODIFICATION", label: "Créer ou modifier une salle" },
  { module: "GROUPES_PEDAGOGIQUES", action: "LECTURE", label: "Consulter les groupes pédagogiques (tronc commun)" },
  { module: "GROUPES_PEDAGOGIQUES", action: "MODIFICATION", label: "Créer ou modifier un groupe pédagogique" },
];

/** Catalogue de permissions du Module 12 (Centre de Communication Intelligent). */
const COMMUNICATION_PERMISSIONS: PermissionSeed[] = [
  { module: "COMMUNICATION", action: "LECTURE", label: "Consulter le tableau de bord, le carnet d'adresses et l'historique" },
  { module: "COMMUNICATION", action: "CREATION", label: "Envoyer un message individuel ou groupé" },
  { module: "CAMPAGNES", action: "LECTURE", label: "Consulter les campagnes" },
  { module: "CAMPAGNES", action: "CREATION", label: "Créer une campagne" },
  { module: "CAMPAGNES", action: "MODIFICATION", label: "Modifier ou dupliquer une campagne" },
  { module: "CAMPAGNES", action: "SUPPRESSION", label: "Supprimer une campagne" },
  { module: "CAMPAGNES", action: "VALIDATION", label: "Planifier, suspendre ou reprendre une campagne" },
  { module: "MODELES_COMMUNICATION", action: "LECTURE", label: "Consulter les modèles de message" },
  { module: "MODELES_COMMUNICATION", action: "MODIFICATION", label: "Créer ou modifier un modèle de message" },
  { module: "PARAMETRES_COMMUNICATION", action: "LECTURE", label: "Consulter la configuration des passerelles de communication" },
  { module: "PARAMETRES_COMMUNICATION", action: "MODIFICATION", label: "Configurer les passerelles SMS/WhatsApp/E-mail (Super Administrateur)" },
];

/** Catalogue de permissions du Module 9 (Moteur centralisé de documents officiels). */
const DOCUMENTS_PERMISSIONS: PermissionSeed[] = [
  { module: "DOCUMENTS", action: "LECTURE", label: "Consulter et retélécharger les documents officiels archivés" },
  { module: "DOCUMENTS", action: "CREATION", label: "Générer un document officiel (Tier 1)" },
  { module: "DOCUMENTS", action: "ADMINISTRATION", label: "Annuler ou réémettre une carte d'étudiant (Module 9.1)" },
  { module: "PARAMETRES_DOCUMENTS", action: "LECTURE", label: "Consulter l'en-tête institutionnelle et le catalogue de modèles" },
  { module: "PARAMETRES_DOCUMENTS", action: "MODIFICATION", label: "Modifier l'en-tête institutionnelle et le catalogue de modèles" },
];

/** Catalogue de permissions des Sanctions disciplinaires (2026-08-03, retour du porteur du projet). */
const SANCTIONS_PERMISSIONS: PermissionSeed[] = [
  { module: "SANCTIONS", action: "LECTURE", label: "Consulter les sanctions disciplinaires d'un étudiant" },
  { module: "SANCTIONS", action: "CREATION", label: "Enregistrer une sanction disciplinaire" },
  { module: "SANCTIONS", action: "ADMINISTRATION", label: "Annuler une sanction déjà enregistrée" },
];

/** Catalogue de permissions des Absences des étudiants (2026-08-03, retour du porteur du projet). */
const ABSENCES_PERMISSIONS: PermissionSeed[] = [
  { module: "ABSENCES", action: "LECTURE", label: "Consulter les absences d'un étudiant" },
  { module: "ABSENCES", action: "CREATION", label: "Enregistrer une absence" },
  { module: "ABSENCES", action: "SUPPRESSION", label: "Supprimer une absence enregistrée par erreur" },
];

/** Catalogue de permissions des Sessionnaires / sessions de rattrapage (2026-08-03, retour du porteur du projet). */
const SESSIONNAIRES_PERMISSIONS: PermissionSeed[] = [
  { module: "SESSIONNAIRES", action: "LECTURE", label: "Consulter les sessionnaires et les sessions de rattrapage" },
  { module: "SESSIONNAIRES", action: "CREATION", label: "Programmer une session de rattrapage (date/heure/salle)" },
  { module: "SESSIONNAIRES", action: "SUPPRESSION", label: "Supprimer la planification d'une session de rattrapage" },
];

/** Catalogue de permissions du Module 6 (Évaluation : notes, bulletins, classement). */
const EVALUATION_PERMISSIONS: PermissionSeed[] = [
  { module: "NOTES", action: "LECTURE", label: "Consulter les notes" },
  { module: "NOTES", action: "MODIFICATION", label: "Saisir ou modifier une note non verrouillée" },
  { module: "NOTES", action: "ADMINISTRATION", label: "Modifier une note déjà verrouillée (bulletin déjà généré)" },
  { module: "BULLETINS", action: "LECTURE", label: "Consulter les bulletins générés" },
  { module: "BULLETINS", action: "CREATION", label: "Générer un bulletin de période ou annuel" },
  { module: "BULLETINS", action: "ADMINISTRATION", label: "Annuler un bulletin déjà généré" },
  { module: "CLASSEMENT", action: "LECTURE", label: "Consulter et imprimer le classement par mérite" },
  { module: "EVALUATION", action: "ADMINISTRATION", label: "Modifier les pondérations et seuils de mention/admission" },
];

/** Catalogue de permissions du Module 10 (Tableau de bord & Rapports décisionnels). */
const TABLEAU_BORD_PERMISSIONS: PermissionSeed[] = [
  { module: "RAPPORTS_DECISIONNELS", action: "LECTURE", label: "Consulter les rapports décisionnels (performance pédagogique, tendances financières/RH)" },
  { module: "ALERTES", action: "LECTURE", label: "Consulter les règles d'alerte et leur historique" },
  { module: "ALERTES", action: "MODIFICATION", label: "Créer, modifier ou désactiver une règle d'alerte" },
];

/** Catalogue de permissions du Module 11 (Sauvegarde, Sécurité avancée, Audit). */
const SAUVEGARDE_BDD_PERMISSIONS: PermissionSeed[] = [
  { module: "SAUVEGARDE_BDD", action: "LECTURE", label: "Consulter l'historique des sauvegardes de la base de données" },
  { module: "SAUVEGARDE_BDD", action: "CREATION", label: "Déclencher une sauvegarde manuelle" },
  { module: "SAUVEGARDE_BDD", action: "MODIFICATION", label: "Configurer la planification et la rétention des sauvegardes" },
  { module: "SAUVEGARDE_BDD", action: "ADMINISTRATION", label: "Restaurer une sauvegarde (action irréversible, réservée au Super Administrateur)" },
];

/** Catalogue de permissions du Module 14 (Inventaire). */
const INVENTAIRE_PERMISSIONS: PermissionSeed[] = [
  { module: "INVENTAIRE", action: "LECTURE", label: "Consulter le registre des biens" },
  { module: "INVENTAIRE", action: "CREATION", label: "Enregistrer un nouveau bien" },
  { module: "INVENTAIRE", action: "MODIFICATION", label: "Modifier la fiche d'un bien (localisation, responsable, état, maintenance)" },
  { module: "INVENTAIRE", action: "SUPPRESSION", label: "Réformer/mettre au rebut un bien (jamais de suppression physique)" },
  { module: "INVENTAIRE", action: "ADMINISTRATION", label: "Gérer les catégories et les lieux de l'inventaire" },
];

/** Catégories de biens de départ (Module 14) — référentiel extensible, aucune valeur codée en dur ailleurs. */
const DEFAULT_ASSET_CATEGORIES = ["Mobilier", "Informatique", "Matériel pédagogique", "Véhicule", "Matériel de sécurité"];

/** Catalogue de permissions du Module 13 (Bibliothèque). */
const BIBLIOTHEQUE_PERMISSIONS: PermissionSeed[] = [
  { module: "BIBLIOTHEQUE", action: "LECTURE", label: "Consulter le catalogue et les emprunts" },
  { module: "BIBLIOTHEQUE", action: "CREATION", label: "Enregistrer un ouvrage/exemplaire, un emprunt ou un retour" },
  { module: "BIBLIOTHEQUE", action: "MODIFICATION", label: "Modifier la fiche d'un ouvrage ou d'un exemplaire" },
  { module: "BIBLIOTHEQUE", action: "SUPPRESSION", label: "Retirer/déclarer perdu un exemplaire (jamais de suppression physique)" },
  { module: "BIBLIOTHEQUE", action: "ADMINISTRATION", label: "Gérer les catégories et les réglages de la bibliothèque" },
];

/** Catégories d'ouvrages de départ (Module 13) — référentiel extensible, aucune valeur codée en dur ailleurs. */
const DEFAULT_BOOK_CATEGORIES = ["Roman", "Manuel scolaire", "Revue", "Ouvrage de référence"];

/** Catalogue de permissions du Module 13 (extension — Bibliothèque numérique). */
const BIBLIOTHEQUE_NUMERIQUE_PERMISSIONS: PermissionSeed[] = [
  { module: "BIBLIOTHEQUE_NUMERIQUE", action: "LECTURE", label: "Consulter et télécharger les documents numériques" },
  { module: "BIBLIOTHEQUE_NUMERIQUE", action: "CREATION", label: "Ajouter un document et le partager par e-mail/WhatsApp" },
  { module: "BIBLIOTHEQUE_NUMERIQUE", action: "SUPPRESSION", label: "Retirer un document numérique" },
  { module: "BIBLIOTHEQUE_NUMERIQUE", action: "ADMINISTRATION", label: "Gérer les catégories de documents numériques" },
];

/** Catégories de documents numériques de départ (Module 13 extension) — distinctes des catégories d'ouvrages physiques. */
const DEFAULT_DIGITAL_DOCUMENT_CATEGORIES = ["Support de cours", "Circulaire", "Formulaire"];

/** Catalogue de permissions du Module 15 (Portail web) — gestion des comptes externes côté personnel
 * uniquement ; le portail lui-même n'utilise jamais le RBAC (voir MODULE-15 §2.1). */
const PORTAIL_WEB_PERMISSIONS: PermissionSeed[] = [
  { module: "PORTAIL_WEB", action: "LECTURE", label: "Consulter les comptes portail existants" },
  { module: "PORTAIL_WEB", action: "CREATION", label: "Créer un compte portail pour un étudiant/tuteur/enseignant" },
  { module: "PORTAIL_WEB", action: "ADMINISTRATION", label: "Désactiver ou réinitialiser un compte portail" },
];

const DEFAULT_LEVELS = [
  { code: "L1", label: "Licence 1", orderIndex: 1 },
  { code: "L2", label: "Licence 2", orderIndex: 2 },
  { code: "L3", label: "Licence 3", orderIndex: 3 },
  { code: "M1", label: "Master 1", orderIndex: 4 },
  { code: "M2", label: "Master 2", orderIndex: 5 },
];

const SIGNATORY_ROLES: SignatoryRole[] = [
  "DIRECTEUR_GENERAL",
  "DIRECTEUR_CAMPUS",
  "DIRECTEUR_ETUDES",
  "COMPTABLE",
  "RESPONSABLE_ADMINISTRATIF",
];

const DOCUMENT_TYPES: DocumentType[] = [
  "CARTE_ETUDIANT",
  "ATTESTATION",
  "CERTIFICAT",
  "BULLETIN",
  "RECU",
  "FACTURE",
  "DIPLOME",
  "CONVOCATION",
  "DECISION",
  // Module 9 — Tier 1, pleinement implémentés (voir MODULE-09 §0.4)
  "CERTIFICAT_SCOLARITE",
  "ATTESTATION_INSCRIPTION",
  "ATTESTATION_TRAVAIL",
  "LISTE_ETUDIANTS",
  "LISTE_ENSEIGNANTS",
  "LISTE_CLASSES",
  "FICHE_EMARGEMENT",
  "EMPLOI_DU_TEMPS",
  "HISTORIQUE_PAIEMENTS",
  // Rapports comptables/de caisse — validés le 2026-07-30 (retour du porteur du projet), voir ADR-053.
  "GRAND_LIVRE_CAISSE",
  "ETAT_RECETTES",
  "RAPPORT_CAISSE",
  "JOURNAL_CAISSE",
  "SITUATION_CAISSE_JOURNALIERE",
  "BILAN",
  // Fiche d'inscription et de réinscription — formulaire vierge, sans entité liée (2026-08-02).
  "FICHE_INSCRIPTION",
  // Fiche d'inscription complétée — version remplie, liée à un étudiant précis (2026-08-03).
  "FICHE_INSCRIPTION_COMPLETEE",
  // Avis de sanction disciplinaire (2026-08-03).
  "SANCTION",
  // Reçu de paiement et bulletin de paie — migrés vers le moteur PDF centralisé le 2026-07-30.
  "RECU_PAIEMENT",
  "BULLETIN_SALAIRE",
  // Fiche d'émargement mensuelle des enseignants — remplace le suivi numérique du pointage (2026-08-03).
  "FICHE_EMARGEMENT_ENSEIGNANT",
  // Contrats de travail (2026-08-06) — remplace CONTRAT_TRAVAIL (Tier 2, jamais implémenté).
  "CONTRAT_CDD_ADMINISTRATIF",
  "CONTRAT_CDD_ENSEIGNANT",
  "CONTRAT_VACATION",
  // Rapports financiers étudiants — retards de paiement et situation financière (2026-08-09).
  "RETARD_PAIEMENT",
  "SITUATION_FINANCIERE",
  // Module 9 — Tier 2, catalogue enregistré mais non implémenté (voir MODULE-09 §0.4)
  "CARTE_PAIEMENT",
  "ATTESTATION_FREQUENTATION",
  "ATTESTATION_REUSSITE",
  "ATTESTATION_STAGE",
  "ATTESTATION_SALAIRE",
  "DECISION_AFFECTATION",
  "BULLETIN_NOTES",
  "RELEVE_NOTES",
  "RAPPORT_FINANCIER",
  "PROCES_VERBAL",
  "RAPPORT_STATISTIQUE",
];

/** Types Tier 1 pour lesquels le double exemplaire (§15) est pertinent par défaut — attestations courtes uniquement. */
const DOUBLE_EXEMPLAIRE_DEFAULT_TYPES: DocumentType[] = [
  "CERTIFICAT_SCOLARITE",
  "ATTESTATION_INSCRIPTION",
  "ATTESTATION_TRAVAIL",
];

const STUDENT_DOCUMENT_TYPES: StudentDocumentType[] = [
  "ACTE_NAISSANCE",
  "DIPLOME",
  "RELEVE",
  "PHOTO",
  "CARTE_IDENTITE_PASSEPORT",
  "CERTIFICAT_MEDICAL",
  "AUTRE",
];

/** Régimes d'inscription par défaut (Module 4.1) — liste extensible depuis Paramètres, rien de figé en dur. */
const DEFAULT_ENROLLMENT_REGIMES = [
  { code: "NORMAL", label: "Normal" },
  { code: "PROFESSIONNEL", label: "Professionnel" },
];

/** Types de frais par défaut (Module 4.2 §6.2) — liste extensible par l'administrateur. */
const DEFAULT_FEE_TYPES = [
  { code: "INSCRIPTION", name: "Frais d'inscription" },
  { code: "REINSCRIPTION", name: "Frais de réinscription" },
  { code: "SCOLARITE", name: "Scolarité" },
  { code: "BIBLIOTHEQUE", name: "Bibliothèque" },
  { code: "LABORATOIRE", name: "Laboratoire" },
  { code: "EXAMENS", name: "Examens" },
  { code: "SOUTENANCE", name: "Soutenance" },
  { code: "CARTE_ETUDIANT", name: "Carte d'étudiant" },
  { code: "UNIFORME", name: "Uniforme" },
  { code: "ASSURANCE", name: "Assurance" },
  { code: "ACTIVITES_PEDAGOGIQUES", name: "Activités pédagogiques" },
  { code: "AUTRE", name: "Autres frais" },
];

/** Modes de paiement système par défaut (Module 4.3 §1.3) — non supprimables, extensibles par l'administrateur. */
const DEFAULT_PAYMENT_METHODS = [
  { code: "ESPECES", label: "Espèces" },
  { code: "CHEQUE", label: "Chèque" },
  { code: "VIREMENT", label: "Virement bancaire" },
  { code: "MOBILE_MONEY", label: "Mobile Money" },
  { code: "CARTE", label: "Carte bancaire" },
];

/** Caisse par défaut (Module 4.3) — au moins une caisse doit exister pour pouvoir encaisser. */
const DEFAULT_CASH_REGISTER = { code: "PRINCIPALE", name: "Caisse principale" };

/** Plan comptable par défaut (Module 7 §1.7) — neutre et librement complétable, pas un plan national figé. */
const DEFAULT_CHART_ACCOUNTS = [
  { code: "411000", label: "Étudiants — créances", type: "ACTIF" as const },
  { code: "401000", label: "Fournisseurs", type: "PASSIF" as const },
  { code: "512000", label: "Caisse", type: "TRESORERIE" as const },
  { code: "521000", label: "Banque", type: "TRESORERIE" as const },
  { code: "706000", label: "Produits de scolarité", type: "PRODUIT" as const },
  { code: "706100", label: "Produits d'inscription", type: "PRODUIT" as const },
  { code: "607000", label: "Charges diverses", type: "CHARGE" as const },
];

/** Catégories de dépenses par défaut (Module 7 §1.7) — extensibles par l'administrateur, comme les types de frais. */
const DEFAULT_EXPENSE_CATEGORIES = [
  { code: "FOURNITURES", name: "Fournitures et consommables" },
  { code: "MAINTENANCE", name: "Maintenance et réparations" },
  { code: "SERVICES", name: "Services extérieurs" },
  { code: "TRANSPORT", name: "Transport et déplacements" },
  { code: "COMMUNICATION", name: "Communication et publicité" },
  { code: "AUTRE", name: "Autres dépenses" },
];

/** Rattachement par défaut des modes de paiement à un compte de trésorerie (Module 7 §1.2). */
const PAYMENT_METHOD_ACCOUNT_CODES: Record<string, string> = {
  ESPECES: "512000",
  CHEQUE: "521000",
  VIREMENT: "521000",
  MOBILE_MONEY: "521000",
  CARTE: "521000",
};

/** Rattachement par défaut des types de frais à un compte de produits (Module 7 §1.2). */
const FEE_TYPE_ACCOUNT_CODES: Record<string, string> = {
  SCOLARITE: "706000",
  INSCRIPTION: "706100",
  REINSCRIPTION: "706100",
};

/** Statuts d'enseignant par défaut (MODULE-05 §1.6) — liste extensible par l'administrateur, rien de figé en dur. */
const DEFAULT_TEACHER_STATUSES = [
  { code: "PERMANENT", label: "Permanent" },
  { code: "VACATAIRE", label: "Vacataire" },
  { code: "CONTRACTUEL", label: "Contractuel" },
  { code: "VISITEUR", label: "Visiteur" },
];

/** Types de contrat par défaut (MODULE-05 §1.6) — liste extensible par l'administrateur. */
const DEFAULT_TEACHER_CONTRACT_TYPES = [
  { code: "CDI", label: "CDI" },
  { code: "CDD", label: "CDD" },
  { code: "VACATION", label: "Vacation" },
  { code: "PRESTATION", label: "Prestation" },
];

/** Catégories d'employés par défaut (MODULE-08 §1.2) — liste extensible, découplée des rôles RBAC. */
const DEFAULT_EMPLOYEE_CATEGORIES = [
  { code: "DIRECTEUR_GENERAL", label: "Directeur Général" },
  { code: "DIRECTEUR_CAMPUS", label: "Directeur de Campus" },
  { code: "DIRECTEUR_ETUDES", label: "Directeur des Études" },
  { code: "SECRETAIRE", label: "Secrétaire" },
  { code: "COMPTABLE", label: "Comptable" },
  { code: "CAISSIER", label: "Caissier" },
  { code: "BIBLIOTHECAIRE", label: "Bibliothécaire" },
  { code: "RESPONSABLE_RH", label: "Responsable RH" },
  { code: "INFORMATICIEN", label: "Informaticien" },
  { code: "CHAUFFEUR", label: "Chauffeur" },
  { code: "AGENT_SECURITE", label: "Agent de sécurité" },
  { code: "AGENT_ENTRETIEN", label: "Agent d'entretien" },
];

/** Composants de paie par défaut (MODULE-08 §1.7) — référentiel extensible, aucun barème automatique. */
const DEFAULT_PAYROLL_COMPONENT_TYPES: { code: string; label: string; kind: PayrollComponentKind }[] = [
  { code: "PRIME_TRANSPORT", label: "Prime de transport", kind: "PRIME" },
  { code: "PRIME_RENDEMENT", label: "Prime de rendement", kind: "PRIME" },
  { code: "INDEMNITE_LOGEMENT", label: "Indemnité de logement", kind: "INDEMNITE" },
  { code: "RETENUE_ABSENCE", label: "Retenue pour absence", kind: "RETENUE" },
  { code: "COTISATION_CNSS", label: "Cotisation CNSS", kind: "COTISATION" },
];

/** Gabarits de message par défaut (MODULE-12 §1.8/§1.9) — is_system, modifiables mais non supprimables. */
const DEFAULT_MESSAGE_TEMPLATES = [
  {
    code: "PAIEMENT_ENREGISTRE",
    label: "Paiement enregistré",
    content:
      "Bonjour {Nom} {Prénom}, le paiement de {Montant} GNF pour {Classe} ({Filière}) a été enregistré le {Date} à {Heure} (Reçu n° {NuméroReçu}, {ModePaiement}). Total scolarité : {MontantTotal} GNF. Payé à ce jour : {MontantPayé} GNF. {SoldeMessage} Année universitaire {AnnéeUniversitaire}. — {Campus}",
  },
  {
    code: "PAIEMENT_EN_RETARD",
    label: "Paiement en retard",
    content:
      "Bonjour {Nom} {Prénom}, un solde de {ResteÀPayer} GNF reste dû pour {Classe} ({Filière}), année {AnnéeUniversitaire}. Merci de régulariser votre situation. — {Campus}",
  },
  {
    code: "SOLDE_RESTANT",
    label: "Solde restant",
    content:
      "Bonjour {Nom} {Prénom}, votre solde restant pour {Classe} ({Filière}) est de {ResteÀPayer} GNF (année {AnnéeUniversitaire}). — {Campus}",
  },
  {
    code: "NOUVELLE_INSCRIPTION",
    label: "Nouvelle inscription",
    content:
      "Bonjour {Nom} {Prénom}, votre inscription en {Classe} ({Filière}) pour l'année {AnnéeUniversitaire} a bien été validée. Bienvenue ! — {Campus}",
  },
  {
    code: "BULLETIN_DISPONIBLE",
    label: "Bulletin disponible",
    content: "Bonjour {Nom} {Prénom}, le bulletin de {Prénom} ({Classe}, {Filière}) est disponible. — {Campus}",
  },
  {
    code: "NOUVELLE_NOTE",
    label: "Nouvelle note",
    content: "Bonjour {Nom} {Prénom}, de nouvelles notes sont disponibles pour {Classe} ({Filière}). — {Campus}",
  },
  {
    code: "CONVOCATION",
    label: "Convocation",
    content: "Bonjour {Nom} {Prénom}, vous êtes convoqué(e) le {Date} à {Heure}. Merci de vous présenter à {Campus}.",
  },
  {
    code: "REUNION_PARENTS",
    label: "Réunion des parents",
    content:
      "Bonjour {Nom} {Prénom}, une réunion des parents pour {Classe} ({Filière}) aura lieu le {Date} à {Heure} — {Campus}.",
  },
  {
    code: "CHANGEMENT_EMPLOI_DU_TEMPS",
    label: "Changement d'emploi du temps",
    content:
      "Bonjour {Nom} {Prénom}, l'emploi du temps de {Classe} ({Filière}) a été modifié. Merci de consulter le nouvel horaire. — {Campus}",
  },
  {
    code: "ANNIVERSAIRE",
    label: "Anniversaire",
    content: "Joyeux anniversaire {Prénom} ! Toute l'équipe de {Campus} vous souhaite une excellente journée.",
  },
  {
    code: "FELICITATIONS",
    label: "Félicitations",
    content: "Félicitations {Nom} {Prénom} pour votre excellent travail en {Classe} ({Filière}) ! — {Campus}",
  },
  {
    code: "SANCTION_ENREGISTREE",
    label: "Sanction disciplinaire enregistrée",
    content:
      "Bonjour {Nom} {Prénom}, une sanction disciplinaire ({TypeSanction}) a été enregistrée le {Date} pour {Classe} ({Filière}). Motif : {Motif}. — {Campus}",
  },
  {
    code: "AFFECTATION_ENSEIGNANT_CREEE",
    label: "Nouvelle affectation enseignant",
    content:
      "Bonjour {Nom} {Prénom}, vous avez été affecté(e) à la matière {Matière} pour la classe {Classe} ({Filière}). — {Campus}",
  },
] as const;

/**
 * Configuration par défaut des notifications automatiques (MODULE-12 §1.10) — seuls les événements
 * pour lesquels un déclencheur existe réellement dans le code (voir §1.10 du document) reçoivent une
 * ligne ; ABSENCE/CERTIFICAT_DISPONIBLE/ATTESTATION_DISPONIBLE restent définis dans l'enum mais sans
 * configuration tant qu'aucun module source (suivi des absences, Module 9) n'existe. WhatsApp exclu :
 * jamais un canal automatique (MODULE-12 §3 règle 7).
 */
const DEFAULT_NOTIFICATION_EVENT_CONFIGS: {
  eventType:
    | "INSCRIPTION_VALIDEE"
    | "PAIEMENT_SCOLARITE"
    | "BULLETIN_DISPONIBLE"
    | "CHANGEMENT_EMPLOI_DU_TEMPS"
    | "SANCTION_ENREGISTREE"
    | "AFFECTATION_ENSEIGNANT_CREEE";
  templateCode: string;
  channels: ("SMS" | "EMAIL")[];
}[] = [
  { eventType: "INSCRIPTION_VALIDEE", templateCode: "NOUVELLE_INSCRIPTION", channels: ["SMS", "EMAIL"] },
  { eventType: "PAIEMENT_SCOLARITE", templateCode: "PAIEMENT_ENREGISTRE", channels: ["SMS", "EMAIL"] },
  { eventType: "BULLETIN_DISPONIBLE", templateCode: "BULLETIN_DISPONIBLE", channels: ["SMS", "EMAIL"] },
  { eventType: "CHANGEMENT_EMPLOI_DU_TEMPS", templateCode: "CHANGEMENT_EMPLOI_DU_TEMPS", channels: ["SMS"] },
  { eventType: "SANCTION_ENREGISTREE", templateCode: "SANCTION_ENREGISTREE", channels: ["SMS", "EMAIL"] },
  { eventType: "AFFECTATION_ENSEIGNANT_CREEE", templateCode: "AFFECTATION_ENSEIGNANT_CREEE", channels: ["SMS", "EMAIL"] },
];

/**
 * Règles d'alerte de départ (MODULE-10 §2/§3) — exemples seedés, modifiables/désactivables sans coder
 * depuis l'écran de configuration, aucun seuil codé en dur ailleurs. `metricType` identifie le calcul
 * exécuté par `alertEngineService` ; `scope` reste `null` (portée globale) pour ces 4 exemples de départ.
 */
const DEFAULT_ALERT_RULES: {
  code: string;
  label: string;
  metricType: string;
  comparator: "LT" | "LTE" | "GT" | "GTE";
  threshold: number;
}[] = [
  { code: "TRESORERIE_BASSE", label: "Trésorerie disponible sous le seuil", metricType: "TRESORERIE_DISPONIBLE", comparator: "LT", threshold: 500000 },
  { code: "IMPAYES_EN_RETARD", label: "Impayés en retard au-delà du seuil", metricType: "IMPAYES_EN_RETARD_MONTANT", comparator: "GT", threshold: 1000000 },
  { code: "OCCUPATION_CLASSE_DEPASSEE", label: "Taux d'occupation d'une classe dépassé", metricType: "TAUX_OCCUPATION_CLASSE_MAX", comparator: "GT", threshold: 100 },
  { code: "MASSE_SALARIALE_ELEVEE", label: "Masse salariale mensuelle au-delà du seuil", metricType: "MASSE_SALARIALE_MENSUELLE", comparator: "GT", threshold: 20000000 },
];

function permissionCode(module: string, action: PermissionAction) {
  return `${module}:${action}`;
}

async function main() {
  for (const role of SYSTEM_ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { label: role.label, isSystem: true },
      create: { code: role.code, label: role.label, isSystem: true },
    });
  }

  const allPermissions = [
    ...IDENTITE_PERMISSIONS,
    ...PARAMETRES_PERMISSIONS,
    ...ETUDIANTS_PERMISSIONS,
    ...INSCRIPTIONS_PERMISSIONS,
    ...FRAIS_PERMISSIONS,
    ...PAIEMENTS_PERMISSIONS,
    ...COMPTABILITE_PERMISSIONS,
    ...MATIERES_PERMISSIONS,
    ...ENSEIGNANTS_PERMISSIONS,
    ...PAIE_PERMISSIONS,
    ...POINTAGE_PERMISSIONS,
    ...EVALUATION_PERMISSIONS,
    ...EMPLOI_DU_TEMPS_PERMISSIONS,
    ...COMMUNICATION_PERMISSIONS,
    ...DOCUMENTS_PERMISSIONS,
    ...SANCTIONS_PERMISSIONS,
    ...ABSENCES_PERMISSIONS,
    ...SESSIONNAIRES_PERMISSIONS,
    ...TABLEAU_BORD_PERMISSIONS,
    ...SAUVEGARDE_BDD_PERMISSIONS,
    ...INVENTAIRE_PERMISSIONS,
    ...BIBLIOTHEQUE_PERMISSIONS,
    ...BIBLIOTHEQUE_NUMERIQUE_PERMISSIONS,
    ...PORTAIL_WEB_PERMISSIONS,
  ];
  for (const permission of allPermissions) {
    const code = permissionCode(permission.module, permission.action);
    await prisma.permission.upsert({
      where: { code },
      update: { module: permission.module, action: permission.action, label: permission.label },
      create: { code, module: permission.module, action: permission.action, label: permission.label },
    });
  }

  if (!(await prisma.securitySettings.findFirst())) {
    await prisma.securitySettings.create({ data: {} });
  }

  if (!(await prisma.establishmentSettings.findFirst())) {
    await prisma.establishmentSettings.create({
      data: { officialName: "École de Commerce et de Gestion ISAC" },
    });
  }

  if (!(await prisma.campusSettings.findFirst())) {
    await prisma.campusSettings.create({ data: { name: "Campus principal" } });
  }

  if (!(await prisma.currencySettings.findFirst())) {
    await prisma.currencySettings.create({ data: {} });
  }

  if (!(await prisma.regionalSettings.findFirst())) {
    await prisma.regionalSettings.create({ data: {} });
  }

  if (!(await prisma.themeSettings.findFirst())) {
    await prisma.themeSettings.create({ data: {} });
  }

  if (!(await prisma.printThemeSettings.findFirst())) {
    await prisma.printThemeSettings.create({ data: {} });
  }

  if (!(await prisma.officialStamp.findFirst())) {
    await prisma.officialStamp.create({ data: {} });
  }

  for (const roleCode of SIGNATORY_ROLES) {
    await prisma.documentSignatory.upsert({
      where: { roleCode },
      update: {},
      create: { roleCode },
    });
  }

  for (const documentType of DOCUMENT_TYPES) {
    await prisma.documentTemplate.upsert({
      where: { documentType },
      update: {},
      create: { documentType },
    });
  }

  for (const documentType of DOUBLE_EXEMPLAIRE_DEFAULT_TYPES) {
    await prisma.documentTemplate.update({
      where: { documentType },
      data: { allowDoubleExemplaire: true, secondaryCopyLabel: "Exemplaire Étudiant" },
    });
  }

  if (!(await prisma.institutionalHeaderSettings.findFirst())) {
    await prisma.institutionalHeaderSettings.create({ data: {} });
  }

  // Module 9.1 — Carte d'étudiant : gabarit singleton, valeurs par défaut = maquette validée le 2026-07-30.
  if (!(await prisma.studentCardTemplate.findFirst())) {
    await prisma.studentCardTemplate.create({ data: {} });
  }

  const MODULE_9_NUMBERING_TEMPLATES: { purpose: NumberingPurpose; template: string; counterPadding?: number }[] = [
    { purpose: "CERTIFICAT_SCOLARITE", template: "CS-{COMPTEUR}-{AA}" },
    { purpose: "ATTESTATION_INSCRIPTION", template: "AI-{COMPTEUR}-{AA}" },
    // Compteur sur 6 chiffres (ex. CE-3-26-000123) — conforme à la maquette validée (MODULE-09.1 §1.4).
    { purpose: "CARTE_ETUDIANT", template: "CE-{COMPTEUR}-{AA}", counterPadding: 6 },
    { purpose: "ATTESTATION_TRAVAIL", template: "ATR-{COMPTEUR}-{AA}" },
    { purpose: "LISTE_ETUDIANTS", template: "LE-{COMPTEUR}-{AA}" },
    { purpose: "LISTE_ENSEIGNANTS", template: "LEN-{COMPTEUR}-{AA}" },
    { purpose: "LISTE_CLASSES", template: "LC-{COMPTEUR}-{AA}" },
    { purpose: "FICHE_EMARGEMENT", template: "FE-{COMPTEUR}-{AA}" },
    { purpose: "EMPLOI_DU_TEMPS", template: "EDT-{COMPTEUR}-{AA}" },
    { purpose: "HISTORIQUE_PAIEMENTS", template: "HP-{COMPTEUR}-{AA}" },
    // Même modèle que la carte d'étudiant (2026-07-30, retour du porteur du projet).
    { purpose: "CARTE_PAIEMENT", template: "CP-{COMPTEUR}-{AA}", counterPadding: 6 },
    // Rapports comptables/de caisse — validés le 2026-07-30 (retour du porteur du projet), voir ADR-053.
    { purpose: "GRAND_LIVRE_CAISSE", template: "GLC-{COMPTEUR}-{AA}" },
    { purpose: "ETAT_RECETTES", template: "ER-{COMPTEUR}-{AA}" },
    { purpose: "RAPPORT_CAISSE", template: "RC-{COMPTEUR}-{AA}" },
    { purpose: "JOURNAL_CAISSE", template: "JC-{COMPTEUR}-{AA}" },
    { purpose: "SITUATION_CAISSE_JOURNALIERE", template: "SC-{COMPTEUR}-{AA}" },
    { purpose: "BILAN", template: "BIL-{COMPTEUR}-{AA}" },
    // Fiche d'inscription et de réinscription — formulaire vierge, sans entité liée (2026-08-02).
    { purpose: "FICHE_INSCRIPTION", template: "FI-{COMPTEUR}-{AA}" },
    // Fiche d'inscription complétée — version remplie, liée à un étudiant précis (2026-08-03).
    { purpose: "FICHE_INSCRIPTION_COMPLETEE", template: "FIC-{COMPTEUR}-{AA}" },
    // Avis de sanction disciplinaire (2026-08-03).
    { purpose: "SANCTION", template: "SANC-{COMPTEUR}-{AA}" },
    // Bulletin de paie migré vers le moteur PDF centralisé le 2026-07-30. Le reçu de paiement
    // (RECU_PAIEMENT) réutilise Payment.receiptNumber et n'a donc pas de nouvelle entrée ici — voir
    // documentEngineService.ts.
    { purpose: "BULLETIN_SALAIRE", template: "BS-{COMPTEUR}-{AA}" },
    // Fiche d'émargement mensuelle des enseignants — remplace le suivi numérique du pointage (2026-08-03).
    { purpose: "FICHE_EMARGEMENT_ENSEIGNANT", template: "FEE-{COMPTEUR}-{AA}" },
    // Contrats de travail (2026-08-06) — remplace CONTRAT_TRAVAIL (Tier 2, jamais implémenté).
    { purpose: "CONTRAT_CDD_ADMINISTRATIF", template: "CTA-{COMPTEUR}-{AA}" },
    { purpose: "CONTRAT_CDD_ENSEIGNANT", template: "CTE-{COMPTEUR}-{AA}" },
    { purpose: "CONTRAT_VACATION", template: "CTV-{COMPTEUR}-{AA}" },
    // Numéro d'inventaire (Module 14, 2026-08-06) — {FILIERE} n'a pas de sens pour un bien, gabarit propre.
    { purpose: "BIEN_INVENTAIRE", template: "INV-{COMPTEUR}-{AA}", counterPadding: 5 },
    // Numéro d'inventaire d'exemplaire de bibliothèque (Module 13, 2026-08-07).
    { purpose: "EXEMPLAIRE_BIBLIOTHEQUE", template: "BIB-{COMPTEUR}-{AA}", counterPadding: 5 },
    // Rapports financiers étudiants — retards de paiement et situation financière (2026-08-09).
    { purpose: "RETARD_PAIEMENT", template: "RP-{COMPTEUR}-{AA}" },
    { purpose: "SITUATION_FINANCIERE", template: "SF-{COMPTEUR}-{AA}" },
  ];
  for (const { purpose, template, counterPadding } of MODULE_9_NUMBERING_TEMPLATES) {
    await prisma.studentNumberingSettings.upsert({
      where: { purpose },
      update: {},
      create: { purpose, template, counterPadding },
    });
  }
  // Correction ponctuelle : la série CARTE_ETUDIANT existait déjà (Module 9) sans compteur sur 6
  // chiffres avant la validation de la maquette du Module 9.1 — l'upsert ci-dessus ne la met pas à
  // jour (une personnalisation ultérieure de l'administrateur ne doit jamais être écrasée par le
  // seed). On l'aligne explicitement une seule fois si elle est restée à la valeur par défaut (0).
  await prisma.studentNumberingSettings.updateMany({
    where: { purpose: "CARTE_ETUDIANT", counterPadding: 0 },
    data: { counterPadding: 6 },
  });

  for (const level of DEFAULT_LEVELS) {
    await prisma.level.upsert({
      where: { code: level.code },
      update: { label: level.label, orderIndex: level.orderIndex },
      create: level,
    });
  }

  await prisma.studentNumberingSettings.upsert({
    where: { purpose: "MATRICULE" },
    update: {},
    create: { purpose: "MATRICULE" },
  });
  await prisma.studentNumberingSettings.upsert({
    where: { purpose: "INSCRIPTION" },
    update: {},
    create: { purpose: "INSCRIPTION", template: "{FILIERE}-{COMPTEUR}-{SIGLE}-{AA}" },
  });

  for (const regime of DEFAULT_ENROLLMENT_REGIMES) {
    await prisma.enrollmentRegime.upsert({
      where: { code: regime.code },
      update: { label: regime.label },
      create: regime,
    });
  }

  if (!(await prisma.enrollmentSettings.findFirst())) {
    await prisma.enrollmentSettings.create({ data: {} });
  }

  for (const documentType of STUDENT_DOCUMENT_TYPES) {
    await prisma.enrollmentDocumentRequirement.upsert({
      where: { documentType },
      update: {},
      create: { documentType },
    });
  }

  for (const feeType of DEFAULT_FEE_TYPES) {
    await prisma.feeType.upsert({
      where: { code: feeType.code },
      update: { name: feeType.name },
      create: feeType,
    });
  }

  for (const method of DEFAULT_PAYMENT_METHODS) {
    await prisma.paymentMethod.upsert({
      where: { code: method.code },
      update: { label: method.label, isSystem: true },
      create: { ...method, isSystem: true },
    });
  }

  await prisma.cashRegister.upsert({
    where: { code: DEFAULT_CASH_REGISTER.code },
    update: { name: DEFAULT_CASH_REGISTER.name },
    create: DEFAULT_CASH_REGISTER,
  });

  await prisma.studentNumberingSettings.upsert({
    where: { purpose: "RECU_PAIEMENT" },
    update: {},
    create: { purpose: "RECU_PAIEMENT", template: "REC-{COMPTEUR}-{AA}" },
  });

  const accountsByCode = new Map<string, string>();
  for (const account of DEFAULT_CHART_ACCOUNTS) {
    const row = await prisma.chartAccount.upsert({
      where: { code: account.code },
      update: { label: account.label, type: account.type },
      create: account,
    });
    accountsByCode.set(account.code, row.id);
  }

  for (const [methodCode, accountCode] of Object.entries(PAYMENT_METHOD_ACCOUNT_CODES)) {
    const accountId = accountsByCode.get(accountCode);
    if (!accountId) continue;
    await prisma.paymentMethod.updateMany({ where: { code: methodCode }, data: { linkedAccountId: accountId } });
  }

  for (const [feeTypeCode, accountCode] of Object.entries(FEE_TYPE_ACCOUNT_CODES)) {
    const accountId = accountsByCode.get(accountCode);
    if (!accountId) continue;
    await prisma.feeType.updateMany({ where: { code: feeTypeCode }, data: { revenueAccountId: accountId } });
  }

  const chargesDiversesId = accountsByCode.get("607000");
  for (const category of DEFAULT_EXPENSE_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { code: category.code },
      update: { name: category.name, defaultAccountId: chargesDiversesId },
      create: { ...category, defaultAccountId: chargesDiversesId },
    });
  }

  await prisma.studentNumberingSettings.upsert({
    where: { purpose: "ECRITURE_COMPTABLE" },
    update: {},
    create: { purpose: "ECRITURE_COMPTABLE", template: "ECR-{COMPTEUR}-{AA}" },
  });
  await prisma.studentNumberingSettings.upsert({
    where: { purpose: "DEPENSE" },
    update: {},
    create: { purpose: "DEPENSE", template: "DEP-{COMPTEUR}-{AA}" },
  });

  for (const status of DEFAULT_TEACHER_STATUSES) {
    await prisma.teacherStatus.upsert({
      where: { code: status.code },
      update: { label: status.label },
      create: status,
    });
  }

  for (const contractType of DEFAULT_TEACHER_CONTRACT_TYPES) {
    await prisma.teacherContractType.upsert({
      where: { code: contractType.code },
      update: { label: contractType.label },
      create: contractType,
    });
  }

  await prisma.studentNumberingSettings.upsert({
    where: { purpose: "ENSEIGNANT" },
    update: {},
    create: { purpose: "ENSEIGNANT", template: "ENS-{COMPTEUR}-{AA}" },
  });

  for (const category of DEFAULT_EMPLOYEE_CATEGORIES) {
    await prisma.employeeCategory.upsert({
      where: { code: category.code },
      update: { label: category.label },
      create: category,
    });
  }

  for (const componentType of DEFAULT_PAYROLL_COMPONENT_TYPES) {
    await prisma.payrollComponentType.upsert({
      where: { code: componentType.code },
      update: { label: componentType.label, kind: componentType.kind },
      create: componentType,
    });
  }

  if (!(await prisma.payrollSettings.findFirst())) {
    await prisma.payrollSettings.create({ data: {} });
  }

  await prisma.studentNumberingSettings.upsert({
    where: { purpose: "EMPLOYE" },
    update: {},
    create: { purpose: "EMPLOYE", template: "EMP-{COMPTEUR}-{AA}" },
  });

  if (!(await prisma.evaluationSettings.findFirst())) {
    await prisma.evaluationSettings.create({ data: {} });
  }

  await prisma.studentNumberingSettings.upsert({
    where: { purpose: "BULLETIN_PERIODE" },
    update: {},
    create: { purpose: "BULLETIN_PERIODE", template: "BUL-{COMPTEUR}-{AA}" },
  });
  await prisma.studentNumberingSettings.upsert({
    where: { purpose: "BULLETIN_ANNUEL" },
    update: {},
    create: { purpose: "BULLETIN_ANNUEL", template: "BULAN-{COMPTEUR}-{AA}" },
  });

  for (const template of DEFAULT_MESSAGE_TEMPLATES) {
    await prisma.messageTemplate.upsert({
      where: { code: template.code },
      update: { label: template.label, content: template.content, isSystem: true },
      create: { ...template, isSystem: true },
    });
  }

  for (const config of DEFAULT_NOTIFICATION_EVENT_CONFIGS) {
    const template = await prisma.messageTemplate.findUniqueOrThrow({ where: { code: config.templateCode } });
    await prisma.notificationEventConfig.upsert({
      where: { eventType: config.eventType },
      update: { templateId: template.id, channels: config.channels },
      create: { eventType: config.eventType, templateId: template.id, channels: config.channels },
    });
  }

  if (!(await prisma.communicationSettings.findFirst())) {
    await prisma.communicationSettings.create({ data: {} });
  }
  if (!(await prisma.whatsAppGatewaySettings.findFirst())) {
    await prisma.whatsAppGatewaySettings.create({ data: {} });
  }
  if (!(await prisma.emailGatewaySettings.findFirst())) {
    await prisma.emailGatewaySettings.create({ data: {} });
  }

  if (!(await prisma.backupSettings.findFirst())) {
    await prisma.backupSettings.create({ data: {} });
  }

  for (const rule of DEFAULT_ALERT_RULES) {
    await prisma.alertRule.upsert({
      where: { code: rule.code },
      update: {},
      create: {
        code: rule.code,
        label: rule.label,
        metricType: rule.metricType,
        comparator: rule.comparator,
        threshold: rule.threshold,
      },
    });
  }

  for (const name of DEFAULT_ASSET_CATEGORIES) {
    await prisma.assetCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const name of DEFAULT_BOOK_CATEGORIES) {
    await prisma.bookCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  if (!(await prisma.librarySettings.findFirst())) {
    await prisma.librarySettings.create({ data: {} });
  }

  for (const name of DEFAULT_DIGITAL_DOCUMENT_CATEGORIES) {
    await prisma.digitalDocumentCategory.upsert({ where: { name }, update: {}, create: { name } });
  }

  console.log(
    `Seed terminé : ${SYSTEM_ROLES.length} rôles système, ${allPermissions.length} permissions, ${DEFAULT_LEVELS.length} niveaux par défaut, ${SIGNATORY_ROLES.length} signataires, ${DOCUMENT_TYPES.length} modèles de documents, ${DEFAULT_ENROLLMENT_REGIMES.length} régimes d'inscription, ${DEFAULT_FEE_TYPES.length} types de frais, ${DEFAULT_PAYMENT_METHODS.length} modes de paiement, 1 caisse par défaut, ${DEFAULT_CHART_ACCOUNTS.length} comptes comptables, ${DEFAULT_EXPENSE_CATEGORIES.length} catégories de dépenses, ${DEFAULT_TEACHER_STATUSES.length} statuts d'enseignant, ${DEFAULT_TEACHER_CONTRACT_TYPES.length} types de contrat, ${DEFAULT_EMPLOYEE_CATEGORIES.length} catégories d'employés, ${DEFAULT_PAYROLL_COMPONENT_TYPES.length} composants de paie, ${DEFAULT_MESSAGE_TEMPLATES.length} modèles de message, ${DEFAULT_NOTIFICATION_EVENT_CONFIGS.length} configurations de notification automatique, ${MODULE_9_NUMBERING_TEMPLATES.length} séries de numérotation de documents officiels (Module 9), ${DEFAULT_ALERT_RULES.length} règles d'alerte de départ (Module 10), 1 réglage de sauvegarde par défaut (Module 11), ${DEFAULT_ASSET_CATEGORIES.length} catégories de biens de départ (Module 14), ${DEFAULT_BOOK_CATEGORIES.length} catégories d'ouvrages de départ et 1 réglage de bibliothèque par défaut (Module 13), ${DEFAULT_DIGITAL_DOCUMENT_CATEGORIES.length} catégories de documents numériques de départ (Module 13 extension).`
  );
}

main()
  .catch((error) => {
    console.error("Échec du seed :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
