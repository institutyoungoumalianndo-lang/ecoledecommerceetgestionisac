import { z } from "zod";

/** Carte de paiement — même modèle visuel que la carte d'étudiant (extension du 2026-07-30), sans cycle de vie propre : chaque génération est une nouvelle archive. */
export const generatePaymentCardInputSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid().optional(),
});
export type GeneratePaymentCardInput = z.infer<typeof generatePaymentCardInputSchema>;
