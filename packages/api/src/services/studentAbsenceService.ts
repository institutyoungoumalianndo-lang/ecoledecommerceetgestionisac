import { prisma, type Prisma } from "@isac-erp/db";
import type { CreateStudentAbsenceInput, StudentAbsenceDto } from "@isac-erp/shared";

const ABSENCE_INCLUDE = {
  createdByUser: true,
} satisfies Prisma.StudentAbsenceInclude;

type StudentAbsenceWithRelations = Prisma.StudentAbsenceGetPayload<{ include: typeof ABSENCE_INCLUDE }>;

function toDto(row: StudentAbsenceWithRelations): StudentAbsenceDto {
  return {
    id: row.id,
    studentId: row.studentId,
    date: row.date,
    motif: row.motif,
    justifiee: row.justifiee,
    createdByName: `${row.createdByUser.firstName} ${row.createdByUser.lastName}`,
    createdAt: row.createdAt,
  };
}

export async function listStudentAbsences(studentId: string): Promise<StudentAbsenceDto[]> {
  const rows = await prisma.studentAbsence.findMany({
    where: { studentId },
    include: ABSENCE_INCLUDE,
    orderBy: { date: "desc" },
  });
  return rows.map(toDto);
}

/**
 * Enregistre une absence pour un jour donné (2026-08-03, retour du porteur du projet) — pas de
 * pointage quotidien, l'étudiant est présumé présent : seule une absence enregistrée explicitement
 * apparaît. Alimente la mention de régularité calculée à la génération des bulletins (voir
 * `computeRegularite` dans `bulletinPeriodeService.ts`/`bulletinAnnuelService.ts`).
 */
export async function createStudentAbsence(input: CreateStudentAbsenceInput, createdBy: string): Promise<StudentAbsenceDto> {
  const row = await prisma.studentAbsence.create({
    data: {
      studentId: input.studentId,
      date: input.date,
      motif: input.motif,
      justifiee: input.justifiee,
      createdBy,
    },
    include: ABSENCE_INCLUDE,
  });
  return toDto(row);
}

/** Suppression physique (pas d'archive officielle contrairement aux sanctions/bulletins) — corrige une saisie erronée. */
export async function deleteStudentAbsence(id: string): Promise<void> {
  await prisma.studentAbsence.delete({ where: { id } });
}

/**
 * Nombre d'absences NON JUSTIFIÉES d'un étudiant sur un intervalle (bornes incluses) — utilisé pour
 * calculer la mention de régularité à la génération des bulletins de période/annuel (voir
 * `bulletinPeriodeService.ts`/`bulletinAnnuelService.ts`, EvaluationSettings.seuilAbsencesIrregulier).
 */
export async function countUnjustifiedAbsences(studentId: string, startDate: Date, endDate: Date): Promise<number> {
  return prisma.studentAbsence.count({
    where: { studentId, justifiee: false, date: { gte: startDate, lte: endDate } },
  });
}
