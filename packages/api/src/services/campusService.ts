import { prisma } from "@isac-erp/db";
import type { CampusSettingsDto, UpdateCampusSettingsInput } from "@isac-erp/shared";

function toDto(row: {
  name: string;
  code: string | null;
  address: string | null;
  phones: string[];
  email: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  managerUserId: string | null;
  logoPath: string | null;
}): CampusSettingsDto {
  return { ...row };
}

async function getOrCreateRow() {
  const existing = await prisma.campusSettings.findFirst();
  if (existing) return existing;
  return prisma.campusSettings.create({ data: { name: "" } });
}

export async function getCampusSettings(): Promise<CampusSettingsDto> {
  return toDto(await getOrCreateRow());
}

export async function updateCampusSettings(
  input: UpdateCampusSettingsInput
): Promise<{ before: CampusSettingsDto; after: CampusSettingsDto }> {
  const row = await getOrCreateRow();
  const before = toDto(row);
  const updated = await prisma.campusSettings.update({ where: { id: row.id }, data: input });
  return { before, after: toDto(updated) };
}
