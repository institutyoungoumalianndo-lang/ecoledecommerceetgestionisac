import { z } from "zod";

/** Formation suivie — donnée structurée, distincte d'un simple changement journalisé dans audit_log (MODULE-05 §1.5). */
export const teacherTrainingSchema = z.object({
  id: z.string().uuid(),
  teacherId: z.string().uuid(),
  title: z.string(),
  institution: z.string().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable(),
  certificatePath: z.string().nullable(),
});
export type TeacherTrainingDto = z.infer<typeof teacherTrainingSchema>;

export const createTeacherTrainingInputSchema = z.object({
  teacherId: z.string().uuid(),
  title: z.string().min(1),
  institution: z.string().nullish(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullish(),
  certificatePath: z.string().nullish(),
});
export type CreateTeacherTrainingInput = z.infer<typeof createTeacherTrainingInputSchema>;

export const updateTeacherTrainingInputSchema = createTeacherTrainingInputSchema
  .omit({ teacherId: true })
  .partial()
  .extend({ id: z.string().uuid() });
export type UpdateTeacherTrainingInput = z.infer<typeof updateTeacherTrainingInputSchema>;

export const teacherTrainingIdInputSchema = z.object({ id: z.string().uuid() });
export const listTeacherTrainingsInputSchema = z.object({ teacherId: z.string().uuid() });
