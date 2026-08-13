import { z } from "zod";

export const studentDocumentTypeSchema = z.enum([
  "ACTE_NAISSANCE",
  "DIPLOME",
  "RELEVE",
  "PHOTO",
  "CARTE_IDENTITE_PASSEPORT",
  "CERTIFICAT_MEDICAL",
  "AUTRE",
]);
export type StudentDocumentType = z.infer<typeof studentDocumentTypeSchema>;

export const studentDocumentSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  type: studentDocumentTypeSchema,
  label: z.string().nullable(),
  filePath: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number().int(),
  uploadedAt: z.coerce.date(),
  uploadedBy: z.string().uuid().nullable(),
});
export type StudentDocumentDto = z.infer<typeof studentDocumentSchema>;

export const createStudentDocumentInputSchema = z.object({
  studentId: z.string().uuid(),
  type: studentDocumentTypeSchema,
  label: z.string().nullish(),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
});
export type CreateStudentDocumentInput = z.infer<typeof createStudentDocumentInputSchema>;

export const replaceStudentDocumentInputSchema = z.object({
  id: z.string().uuid(),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
});
export type ReplaceStudentDocumentInput = z.infer<typeof replaceStudentDocumentInputSchema>;

export const studentDocumentIdInputSchema = z.object({ id: z.string().uuid() });
export const listStudentDocumentsInputSchema = z.object({ studentId: z.string().uuid() });
