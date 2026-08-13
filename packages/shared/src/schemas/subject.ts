import { z } from "zod";

export const subjectSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  credits: z.number().nullable(),
  isActive: z.boolean(),
});
export type SubjectDto = z.infer<typeof subjectSchema>;

export const createSubjectInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullish(),
  credits: z.number().min(0).nullish(),
});
export type CreateSubjectInput = z.infer<typeof createSubjectInputSchema>;

export const updateSubjectInputSchema = createSubjectInputSchema.partial().extend({ id: z.string().uuid() });
export type UpdateSubjectInput = z.infer<typeof updateSubjectInputSchema>;

export const subjectIdInputSchema = z.object({ id: z.string().uuid() });

export const listSubjectsInputSchema = z.object({
  search: z.string().trim().optional(),
  includeInactive: z.boolean().default(false),
});
export type ListSubjectsInput = z.infer<typeof listSubjectsInputSchema>;
