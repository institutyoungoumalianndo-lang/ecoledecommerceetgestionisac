import { z } from "zod";

export const feeReductionTypeSchema = z.enum([
  "BOURSE",
  "REMISE",
  "EXONERATION_PARTIELLE",
  "EXONERATION_TOTALE",
  "EXCEPTIONNELLE",
]);
export type FeeReductionType = z.infer<typeof feeReductionTypeSchema>;

export const feeReductionValueModeSchema = z.enum(["MONTANT", "POURCENTAGE"]);
export type FeeReductionValueMode = z.infer<typeof feeReductionValueModeSchema>;

export const feeReductionSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  studentMatricule: z.string(),
  studentName: z.string(),
  feeTypeId: z.string().uuid().nullable(),
  feeTypeName: z.string().nullable(),
  academicYearId: z.string().uuid(),
  academicYearLabel: z.string(),
  type: feeReductionTypeSchema,
  valueMode: feeReductionValueModeSchema,
  value: z.number(),
  reason: z.string(),
  grantedByAuthority: z.string(),
  recordedBy: z.string().uuid().nullable(),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().nullable(),
  isExpired: z.boolean(),
});
export type FeeReductionDto = z.infer<typeof feeReductionSchema>;

export const createFeeReductionInputSchema = z.object({
  studentId: z.string().uuid(),
  feeTypeId: z.string().uuid().nullish(),
  academicYearId: z.string().uuid(),
  type: feeReductionTypeSchema,
  valueMode: feeReductionValueModeSchema,
  value: z.number().positive(),
  reason: z.string().min(1),
  grantedByAuthority: z.string().min(1),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().nullish(),
});
export type CreateFeeReductionInput = z.infer<typeof createFeeReductionInputSchema>;

export const updateFeeReductionInputSchema = z.object({
  id: z.string().uuid(),
  value: z.number().positive().optional(),
  reason: z.string().min(1).optional(),
  validTo: z.coerce.date().nullish(),
});
export type UpdateFeeReductionInput = z.infer<typeof updateFeeReductionInputSchema>;

export const feeReductionIdInputSchema = z.object({ id: z.string().uuid() });

export const listFeeReductionsInputSchema = z.object({
  studentId: z.string().uuid().optional(),
  academicYearId: z.string().uuid().optional(),
  type: feeReductionTypeSchema.optional(),
});
export type ListFeeReductionsInput = z.infer<typeof listFeeReductionsInputSchema>;
