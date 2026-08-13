import { z } from "zod";

/** Cycle de vie de la carte (MODULE-09.1 §2/§3) — distinct de GeneratedDocument, qui est un simple journal immuable. */
export const studentCardStatusSchema = z.enum(["ACTIVE", "CANCELLED", "EXPIRED", "SUPERSEDED"]);
export type StudentCardStatus = z.infer<typeof studentCardStatusSchema>;

export const studentCardSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  studentMatricule: z.string(),
  cardNumber: z.string(),
  verificationCode: z.string(),
  status: studentCardStatusSchema,
  issuedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  cancelledAt: z.coerce.date().nullable(),
  cancelledByName: z.string().nullable(),
  cancelledReason: z.string().nullable(),
  supersededByCardId: z.string().uuid().nullable(),
  filePath: z.string(),
  generatedByName: z.string().nullable(),
  createdAt: z.coerce.date(),
  reprintCount: z.number().int(),
});
export type StudentCardDto = z.infer<typeof studentCardSchema>;

export const studentCardReprintSchema = z.object({
  id: z.string().uuid(),
  studentCardId: z.string().uuid(),
  reprintedAt: z.coerce.date(),
  reprintedByName: z.string().nullable(),
  reason: z.string().nullable(),
});
export type StudentCardReprintDto = z.infer<typeof studentCardReprintSchema>;

export const generateStudentCardInputSchema = z.object({ studentId: z.string().uuid() });
export type GenerateStudentCardInput = z.infer<typeof generateStudentCardInputSchema>;

export const cancelStudentCardInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1, "Le motif d'annulation est requis."),
});
export type CancelStudentCardInput = z.infer<typeof cancelStudentCardInputSchema>;

/** Réémission (MODULE-09.1 §3 règle 2) : bascule l'ancienne carte active à SUPERSEDED, en crée une nouvelle. */
export const reissueStudentCardInputSchema = z.object({
  studentId: z.string().uuid(),
  reason: z.string().optional(),
});
export type ReissueStudentCardInput = z.infer<typeof reissueStudentCardInputSchema>;

/** Réimpression (MODULE-09.1 §3 règle 4) : retélécharge strictement le PDF déjà archivé, jamais un nouveau numéro. */
export const reprintStudentCardInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
});
export type ReprintStudentCardInput = z.infer<typeof reprintStudentCardInputSchema>;

export const listStudentCardsInputSchema = z.object({
  studentId: z.string().uuid().optional(),
  status: studentCardStatusSchema.optional(),
  search: z.string().optional(),
});
export type ListStudentCardsInput = z.infer<typeof listStudentCardsInputSchema>;

/** Génération par lot (MODULE-09.1 §6 point 5) — une page par étudiant, un StudentCard individuel par étudiant. */
export const generateStudentCardsBatchInputSchema = z.object({
  academicYearId: z.string().uuid(),
  classId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  filiereId: z.string().uuid().optional(),
});
export type GenerateStudentCardsBatchInput = z.infer<typeof generateStudentCardsBatchInputSchema>;

export const generateStudentCardsBatchResultSchema = z.object({
  batchFilePath: z.string(),
  generatedCount: z.number().int(),
  failed: z.array(z.object({ studentId: z.string().uuid(), studentName: z.string(), error: z.string() })),
});
export type GenerateStudentCardsBatchResult = z.infer<typeof generateStudentCardsBatchResultSchema>;

export const studentCardTemplateSchema = z.object({
  id: z.string().uuid(),
  showGuineaStripes: z.boolean(),
  backgroundColor: z.string(),
  legalText: z.string(),
  personalUseText: z.string(),
  fontFamily: z.string(),
});
export type StudentCardTemplateDto = z.infer<typeof studentCardTemplateSchema>;

export const updateStudentCardTemplateInputSchema = studentCardTemplateSchema.omit({ id: true }).partial();
export type UpdateStudentCardTemplateInput = z.infer<typeof updateStudentCardTemplateInputSchema>;
