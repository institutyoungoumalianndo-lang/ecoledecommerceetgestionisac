import { z } from "zod";
import { studentFeeSummarySchema } from "./feeSummary";

export const paymentTransactionStatusSchema = z.enum(["VALIDE", "ANNULE"]);
export type PaymentTransactionStatus = z.infer<typeof paymentTransactionStatusSchema>;

export const paymentAllocationInputSchema = z.object({
  feeTypeId: z.string().uuid(),
  feeInstallmentId: z.string().uuid().nullish(),
  amount: z.number().positive(),
});
export type PaymentAllocationInput = z.infer<typeof paymentAllocationInputSchema>;

export const paymentAllocationSchema = z.object({
  id: z.string().uuid(),
  feeTypeId: z.string().uuid(),
  feeTypeName: z.string(),
  feeInstallmentId: z.string().uuid().nullable(),
  feeInstallmentLabel: z.string().nullable(),
  amount: z.number(),
});
export type PaymentAllocationDto = z.infer<typeof paymentAllocationSchema>;

export const paymentSchema = z.object({
  id: z.string().uuid(),
  receiptNumber: z.string(),
  studentId: z.string().uuid(),
  studentMatricule: z.string(),
  studentName: z.string(),
  enrollmentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  academicYearLabel: z.string(),
  filiereName: z.string(),
  levelLabel: z.string(),
  className: z.string(),
  cashRegisterSessionId: z.string().uuid(),
  cashRegisterName: z.string(),
  paymentMethodId: z.string().uuid(),
  paymentMethodLabel: z.string(),
  amount: z.number(),
  recordedBy: z.string().uuid(),
  recordedByName: z.string(),
  status: paymentTransactionStatusSchema,
  cancelledAt: z.coerce.date().nullable(),
  cancelledReason: z.string().nullable(),
  cancelledByName: z.string().nullable(),
  verificationCode: z.string(),
  externalReference: z.string().nullable(),
  createdAt: z.coerce.date(),
  allocations: z.array(paymentAllocationSchema),
});
export type PaymentDto = z.infer<typeof paymentSchema>;

export const createPaymentInputSchema = z.object({
  studentId: z.string().uuid(),
  cashRegisterSessionId: z.string().uuid(),
  paymentMethodId: z.string().uuid(),
  allocations: z.array(paymentAllocationInputSchema).min(1),
  externalReference: z.string().nullish(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

export const cancelPaymentInputSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().min(1),
});
export type CancelPaymentInput = z.infer<typeof cancelPaymentInputSchema>;

export const paymentIdInputSchema = z.object({ id: z.string().uuid() });

export const listPaymentsInputSchema = z.object({
  search: z.string().trim().optional(),
  studentId: z.string().uuid().optional(),
  recordedBy: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
  feeTypeId: z.string().uuid().optional(),
  status: paymentTransactionStatusSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(20),
  sortBy: z.enum(["createdAt", "amount", "receiptNumber"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});
export type ListPaymentsInput = z.infer<typeof listPaymentsInputSchema>;

export const listPaymentsResultSchema = z.object({
  items: z.array(paymentSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type ListPaymentsResult = z.infer<typeof listPaymentsResultSchema>;

/** Contexte d'encaissement (MODULE-04.3 §1.2/§4) : fiche étudiant + coût de scolarité, pour l'écran d'encaissement. */
export const paymentContextSchema = z.object({
  studentId: z.string().uuid(),
  studentMatricule: z.string(),
  studentName: z.string(),
  studentPhotoPath: z.string().nullable(),
  studentPhonePrimary: z.string().nullable(),
  enrollmentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  academicYearLabel: z.string(),
  filiereName: z.string(),
  levelLabel: z.string(),
  className: z.string(),
  feeSummary: studentFeeSummarySchema,
});
export type PaymentContext = z.infer<typeof paymentContextSchema>;

export const getPaymentContextInputSchema = z.object({ studentId: z.string().uuid() });

/** Tableau de bord des paiements (MODULE-04.3 §7.9) — aujourd'hui/semaine/mois, répartition par mode. */
export const paymentDashboardSchema = z.object({
  totalToday: z.number(),
  totalWeek: z.number(),
  totalMonth: z.number(),
  paymentCountToday: z.number().int(),
  totalOutstanding: z.number(),
  byPaymentMethod: z.array(
    z.object({ paymentMethodId: z.string().uuid(), paymentMethodLabel: z.string(), total: z.number(), count: z.number().int() })
  ),
});
export type PaymentDashboard = z.infer<typeof paymentDashboardSchema>;
