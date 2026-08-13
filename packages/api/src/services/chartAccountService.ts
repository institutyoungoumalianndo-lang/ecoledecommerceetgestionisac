import { prisma } from "@isac-erp/db";
import type { ChartAccountDto, CreateChartAccountInput, ListChartAccountsInput, UpdateChartAccountInput } from "@isac-erp/shared";

export async function listChartAccounts(filter: ListChartAccountsInput): Promise<ChartAccountDto[]> {
  return prisma.chartAccount.findMany({
    where: { type: filter.type, isActive: filter.includeInactive ? undefined : true },
    orderBy: { code: "asc" },
  });
}

export async function createChartAccount(input: CreateChartAccountInput): Promise<ChartAccountDto> {
  return prisma.chartAccount.create({ data: input });
}

export async function updateChartAccount(input: UpdateChartAccountInput): Promise<ChartAccountDto> {
  const { id, ...fields } = input;
  return prisma.chartAccount.update({ where: { id }, data: fields });
}

export async function deactivateChartAccount(id: string): Promise<ChartAccountDto> {
  return prisma.chartAccount.update({ where: { id }, data: { isActive: false } });
}

export async function reactivateChartAccount(id: string): Promise<ChartAccountDto> {
  return prisma.chartAccount.update({ where: { id }, data: { isActive: true } });
}
