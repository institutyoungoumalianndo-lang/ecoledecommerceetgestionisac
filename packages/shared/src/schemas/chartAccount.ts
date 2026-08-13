import { z } from "zod";

export const accountTypeSchema = z.enum(["ACTIF", "PASSIF", "TRESORERIE", "CHARGE", "PRODUIT", "CAPITAUX_PROPRES"]);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const chartAccountSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  type: accountTypeSchema,
  isActive: z.boolean(),
});
export type ChartAccountDto = z.infer<typeof chartAccountSchema>;

export const createChartAccountInputSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  type: accountTypeSchema,
});
export type CreateChartAccountInput = z.infer<typeof createChartAccountInputSchema>;

export const updateChartAccountInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  type: accountTypeSchema.optional(),
  isActive: z.boolean().optional(),
});
export type UpdateChartAccountInput = z.infer<typeof updateChartAccountInputSchema>;

export const listChartAccountsInputSchema = z.object({
  type: accountTypeSchema.optional(),
  includeInactive: z.boolean().default(false),
});
export type ListChartAccountsInput = z.infer<typeof listChartAccountsInputSchema>;
