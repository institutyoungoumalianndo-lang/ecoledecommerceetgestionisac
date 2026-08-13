import { z } from "zod";

/** Diagnostic pédagogique (MODULE-02.1 §1.5/§9.11) — informatif, ne bloque aucune opération. */
export const pedagogicalIssueTypeSchema = z.enum([
  "MATIERE_OBLIGATOIRE_MANQUANTE",
  "VOLUME_HORAIRE_INCOHERENT",
  "COEFFICIENT_MANQUANT",
]);
export type PedagogicalIssueType = z.infer<typeof pedagogicalIssueTypeSchema>;

export const pedagogicalIssueSchema = z.object({
  periodId: z.string().uuid(),
  periodLabel: z.string(),
  type: pedagogicalIssueTypeSchema,
  message: z.string(),
  subjectOfferingId: z.string().uuid().nullable(),
  subjectName: z.string().nullable(),
});
export type PedagogicalIssue = z.infer<typeof pedagogicalIssueSchema>;

export const validateClassPedagogyInputSchema = z.object({ classId: z.string().uuid() });
export type ValidateClassPedagogyInput = z.infer<typeof validateClassPedagogyInputSchema>;

export const pedagogicalDiagnosticResultSchema = z.object({
  classId: z.string().uuid(),
  className: z.string(),
  filiereName: z.string(),
  levelName: z.string(),
  academicYearLabel: z.string(),
  issues: z.array(pedagogicalIssueSchema),
  isValid: z.boolean(),
});
export type PedagogicalDiagnosticResult = z.infer<typeof pedagogicalDiagnosticResultSchema>;
