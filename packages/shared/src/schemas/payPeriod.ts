import { z } from "zod";

export const payPeriodStatusSchema = z.enum(["OUVERT", "EN_COURS", "CLOTURE"]);
export type PayPeriodStatus = z.infer<typeof payPeriodStatusSchema>;

/** Mois de paie — clé (année, mois), voir MODULE-08 §1.6. */
export const payPeriodSchema = z.object({
  id: z.string().uuid(),
  year: z.number().int(),
  month: z.number().int(),
  label: z.string(),
  status: payPeriodStatusSchema,
  openedAt: z.coerce.date(),
  closedAt: z.coerce.date().nullable(),
  paymentDate: z.coerce.date().nullable(),
  validatedByName: z.string().nullable(),
});
export type PayPeriodDto = z.infer<typeof payPeriodSchema>;

export const createPayPeriodInputSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});
export type CreatePayPeriodInput = z.infer<typeof createPayPeriodInputSchema>;

export const payPeriodIdInputSchema = z.object({ id: z.string().uuid() });

export const closePayPeriodInputSchema = z.object({
  id: z.string().uuid(),
  paymentDate: z.coerce.date().nullish(),
});
export type ClosePayPeriodInput = z.infer<typeof closePayPeriodInputSchema>;

export const listPayPeriodsInputSchema = z.object({ year: z.number().int().optional() });
export type ListPayPeriodsInput = z.infer<typeof listPayPeriodsInputSchema>;
