import { prisma, type Prisma } from "@isac-erp/db";
import type { LibrarySettingsDto, UpdateLibrarySettingsInput } from "@isac-erp/shared";

/** Réglages de la bibliothèque — singleton, voir MODULE-13 §1.2. */
export async function getOrCreateLibrarySettingsRow() {
  const existing = await prisma.librarySettings.findFirst();
  if (existing) return existing;
  return prisma.librarySettings.create({ data: {} });
}

function toDto(row: Prisma.LibrarySettingsGetPayload<Record<string, never>>): LibrarySettingsDto {
  return {
    defaultLoanDurationDays: row.defaultLoanDurationDays,
    maxSimultaneousLoans: row.maxSimultaneousLoans,
  };
}

export async function getLibrarySettings(): Promise<LibrarySettingsDto> {
  return toDto(await getOrCreateLibrarySettingsRow());
}

export async function updateLibrarySettings(input: UpdateLibrarySettingsInput): Promise<LibrarySettingsDto> {
  const row = await getOrCreateLibrarySettingsRow();
  const updated = await prisma.librarySettings.update({ where: { id: row.id }, data: input });
  return toDto(updated);
}
