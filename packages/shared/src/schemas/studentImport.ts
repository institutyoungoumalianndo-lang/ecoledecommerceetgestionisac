import { z } from "zod";
import { genderSchema, maritalStatusSchema } from "./student";

/**
 * Le fichier Excel/CSV est lu et mappé côté client (apps/desktop) — seules
 * des données JSON typées transitent par tRPC, jamais de fichier binaire
 * (cohérent avec ADR-012 : les fichiers passent par la route REST dédiée,
 * pas par tRPC).
 */
export const studentImportRowInputSchema = z.object({
  rowNumber: z.number().int().min(1),
  lastName: z.string(),
  firstName: z.string(),
  gender: z.string(),
  birthDate: z.string().nullish(),
  birthPlace: z.string().nullish(),
  nationality: z.string().nullish(),
  phonePrimary: z.string().nullish(),
  phoneSecondary: z.string().nullish(),
  email: z.string().nullish(),
  maritalStatus: z.string().nullish(),
  classCode: z.string().nullish(),
});
export type StudentImportRowInput = z.infer<typeof studentImportRowInputSchema>;

export const validateStudentImportInputSchema = z.object({
  targetClassId: z.string().uuid(),
  rows: z.array(studentImportRowInputSchema).min(1).max(2000),
});
export type ValidateStudentImportInput = z.infer<typeof validateStudentImportInputSchema>;

export const studentImportRowDataSchema = z.object({
  lastName: z.string().min(1),
  firstName: z.string().min(1),
  gender: genderSchema,
  birthDate: z.coerce.date().nullish(),
  birthPlace: z.string().nullish(),
  nationality: z.string().nullish(),
  phonePrimary: z.string().nullish(),
  phoneSecondary: z.string().nullish(),
  email: z.string().nullish(),
  maritalStatus: maritalStatusSchema,
  classId: z.string().uuid(),
});
export type StudentImportRowData = z.infer<typeof studentImportRowDataSchema>;

export const studentImportRowResultSchema = z.object({
  rowNumber: z.number().int(),
  data: studentImportRowDataSchema.nullable(),
  errors: z.array(z.string()),
  duplicateWarnings: z.array(z.string()),
  isValid: z.boolean(),
});
export type StudentImportRowResult = z.infer<typeof studentImportRowResultSchema>;

export const validateStudentImportOutputSchema = z.object({
  results: z.array(studentImportRowResultSchema),
  validCount: z.number().int(),
  errorCount: z.number().int(),
  warningCount: z.number().int(),
});
export type ValidateStudentImportOutput = z.infer<typeof validateStudentImportOutputSchema>;

export const executeStudentImportInputSchema = z.object({
  rows: z.array(z.object({ rowNumber: z.number().int(), data: studentImportRowDataSchema })).min(1),
});
export type ExecuteStudentImportInput = z.infer<typeof executeStudentImportInputSchema>;

export const executeStudentImportOutputSchema = z.object({
  importedCount: z.number().int(),
  failedRows: z.array(z.object({ rowNumber: z.number().int(), error: z.string() })),
});
export type ExecuteStudentImportOutput = z.infer<typeof executeStudentImportOutputSchema>;
