import { prisma, type Prisma } from "@isac-erp/db";
import type { CreateSalaryAdvanceInput, ListSalaryAdvancesInput, SalaryAdvanceDto } from "@isac-erp/shared";
import { payPeriodLabel } from "./payPeriodService.js";
import { getEmployeeById } from "./employeeService.js";

const ADVANCE_INCLUDE = {
  grantedPayPeriod: true,
  deductionPayPeriod: true,
} satisfies Prisma.SalaryAdvanceInclude;

type AdvanceWithRelations = Prisma.SalaryAdvanceGetPayload<{ include: typeof ADVANCE_INCLUDE }>;

async function toDto(row: AdvanceWithRelations): Promise<SalaryAdvanceDto> {
  const employee = await getEmployeeById(row.employeeId);
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeMatricule: employee.matricule,
    employeeName: `${employee.lastName ?? ""} ${employee.firstName ?? ""}`.trim(),
    amount: Number(row.amount),
    grantedPayPeriodId: row.grantedPayPeriodId,
    grantedPayPeriodLabel: payPeriodLabel(row.grantedPayPeriod.year, row.grantedPayPeriod.month),
    deductionPayPeriodId: row.deductionPayPeriodId,
    deductionPayPeriodLabel: row.deductionPayPeriod
      ? payPeriodLabel(row.deductionPayPeriod.year, row.deductionPayPeriod.month)
      : null,
    reason: row.reason,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export async function listSalaryAdvances(filter: ListSalaryAdvancesInput): Promise<SalaryAdvanceDto[]> {
  const rows = await prisma.salaryAdvance.findMany({
    where: { employeeId: filter.employeeId, status: filter.status },
    include: ADVANCE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(rows.map(toDto));
}

export async function createSalaryAdvance(input: CreateSalaryAdvanceInput): Promise<SalaryAdvanceDto> {
  const row = await prisma.salaryAdvance.create({
    data: {
      employeeId: input.employeeId,
      amount: input.amount,
      grantedPayPeriodId: input.grantedPayPeriodId,
      deductionPayPeriodId: input.deductionPayPeriodId ?? null,
      reason: input.reason ?? null,
    },
    include: ADVANCE_INCLUDE,
  });
  return toDto(row);
}

export async function cancelSalaryAdvance(id: string): Promise<SalaryAdvanceDto> {
  const row = await prisma.salaryAdvance.update({
    where: { id },
    data: { status: "ANNULEE" },
    include: ADVANCE_INCLUDE,
  });
  return toDto(row);
}

/** Avances en attente à déduire sur une période donnée — utilisé par le calcul de paie (MODULE-08 §1.9). */
export async function getPendingAdvancesForPeriod(employeeId: string, payPeriodId: string) {
  return prisma.salaryAdvance.findMany({
    where: {
      employeeId,
      status: "EN_ATTENTE",
      OR: [{ deductionPayPeriodId: payPeriodId }, { deductionPayPeriodId: null }],
    },
  });
}

export async function markAdvancesDeducted(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.salaryAdvance.updateMany({ where: { id: { in: ids } }, data: { status: "DEDUITE" } });
}
