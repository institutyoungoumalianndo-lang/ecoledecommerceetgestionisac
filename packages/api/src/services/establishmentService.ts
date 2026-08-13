import { prisma } from "@isac-erp/db";
import type { EstablishmentSettingsDto, UpdateEstablishmentSettingsInput } from "@isac-erp/shared";

function toDto(row: {
  officialName: string;
  acronym: string | null;
  motto: string | null;
  slogan: string | null;
  address: string | null;
  city: string | null;
  prefecture: string | null;
  region: string | null;
  country: string | null;
  phones: string[];
  primaryEmail: string | null;
  secondaryEmail: string | null;
  website: string | null;
  logoPrimaryPath: string | null;
  logoSecondaryPath: string | null;
  ministryLogoPath: string | null;
  faviconPath: string | null;
  authorizationNumber: string | null;
  taxNumber: string | null;
  rccmNumber: string | null;
  administrativeReferences: string | null;
  legalMentions: string | null;
}): EstablishmentSettingsDto {
  return { ...row };
}

async function getOrCreateRow() {
  const existing = await prisma.establishmentSettings.findFirst();
  if (existing) return existing;
  return prisma.establishmentSettings.create({ data: { officialName: "" } });
}

export async function getEstablishmentSettings(): Promise<EstablishmentSettingsDto> {
  return toDto(await getOrCreateRow());
}

export async function updateEstablishmentSettings(
  input: UpdateEstablishmentSettingsInput
): Promise<{ before: EstablishmentSettingsDto; after: EstablishmentSettingsDto }> {
  const row = await getOrCreateRow();
  const before = toDto(row);
  const updated = await prisma.establishmentSettings.update({ where: { id: row.id }, data: input });
  return { before, after: toDto(updated) };
}
