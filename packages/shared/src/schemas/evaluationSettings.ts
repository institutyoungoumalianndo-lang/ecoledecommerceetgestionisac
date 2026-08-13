import { z } from "zod";

/**
 * Réglages de l'évaluation — singleton configurable (voir MODULE-06 §1.2/§1.6). Pondérations des
 * composantes et seuils de mention/admission, jamais codés en dur (repris configurables du système
 * existant qui les codait en dur).
 */
export const evaluationSettingsSchema = z.object({
  id: z.string().uuid(),
  poidsOrale: z.number(),
  poidsEcrite: z.number(),
  poidsComposition: z.number(),
  seuilAdmission: z.number(),
  seuilPassable: z.number(),
  seuilAssezBien: z.number(),
  seuilBien: z.number(),
  seuilTresBien: z.number(),
  // Régularité (2026-08-03, retour du porteur du projet) : au-delà de ce nombre d'absences NON
  // JUSTIFIÉES, la mention "Irrégulier" remplace "Régulier" sur le bulletin.
  seuilAbsencesIrregulier: z.number().int(),
});
export type EvaluationSettingsDto = z.infer<typeof evaluationSettingsSchema>;

export const updateEvaluationSettingsInputSchema = z.object({
  poidsOrale: z.number().positive(),
  poidsEcrite: z.number().positive(),
  poidsComposition: z.number().positive(),
  seuilAdmission: z.number().min(0).max(20),
  seuilPassable: z.number().min(0).max(20),
  seuilAssezBien: z.number().min(0).max(20),
  seuilBien: z.number().min(0).max(20),
  seuilTresBien: z.number().min(0).max(20),
  seuilAbsencesIrregulier: z.number().int().min(0),
});
export type UpdateEvaluationSettingsInput = z.infer<typeof updateEvaluationSettingsInputSchema>;
