import { z } from "zod";

export const enrollmentRegimeSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  isActive: z.boolean(),
});
export type EnrollmentRegimeDto = z.infer<typeof enrollmentRegimeSchema>;

export const createEnrollmentRegimeInputSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
});
export type CreateEnrollmentRegimeInput = z.infer<typeof createEnrollmentRegimeInputSchema>;

export const updateEnrollmentRegimeInputSchema = createEnrollmentRegimeInputSchema
  .partial()
  .extend({ id: z.string().uuid() });
export type UpdateEnrollmentRegimeInput = z.infer<typeof updateEnrollmentRegimeInputSchema>;

export const enrollmentRegimeIdInputSchema = z.object({ id: z.string().uuid() });
