import { prisma } from "@isac-erp/db";
import type {
  AcademicPeriodDto,
  CreateAcademicPeriodInput,
  UpdateAcademicPeriodInput,
} from "@isac-erp/shared";

export async function listAcademicPeriods(academicYearId?: string): Promise<AcademicPeriodDto[]> {
  return prisma.academicPeriod.findMany({
    where: academicYearId ? { academicYearId } : undefined,
    orderBy: { orderIndex: "asc" },
  });
}

export interface PeriodDateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Deux modules/semestres d'une même année ne doivent jamais se chevaucher (2026-08-09, retour du
 * porteur du projet — un chevauchement fait compter deux fois les mêmes semaines dans "Par année" de la
 * charge horaire enseignant). Fonction pure, testable sans base de données.
 */
export function findOverlappingPeriod<T extends PeriodDateRange>(
  candidate: PeriodDateRange,
  siblings: T[]
): T | null {
  return siblings.find((p) => candidate.startDate < p.endDate && candidate.endDate > p.startDate) ?? null;
}

/** Les dates d'un module doivent rester à l'intérieur des bornes de son année universitaire. */
export function isPeriodWithinAcademicYear(candidate: PeriodDateRange, academicYear: PeriodDateRange): boolean {
  return candidate.startDate >= academicYear.startDate && candidate.endDate <= academicYear.endDate;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("fr-FR");
}

async function assertPeriodDatesValid(
  input: { academicYearId: string; startDate: Date; endDate: Date },
  excludeId?: string
): Promise<void> {
  if (input.endDate <= input.startDate) {
    throw new Error("La date de fin doit être postérieure à la date de début.");
  }

  const academicYear = await prisma.academicYear.findUniqueOrThrow({ where: { id: input.academicYearId } });
  if (!isPeriodWithinAcademicYear(input, academicYear)) {
    throw new Error(
      `Les dates du module doivent être comprises entre le ${formatDate(academicYear.startDate)} et le ${formatDate(academicYear.endDate)} (bornes de l'année universitaire « ${academicYear.label} »).`
    );
  }

  const siblings = await prisma.academicPeriod.findMany({
    where: { academicYearId: input.academicYearId, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
  const overlapping = findOverlappingPeriod(input, siblings);
  if (overlapping) {
    throw new Error(
      `Ces dates chevauchent la période « ${overlapping.label} » (${formatDate(overlapping.startDate)} → ${formatDate(overlapping.endDate)}). Deux modules d'une même année ne doivent jamais se chevaucher.`
    );
  }
}

export async function createAcademicPeriod(
  input: CreateAcademicPeriodInput
): Promise<AcademicPeriodDto> {
  await assertPeriodDatesValid(input);
  return prisma.academicPeriod.create({ data: input });
}

export async function updateAcademicPeriod(
  input: UpdateAcademicPeriodInput
): Promise<AcademicPeriodDto> {
  const { id, ...fields } = input;
  const existing = await prisma.academicPeriod.findUniqueOrThrow({ where: { id } });
  await assertPeriodDatesValid(
    {
      academicYearId: fields.academicYearId ?? existing.academicYearId,
      startDate: fields.startDate ?? existing.startDate,
      endDate: fields.endDate ?? existing.endDate,
    },
    id
  );
  return prisma.academicPeriod.update({ where: { id }, data: fields });
}

export async function deleteAcademicPeriod(id: string): Promise<void> {
  await prisma.academicPeriod.delete({ where: { id } });
}
