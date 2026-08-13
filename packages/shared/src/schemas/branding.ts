import { z } from "zod";

export const signatoryRoleSchema = z.enum([
  "DIRECTEUR_GENERAL",
  "DIRECTEUR_CAMPUS",
  "DIRECTEUR_ETUDES",
  "COMPTABLE",
  "RESPONSABLE_ADMINISTRATIF",
]);
export type SignatoryRole = z.infer<typeof signatoryRoleSchema>;

export const documentSignatorySchema = z.object({
  roleCode: signatoryRoleSchema,
  displayName: z.string().nullable(),
  title: z.string().nullable(),
  signatureImagePath: z.string().nullable(),
  linkedUserId: z.string().uuid().nullable(),
});
export type DocumentSignatoryDto = z.infer<typeof documentSignatorySchema>;

export const updateDocumentSignatoryInputSchema = z.object({
  roleCode: signatoryRoleSchema,
  displayName: z.string().nullish(),
  title: z.string().nullish(),
  linkedUserId: z.string().uuid().nullish(),
  signatureImagePath: z.string().nullish(),
});
export type UpdateDocumentSignatoryInput = z.infer<typeof updateDocumentSignatoryInputSchema>;

export const documentTypeSchema = z.enum([
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
  // RAPPORT_CAISSE passe du Tier 2 (catalogue seul, ADR-049) au Tier 1 à cette occasion.
  "GRAND_LIVRE_CAISSE",
  "ETAT_RECETTES",
  "RAPPORT_CAISSE",
  "JOURNAL_CAISSE",
  "SITUATION_CAISSE_JOURNALIERE",
  "BILAN",
  // Fiche d'inscription et de réinscription — formulaire vierge à remplir à la main par l'étudiant
  // (2026-08-02, retour du porteur du projet) : sans entité liée (aucun étudiant n'existe encore au
  // moment d'une nouvelle inscription), même principe que RAPPORT_CAISSE/ETAT_RECETTES ci-dessus.
  "FICHE_INSCRIPTION",
  // Fiche d'inscription complétée — version remplie de la fiche ci-dessus, générée depuis le dossier
  // réel d'un étudiant déjà inscrit (2026-08-03, retour du porteur du projet) : contrairement à
  // FICHE_INSCRIPTION (formulaire vierge, sans entité), celle-ci est liée à un étudiant précis
  // (studentId), avec sa photo et ses informations réelles pré-remplies.
  "FICHE_INSCRIPTION_COMPLETEE",
  // Avis de sanction disciplinaire — lié à un étudiant et à la sanction enregistrée (2026-08-03,
  // retour du porteur du projet).
  "SANCTION",
  // Reçu de paiement et bulletin de paie — migrés vers le moteur PDF centralisé le 2026-07-30
  // (auparavant window.print(), voir CHANGELOG). RECU/BULLETIN (génériques, Module 2) inchangés.
  "RECU_PAIEMENT",
  "BULLETIN_SALAIRE",
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
  // Fiche d'émargement mensuelle des enseignants — remplace le suivi numérique des séances/pointage
  // (2026-08-03, retour du porteur du projet), distincte de FICHE_EMARGEMENT (émargement étudiants
  // d'une séance) déjà existante.
  "FICHE_EMARGEMENT_ENSEIGNANT",
  // Contrats de travail (2026-08-06, retour du porteur du projet) — l'établissement ne fonctionne
  // qu'en CDD (jamais de CDI) : personnel administratif (durée = une année scolaire), enseignant
  // (durée = un module d'enseignement, sans période d'essai, renouvelable module par module), et
  // contrat de vacation (rémunération à l'heure). Remplace CONTRAT_TRAVAIL (Tier 2, jamais implémenté).
  "CONTRAT_CDD_ADMINISTRATIF",
  "CONTRAT_CDD_ENSEIGNANT",
  "CONTRAT_VACATION",
  // Rapports financiers étudiants — retards de paiement et situation financière détaillée par
  // filière/niveau/année/tranche (2026-08-09, retour du porteur du projet), réutilisant
  // getStudentFeeSummary (Module 4.2/4.3) plutôt qu'un nouveau calcul de tarif indépendant.
  "RETARD_PAIEMENT",
  "SITUATION_FINANCIERE",
]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

/** Types Tier 1 (Module 9) dont la génération réelle est implémentée — voir MODULE-09 §0.4. */
export const TIER1_DOCUMENT_TYPES = [
  "CERTIFICAT_SCOLARITE",
  "ATTESTATION_INSCRIPTION",
  "CARTE_ETUDIANT",
  "ATTESTATION_TRAVAIL",
  "LISTE_ETUDIANTS",
  "LISTE_ENSEIGNANTS",
  "LISTE_CLASSES",
  "FICHE_EMARGEMENT",
  "EMPLOI_DU_TEMPS",
  "HISTORIQUE_PAIEMENTS",
  "GRAND_LIVRE_CAISSE",
  "ETAT_RECETTES",
  "RAPPORT_CAISSE",
  "JOURNAL_CAISSE",
  "SITUATION_CAISSE_JOURNALIERE",
  "BILAN",
  "FICHE_INSCRIPTION",
  "FICHE_INSCRIPTION_COMPLETEE",
  "SANCTION",
  "RECU_PAIEMENT",
  "BULLETIN_SALAIRE",
  "FICHE_EMARGEMENT_ENSEIGNANT",
  "CONTRAT_CDD_ADMINISTRATIF",
  "CONTRAT_CDD_ENSEIGNANT",
  "CONTRAT_VACATION",
  "RETARD_PAIEMENT",
  "SITUATION_FINANCIERE",
] as const satisfies readonly DocumentType[];
export type Tier1DocumentType = (typeof TIER1_DOCUMENT_TYPES)[number];

export const officialStampSchema = z.object({
  imagePath: z.string().nullable(),
  widthMm: z.number().positive().nullable(),
  heightMm: z.number().positive().nullable(),
  positionXMm: z.number().nullable(),
  positionYMm: z.number().nullable(),
  applicableDocumentTypes: z.array(documentTypeSchema),
});
export type OfficialStampDto = z.infer<typeof officialStampSchema>;

export const updateOfficialStampInputSchema = officialStampSchema.partial();
export type UpdateOfficialStampInput = z.infer<typeof updateOfficialStampInputSchema>;

export const themeSettingsSchema = z.object({
  primaryColor: z.string().nullable(),
  secondaryColor: z.string().nullable(),
  buttonColor: z.string().nullable(),
  menuColor: z.string().nullable(),
  /** Couleur des fenêtres (extension du 2026-07-30) — fond des panneaux/cartes/boîtes de dialogue.
   * Les zones de saisie et le contenu des tableaux restent toujours blancs, quelle que soit cette valeur. */
  windowColor: z.string().nullable(),
  /** Couleurs par variante de bouton (extension du 2026-07-30) — chaque bouton réglable individuellement. */
  destructiveColor: z.string().nullable(),
  successColor: z.string().nullable(),
  warningColor: z.string().nullable(),
  fontFamily: z.string().nullable(),
  loginImagePath: z.string().nullable(),
  backgroundImagePath: z.string().nullable(),
});
export type ThemeSettingsDto = z.infer<typeof themeSettingsSchema>;

export const updateThemeSettingsInputSchema = themeSettingsSchema.partial();
export type UpdateThemeSettingsInput = z.infer<typeof updateThemeSettingsInputSchema>;

export const documentTemplateSchema = z.object({
  documentType: documentTypeSchema,
  showLogoPrimary: z.boolean(),
  showLogoSecondary: z.boolean(),
  showStamp: z.boolean(),
  signatoryRoleCode: signatoryRoleSchema.nullable(),
  customFooterText: z.string().nullable(),
  // Module 9 — moteur PDF centralisé (voir MODULE-09 §2)
  showCampusLogo: z.boolean(),
  showQrCode: z.boolean(),
  allowDoubleExemplaire: z.boolean(),
  secondaryCopyLabel: z.string().nullable(),
});
export type DocumentTemplateDto = z.infer<typeof documentTemplateSchema>;

export const updateDocumentTemplateInputSchema = z.object({
  documentType: documentTypeSchema,
  showLogoPrimary: z.boolean().optional(),
  showLogoSecondary: z.boolean().optional(),
  showStamp: z.boolean().optional(),
  signatoryRoleCode: signatoryRoleSchema.nullish(),
  customFooterText: z.string().nullish(),
  showCampusLogo: z.boolean().optional(),
  showQrCode: z.boolean().optional(),
  allowDoubleExemplaire: z.boolean().optional(),
  secondaryCopyLabel: z.string().nullish(),
});
export type UpdateDocumentTemplateInput = z.infer<typeof updateDocumentTemplateInputSchema>;

/** Catalogue de documents pour l'écran de configuration (Module 9 §1.4) — indique si la génération est réellement disponible. */
export const documentCatalogEntrySchema = z.object({
  documentType: documentTypeSchema,
  label: z.string(),
  implemented: z.boolean(),
  template: documentTemplateSchema,
});
export type DocumentCatalogEntryDto = z.infer<typeof documentCatalogEntrySchema>;
