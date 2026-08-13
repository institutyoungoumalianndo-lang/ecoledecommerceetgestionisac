import { z } from "zod";

export const numberingResetPolicySchema = z.enum(["JAMAIS", "ANNUEL"]);

/** MATRICULE (Module 4) et INSCRIPTION (Module 4.1) réutilisent le même moteur de gabarit/compteur — voir ADR-018/019. */
export const numberingPurposeSchema = z.enum([
  "MATRICULE",
  "INSCRIPTION",
  "RECU_PAIEMENT",
  "ECRITURE_COMPTABLE",
  "DEPENSE",
  "ENSEIGNANT",
  "EMPLOYE",
  "BULLETIN_PERIODE",
  "BULLETIN_ANNUEL",
  // Module 9 — une série par type de document Tier 1 (voir MODULE-09 §1.6)
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
  // Extension du 2026-07-30 (retour du porteur du projet) — carte de paiement, même modèle que la carte d'étudiant.
  "CARTE_PAIEMENT",
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
  // Bulletin de paie migré vers le moteur PDF centralisé le 2026-07-30 — nouvelle série dédiée.
  // Le reçu de paiement réutilise "RECU_PAIEMENT" ci-dessus (Module 4.3), pas de nouvelle série.
  "BULLETIN_SALAIRE",
  // Fiche d'émargement mensuelle des enseignants (2026-08-03) — remplace le suivi numérique du
  // pointage, abandonné.
  "FICHE_EMARGEMENT_ENSEIGNANT",
  // Contrats de travail (2026-08-06) — voir documentTypeSchema pour le contexte complet.
  "CONTRAT_CDD_ADMINISTRATIF",
  "CONTRAT_CDD_ENSEIGNANT",
  "CONTRAT_VACATION",
  // Numéro d'inventaire d'un bien (Module 14, 2026-08-06).
  "BIEN_INVENTAIRE",
  // Numéro d'inventaire d'un exemplaire de bibliothèque (Module 13, 2026-08-07).
  "EXEMPLAIRE_BIBLIOTHEQUE",
  // Rapports financiers étudiants — retards de paiement et situation financière (2026-08-09).
  "RETARD_PAIEMENT",
  "SITUATION_FINANCIERE",
]);
export type NumberingPurpose = z.infer<typeof numberingPurposeSchema>;

export const studentNumberingSettingsSchema = z.object({
  id: z.string().uuid(),
  purpose: numberingPurposeSchema,
  template: z.string(),
  resetPolicy: numberingResetPolicySchema,
  counterPadding: z.number().int(),
});
export type StudentNumberingSettingsDto = z.infer<typeof studentNumberingSettingsSchema>;

export const getStudentNumberingSettingsInputSchema = z.object({ purpose: numberingPurposeSchema });
export type GetStudentNumberingSettingsInput = z.infer<typeof getStudentNumberingSettingsInputSchema>;

export const updateStudentNumberingSettingsInputSchema = z.object({
  purpose: numberingPurposeSchema,
  template: z
    .string()
    .min(1)
    .refine((t) => t.includes("{COMPTEUR}"), {
      message: "Le gabarit doit contenir la variable {COMPTEUR}.",
    }),
  resetPolicy: numberingResetPolicySchema,
  counterPadding: z.number().int().min(0).max(10),
});
export type UpdateStudentNumberingSettingsInput = z.infer<typeof updateStudentNumberingSettingsInputSchema>;

export const previewNextMatriculeInputSchema = z.object({
  purpose: numberingPurposeSchema,
  template: z.string().min(1),
  counterPadding: z.number().int().min(0).max(10),
  filiereId: z.string().uuid().optional(),
});
export type PreviewNextMatriculeInput = z.infer<typeof previewNextMatriculeInputSchema>;
