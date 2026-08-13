import { z } from "zod";

/** Import en masse du catalogue de matières uniquement (code/nom/description/crédits) — les affectations
 * (coefficient/volumes horaires par contexte) restent saisies via le formulaire, voir MODULE-02.1 §6 point 3. */
export const subjectImportRowInputSchema = z.object({
  rowNumber: z.number().int().min(1),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  credits: z.string().nullish(),
});
export type SubjectImportRowInput = z.infer<typeof subjectImportRowInputSchema>;

export const validateSubjectImportInputSchema = z.object({
  rows: z.array(subjectImportRowInputSchema).min(1).max(2000),
});
export type ValidateSubjectImportInput = z.infer<typeof validateSubjectImportInputSchema>;

export const subjectImportRowDataSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullish(),
  credits: z.number().min(0).nullish(),
});
export type SubjectImportRowData = z.infer<typeof subjectImportRowDataSchema>;

export const subjectImportRowResultSchema = z.object({
  rowNumber: z.number().int(),
  data: subjectImportRowDataSchema.nullable(),
  errors: z.array(z.string()),
  duplicateWarnings: z.array(z.string()),
  isValid: z.boolean(),
});
export type SubjectImportRowResult = z.infer<typeof subjectImportRowResultSchema>;

export const validateSubjectImportOutputSchema = z.object({
  results: z.array(subjectImportRowResultSchema),
  validCount: z.number().int(),
  errorCount: z.number().int(),
  warningCount: z.number().int(),
});
export type ValidateSubjectImportOutput = z.infer<typeof validateSubjectImportOutputSchema>;

export const executeSubjectImportInputSchema = z.object({
  rows: z.array(z.object({ rowNumber: z.number().int(), data: subjectImportRowDataSchema })).min(1),
});
export type ExecuteSubjectImportInput = z.infer<typeof executeSubjectImportInputSchema>;

export const executeSubjectImportOutputSchema = z.object({
  importedCount: z.number().int(),
  failedRows: z.array(z.object({ rowNumber: z.number().int(), error: z.string() })),
});
export type ExecuteSubjectImportOutput = z.infer<typeof executeSubjectImportOutputSchema>;
