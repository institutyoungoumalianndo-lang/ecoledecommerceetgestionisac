import { prisma } from "@isac-erp/db";
import type { FinancialTrendPointDto, FinancialTrendsInput, FinancialTrendsReportDto } from "@isac-erp/shared";
import { endOf, startOfMonth, sumLinesByAccountType } from "./financialReportService.js";
import { getAllActiveStudentFeeSummaries } from "./feeSummaryService.js";

/**
 * Taux de recouvrement des frais de scolarité — agrège `getAllActiveStudentFeeSummaries` (Module
 * 4.2/4.3) sur l'année universitaire active, jamais recalculé indépendamment. Scope volontairement
 * l'année active plutôt que la plage de dates du rapport : les tarifs de frais sont définis par année
 * universitaire, pas par plage de dates arbitraire.
 */
async function computeFeeRecoveryRate(): Promise<number | null> {
  const activeYear = await prisma.academicYear.findFirst({ where: { isActive: true } });
  if (!activeYear) return null;

  const summaries = await getAllActiveStudentFeeSummaries(activeYear.id);
  if (summaries.length === 0) return null;

  const totalNet = summaries.reduce((sum, s) => sum + s.totalNet, 0);
  const totalPaid = summaries.reduce((sum, s) => sum + s.totalPaid, 0);
  return totalNet > 0 ? (totalPaid / totalNet) * 100 : null;
}

/**
 * Tendances financières/RH sur période choisie (MODULE-10 §1.2) — un point par mois entre
 * `startDate` et `endDate`. Réutilise `sumLinesByAccountType` (Module 7, `financialReportService.ts`)
 * et la même somme `payrollLine.netSalary` que `payrollDashboardService.ts` (Module 8) — jamais de
 * calcul dupliqué.
 */
export async function getFinancialTrendsReport(input: FinancialTrendsInput): Promise<FinancialTrendsReportDto> {
  const points: FinancialTrendPointDto[] = [];
  let cursor = startOfMonth(input.startDate);
  const end = input.endDate;

  while (cursor <= end) {
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOf("month", monthStart);
    const period = await prisma.payPeriod.findUnique({
      where: { year_month: { year: monthStart.getFullYear(), month: monthStart.getMonth() + 1 } },
    });
    const [revenue, expenses, payrollLines] = await Promise.all([
      sumLinesByAccountType("PRODUIT", "credit", monthStart, monthEnd),
      sumLinesByAccountType("CHARGE", "debit", monthStart, monthEnd),
      period ? prisma.payrollLine.findMany({ where: { payPeriodId: period.id, status: "VALIDEE" } }) : Promise.resolve([]),
    ]);
    const payrollCost = payrollLines.reduce((sum, l) => sum + Number(l.netSalary), 0);

    points.push({
      monthLabel: monthStart.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
      revenue,
      expenses,
      payrollCost,
    });

    cursor = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  }

  const totalRevenue = points.reduce((sum, p) => sum + p.revenue, 0);
  const totalExpenses = points.reduce((sum, p) => sum + p.expenses, 0);
  const totalPayrollCost = points.reduce((sum, p) => sum + p.payrollCost, 0);

  const activeStudentCount = await prisma.student.count({ where: { archivedAt: null } });
  const costPerStudent = activeStudentCount > 0 ? totalExpenses / activeStudentCount : null;

  return {
    points,
    totalRevenue,
    totalExpenses,
    totalPayrollCost,
    costPerStudent,
    feeRecoveryRate: await computeFeeRecoveryRate(),
  };
}
