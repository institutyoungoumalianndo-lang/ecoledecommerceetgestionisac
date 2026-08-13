import { z } from "zod";

export const budgetLineInputSchema = z.object({
  categoryId: z.string().uuid(),
  allocatedAmount: z.number().min(0),
});
export type BudgetLineInput = z.infer<typeof budgetLineInputSchema>;

/** Écart réalisé/prévisionnel toujours calculé à la volée (MODULE-07 §1.9), jamais stocké. */
export const budgetLineSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  allocatedAmount: z.number(),
  actualAmount: z.number(),
  variance: z.number(),
});
export type BudgetLineDto = z.infer<typeof budgetLineSchema>;

export const budgetSchema = z.object({
  id: z.string().uuid(),
  year: z.number().int(),
  label: z.string().nullable(),
  lines: z.array(budgetLineSchema),
  totalAllocated: z.number(),
  totalActual: z.number(),
  totalVariance: z.number(),
});
export type BudgetDto = z.infer<typeof budgetSchema>;

export const createBudgetInputSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  label: z.string().nullish(),
  lines: z.array(budgetLineInputSchema).default([]),
});
export type CreateBudgetInput = z.infer<typeof createBudgetInputSchema>;

export const updateBudgetLinesInputSchema = z.object({
  budgetId: z.string().uuid(),
  lines: z.array(budgetLineInputSchema),
});
export type UpdateBudgetLinesInput = z.infer<typeof updateBudgetLinesInputSchema>;

export const getBudgetInputSchema = z.object({ year: z.number().int() });
export type GetBudgetInput = z.infer<typeof getBudgetInputSchema>;

export const listBudgetsInputSchema = z.object({});
