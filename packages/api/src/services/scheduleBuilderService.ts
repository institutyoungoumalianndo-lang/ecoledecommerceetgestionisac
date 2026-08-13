import { prisma, type Prisma } from "@isac-erp/db";
import type { ScheduleBuilderAssignmentDto, ScheduleBuilderFilterInput } from "@isac-erp/shared";

const ASSIGNMENT_INCLUDE = {
  subjectOffering: { include: { subject: true, academicYear: true, period: true, level: true, filiere: true } },
  class: true,
} satisfies Prisma.TeacherAssignmentInclude;

const TEMPLATE_INCLUDE = {
  teacher: true,
  subjectOffering: { include: { subject: true, period: true } },
  room: true,
  pedagogicalGroup: true,
  classes: { include: { class: true }, orderBy: { class: { name: "asc" as const } } },
} satisfies Prisma.SeanceRecurrenceTemplateInclude;

/**
 * Constructeur d'emploi du temps (2026-08-06, retour du porteur du projet) — pour une combinaison
 * Année universitaire × Filière (optionnelle) × Niveau × Module (= Période), retrouve les affectations
 * enregistrées (Module 5) via la classe réellement affectée (plus précis que le filiereId, nullable,
 * de la subject_offering — voir SubjectOffering.filiereId : "commun à toutes les filières du niveau"),
 * et associe le créneau hebdomadaire déjà posé le cas échéant (Module 5.2).
 */
export async function listScheduleBuilderAssignments(
  input: ScheduleBuilderFilterInput
): Promise<ScheduleBuilderAssignmentDto[]> {
  const assignments = await prisma.teacherAssignment.findMany({
    where: {
      isActive: true,
      subjectOffering: { periodId: input.periodId },
      class: {
        academicYearId: input.academicYearId,
        levelId: input.levelId,
        filiereId: input.filiereId ?? undefined,
      },
    },
    include: ASSIGNMENT_INCLUDE,
    orderBy: [{ subjectOffering: { subject: { name: "asc" } } }, { class: { name: "asc" } }],
  });

  const subjectOfferingIds = [...new Set(assignments.map((a) => a.subjectOfferingId))];
  const templates = subjectOfferingIds.length
    ? await prisma.seanceRecurrenceTemplate.findMany({
        where: { isActive: true, subjectOfferingId: { in: subjectOfferingIds } },
        include: TEMPLATE_INCLUDE,
      })
    : [];

  return assignments.map((a) => {
    const offering = a.subjectOffering;
    const template = templates.find(
      (t) => t.teacherId === a.teacherId && t.subjectOfferingId === a.subjectOfferingId && t.classes.some((c) => c.classId === a.classId)
    );
    return {
      id: a.id,
      teacherId: a.teacherId,
      subjectOfferingId: a.subjectOfferingId,
      classId: a.classId,
      isActive: a.isActive,
      createdAt: a.createdAt,
      subjectName: offering.subject.name,
      className: a.class.name,
      levelLabel: offering.level.label,
      filiereName: offering.filiere?.name ?? null,
      periodLabel: offering.period.label,
      academicYearLabel: offering.academicYear.label,
      coefficient: Number(offering.coefficient),
      hoursPerWeek: offering.hoursCourse + offering.hoursTd + offering.hoursTp,
      academicYearId: offering.academicYearId,
      periodId: offering.periodId,
      levelId: offering.levelId,
      subjectId: offering.subjectId,
      template: template
        ? {
            id: template.id,
            teacherId: template.teacherId,
            teacherName: `${template.teacher.lastName} ${template.teacher.firstName}`.trim(),
            subjectOfferingId: template.subjectOfferingId,
            subjectName: template.subjectOffering.subject.name,
            periodId: template.subjectOffering.periodId,
            periodLabel: template.subjectOffering.period.label,
            periodStartDate: template.subjectOffering.period.startDate,
            periodEndDate: template.subjectOffering.period.endDate,
            roomId: template.roomId,
            roomLabel: template.room?.label ?? null,
            dayOfWeek: template.dayOfWeek,
            startTime: template.startTime,
            endTime: template.endTime,
            pedagogicalGroupId: template.pedagogicalGroupId,
            pedagogicalGroupLabel: template.pedagogicalGroup?.label ?? null,
            isActive: template.isActive,
            classIds: template.classes.map((c) => c.classId),
            classNames: template.classes.map((c) => c.class.name),
          }
        : null,
    };
  });
}
