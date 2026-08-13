import { z } from "zod";
import { enrollmentStatusSchema, paymentStatusSchema } from "./studentEnrollment";
import { studentDocumentTypeSchema } from "./studentDocument";

/**
 * "Nouvelle inscription" (étudiant existant) et "réinscription" sont la même
 * opération sous-jacente — créer une ligne student_enrollments pour une
 * nouvelle année (voir MODULE-04.1 §1.2). La création d'un nouvel étudiant
 * reste gérée par students.create (Module 4), désormais enrichi de regimeId.
 */
export const createEnrollmentInputSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  // Requis dans l'assistant (UI), mais optionnel ici pour rester utilisable
  // par l'import en masse quand le fichier ne précise pas de régime par ligne.
  regimeId: z.string().uuid().nullish(),
  status: enrollmentStatusSchema.default("NOUVEAU"),
  enrollmentDate: z.coerce.date().nullish(),
  feeAmountExpected: z.number().min(0).nullish(),
});
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentInputSchema>;

export const checkEnrollmentConditionsInputSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
});
export type CheckEnrollmentConditionsInput = z.infer<typeof checkEnrollmentConditionsInputSchema>;

export const enrollmentConditionsResultSchema = z.object({
  alreadyEnrolledThisYear: z.boolean(),
  capacityEnforced: z.boolean(),
  capacityReached: z.boolean(),
  classCapacity: z.number().int().nullable(),
  currentClassHeadcount: z.number().int(),
  missingRequiredDocumentTypes: z.array(studentDocumentTypeSchema),
});
export type EnrollmentConditionsResult = z.infer<typeof enrollmentConditionsResultSchema>;

export const cancelEnrollmentInputSchema = z.object({
  enrollmentId: z.string().uuid(),
  reason: z.string().min(1),
});
export type CancelEnrollmentInput = z.infer<typeof cancelEnrollmentInputSchema>;

export const enrollmentIdInputSchema = z.object({ id: z.string().uuid() });

// --- Tableau transverse des inscriptions (§5.9) -----------------------------

export const enrollmentListRowSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  matricule: z.string(),
  studentLastName: z.string(),
  studentFirstName: z.string(),
  academicYearId: z.string().uuid(),
  academicYearLabel: z.string(),
  filiereName: z.string(),
  levelLabel: z.string(),
  className: z.string(),
  regimeLabel: z.string().nullable(),
  registrationNumber: z.string().nullable(),
  status: enrollmentStatusSchema,
  paymentStatus: paymentStatusSchema.nullable(),
  isCancelled: z.boolean(),
  enrollmentDate: z.coerce.date(),
});
export type EnrollmentListRow = z.infer<typeof enrollmentListRowSchema>;

export const enrollmentListFilterInputSchema = z.object({
  search: z.string().trim().optional(),
  academicYearId: z.string().uuid().optional(),
  filiereId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  status: enrollmentStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  includeCancelled: z.boolean().default(false),
  sortBy: z.enum(["enrollmentDate", "studentLastName", "matricule"]).default("enrollmentDate"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(200).default(50),
});
export type EnrollmentListFilterInput = z.infer<typeof enrollmentListFilterInputSchema>;

export const enrollmentListPageSchema = z.object({
  rows: z.array(enrollmentListRowSchema),
  total: z.number().int(),
});
export type EnrollmentListPage = z.infer<typeof enrollmentListPageSchema>;

// --- Tableau de bord (§5.8) --------------------------------------------------

export const enrollmentDashboardInputSchema = z.object({ academicYearId: z.string().uuid().optional() });
export type EnrollmentDashboardInput = z.infer<typeof enrollmentDashboardInputSchema>;

export const enrollmentDashboardSchema = z.object({
  newEnrollmentsCount: z.number().int(),
  reenrollmentsCount: z.number().int(),
  byClass: z.array(z.object({ classId: z.string().uuid(), className: z.string(), count: z.number().int() })),
  byFiliere: z.array(z.object({ filiereId: z.string().uuid(), filiereName: z.string(), count: z.number().int() })),
  byLevel: z.array(z.object({ levelId: z.string().uuid(), levelLabel: z.string(), count: z.number().int() })),
  byGender: z.object({ M: z.number().int(), F: z.number().int() }),
});
export type EnrollmentDashboard = z.infer<typeof enrollmentDashboardSchema>;

// --- Import en masse (§5.11) -------------------------------------------------

export const enrollmentImportRowInputSchema = z.object({
  rowNumber: z.number().int().min(1),
  matricule: z.string(),
  classCode: z.string().nullish(),
  regimeCode: z.string().nullish(),
  status: z.string().nullish(),
});
export type EnrollmentImportRowInput = z.infer<typeof enrollmentImportRowInputSchema>;

export const validateEnrollmentImportInputSchema = z.object({
  targetClassId: z.string().uuid(),
  rows: z.array(enrollmentImportRowInputSchema).min(1).max(2000),
});
export type ValidateEnrollmentImportInput = z.infer<typeof validateEnrollmentImportInputSchema>;

export const enrollmentImportRowDataSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  regimeId: z.string().uuid().nullable(),
  status: enrollmentStatusSchema,
});
export type EnrollmentImportRowData = z.infer<typeof enrollmentImportRowDataSchema>;

export const enrollmentImportRowResultSchema = z.object({
  rowNumber: z.number().int(),
  data: enrollmentImportRowDataSchema.nullable(),
  errors: z.array(z.string()),
  duplicateWarnings: z.array(z.string()),
  isValid: z.boolean(),
});
export type EnrollmentImportRowResult = z.infer<typeof enrollmentImportRowResultSchema>;

export const validateEnrollmentImportOutputSchema = z.object({
  results: z.array(enrollmentImportRowResultSchema),
  validCount: z.number().int(),
  errorCount: z.number().int(),
  warningCount: z.number().int(),
});
export type ValidateEnrollmentImportOutput = z.infer<typeof validateEnrollmentImportOutputSchema>;

export const executeEnrollmentImportInputSchema = z.object({
  rows: z.array(z.object({ rowNumber: z.number().int(), data: enrollmentImportRowDataSchema })).min(1),
});
export type ExecuteEnrollmentImportInput = z.infer<typeof executeEnrollmentImportInputSchema>;

export const executeEnrollmentImportOutputSchema = z.object({
  importedCount: z.number().int(),
  failedRows: z.array(z.object({ rowNumber: z.number().int(), error: z.string() })),
});
export type ExecuteEnrollmentImportOutput = z.infer<typeof executeEnrollmentImportOutputSchema>;
