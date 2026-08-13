import { prisma } from "@isac-erp/db";
import type { GetPayrollDashboardInput, PayrollDashboard } from "@isac-erp/shared";
import { payPeriodLabel } from "./payPeriodService.js";

/** Tableau de bord de la paie (MODULE-08 §1.12/§11.18) — calculé à la volée depuis payroll_lines. */
export async function getPayrollDashboard(input: GetPayrollDashboardInput): Promise<PayrollDashboard> {
  const today = new Date();
  const year = input.year ?? today.getFullYear();
  const month = input.month ?? today.getMonth() + 1;

  const period = await prisma.payPeriod.findUnique({ where: { year_month: { year, month } } });

  const [periodLines, yearLines, activeEmployeeCount, history] = await Promise.all([
    period
      ? prisma.payrollLine.findMany({
          where: { payPeriodId: period.id, status: "VALIDEE" },
          include: { employee: true },
        })
      : Promise.resolve([]),
    prisma.payrollLine.findMany({
      where: { status: "VALIDEE", payPeriod: { year } },
      include: { employee: true },
    }),
    prisma.employee.count({ where: { archivedAt: null } }),
    prisma.payPeriod.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
      include: { payrollLines: { where: { status: "VALIDEE" } } },
    }),
  ]);

  const monthlyPayroll = periodLines.reduce((sum, l) => sum + Number(l.netSalary), 0);
  const yearlyPayroll = yearLines.reduce((sum, l) => sum + Number(l.netSalary), 0);
  const paidEmployeeCount = periodLines.length;
  const pendingEmployeeCount = Math.max(0, activeEmployeeCount - paidEmployeeCount);

  const teacherSalaries = periodLines
    .filter((l) => l.employee.teacherId !== null)
    .reduce((sum, l) => sum + Number(l.netSalary), 0);
  const administrativeSalaries = monthlyPayroll - teacherSalaries;

  const teachingHoursCost = periodLines
    .filter((l) => l.employee.teacherId !== null && (l.employee.salaryMode === "HORAIRE" || l.employee.teachingHoursPaid))
    .reduce((sum, l) => sum + Number(l.hoursWorked ?? 0) * Number(l.hourlyRate ?? 0), 0);

  const totalPrimes = periodLines.reduce((sum, l) => sum + Number(l.totalPrimes), 0);
  const totalRetenues = periodLines.reduce((sum, l) => sum + Number(l.totalRetenues), 0);

  const monthlyHistory = history
    .map((p) => ({
      year: p.year,
      month: p.month,
      label: payPeriodLabel(p.year, p.month),
      total: p.payrollLines.reduce((sum, l) => sum + Number(l.netSalary), 0),
    }))
    .reverse();

  return {
    monthlyPayroll,
    yearlyPayroll,
    paidEmployeeCount,
    pendingEmployeeCount,
    teacherSalaries,
    administrativeSalaries,
    teachingHoursCost,
    totalPrimes,
    totalRetenues,
    monthlyHistory,
  };
}
