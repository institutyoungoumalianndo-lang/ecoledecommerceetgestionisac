import { prisma } from "@isac-erp/db";
import type { FeuilleSaisieDto, GetFeuilleSaisieInput } from "@isac-erp/shared";

/**
 * Feuille de saisie imprimable (MODULE-06 §1.10) — aucune donnée stockée, préremplit l'enseignant
 * affecté à cette matière/classe quand il n'y en a qu'un seul (réutilise TeacherAssignment, Module 5).
 */
export async function getFeuilleSaisie(input: GetFeuilleSaisieInput): Promise<FeuilleSaisieDto> {
  const [offering, schoolClass, enrollments, assignments] = await Promise.all([
    prisma.subjectOffering.findUniqueOrThrow({
      where: { id: input.subjectOfferingId },
      include: { subject: true, academicYear: true, period: true },
    }),
    prisma.class.findUniqueOrThrow({ where: { id: input.classId }, include: { filiere: true, level: true } }),
    prisma.studentEnrollment.findMany({
      where: { classId: input.classId, cancelledAt: null },
      include: { student: true },
      orderBy: [{ student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    }),
    prisma.teacherAssignment.findMany({
      where: { subjectOfferingId: input.subjectOfferingId, classId: input.classId, isActive: true },
      include: { teacher: true },
    }),
  ]);

  const teacher = assignments.length === 1 ? (assignments[0]?.teacher ?? null) : null;

  return {
    subjectName: offering.subject.name,
    classLabel: schoolClass.name,
    filiereLabel: schoolClass.filiere.name,
    levelLabel: schoolClass.level.label,
    academicYearLabel: offering.academicYear.label,
    academicPeriodLabel: offering.period.label,
    coefficient: Number(offering.coefficient),
    teacherName: teacher ? `${teacher.lastName} ${teacher.firstName}` : null,
    teacherPhone: teacher?.phonePrimary ?? null,
    students: enrollments.map((e) => ({
      studentId: e.studentId,
      matricule: e.student.matricule,
      lastName: e.student.lastName,
      firstName: e.student.firstName,
    })),
  };
}
