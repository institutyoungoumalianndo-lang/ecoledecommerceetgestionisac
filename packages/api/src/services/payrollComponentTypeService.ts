import { prisma } from "@isac-erp/db";
import type {
  CreatePayrollComponentTypeInput,
  PayrollComponentTypeDto,
  UpdatePayrollComponentTypeInput,
} from "@isac-erp/shared";

export async function listPayrollComponentTypes(): Promise<PayrollComponentTypeDto[]> {
  return prisma.payrollComponentType.findMany({ orderBy: { label: "asc" } });
}

export async function createPayrollComponentType(
  input: CreatePayrollComponentTypeInput
): Promise<PayrollComponentTypeDto> {
  return prisma.payrollComponentType.create({ data: input });
}

export async function updatePayrollComponentType(
  input: UpdatePayrollComponentTypeInput
): Promise<PayrollComponentTypeDto> {
  const { id, ...fields } = input;
  return prisma.payrollComponentType.update({ where: { id }, data: fields });
}

export async function deactivatePayrollComponentType(id: string): Promise<PayrollComponentTypeDto> {
  return prisma.payrollComponentType.update({ where: { id }, data: { isActive: false } });
}

export async function reactivatePayrollComponentType(id: string): Promise<PayrollComponentTypeDto> {
  return prisma.payrollComponentType.update({ where: { id }, data: { isActive: true } });
}
