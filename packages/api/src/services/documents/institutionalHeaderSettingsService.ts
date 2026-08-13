import { prisma } from "@isac-erp/db";
import type { InstitutionalHeaderSettingsDto, UpdateInstitutionalHeaderSettingsInput } from "@isac-erp/shared";

/** En-tête institutionnel — singleton (MODULE-09 §1.1/§1.4), jamais codé en dur, applicable à tous les documents Tier 1. */
async function getOrCreateRow() {
  const existing = await prisma.institutionalHeaderSettings.findFirst();
  if (existing) return existing;
  return prisma.institutionalHeaderSettings.create({ data: {} });
}

export async function getInstitutionalHeaderSettings(): Promise<InstitutionalHeaderSettingsDto> {
  return getOrCreateRow();
}

export async function updateInstitutionalHeaderSettings(
  input: UpdateInstitutionalHeaderSettingsInput
): Promise<{ before: InstitutionalHeaderSettingsDto; after: InstitutionalHeaderSettingsDto }> {
  const before = await getOrCreateRow();
  const after = await prisma.institutionalHeaderSettings.update({ where: { id: before.id }, data: input });
  return { before, after };
}
