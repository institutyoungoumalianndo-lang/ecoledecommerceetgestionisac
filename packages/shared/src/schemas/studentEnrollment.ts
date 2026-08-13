import { z } from "zod";

export const enrollmentStatusSchema = z.enum(["NOUVEAU", "ANCIEN", "REDOUBLANT", "TRANSFERT", "REPRISE"]);
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>;

export const enrollmentDecisionSchema = z.enum(["EN_COURS", "ADMIS", "REDOUBLANT", "AJOURNE", "ABANDON"]);
export type EnrollmentDecision = z.infer<typeof enrollmentDecisionSchema>;
export const paymentStatusSchema = z.enum(["NON_PAYE", "PARTIELLEMENT_PAYE", "TOTALEMENT_PAYE"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const studentEnrollmentSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  academicYearLabel: z.string(),
  classId: z.string().uuid(),
  className: z.string(),
  filiereId: z.string().uuid(),
  filiereName: z.string(),
  levelId: z.string().uuid(),
  levelLabel: z.string(),
  status: enrollmentStatusSchema,
  decision: enrollmentDecisionSchema,
  annualAverage: z.number().nullable(),
  mention: z.string().nullable(),
  enrollmentDate: z.coerce.date(),
  isCurrentYear: z.boolean(),
  isEditable: z.boolean(),
  // Module 4.1 — Inscriptions et réinscriptions
  regimeId: z.string().uuid().nullable(),
  regimeLabel: z.string().nullable(),
  registrationNumber: z.string().nullable(),
  feeAmountExpected: z.number().nullable(),
  paymentStatus: paymentStatusSchema.nullable(),
  cancelledAt: z.coerce.date().nullable(),
  cancelledReason: z.string().nullable(),
});
export type StudentEnrollmentDto = z.infer<typeof studentEnrollmentSchema>;

export const listStudentEnrollmentsInputSchema = z.object({ studentId: z.string().uuid() });

export const changeStudentClassInputSchema = z.object({
  studentId: z.string().uuid(),
  newClassId: z.string().uuid(),
  status: enrollmentStatusSchema.optional(),
});
export type ChangeStudentClassInput = z.infer<typeof changeStudentClassInputSchema>;

export const setEnrollmentDecisionInputSchema = z.object({
  enrollmentId: z.string().uuid(),
  decision: enrollmentDecisionSchema,
  annualAverage: z.number().min(0).max(20).nullish(),
  mention: z.string().nullish(),
});
export type SetEnrollmentDecisionInput = z.infer<typeof setEnrollmentDecisionInputSchema>;

export const updateEnrollmentPaymentInputSchema = z.object({
  enrollmentId: z.string().uuid(),
  feeAmountExpected: z.number().min(0).nullish(),
  paymentStatus: paymentStatusSchema.nullish(),
});
export type UpdateEnrollmentPaymentInput = z.infer<typeof updateEnrollmentPaymentInputSchema>;
