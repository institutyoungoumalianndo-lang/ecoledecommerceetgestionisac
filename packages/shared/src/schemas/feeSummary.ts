import { z } from "zod";
import { feeReductionSchema } from "./feeReduction";

export const studentFeeLineInstallmentSchema = z.object({
  id: z.string().uuid(),
  orderIndex: z.number().int(),
  label: z.string().nullable(),
  dueDate: z.coerce.date(),
  amount: z.number(),
  paidAmount: z.number(),
  remainingAmount: z.number(),
});
export type StudentFeeLineInstallment = z.infer<typeof studentFeeLineInstallmentSchema>;

export const studentFeeLineSchema = z.object({
  feeTypeId: z.string().uuid(),
  feeTypeName: z.string(),
  /** Code du type de frais (`FeeType.code`) — permet d'isoler la ligne Scolarité sans dépendre du
   * libellé, modifiable par l'établissement (voir feeSummaryService.ts, SCOLARITE_FEE_TYPE_CODE). */
  feeTypeCode: z.string(),
  tariffAmount: z.number().nullable(),
  reductions: z.array(feeReductionSchema),
  reductionAmount: z.number(),
  netAmount: z.number().nullable(),
  paidAmount: z.number(),
  remainingAmount: z.number().nullable(),
  surplusAmount: z.number(),
  installments: z.array(studentFeeLineInstallmentSchema),
});
export type StudentFeeLine = z.infer<typeof studentFeeLineSchema>;

/**
 * Coût de la scolarité d'un étudiant (MODULE-04.2 §1.7/§6.6). Depuis le
 * Module 4.3, "payé"/"reste à payer" sont calculés à partir des paiements
 * réellement enregistrés (jamais recalculés/dupliqués depuis les tarifs).
 */
export const studentFeeSummarySchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  academicYearLabel: z.string(),
  lines: z.array(studentFeeLineSchema),
  totalTariff: z.number(),
  totalReductions: z.number(),
  totalNet: z.number(),
  totalPaid: z.number(),
  totalRemaining: z.number(),
  totalSurplus: z.number(),
});
export type StudentFeeSummary = z.infer<typeof studentFeeSummarySchema>;

export const getStudentFeeSummaryInputSchema = z.object({
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid().optional(),
});
export type GetStudentFeeSummaryInput = z.infer<typeof getStudentFeeSummaryInputSchema>;

export const feeDashboardInputSchema = z.object({ academicYearId: z.string().uuid().optional() });
export type FeeDashboardInput = z.infer<typeof feeDashboardInputSchema>;

export const feeDashboardSchema = z.object({
  totalFeeTypes: z.number().int(),
  totalTariffs: z.number().int(),
  averageTariffAmount: z.number(),
  byFeeType: z.array(
    z.object({ feeTypeId: z.string().uuid(), feeTypeName: z.string(), tariffCount: z.number().int() })
  ),
});
export type FeeDashboard = z.infer<typeof feeDashboardSchema>;
