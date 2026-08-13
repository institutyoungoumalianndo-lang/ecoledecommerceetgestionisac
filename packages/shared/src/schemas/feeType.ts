import { z } from "zod";

export const feeTypeSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
});
export type FeeTypeDto = z.infer<typeof feeTypeSchema>;

export const createFeeTypeInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullish(),
});
export type CreateFeeTypeInput = z.infer<typeof createFeeTypeInputSchema>;

export const updateFeeTypeInputSchema = createFeeTypeInputSchema
  .partial()
  .extend({ id: z.string().uuid() });
export type UpdateFeeTypeInput = z.infer<typeof updateFeeTypeInputSchema>;

export const feeTypeIdInputSchema = z.object({ id: z.string().uuid() });
