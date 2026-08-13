import { prisma } from "@isac-erp/db";
import type {
  EnrollmentDocumentRequirementDto,
  EnrollmentSettingsDto,
  SetEnrollmentDocumentRequirementInput,
  UpdateEnrollmentSettingsInput,
} from "@isac-erp/shared";

async function getOrCreateSettingsRow() {
  const existing = await prisma.enrollmentSettings.findFirst();
  if (existing) return existing;
  return prisma.enrollmentSettings.create({ data: {} });
}

export async function getEnrollmentSettings(): Promise<EnrollmentSettingsDto> {
  return getOrCreateSettingsRow();
}

export async function updateEnrollmentSettings(
  input: UpdateEnrollmentSettingsInput
): Promise<EnrollmentSettingsDto> {
  const existing = await getOrCreateSettingsRow();
  return prisma.enrollmentSettings.update({ where: { id: existing.id }, data: input });
}

export async function listEnrollmentDocumentRequirements(): Promise<EnrollmentDocumentRequirementDto[]> {
  return prisma.enrollmentDocumentRequirement.findMany({ orderBy: { documentType: "asc" } });
}

export async function setEnrollmentDocumentRequirement(
  input: SetEnrollmentDocumentRequirementInput
): Promise<EnrollmentDocumentRequirementDto> {
  return prisma.enrollmentDocumentRequirement.upsert({
    where: { documentType: input.documentType },
    update: { isRequired: input.isRequired },
    create: input,
  });
}
