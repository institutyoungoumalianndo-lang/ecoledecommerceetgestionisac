import { z } from "zod";

export const salaryAdvanceStatusSchema = z.enum(["EN_ATTENTE", "DEDUITE", "ANNULEE"]);
export type SalaryAdvanceStatus = z.infer<typeof salaryAdvanceStatusSchema>;

/** Avance sur salaire — jamais supprimée physiquement, voir MODULE-08 §1.8. */
export const salaryAdvanceSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeMatricule: z.string(),
  employeeName: z.string(),
  amount: z.number(),
  grantedPayPeriodId: z.string().uuid(),
  grantedPayPeriodLabel: z.string(),
  deductionPayPeriodId: z.string().uuid().nullable(),
  deductionPayPeriodLabel: z.string().nullable(),
  reason: z.string().nullable(),
  status: salaryAdvanceStatusSchema,
  createdAt: z.coerce.date(),
});
export type SalaryAdvanceDto = z.infer<typeof salaryAdvanceSchema>;

export const createSalaryAdvanceInputSchema = z.object({
  employeeId: z.string().uuid(),
  amount: z.number().positive(),
  grantedPayPeriodId: z.string().uuid(),
  deductionPayPeriodId: z.string().uuid().nullish(),
  reason: z.string().nullish(),
});
export type CreateSalaryAdvanceInput = z.infer<typeof createSalaryAdvanceInputSchema>;

export const salaryAdvanceIdInputSchema = z.object({ id: z.string().uuid() });

export const cancelSalaryAdvanceInputSchema = z.object({ id: z.string().uuid() });

export const listSalaryAdvancesInputSchema = z.object({
  employeeId: z.string().uuid().optional(),
  status: salaryAdvanceStatusSchema.optional(),
});
export type ListSalaryAdvancesInput = z.infer<typeof listSalaryAdvancesInputSchema>;
