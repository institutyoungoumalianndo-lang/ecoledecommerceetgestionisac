import { z } from "zod";

export const paymentMethodSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  isSystem: z.boolean(),
  isActive: z.boolean(),
});
export type PaymentMethodDto = z.infer<typeof paymentMethodSchema>;

export const createPaymentMethodInputSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
});
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodInputSchema>;

export const updatePaymentMethodInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePaymentMethodInput = z.infer<typeof updatePaymentMethodInputSchema>;
