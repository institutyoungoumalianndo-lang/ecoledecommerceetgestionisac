import { z } from "zod";

export const teacherDocumentTypeSchema = z.enum([
  "DIPLOME",
  "CV",
  "CONTRAT",
  "EVALUATION",
  "CARTE_IDENTITE_PASSEPORT",
  "AUTRE",
]);
export type TeacherDocumentType = z.infer<typeof teacherDocumentTypeSchema>;

/** Dossier numérique de l'enseignant — même modèle que StudentDocument (Module 4). */
export const teacherDocumentSchema = z.object({
  id: z.string().uuid(),
  teacherId: z.string().uuid(),
  type: teacherDocumentTypeSchema,
  label: z.string().nullable(),
  filePath: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  fileSizeBytes: z.number().int(),
  createdAt: z.coerce.date(),
  uploadedBy: z.string().uuid().nullable(),
});
export type TeacherDocumentDto = z.infer<typeof teacherDocumentSchema>;

export const createTeacherDocumentInputSchema = z.object({
  teacherId: z.string().uuid(),
  type: teacherDocumentTypeSchema,
  label: z.string().nullish(),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().positive(),
});
export type CreateTeacherDocumentInput = z.infer<typeof createTeacherDocumentInputSchema>;

export const teacherDocumentIdInputSchema = z.object({ id: z.string().uuid() });
export const listTeacherDocumentsInputSchema = z.object({ teacherId: z.string().uuid() });
