import { z } from "zod";
import { enrollmentStatusSchema } from "./studentEnrollment";

export const latePenaltyTypeSchema = z.enum(["AUCUNE", "MONTANT_FIXE", "POURCENTAGE"]);
export type LatePenaltyType = z.infer<typeof latePenaltyTypeSchema>;

export const feeInstallmentInputSchema = z.object({
  orderIndex: z.number().int().min(1),
  label: z.string().nullish(),
  dueDate: z.coerce.date(),
  amount: z.number().min(0),
});
export type FeeInstallmentInput = z.infer<typeof feeInstallmentInputSchema>;

export const feeInstallmentSchema = z.object({
  id: z.string().uuid(),
  orderIndex: z.number().int(),
  label: z.string().nullable(),
  dueDate: z.coerce.date(),
  amount: z.number(),
});
export type FeeInstallmentDto = z.infer<typeof feeInstallmentSchema>;

export const feeInstallmentPlanSchema = z.object({
  id: z.string().uuid(),
  feeTariffId: z.string().uuid(),
  installmentCount: z.number().int(),
  latePenaltyType: latePenaltyTypeSchema,
  latePenaltyValue: z.number().nullable(),
  gracePeriodDays: z.number().int(),
  installments: z.array(feeInstallmentSchema),
});
export type FeeInstallmentPlanDto = z.infer<typeof feeInstallmentPlanSchema>;

export const setFeeInstallmentPlanInputSchema = z.object({
  feeTariffId: z.string().uuid(),
  latePenaltyType: latePenaltyTypeSchema.default("AUCUNE"),
  latePenaltyValue: z.number().min(0).nullish(),
  gracePeriodDays: z.number().int().min(0).default(0),
  installments: z.array(feeInstallmentInputSchema).min(1),
});
export type SetFeeInstallmentPlanInput = z.infer<typeof setFeeInstallmentPlanInputSchema>;

export const feeTariffSchema = z.object({
  id: z.string().uuid(),
  feeTypeId: z.string().uuid(),
  feeTypeName: z.string(),
  academicYearId: z.string().uuid(),
  academicYearLabel: z.string(),
  filiereId: z.string().uuid().nullable(),
  filiereName: z.string().nullable(),
  levelId: z.string().uuid().nullable(),
  levelLabel: z.string().nullable(),
  classId: z.string().uuid().nullable(),
  className: z.string().nullable(),
  targetEnrollmentStatus: enrollmentStatusSchema.nullable(),
  amount: z.number(),
  isActive: z.boolean(),
  installmentPlan: feeInstallmentPlanSchema.nullable(),
});
export type FeeTariffDto = z.infer<typeof feeTariffSchema>;

export const createFeeTariffInputSchema = z.object({
  feeTypeId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  filiereId: z.string().uuid().nullish(),
  levelId: z.string().uuid().nullish(),
  classId: z.string().uuid().nullish(),
  targetEnrollmentStatus: enrollmentStatusSchema.nullish(),
  amount: z.number().min(0),
});
export type CreateFeeTariffInput = z.infer<typeof createFeeTariffInputSchema>;

export const updateFeeTariffInputSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().min(0),
  justification: z.string().min(1),
});
export type UpdateFeeTariffInput = z.infer<typeof updateFeeTariffInputSchema>;

export const feeTariffIdInputSchema = z.object({ id: z.string().uuid() });

export const feeTariffListFilterInputSchema = z.object({
  academicYearId: z.string().uuid().optional(),
  feeTypeId: z.string().uuid().optional(),
  filiereId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  includeInactive: z.boolean().default(false),
});
export type FeeTariffListFilterInput = z.infer<typeof feeTariffListFilterInputSchema>;
