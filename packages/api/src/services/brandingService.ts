import { prisma } from "@isac-erp/db";
import type {
  DocumentSignatoryDto,
  DocumentTemplateDto,
  OfficialStampDto,
  ThemeSettingsDto,
  UpdateDocumentSignatoryInput,
  UpdateDocumentTemplateInput,
  UpdateOfficialStampInput,
  UpdateThemeSettingsInput,
} from "@isac-erp/shared";

// --- Signatures (§3.5) ---------------------------------------------------

export async function listDocumentSignatories(): Promise<DocumentSignatoryDto[]> {
  const rows = await prisma.documentSignatory.findMany({ orderBy: { roleCode: "asc" } });
  return rows;
}

export async function updateDocumentSignatory(
  input: UpdateDocumentSignatoryInput
): Promise<{ before: DocumentSignatoryDto | null; after: DocumentSignatoryDto }> {
  const before = await prisma.documentSignatory.findUnique({ where: { roleCode: input.roleCode } });
  const after = await prisma.documentSignatory.upsert({
    where: { roleCode: input.roleCode },
    update: input,
    create: input,
  });
  return { before, after };
}

// --- Cachet officiel (§3.6) ------------------------------------------------

async function getOrCreateStampRow() {
  const existing = await prisma.officialStamp.findFirst();
  if (existing) return existing;
  return prisma.officialStamp.create({ data: {} });
}

export async function getOfficialStamp(): Promise<OfficialStampDto> {
  return getOrCreateStampRow();
}

export async function updateOfficialStamp(
  input: UpdateOfficialStampInput
): Promise<{ before: OfficialStampDto; after: OfficialStampDto }> {
  const before = await getOrCreateStampRow();
  const after = await prisma.officialStamp.update({ where: { id: before.id }, data: input });
  return { before, after };
}

// --- Personnalisation graphique (§3.15) -------------------------------------

async function getOrCreateThemeRow() {
  const existing = await prisma.themeSettings.findFirst();
  if (existing) return existing;
  return prisma.themeSettings.create({ data: {} });
}

export async function getThemeSettings(): Promise<ThemeSettingsDto> {
  return getOrCreateThemeRow();
}

export async function updateThemeSettings(
  input: UpdateThemeSettingsInput
): Promise<{ before: ThemeSettingsDto; after: ThemeSettingsDto }> {
  const before = await getOrCreateThemeRow();
  const after = await prisma.themeSettings.update({ where: { id: before.id }, data: input });
  return { before, after };
}

// --- Modèles de documents (§3.16 — registre de configuration, voir MODULE-02 §1.4.1) ---

export async function listDocumentTemplates(): Promise<DocumentTemplateDto[]> {
  return prisma.documentTemplate.findMany({ orderBy: { documentType: "asc" } });
}

export async function updateDocumentTemplate(
  input: UpdateDocumentTemplateInput
): Promise<{ before: DocumentTemplateDto | null; after: DocumentTemplateDto }> {
  const before = await prisma.documentTemplate.findUnique({
    where: { documentType: input.documentType },
  });
  const after = await prisma.documentTemplate.upsert({
    where: { documentType: input.documentType },
    update: input,
    create: input,
  });
  return { before, after };
}
