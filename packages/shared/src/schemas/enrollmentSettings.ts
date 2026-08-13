import { z } from "zod";
import { studentDocumentTypeSchema } from "./studentDocument";

export const enrollmentSettingsSchema = z.object({
  id: z.string().uuid(),
  enforceClassCapacity: z.boolean(),
});
export type EnrollmentSettingsDto = z.infer<typeof enrollmentSettingsSchema>;

export const updateEnrollmentSettingsInputSchema = z.object({
  enforceClassCapacity: z.boolean(),
});
export type UpdateEnrollmentSettingsInput = z.infer<typeof updateEnrollmentSettingsInputSchema>;

export const enrollmentDocumentRequirementSchema = z.object({
  id: z.string().uuid(),
  documentType: studentDocumentTypeSchema,
  isRequired: z.boolean(),
});
export type EnrollmentDocumentRequirementDto = z.infer<typeof enrollmentDocumentRequirementSchema>;

export const setEnrollmentDocumentRequirementInputSchema = z.object({
  documentType: studentDocumentTypeSchema,
  isRequired: z.boolean(),
});
export type SetEnrollmentDocumentRequirementInput = z.infer<typeof setEnrollmentDocumentRequirementInputSchema>;
