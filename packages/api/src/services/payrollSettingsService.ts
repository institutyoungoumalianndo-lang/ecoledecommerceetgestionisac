import { prisma } from "@isac-erp/db";
import type { PayrollSettingsDto, UpdatePayrollSettingsInput } from "@isac-erp/shared";

async function getOrCreateSettings() {
  const existing = await prisma.payrollSettings.findFirst({ include: { salaryExpenseAccount: true } });
  if (existing) return existing;
  return prisma.payrollSettings.create({ data: {}, include: { salaryExpenseAccount: true } });
}

export async function getPayrollSettings(): Promise<PayrollSettingsDto> {
  const row = await getOrCreateSettings();
  return {
    id: row.id,
    salaryExpenseAccountId: row.salaryExpenseAccountId,
    salaryExpenseAccountLabel: row.salaryExpenseAccount?.label ?? null,
    defaultHourlyRate: row.defaultHourlyRate ? Number(row.defaultHourlyRate) : null,
    defaultSessionDurationHours: row.defaultSessionDurationHours ? Number(row.defaultSessionDurationHours) : null,
    overtimeMultiplier: row.overtimeMultiplier ? Number(row.overtimeMultiplier) : null,
    monthlyHoursCap: row.monthlyHoursCap ? Number(row.monthlyHoursCap) : null,
  };
}

/** defaultHourlyRate/defaultSessionDurationHours ne préremplissent qu'un nouvel employé (MODULE-05.1 §1.8).
 * overtimeMultiplier/monthlyHoursCap : champs de configuration uniquement, aucun calcul automatique
 * ne les consomme tant que la règle exacte n'est pas précisée (MODULE-05.2 §1.10/§6.5). */
export async function updatePayrollSettings(input: UpdatePayrollSettingsInput): Promise<PayrollSettingsDto> {
  const existing = await getOrCreateSettings();
  const row = await prisma.payrollSettings.update({
    where: { id: existing.id },
    data: {
      salaryExpenseAccountId: input.salaryExpenseAccountId ?? null,
      defaultHourlyRate: input.defaultHourlyRate ?? null,
      defaultSessionDurationHours: input.defaultSessionDurationHours ?? null,
      overtimeMultiplier: input.overtimeMultiplier ?? null,
      monthlyHoursCap: input.monthlyHoursCap ?? null,
    },
    include: { salaryExpenseAccount: true },
  });
  return {
    id: row.id,
    salaryExpenseAccountId: row.salaryExpenseAccountId,
    salaryExpenseAccountLabel: row.salaryExpenseAccount?.label ?? null,
    defaultHourlyRate: row.defaultHourlyRate ? Number(row.defaultHourlyRate) : null,
    defaultSessionDurationHours: row.defaultSessionDurationHours ? Number(row.defaultSessionDurationHours) : null,
    overtimeMultiplier: row.overtimeMultiplier ? Number(row.overtimeMultiplier) : null,
    monthlyHoursCap: row.monthlyHoursCap ? Number(row.monthlyHoursCap) : null,
  };
}
