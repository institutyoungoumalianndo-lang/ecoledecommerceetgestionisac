import { prisma } from "@isac-erp/db";
import type {
  CurrencySettingsDto,
  RegionalSettingsDto,
  UpdateCurrencySettingsInput,
  UpdateRegionalSettingsInput,
} from "@isac-erp/shared";

async function getOrCreateCurrencyRow() {
  const existing = await prisma.currencySettings.findFirst();
  if (existing) return existing;
  return prisma.currencySettings.create({ data: {} });
}

export async function getCurrencySettings(): Promise<CurrencySettingsDto> {
  return getOrCreateCurrencyRow();
}

export async function updateCurrencySettings(
  input: UpdateCurrencySettingsInput
): Promise<{ before: CurrencySettingsDto; after: CurrencySettingsDto }> {
  const before = await getOrCreateCurrencyRow();
  const after = await prisma.currencySettings.update({ where: { id: before.id }, data: input });
  return { before, after };
}

async function getOrCreateRegionalRow() {
  const existing = await prisma.regionalSettings.findFirst();
  if (existing) return existing;
  return prisma.regionalSettings.create({ data: {} });
}

export async function getRegionalSettings(): Promise<RegionalSettingsDto> {
  return getOrCreateRegionalRow();
}

export async function updateRegionalSettings(
  input: UpdateRegionalSettingsInput
): Promise<{ before: RegionalSettingsDto; after: RegionalSettingsDto }> {
  const before = await getOrCreateRegionalRow();
  const after = await prisma.regionalSettings.update({ where: { id: before.id }, data: input });
  return { before, after };
}
