import { prisma } from "@isac-erp/db";
import type { PrintThemeSettingsDto, UpdatePrintThemeSettingsInput } from "@isac-erp/shared";

async function getOrCreateRow() {
  const existing = await prisma.printThemeSettings.findFirst();
  if (existing) return existing;
  return prisma.printThemeSettings.create({ data: {} });
}

export async function getPrintThemeSettings(): Promise<PrintThemeSettingsDto> {
  return getOrCreateRow();
}

export async function updatePrintThemeSettings(
  input: UpdatePrintThemeSettingsInput
): Promise<PrintThemeSettingsDto> {
  const existing = await getOrCreateRow();
  return prisma.printThemeSettings.update({ where: { id: existing.id }, data: input });
}
