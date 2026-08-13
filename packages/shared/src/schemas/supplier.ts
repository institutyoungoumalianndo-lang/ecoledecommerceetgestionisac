import { z } from "zod";

export const supplierSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  contactPerson: z.string().nullable(),
  category: z.string().nullable(),
  isActive: z.boolean(),
  totalPaid: z.number(),
});
export type SupplierDto = z.infer<typeof supplierSchema>;

export const createSupplierInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  address: z.string().nullish(),
  phone: z.string().nullish(),
  email: z.string().email().nullish(),
  contactPerson: z.string().nullish(),
  category: z.string().nullish(),
});
export type CreateSupplierInput = z.infer<typeof createSupplierInputSchema>;

export const updateSupplierInputSchema = createSupplierInputSchema.partial().extend({ id: z.string().uuid() });
export type UpdateSupplierInput = z.infer<typeof updateSupplierInputSchema>;

export const listSuppliersInputSchema = z.object({
  search: z.string().trim().optional(),
  includeInactive: z.boolean().default(false),
});
export type ListSuppliersInput = z.infer<typeof listSuppliersInputSchema>;
