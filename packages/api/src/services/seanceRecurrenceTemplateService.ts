import { prisma, type Prisma } from "@isac-erp/db";
import type {
  CreateSeanceRecurrenceTemplateInput,
  DayOfWeek,
  GenerateSeancesFromTemplateInput,
  ListSeanceRecurrenceTemplatesInput,
  RecurrenceConflictDto,
  SeanceDto,
  SeanceRecurrenceTemplateDto,
  UpdateSeanceRecurrenceTemplateInput,
} from "@isac-erp/shared";
import { createSeanceCore, getSeanceById, timesOverlap } from "./seanceService.js";

const TEMPLATE_INCLUDE = {
  teacher: true,
  subjectOffering: { include: { subject: true, period: true } },
  room: true,
  pedagogicalGroup: true,
  classes: { include: { class: true }, orderBy: { class: { name: "asc" as const } } },
} satisfies Prisma.SeanceRecurrenceTemplateInclude;

type TemplateWithRelations = Prisma.SeanceRecurrenceTemplateGetPayload<{ include: typeof TEMPLATE_INCLUDE }>;

function toTemplateDto(row: TemplateWithRelations): SeanceRecurrenceTemplateDto {
  return {
    id: row.id,
    teacherId: row.teacherId,
    teacherName: `${row.teacher.lastName} ${row.teacher.firstName}`.trim(),
    subjectOfferingId: row.subjectOfferingId,
    subjectName: row.subjectOffering.subject.name,
    periodId: row.subjectOffering.periodId,
    periodLabel: row.subjectOffering.period.label,
    periodStartDate: row.subjectOffering.period.startDate,
    periodEndDate: row.subjectOffering.period.endDate,
    roomId: row.roomId,
    roomLabel: row.room?.label ?? null,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
    pedagogicalGroupId: row.pedagogicalGroupId,
    pedagogicalGroupLabel: row.pedagogicalGroup?.label ?? null,
    isActive: row.isActive,
    classIds: row.classes.map((c) => c.classId),
    classNames: row.classes.map((c) => c.class.name),
  };
}

/**
 * Modèle de récurrence hebdomadaire — remplace TeacherWeeklySlot (Module 5.1), génère des Séance
 * concrètes et indépendantes (voir MODULE-05.2 §1.8.1).
 */
export async function listSeanceRecurrenceTemplates(
  input: ListSeanceRecurrenceTemplatesInput
): Promise<SeanceRecurrenceTemplateDto[]> {
  const rows = await prisma.seanceRecurrenceTemplate.findMany({
    where: {
      teacherId: input.teacherId,
      isActive: input.activeOnly ? true : undefined,
    },
    include: TEMPLATE_INCLUDE,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return rows.map(toTemplateDto);
}

async function resolveClassIds(pedagogicalGroupId: string | null | undefined, classIds: string[]): Promise<string[]> {
  if (classIds.length > 0) return classIds;
  if (!pedagogicalGroupId) return [];
  const members = await prisma.pedagogicalGroupClass.findMany({ where: { pedagogicalGroupId } });
  return members.map((m) => m.classId);
}

/**
 * Détection de conflits au niveau du modèle de récurrence hebdomadaire (2026-08-06, retour du porteur
 * du projet) — même principe que `checkSeanceConflicts` (seanceService.ts, MODULE-05.2 §1.4) mais
 * comparé aux autres modèles actifs sur le même jour de semaine plutôt qu'à des séances datées.
 */
export async function checkRecurrenceConflicts(input: {
  excludeTemplateId?: string;
  teacherId: string;
  roomId: string | null;
  classIds: string[];
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}): Promise<{ conflicts: RecurrenceConflictDto[] }> {
  const candidates = await prisma.seanceRecurrenceTemplate.findMany({
    where: {
      isActive: true,
      dayOfWeek: input.dayOfWeek,
      id: input.excludeTemplateId ? { not: input.excludeTemplateId } : undefined,
      OR: [
        { teacherId: input.teacherId },
        ...(input.roomId ? [{ roomId: input.roomId }] : []),
        { classes: { some: { classId: { in: input.classIds } } } },
      ],
    },
    include: { classes: true },
  });

  const conflicts: RecurrenceConflictDto[] = [];
  for (const c of candidates) {
    if (!timesOverlap(input.startTime, input.endTime, c.startTime, c.endTime)) continue;

    if (c.teacherId === input.teacherId) {
      conflicts.push({
        type: "TEACHER",
        templateId: c.id,
        label: "L'enseignant a déjà un créneau sur ce jour/cette heure.",
        dayOfWeek: c.dayOfWeek,
        startTime: c.startTime,
        endTime: c.endTime,
      });
    }
    if (input.roomId && c.roomId === input.roomId) {
      conflicts.push({
        type: "ROOM",
        templateId: c.id,
        label: "La salle est déjà occupée sur ce jour/cette heure.",
        dayOfWeek: c.dayOfWeek,
        startTime: c.startTime,
        endTime: c.endTime,
      });
    }
    const overlappingClassIds = c.classes.map((cl) => cl.classId).filter((id) => input.classIds.includes(id));
    if (overlappingClassIds.length > 0) {
      conflicts.push({
        type: "CLASS",
        templateId: c.id,
        label: "Une des classes a déjà un créneau sur ce jour/cette heure.",
        dayOfWeek: c.dayOfWeek,
        startTime: c.startTime,
        endTime: c.endTime,
      });
    }
  }

  return { conflicts };
}

export async function createSeanceRecurrenceTemplate(
  input: CreateSeanceRecurrenceTemplateInput
): Promise<SeanceRecurrenceTemplateDto> {
  const classIds = await resolveClassIds(input.pedagogicalGroupId, input.classIds);
  const { conflicts } = await checkRecurrenceConflicts({
    teacherId: input.teacherId,
    roomId: input.roomId ?? null,
    classIds,
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
  });
  if (conflicts.length > 0) {
    throw new Error(`Conflit détecté : ${conflicts.map((c) => c.label).join(" ")}`);
  }
  const row = await prisma.seanceRecurrenceTemplate.create({
    data: {
      teacherId: input.teacherId,
      subjectOfferingId: input.subjectOfferingId,
      roomId: input.roomId ?? null,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      pedagogicalGroupId: input.pedagogicalGroupId ?? null,
      classes: { create: classIds.map((classId) => ({ classId })) },
    },
    include: TEMPLATE_INCLUDE,
  });
  return toTemplateDto(row);
}

export async function updateSeanceRecurrenceTemplate(
  input: UpdateSeanceRecurrenceTemplateInput
): Promise<SeanceRecurrenceTemplateDto> {
  const classIds = await resolveClassIds(input.pedagogicalGroupId, input.classIds);
  const existing = await prisma.seanceRecurrenceTemplate.findUniqueOrThrow({ where: { id: input.id } });
  if (input.isActive) {
    const { conflicts } = await checkRecurrenceConflicts({
      excludeTemplateId: input.id,
      teacherId: existing.teacherId,
      roomId: input.roomId ?? null,
      classIds,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    });
    if (conflicts.length > 0) {
      throw new Error(`Conflit détecté : ${conflicts.map((c) => c.label).join(" ")}`);
    }
  }
  const row = await prisma.$transaction(async (tx) => {
    await tx.seanceRecurrenceTemplateClass.deleteMany({ where: { templateId: input.id } });
    await tx.seanceRecurrenceTemplateClass.createMany({
      data: classIds.map((classId) => ({ templateId: input.id, classId })),
    });
    return tx.seanceRecurrenceTemplate.update({
      where: { id: input.id },
      data: {
        roomId: input.roomId ?? null,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        pedagogicalGroupId: input.pedagogicalGroupId ?? null,
        isActive: input.isActive,
      },
      include: TEMPLATE_INCLUDE,
    });
  });
  return toTemplateDto(row);
}

/** Jamais supprimé physiquement — n'affecte jamais les séances déjà générées (voir MODULE-05.2 §3 règle 6). */
export async function deactivateSeanceRecurrenceTemplate(id: string): Promise<SeanceRecurrenceTemplateDto> {
  const row = await prisma.seanceRecurrenceTemplate.update({
    where: { id },
    data: { isActive: false },
    include: TEMPLATE_INCLUDE,
  });
  return toTemplateDto(row);
}

export async function reactivateSeanceRecurrenceTemplate(id: string): Promise<SeanceRecurrenceTemplateDto> {
  const row = await prisma.seanceRecurrenceTemplate.update({
    where: { id },
    data: { isActive: true },
    include: TEMPLATE_INCLUDE,
  });
  return toTemplateDto(row);
}

const JS_DAY_TO_DAY_OF_WEEK = [
  "DIMANCHE",
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
] as const;

function datesForDayOfWeek(dayOfWeek: string, start: Date, end: Date): Date[] {
  const targetIndex = JS_DAY_TO_DAY_OF_WEEK.indexOf(dayOfWeek as (typeof JS_DAY_TO_DAY_OF_WEEK)[number]);
  const dates: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    if (cursor.getDay() === targetIndex) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/**
 * Génère des séances concrètes depuis ce modèle sur [startDate, endDate] (voir MODULE-05.2 §1.8.1).
 * Idempotent (unique sur recurrenceTemplateId+sessionDate) : ne duplique jamais une séance déjà
 * générée pour une même date. Chaque séance générée est ensuite indépendante — modifiable/déplaçable
 * sans affecter le modèle ni les autres occurrences.
 */
export async function generateSeancesFromTemplate(input: GenerateSeancesFromTemplateInput): Promise<SeanceDto[]> {
  const template = await prisma.seanceRecurrenceTemplate.findUniqueOrThrow({
    where: { id: input.templateId },
    include: TEMPLATE_INCLUDE,
  });

  const dates = datesForDayOfWeek(template.dayOfWeek, input.startDate, input.endDate);
  const classIds = template.classes.map((c) => c.classId);
  const results: SeanceDto[] = [];

  for (const date of dates) {
    const existing = await prisma.seance.findUnique({
      where: { recurrenceTemplateId_sessionDate: { recurrenceTemplateId: template.id, sessionDate: date } },
    });
    if (existing) {
      results.push(await getSeanceById(existing.id));
      continue;
    }
    const created = await createSeanceCore({
      teacherId: template.teacherId,
      subjectOfferingId: template.subjectOfferingId,
      roomId: template.roomId,
      recurrenceTemplateId: template.id,
      sessionDate: date,
      startTime: template.startTime,
      endTime: template.endTime,
      classIds,
    });
    results.push(created);
  }

  return results;
}
