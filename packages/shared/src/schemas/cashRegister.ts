import { z } from "zod";

export const cashRegisterSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  isActive: z.boolean(),
});
export type CashRegisterDto = z.infer<typeof cashRegisterSchema>;

export const createCashRegisterInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
});
export type CreateCashRegisterInput = z.infer<typeof createCashRegisterInputSchema>;

export const updateCashRegisterInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCashRegisterInput = z.infer<typeof updateCashRegisterInputSchema>;
