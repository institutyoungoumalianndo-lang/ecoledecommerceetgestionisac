import { z } from "zod";

/** Référentiel configurable (Directeur Général, Secrétaire, Comptable..., extensible) — voir MODULE-08 §1.2. */
export const employeeCategorySchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  isActive: z.boolean(),
});
export type EmployeeCategoryDto = z.infer<typeof employeeCategorySchema>;

export const createEmployeeCategoryInputSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
});
export type CreateEmployeeCategoryInput = z.infer<typeof createEmployeeCategoryInputSchema>;

export const updateEmployeeCategoryInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateEmployeeCategoryInput = z.infer<typeof updateEmployeeCategoryInputSchema>;

export const employeeCategoryIdInputSchema = z.object({ id: z.string().uuid() });
