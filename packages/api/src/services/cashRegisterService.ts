import { prisma } from "@isac-erp/db";
import type { CashRegisterDto, CreateCashRegisterInput, UpdateCashRegisterInput } from "@isac-erp/shared";

export async function listCashRegisters(): Promise<CashRegisterDto[]> {
  return prisma.cashRegister.findMany({ orderBy: { name: "asc" } });
}

export async function createCashRegister(input: CreateCashRegisterInput): Promise<CashRegisterDto> {
  return prisma.cashRegister.create({ data: input });
}

export async function updateCashRegister(input: UpdateCashRegisterInput): Promise<CashRegisterDto> {
  const { id, ...fields } = input;
  return prisma.cashRegister.update({ where: { id }, data: fields });
}
