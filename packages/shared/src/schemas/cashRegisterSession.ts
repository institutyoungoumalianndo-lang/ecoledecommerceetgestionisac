import { z } from "zod";

export const cashSessionStatusSchema = z.enum(["OUVERTE", "FERMEE"]);
export type CashSessionStatus = z.infer<typeof cashSessionStatusSchema>;

export const cashRegisterSessionSchema = z.object({
  id: z.string().uuid(),
  cashRegisterId: z.string().uuid(),
  cashRegisterName: z.string(),
  openedBy: z.string().uuid(),
  openedByName: z.string(),
  openedAt: z.coerce.date(),
  openingBalance: z.number(),
  closedBy: z.string().uuid().nullable(),
  closedByName: z.string().nullable(),
  closedAt: z.coerce.date().nullable(),
  closingBalanceDeclared: z.number().nullable(),
  closingBalanceComputed: z.number().nullable(),
  variance: z.number().nullable(),
  status: cashSessionStatusSchema,
  notes: z.string().nullable(),
  totalCollected: z.number(),
  paymentCount: z.number().int(),
});
export type CashRegisterSessionDto = z.infer<typeof cashRegisterSessionSchema>;

export const openCashRegisterSessionInputSchema = z.object({
  cashRegisterId: z.string().uuid(),
  openingBalance: z.number().min(0),
  notes: z.string().nullish(),
});
export type OpenCashRegisterSessionInput = z.infer<typeof openCashRegisterSessionInputSchema>;

export const closeCashRegisterSessionInputSchema = z.object({
  id: z.string().uuid(),
  closingBalanceDeclared: z.number().min(0),
  notes: z.string().nullish(),
});
export type CloseCashRegisterSessionInput = z.infer<typeof closeCashRegisterSessionInputSchema>;

export const listCashRegisterSessionsInputSchema = z.object({
  cashRegisterId: z.string().uuid().optional(),
  status: cashSessionStatusSchema.optional(),
});
export type ListCashRegisterSessionsInput = z.infer<typeof listCashRegisterSessionsInputSchema>;
