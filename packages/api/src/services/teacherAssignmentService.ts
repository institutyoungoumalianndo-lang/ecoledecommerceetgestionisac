import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CreateTeacherAssignmentInput,
  GetTeacherWorkloadInput,
  TeacherAssignmentDto,
  TeacherWorkloadDto,
} from "@isac-erp/shared";
import { notifyTeacherAssignmentCreated } from "./teacherAssignmentNotificationService.js";

const ASSIGNMENT_INCLUDE = {
  subjectOffering: { include: { subject: true, academicYear: true, period: true, level: true, filiere: true } },
  class: true,
} satisfies Prisma.TeacherAssignmentInclude;

type AssignmentWithRelations = Prisma.TeacherAssignmentGetPayload<{ include: typeof ASSIGNMENT_INCLUDE }>;

function toDto(row: AssignmentWithRelations): TeacherAssignmentDto {
  const offering = row.subjectOffering;
  return {
    id: row.id,
    teacherId: row.teacherId,
    subjectOfferingId: row.subjectOfferingId,
    classId: row.classId,
    isActive: row.isActive,
    createdAt: row.createdAt,
    subjectName: offering.subject.name,
    className: row.class.name,
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
  };
}

export async function listTeacherAssignments(
  teacherId: string,
  includeInactive: boolean
): Promise<TeacherAssignmentDto[]> {
  const rows = await prisma.teacherAssignment.findMany({
    where: { teacherId, isActive: includeInactive ? undefined : true },
    include: ASSIGNMENT_INCLUDE,
    orderBy: [{ subjectOffering: { academicYear: { startDate: "desc" } } }, { createdAt: "desc" }],
  });
  return rows.map(toDto);
}

/** La classe affectée doit appartenir au niveau/filière de la subject_offering (MODULE-05 §1.2/§3 règle 2). */
async function assertClassMatchesOffering(subjectOfferingId: string, classId: string): Promise<void> {
  const [offering, targetClass] = await Promise.all([
    prisma.subjectOffering.findUniqueOrThrow({ where: { id: subjectOfferingId } }),
    prisma.class.findUniqueOrThrow({ where: { id: classId } }),
  ]);
  if (targetClass.academicYearId !== offering.academicYearId || targetClass.levelId !== offering.levelId) {
    throw new Error("La classe sélectionnée ne correspond pas à l'année universitaire/niveau de cette affectation de matière.");
  }
  if (offering.filiereId && targetClass.filiereId !== offering.filiereId) {
    throw new Error("La classe sélectionnée n'appartient pas à la filière de cette affectation de matière.");
  }
  // 2026-08-09, retour du porteur du projet : une affectation sur une matière à 0h (cours/TD/TP jamais
  // renseignées) laisse silencieusement la charge horaire de l'enseignant à 0 — mieux vaut bloquer que
  // laisser créer une affectation fantôme.
  if (offering.hoursCourse + offering.hoursTd + offering.hoursTp === 0) {
    throw new Error(
      "Cette matière n'a aucun volume horaire déclaré (0h cours/TD/TP). Complète son volume horaire dans Réglages → Matières avant d'y affecter un enseignant, sinon sa charge horaire restera à 0."
    );
  }
}

async function assertNotAlreadyAssigned(
  teacherId: string,
  subjectOfferingId: string,
  classId: string
): Promise<void> {
  const existing = await prisma.teacherAssignment.findFirst({
    where: { teacherId, subjectOfferingId, classId, isActive: true },
  });
  if (existing) {
    throw new Error("Cet enseignant est déjà affecté à cette matière pour cette classe.");
  }
}

export async function createTeacherAssignment(
  input: CreateTeacherAssignmentInput
): Promise<TeacherAssignmentDto> {
  await assertClassMatchesOffering(input.subjectOfferingId, input.classId);
  await assertNotAlreadyAssigned(input.teacherId, input.subjectOfferingId, input.classId);
  const row = await prisma.teacherAssignment.create({
    data: input,
    include: ASSIGNMENT_INCLUDE,
  });
  const dto = toDto(row);

  // Module 12 — Centre de Communication : notification automatique de nouvelle affectation
  // (2026-08-06, retour du porteur du projet) — fire-and-forget, n'échoue jamais bruyamment.
  void notifyTeacherAssignmentCreated(dto);

  return dto;
}

/** Jamais supprimée physiquement — désactivée seulement, l'historique reste consultable (MODULE-05 §3 règle 5). */
export async function deactivateTeacherAssignment(id: string): Promise<TeacherAssignmentDto> {
  const row = await prisma.teacherAssignment.update({
    where: { id },
    data: { isActive: false },
    include: ASSIGNMENT_INCLUDE,
  });
  return toDto(row);
}

export async function reactivateTeacherAssignment(id: string): Promise<TeacherAssignmentDto> {
  const row = await prisma.teacherAssignment.update({
    where: { id },
    data: { isActive: true },
    include: ASSIGNMENT_INCLUDE,
  });
  return toDto(row);
}

// --- Charge horaire (MODULE-05 §1.3) — jamais stockée, toujours calculée depuis les affectations actives. ---

export const AVERAGE_WEEKS_PER_MONTH = 4.345;

export function computeWeeksInRange(startDate: Date, endDate: Date): number {
  const ms = endDate.getTime() - startDate.getTime();
  return Math.max(0, ms / (7 * 24 * 60 * 60 * 1000));
}

export interface PeriodWorkload {
  startDate: Date;
  endDate: Date;
  weeklyHours: number;
}

/**
 * Semaine/mois = calculés depuis le semestre en cours (celui dont la date du jour tombe entre
 * ses dates de début/fin) ; année = somme sur tous les semestres de l'année universitaire.
 * Fonction pure, testable sans base de données.
 */
export function computeWorkloadFromPeriods(
  periods: PeriodWorkload[],
  today: Date = new Date()
): Omit<TeacherWorkloadDto, "weeklyCapacity" | "weeklyRemaining"> {
  const current = periods.find((p) => today >= p.startDate && today <= p.endDate);
  const weeklyHours = current?.weeklyHours ?? 0;
  const semesterHours = current ? weeklyHours * computeWeeksInRange(current.startDate, current.endDate) : 0;
  const monthlyHours = weeklyHours * AVERAGE_WEEKS_PER_MONTH;
  const yearlyHours = periods.reduce(
    (sum, p) => sum + p.weeklyHours * computeWeeksInRange(p.startDate, p.endDate),
    0
  );
  return { weeklyHours, monthlyHours, semesterHours, yearlyHours };
}

export async function getTeacherWorkload(input: GetTeacherWorkloadInput): Promise<TeacherWorkloadDto> {
  const [teacher, academicYear] = await Promise.all([
    prisma.teacher.findUniqueOrThrow({ where: { id: input.teacherId } }),
    input.academicYearId
      ? prisma.academicYear.findUniqueOrThrow({ where: { id: input.academicYearId } })
      : prisma.academicYear.findFirst({ where: { isActive: true } }),
  ]);

  const assignments = academicYear
    ? await prisma.teacherAssignment.findMany({
        where: { teacherId: input.teacherId, isActive: true, subjectOffering: { academicYearId: academicYear.id } },
        include: { subjectOffering: { include: { period: true } } },
      })
    : [];

  const hoursByPeriod = new Map<string, PeriodWorkload>();
  for (const a of assignments) {
    const period = a.subjectOffering.period;
    const weeklyHours =
      a.subjectOffering.hoursCourse + a.subjectOffering.hoursTd + a.subjectOffering.hoursTp;
    const entry = hoursByPeriod.get(period.id) ?? { startDate: period.startDate, endDate: period.endDate, weeklyHours: 0 };
    entry.weeklyHours += weeklyHours;
    hoursByPeriod.set(period.id, entry);
  }

  const workload = computeWorkloadFromPeriods([...hoursByPeriod.values()]);
  const weeklyCapacity = teacher.weeklyHoursCapacity ? Number(teacher.weeklyHoursCapacity) : null;
  const weeklyRemaining = weeklyCapacity !== null ? Math.max(0, weeklyCapacity - workload.weeklyHours) : null;

  return { ...workload, weeklyCapacity, weeklyRemaining };
}
