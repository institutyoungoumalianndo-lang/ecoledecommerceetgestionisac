import { z } from "zod";

export const expenseCategorySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  defaultAccountId: z.string().uuid().nullable(),
  defaultAccountLabel: z.string().nullable(),
  isActive: z.boolean(),
});
export type ExpenseCategoryDto = z.infer<typeof expenseCategorySchema>;

export const createExpenseCategoryInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  defaultAccountId: z.string().uuid().nullish(),
});
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategoryInputSchema>;

export const updateExpenseCategoryInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  defaultAccountId: z.string().uuid().nullish(),
  isActive: z.boolean().optional(),
});
export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategoryInputSchema>;
