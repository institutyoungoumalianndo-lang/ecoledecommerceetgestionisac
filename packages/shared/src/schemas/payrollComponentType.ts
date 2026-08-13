import { z } from "zod";

export const payrollComponentKindSchema = z.enum(["PRIME", "INDEMNITE", "RETENUE", "COTISATION"]);
export type PayrollComponentKind = z.infer<typeof payrollComponentKindSchema>;

/** Référentiel configurable de primes/indemnités/retenues/cotisations — voir MODULE-08 §1.7. */
export const payrollComponentTypeSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  kind: payrollComponentKindSchema,
  isActive: z.boolean(),
});
export type PayrollComponentTypeDto = z.infer<typeof payrollComponentTypeSchema>;

export const createPayrollComponentTypeInputSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  kind: payrollComponentKindSchema,
});
export type CreatePayrollComponentTypeInput = z.infer<typeof createPayrollComponentTypeInputSchema>;

export const updatePayrollComponentTypeInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePayrollComponentTypeInput = z.infer<typeof updatePayrollComponentTypeInputSchema>;

export const payrollComponentTypeIdInputSchema = z.object({ id: z.string().uuid() });
