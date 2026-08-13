import { z } from "zod";

/** Rapport de performance pédagogique (MODULE-10 §1.1) — lit Module 6, jamais recalculé indépendamment. */
export const pedagogicalPerformanceInputSchema = z.object({
  academicYearId: z.string().uuid(),
  periodId: z.string().uuid().optional(),
  filiereId: z.string().uuid().optional(),
  levelId: z.string().uuid().optional(),
});
export type PedagogicalPerformanceInput = z.infer<typeof pedagogicalPerformanceInputSchema>;

export const pedagogicalPerformanceGroupSchema = z.object({
  label: z.string(),
  studentCount: z.number(),
  averageGrade: z.number().nullable(),
  successRate: z.number().nullable(),
});
export type PedagogicalPerformanceGroupDto = z.infer<typeof pedagogicalPerformanceGroupSchema>;

export const pedagogicalPerformanceReportSchema = z.object({
  overall: pedagogicalPerformanceGroupSchema,
  byFiliere: z.array(pedagogicalPerformanceGroupSchema),
  byLevel: z.array(pedagogicalPerformanceGroupSchema),
});
export type PedagogicalPerformanceReportDto = z.infer<typeof pedagogicalPerformanceReportSchema>;

/** Tendances financières/RH sur période choisie (MODULE-10 §1.2) — lit Module 4.3/7/8, jamais dupliqué. */
export const financialTrendsInputSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
export type FinancialTrendsInput = z.infer<typeof financialTrendsInputSchema>;

export const financialTrendPointSchema = z.object({
  monthLabel: z.string(),
  revenue: z.number(),
  expenses: z.number(),
  payrollCost: z.number(),
});
export type FinancialTrendPointDto = z.infer<typeof financialTrendPointSchema>;

export const financialTrendsReportSchema = z.object({
  points: z.array(financialTrendPointSchema),
  totalRevenue: z.number(),
  totalExpenses: z.number(),
  totalPayrollCost: z.number(),
  costPerStudent: z.number().nullable(),
  feeRecoveryRate: z.number().nullable(),
});
export type FinancialTrendsReportDto = z.infer<typeof financialTrendsReportSchema>;
