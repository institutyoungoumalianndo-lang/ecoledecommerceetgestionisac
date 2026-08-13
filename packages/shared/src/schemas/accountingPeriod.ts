import { z } from "zod";

export const accountingPeriodSchema = z.object({
  id: z.string().uuid(),
  year: z.number().int(),
  month: z.number().int(),
  isLocked: z.boolean(),
  lockedAt: z.coerce.date().nullable(),
  lockedByName: z.string().nullable(),
});
export type AccountingPeriodDto = z.infer<typeof accountingPeriodSchema>;

export const periodInputSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});
export type PeriodInput = z.infer<typeof periodInputSchema>;

export const listAccountingPeriodsInputSchema = z.object({ year: z.number().int().optional() });
export type ListAccountingPeriodsInput = z.infer<typeof listAccountingPeriodsInputSchema>;
