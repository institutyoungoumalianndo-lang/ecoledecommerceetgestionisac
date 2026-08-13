import { prisma } from "@isac-erp/db";
import type { CreateEnrollmentRegimeInput, EnrollmentRegimeDto, UpdateEnrollmentRegimeInput } from "@isac-erp/shared";

export async function listEnrollmentRegimes(): Promise<EnrollmentRegimeDto[]> {
  return prisma.enrollmentRegime.findMany({ orderBy: { label: "asc" } });
}

export async function createEnrollmentRegime(input: CreateEnrollmentRegimeInput): Promise<EnrollmentRegimeDto> {
  return prisma.enrollmentRegime.create({ data: input });
}

export async function updateEnrollmentRegime(input: UpdateEnrollmentRegimeInput): Promise<EnrollmentRegimeDto> {
  const { id, ...fields } = input;
  return prisma.enrollmentRegime.update({ where: { id }, data: fields });
}

export async function deactivateEnrollmentRegime(id: string): Promise<EnrollmentRegimeDto> {
  return prisma.enrollmentRegime.update({ where: { id }, data: { isActive: false } });
}

export async function reactivateEnrollmentRegime(id: string): Promise<EnrollmentRegimeDto> {
  return prisma.enrollmentRegime.update({ where: { id }, data: { isActive: true } });
}
