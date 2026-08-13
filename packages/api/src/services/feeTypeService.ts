import { prisma } from "@isac-erp/db";
import type { CreateFeeTypeInput, FeeTypeDto, UpdateFeeTypeInput } from "@isac-erp/shared";

export async function listFeeTypes(): Promise<FeeTypeDto[]> {
  return prisma.feeType.findMany({ orderBy: { name: "asc" } });
}

export async function createFeeType(input: CreateFeeTypeInput): Promise<FeeTypeDto> {
  return prisma.feeType.create({ data: input });
}

export async function updateFeeType(input: UpdateFeeTypeInput): Promise<FeeTypeDto> {
  const { id, ...fields } = input;
  return prisma.feeType.update({ where: { id }, data: fields });
}

export async function deactivateFeeType(id: string): Promise<FeeTypeDto> {
  return prisma.feeType.update({ where: { id }, data: { isActive: false } });
}

export async function reactivateFeeType(id: string): Promise<FeeTypeDto> {
  return prisma.feeType.update({ where: { id }, data: { isActive: true } });
}
