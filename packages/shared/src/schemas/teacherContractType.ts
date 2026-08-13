import { z } from "zod";

/** Référentiel configurable (CDI/CDD/Vacation/Prestation, extensible) — voir MODULE-05 §1.6. */
export const teacherContractTypeSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  isActive: z.boolean(),
});
export type TeacherContractTypeDto = z.infer<typeof teacherContractTypeSchema>;

export const createTeacherContractTypeInputSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
});
export type CreateTeacherContractTypeInput = z.infer<typeof createTeacherContractTypeInputSchema>;

export const updateTeacherContractTypeInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateTeacherContractTypeInput = z.infer<typeof updateTeacherContractTypeInputSchema>;

export const teacherContractTypeIdInputSchema = z.object({ id: z.string().uuid() });
