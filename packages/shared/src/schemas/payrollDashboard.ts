import { z } from "zod";

/** Tableau de bord de la paie (MODULE-08 §1.12/§11.18) — calculé à la volée depuis payroll_lines. */
export const payrollDashboardSchema = z.object({
  monthlyPayroll: z.number(),
  yearlyPayroll: z.number(),
  paidEmployeeCount: z.number().int(),
  pendingEmployeeCount: z.number().int(),
  teacherSalaries: z.number(),
  administrativeSalaries: z.number(),
  teachingHoursCost: z.number(),
  totalPrimes: z.number(),
  totalRetenues: z.number(),
  monthlyHistory: z.array(
    z.object({ year: z.number().int(), month: z.number().int(), label: z.string(), total: z.number() })
  ),
});
export type PayrollDashboard = z.infer<typeof payrollDashboardSchema>;

export const getPayrollDashboardInputSchema = z.object({
  year: z.number().int().optional(),
  month: z.number().int().optional(),
});
export type GetPayrollDashboardInput = z.infer<typeof getPayrollDashboardInputSchema>;
