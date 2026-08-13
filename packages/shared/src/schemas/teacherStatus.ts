import { z } from "zod";

/** Référentiel configurable (Permanent/Vacataire/Contractuel/Visiteur, extensible) — voir MODULE-05 §1.6. */
export const teacherStatusSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  isActive: z.boolean(),
});
export type TeacherStatusDto = z.infer<typeof teacherStatusSchema>;

export const createTeacherStatusInputSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
});
export type CreateTeacherStatusInput = z.infer<typeof createTeacherStatusInputSchema>;

export const updateTeacherStatusInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateTeacherStatusInput = z.infer<typeof updateTeacherStatusInputSchema>;

export const teacherStatusIdInputSchema = z.object({ id: z.string().uuid() });
