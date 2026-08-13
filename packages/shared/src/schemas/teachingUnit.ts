import { z } from "zod";

/** Total des crédits jamais stocké — toujours calculé depuis les subject_offerings rattachées (MODULE-02.1 §1.3). */
export const teachingUnitSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  responsibleUserId: z.string().uuid().nullable(),
  responsibleUserName: z.string().nullable(),
  totalCredits: z.number(),
  subjectCount: z.number().int(),
  isActive: z.boolean(),
});
export type TeachingUnitDto = z.infer<typeof teachingUnitSchema>;

export const createTeachingUnitInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullish(),
  responsibleUserId: z.string().uuid().nullish(),
});
export type CreateTeachingUnitInput = z.infer<typeof createTeachingUnitInputSchema>;

export const updateTeachingUnitInputSchema = createTeachingUnitInputSchema
  .partial()
  .extend({ id: z.string().uuid() });
export type UpdateTeachingUnitInput = z.infer<typeof updateTeachingUnitInputSchema>;

export const teachingUnitIdInputSchema = z.object({ id: z.string().uuid() });
