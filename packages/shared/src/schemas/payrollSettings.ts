import { z } from "zod";

/**
 * Réglages de la paie — singleton, intégration comptable conditionnelle (voir MODULE-08 §1.11).
 * defaultHourlyRate/defaultSessionDurationHours (Module 5.1 §1.8) ne servent qu'à préremplir un
 * nouvel employé — jamais à écraser un tarif déjà personnalisé.
 */
export const payrollSettingsSchema = z.object({
  id: z.string().uuid(),
  salaryExpenseAccountId: z.string().uuid().nullable(),
  salaryExpenseAccountLabel: z.string().nullable(),
  defaultHourlyRate: z.number().nullable(),
  defaultSessionDurationHours: z.number().nullable(),
  /** Majoration des heures supplémentaires (ex. 1.25 = +25%) — MODULE-05.2 §1.10. Champ de
   * configuration uniquement : aucun calcul automatique tant que la règle exacte n'est précisée. */
  overtimeMultiplier: z.number().nullable(),
  /** Plafond mensuel d'heures par défaut — MODULE-05.2 §1.10. Même statut que overtimeMultiplier. */
  monthlyHoursCap: z.number().nullable(),
});
export type PayrollSettingsDto = z.infer<typeof payrollSettingsSchema>;

export const updatePayrollSettingsInputSchema = z.object({
  salaryExpenseAccountId: z.string().uuid().nullish(),
  defaultHourlyRate: z.number().positive().nullish(),
  defaultSessionDurationHours: z.number().positive().nullish(),
  overtimeMultiplier: z.number().positive().nullish(),
  monthlyHoursCap: z.number().positive().nullish(),
});
export type UpdatePayrollSettingsInput = z.infer<typeof updatePayrollSettingsInputSchema>;
